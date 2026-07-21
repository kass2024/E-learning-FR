#!/usr/bin/env python3
"""Hotfix Student + AuthController registration name fix on VPS."""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import ssh_deploy as d
import paramiko

ROOT = Path(__file__).resolve().parents[3]
BE = ROOT / "E-learning-parrot-backend"


def main() -> int:
    cfg = d.load_env(d.DEPLOY / "vps.env")
    user, host, port = d.parse_host(cfg["VPS_HOST"])
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(
        hostname=host,
        port=port,
        username=user,
        password=cfg["VPS_PASSWORD"],
        timeout=120,
        banner_timeout=120,
        auth_timeout=120,
    )

    files = [
        "app/Models/Student.php",
        "app/Http/Controllers/Api/AuthController.php",
    ]
    for rel in files:
        local = BE / rel
        remote = f"/opt/e-learning-frwanda/E-learning-parrot-backend/{rel}"
        print(f"upload {rel}")
        d.upload(client, local, remote)

    cmd = r"""
set -euo pipefail
BE_CT=$(docker ps --format '{{.Names}}' | grep -i frwanda | grep -i back | head -1)
echo "BE=$BE_CT"
docker cp /opt/e-learning-frwanda/E-learning-parrot-backend/app/Models/Student.php "$BE_CT:/var/www/html/app/Models/Student.php"
docker cp /opt/e-learning-frwanda/E-learning-parrot-backend/app/Http/Controllers/Api/AuthController.php "$BE_CT:/var/www/html/app/Http/Controllers/Api/AuthController.php"
docker exec "$BE_CT" php -l /var/www/html/app/Models/Student.php
docker exec "$BE_CT" php -l /var/www/html/app/Http/Controllers/Api/AuthController.php
docker exec "$BE_CT" grep -n "booted\|student->name\|forceFill\|setAttribute\|attributes\['name'\]" /var/www/html/app/Models/Student.php /var/www/html/app/Http/Controllers/Api/AuthController.php | head -20
docker exec "$BE_CT" php -r 'if (function_exists("opcache_reset")) { opcache_reset(); echo "opcache_reset ok\n"; } else { echo "no opcache\n"; }'
docker exec "$BE_CT" php -r '
require "vendor/autoload.php";
$app = require "bootstrap/app.php";
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
try {
  $s = new App\Models\Student();
  $s->first_name = "Test";
  $s->last_name = "Regfix";
  $s->email = "regfix+".time()."@example.com";
  $s->status = "Pending";
  $s->phone = "";
  $s->country = "";
  $s->primary_goal = "";
  $s->password = "TempPass123!";
  $s->save();
  $name = $s->getAttributes()["name"] ?? "MISSING";
  echo "saved id=".$s->id." name=".$name."\n";
  $s->delete();
  echo "ok\n";
} catch (Throwable $ex) {
  echo "ERR: ".$ex->getMessage()."\n".$ex->getFile().":".$ex->getLine()."\n";
  exit(1);
}
'
"""
    return d.run(client, cmd, timeout=180)


if __name__ == "__main__":
    raise SystemExit(main())
