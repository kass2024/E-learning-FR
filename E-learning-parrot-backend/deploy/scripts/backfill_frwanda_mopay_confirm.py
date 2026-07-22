"""Backfill stuck MoPay payments + re-register F&R webhook callbacks."""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import paramiko
import ssh_deploy as d

PHP = r'''<?php
require "vendor/autoload.php";
$app = require "bootstrap/app.php";
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\CoursePayment;
use App\Services\MopayPaymentService;
use App\Services\ExternalPayNowService;

$svc = app(MopayPaymentService::class);
$ext = app(ExternalPayNowService::class);

if (getenv("MOPAY_REGISTER_CALLBACKS") === "1") {
  echo "Registering callbacks...\n";
  try {
    $reg = $svc->registerCallbackSettings();
    echo "callback_ok=" . (!empty($reg["ok"]) ? "yes" : "no") . " url=" . ($reg["callback_url"] ?? "") . "\n";
  } catch (Throwable $e) {
    echo "callback_register_failed=" . $e->getMessage() . "\n";
  }
} else {
  echo "Skipping callback registration (set MOPAY_REGISTER_CALLBACKS=1 to enable)\n";
}

$pending = CoursePayment::query()
  ->where("provider", "mopay")
  ->whereIn("status", ["processing", "pending", "failed"])
  ->whereNotNull("external_reference")
  ->orderByDesc("id")
  ->limit(30)
  ->get();

echo "learner_pending=" . $pending->count() . "\n";
foreach ($pending as $p) {
  $ref = (string) $p->external_reference;
  echo "sync {$ref} ... ";
  try {
    $r = $svc->syncPaymentFromGateway($ref);
    echo ($r["payment"]["status"] ?? "?") . " | " . ($r["enrollment"]["status"] ?? "-") . " | " . ($r["message"] ?? "") . "\n";
  } catch (Throwable $e) {
    echo "ERR " . $e->getMessage() . "\n";
  }
}

$extPending = App\Models\ExternalCoursePayment::query()
  ->whereIn("status", ["processing", "pending", "failed"])
  ->orderByDesc("id")
  ->limit(20)
  ->get();
echo "external_pending=" . $extPending->count() . "\n";
foreach ($extPending as $p) {
  $ref = (string) $p->external_reference;
  echo "ext {$ref} ... ";
  try {
    $r = $ext->syncPaymentFromGateway($ref);
    echo (($r["payment"]["status"] ?? "?")) . " | " . ($r["message"] ?? "") . "\n";
  } catch (Throwable $e) {
    echo "ERR " . $e->getMessage() . "\n";
  }
}
'''


def main() -> int:
    cfg = d.load_env(d.DEPLOY / "vps.env")
    user, host, port = d.parse_host(cfg["VPS_HOST"])
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(hostname=host, port=port, username=user, password=cfg["VPS_PASSWORD"], timeout=30)

    sftp = client.open_sftp()
    remote = "/tmp/frwanda_backfill_mopay.php"
    with sftp.file(remote, "w") as f:
        f.write(PHP)
    sftp.close()

    cmd = r"""
set -euo pipefail
BE=$(docker ps --format '{{.Names}}' | grep -i frwanda | grep -iE 'back|api' | head -1)
echo BE=$BE
docker cp /tmp/frwanda_backfill_mopay.php "$BE:/tmp/frwanda_backfill_mopay.php"
docker exec "$BE" php /tmp/frwanda_backfill_mopay.php
"""
    return d.run(client, cmd, timeout=300)


if __name__ == "__main__":
    raise SystemExit(main())
