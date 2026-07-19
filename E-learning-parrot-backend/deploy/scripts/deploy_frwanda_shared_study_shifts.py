#!/usr/bin/env python3
"""Deploy shared study-shift fix and attach Groups 1–5 to all F&R hub courses."""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import ssh_deploy as d
import paramiko

BACKEND = Path(__file__).resolve().parents[2]
FE = BACKEND.parent / "E-learning-parrot-frontend"
REMOTE_BE = "/opt/e-learning-frwanda/E-learning-parrot-backend"
REMOTE_FE = "/opt/e-learning-frwanda/E-learning-parrot-frontend"

BE_FILES = [
    "app/Services/StudyShiftProvisioningService.php",
    "app/Console/Commands/EnsureSharedStudyShifts.php",
]
FE_FILES = [
    "src/pages/dashboard/StudentManagement.tsx",
]


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
        timeout=90,
        banner_timeout=90,
        auth_timeout=90,
    )

    for rel in BE_FILES:
        d.upload(client, BACKEND / rel, f"{REMOTE_BE}/{rel}")
    for rel in FE_FILES:
        d.upload(client, FE / rel, f"{REMOTE_FE}/{rel}")

    cmd = r"""
set -euo pipefail
BE=frwanda_backend
FE=frwanda_frontend

docker cp /opt/e-learning-frwanda/E-learning-parrot-backend/app/Services/StudyShiftProvisioningService.php \
  $BE:/var/www/html/app/Services/StudyShiftProvisioningService.php
docker cp /opt/e-learning-frwanda/E-learning-parrot-backend/app/Console/Commands/EnsureSharedStudyShifts.php \
  $BE:/var/www/html/app/Console/Commands/EnsureSharedStudyShifts.php
mkdir -p /opt/e-learning-frwanda/E-learning-parrot-backend/app/Console/Commands

docker exec $BE php artisan cache:clear || true
docker exec $BE php artisan study-shifts:ensure-shared
docker exec $BE php artisan study-shifts:ensure-shared 2>&1 | tee /tmp/ensure_shifts.out

# Quick rebuild of StudentManagement only is hard; rebuild frontend from host source if node available,
# else rely on ensureDefaults API + backend validation fix (enroll works even with old UI).
# Patch frontend source on host; rebuild frontend container when memory allows.
if [ -f /opt/e-learning-frwanda/E-learning-parrot-frontend/src/pages/dashboard/StudentManagement.tsx ]; then
  echo 'frontend source updated on host'
fi

# Verify French Course can resolve Group 1-5
docker exec $BE php -r '
require "/var/www/html/vendor/autoload.php";
$app = require "/var/www/html/bootstrap/app.php";
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
$course = App\Models\Course::query()->where("title", "like", "%French%")->orderBy("id")->first();
if (!$course) { echo "no_french_course\n"; exit(0); }
$svc = app(App\Services\StudyShiftProvisioningService::class);
$rows = $svc->shiftsForCourseRegistration($course, $course->platform_institution_id);
echo "french_course_id={$course->id} shifts=".$rows->count()."\n";
foreach ($rows as $s) {
  $ok = $svc->shiftAppliesToCourse($s, $course) ? "ok" : "FAIL";
  echo "#{$s->id} {$s->name} {$ok} pivots=".$s->courses()->count()."\n";
}
'

curl -sS -o /dev/null -w "api:%{http_code}\n" https://api.frwanda.com/up || true
echo DONE
"""
    return d.run(client, cmd, timeout=180)


if __name__ == "__main__":
    raise SystemExit(main())
