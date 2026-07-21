#!/usr/bin/env python3
"""Wipe duplicate study shifts and install the official F&R flyer schedule on production."""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import ssh_deploy as d
import paramiko

BACKEND = Path(__file__).resolve().parents[2]
REMOTE_BE = "/opt/e-learning-frwanda/E-learning-parrot-backend"


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

    for rel in (
        "app/Services/StudyShiftProvisioningService.php",
        "app/Console/Commands/EnsureSharedStudyShifts.php",
        "app/Console/Commands/ReplaceFrwandaFlyerStudyShifts.php",
    ):
        print(f"upload {rel}")
        d.upload(client, BACKEND / rel, f"{REMOTE_BE}/{rel}")

    cmd = r"""
set -euo pipefail
BE=$(docker ps --format '{{.Names}}' | grep -i frwanda | grep -i back | head -1)
echo "BE=$BE"
docker exec "$BE" mkdir -p /var/www/html/app/Console/Commands
docker cp /opt/e-learning-frwanda/E-learning-parrot-backend/app/Services/StudyShiftProvisioningService.php \
  "$BE:/var/www/html/app/Services/StudyShiftProvisioningService.php"
docker cp /opt/e-learning-frwanda/E-learning-parrot-backend/app/Console/Commands/EnsureSharedStudyShifts.php \
  "$BE:/var/www/html/app/Console/Commands/EnsureSharedStudyShifts.php"
docker cp /opt/e-learning-frwanda/E-learning-parrot-backend/app/Console/Commands/ReplaceFrwandaFlyerStudyShifts.php \
  "$BE:/var/www/html/app/Console/Commands/ReplaceFrwandaFlyerStudyShifts.php"
docker exec "$BE" php -l /var/www/html/app/Services/StudyShiftProvisioningService.php
docker exec "$BE" php -r 'if (function_exists("opcache_reset")) { opcache_reset(); echo "opcache_reset ok\n"; }'
docker exec "$BE" php artisan cache:clear || true
echo "=== before ==="
docker exec "$BE" php -r '
require "vendor/autoload.php";
$app = require "bootstrap/app.php";
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
echo "shifts=".App\Models\StudyShift::query()->count()."\n";
'
docker exec "$BE" php artisan study-shifts:replace-frwanda-flyer
echo "=== after ==="
docker exec "$BE" php -r '
require "vendor/autoload.php";
$app = require "bootstrap/app.php";
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
echo "shifts=".App\Models\StudyShift::query()->count()."\n";
foreach (App\Models\Course::query()->whereNull("platform_institution_id")->orderBy("id")->get() as $c) {
  $n = app(App\Services\StudyShiftProvisioningService::class)
    ->shiftsForCourseRegistration($c, null)->count();
  echo "course #{$c->id} {$c->title}: {$n} shifts\n";
}
'
echo DONE
"""
    return d.run(client, cmd, timeout=300)


if __name__ == "__main__":
    raise SystemExit(main())
