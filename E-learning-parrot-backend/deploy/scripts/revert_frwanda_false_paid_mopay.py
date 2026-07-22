"""Revert Pay Now / MoMo rows wrongly marked paid before PIN approval."""
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
use App\Services\Mopay\MopayGatewayClient;

$gateway = app(MopayGatewayClient::class);
$refs = ["FRWEXT_1_1784715094_7564"];

$recent = ExternalCoursePayment::query()
  ->where("status", "paid")
  ->where("paid_at", ">=", now()->subHours(6))
  ->orderByDesc("id")
  ->limit(20)
  ->get();

$ids = [];
foreach ($recent as $p) {
  $ids[] = $p->id;
}
foreach ($refs as $ref) {
  $p = ExternalCoursePayment::where("external_reference", $ref)->first();
  if ($p) $ids[] = $p->id;
}
$ids = array_values(array_unique($ids));

echo "candidates=" . count($ids) . "\n";
foreach ($ids as $id) {
  $p = ExternalCoursePayment::find($id);
  if (!$p) continue;
  $meta = is_array($p->metadata) ? $p->metadata : [];
  $webhook = $meta["webhook"] ?? null;
  $source = is_array($webhook) ? (string) ($webhook["source"] ?? "") : "";
  $stillSettled = false;
  try {
    $st = $gateway->transactionStatus((string) $p->external_reference);
    $stillSettled = !empty($st["success"]);
  } catch (Throwable $e) {
    echo "status_err {$p->external_reference} " . $e->getMessage() . "\n";
  }
  echo "check {$p->external_reference} source={$source} gateway_settled=" . ($stillSettled ? "yes" : "no") . "\n";
  if ($stillSettled) {
    echo "keep {$p->external_reference}\n";
    continue;
  }
  // False positive from premature status poll (or unpaid PIN prompt).
  $p->status = "processing";
  $p->paid_at = null;
  $p->receipt_emailed = false;
  $meta["reverted_premature_paid"] = [
    "at" => now()->toIso8601String(),
    "reason" => "Marked paid before MoMo PIN settlement",
    "previous_webhook" => $webhook,
  ];
  $p->metadata = $meta;
  $p->save();
  echo "reverted {$p->external_reference}\n";
}
'''


def main() -> int:
    cfg = d.load_env(d.DEPLOY / "vps.env")
    user, host, port = d.parse_host(cfg["VPS_HOST"])
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(hostname=host, port=port, username=user, password=cfg["VPS_PASSWORD"], timeout=30)

    sftp = client.open_sftp()
    remote = "/tmp/frwanda_revert_false_paid.php"
    with sftp.file(remote, "w") as f:
        f.write(PHP)
    sftp.close()

    cmd = r"""
set -euo pipefail
BE=$(docker ps --format '{{.Names}}' | grep -i frwanda | grep -iE 'back|api' | head -1)
echo BE=$BE
docker cp /tmp/frwanda_revert_false_paid.php "$BE:/tmp/frwanda_revert_false_paid.php"
docker exec "$BE" php /tmp/frwanda_revert_false_paid.php
"""
    return d.run(client, cmd, timeout=180)


if __name__ == "__main__":
    raise SystemExit(main())
