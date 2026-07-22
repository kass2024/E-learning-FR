"""Probe MoPay status payloads for F&R stuck payments."""
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

use App\Models\ExternalCoursePayment;
use App\Models\CoursePayment;
use App\Services\Mopay\MopayGatewayClient;

$gateway = app(MopayGatewayClient::class);

$refs = [
  "FRWEXT_8_1784718945_52767_139505",
  "FRWEXT_8_1784718278_84106_219241",
  "FRWEXT_8_1784718278_84106219241",
];

$ext = ExternalCoursePayment::query()->orderByDesc("id")->limit(8)->get(["id","external_reference","status","amount_rwf","paid_at","created_at"]);
echo "=== external payments ===\n";
foreach ($ext as $p) {
  echo "#{$p->id} {$p->external_reference} status={$p->status} amount={$p->amount_rwf} created={$p->created_at}\n";
  $refs[] = (string)$p->external_reference;
}

$learn = CoursePayment::query()->where("provider","mopay")->orderByDesc("id")->limit(5)->get(["id","external_reference","status","amount_cents","created_at"]);
echo "=== learner payments ===\n";
foreach ($learn as $p) {
  echo "#{$p->id} {$p->external_reference} status={$p->status} amount=".($p->amount_cents/100)." created={$p->created_at}\n";
  $refs[] = (string)$p->external_reference;
}

$refs = array_values(array_unique(array_filter($refs)));
echo "=== gateway status probes ===\n";
foreach ($refs as $ref) {
  foreach ([$ref, $ref."_T"] as $try) {
    try {
      $st = $gateway->transactionStatus($try);
      echo "REF {$try}\n";
      echo "  http=" . ($st["http_status"] ?? "?") . " success=" . (!empty($st["success"])?"yes":"no") . " failed=" . (!empty($st["failed"])?"yes":"no") . "\n";
      echo "  body=" . json_encode($st["response"], JSON_UNESCAPED_UNICODE) . "\n";
      echo "  settled_strict=" . ($gateway->isSettledSuccess($st["response"] ?? null) ? "yes":"no") . " settled_webhook=" . ($gateway->isSettledSuccess($st["response"] ?? null, true) ? "yes":"no") . "\n";
    } catch (Throwable $e) {
      echo "REF {$try} ERR " . $e->getMessage() . "\n";
    }
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
    remote = "/tmp/frwanda_probe_mopay_status.php"
    with sftp.file(remote, "w") as f:
        f.write(PHP)
    sftp.close()

    cmd = r"""
set -euo pipefail
BE=$(docker ps --format '{{.Names}}' | grep -i frwanda | grep -iE 'back|api' | head -1)
echo BE=$BE
docker cp /tmp/frwanda_probe_mopay_status.php "$BE:/tmp/frwanda_probe_mopay_status.php"
docker exec "$BE" php /tmp/frwanda_probe_mopay_status.php
"""
    return d.run(client, cmd, timeout=180)


if __name__ == "__main__":
    raise SystemExit(main())
