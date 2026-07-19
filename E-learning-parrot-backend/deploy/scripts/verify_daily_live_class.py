#!/usr/bin/env python3
"""Verify Daily live-class host auth no longer 500s; check branding fix on VPS."""
from __future__ import annotations

import json
import sys
import time
from pathlib import Path

import paramiko

DEPLOY = Path(__file__).resolve().parent.parent


def load_env(path: Path) -> dict[str, str]:
    out: dict[str, str] = {}
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        out[k.strip()] = v.strip()
    return out


def main() -> int:
    cfg = load_env(DEPLOY / "vps.env")
    host = cfg["VPS_HOST"]
    user, hostname = host.split("@", 1)
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(hostname, username=user, password=cfg["VPS_PASSWORD"], timeout=30)

    # Upload LiveMeetingJoinService + branding (already fixed)
    sftp = client.open_sftp()
    backend = DEPLOY.parent
    files = [
        "app/Support/ZoomMeetingBrandingResolver.php",
        "app/Services/Meetings/LiveMeetingJoinService.php",
        "app/Http/Controllers/Api/ZoomEmbedController.php",
    ]
    remote_root = "/opt/e-learning-xander/E-learning-parrot-backend"
    for rel in files:
        print("upload", rel)
        sftp.put(str(backend / rel), f"{remote_root}/{rel}")
    sftp.close()

    cmd = r"""
set -e
ROOT=/opt/e-learning-xander/E-learning-parrot-backend
docker cp "$ROOT/app/Support/ZoomMeetingBrandingResolver.php" parrot_backend:/var/www/html/app/Support/ZoomMeetingBrandingResolver.php
docker cp "$ROOT/app/Services/Meetings/LiveMeetingJoinService.php" parrot_backend:/var/www/html/app/Services/Meetings/LiveMeetingJoinService.php
docker cp "$ROOT/app/Http/Controllers/Api/ZoomEmbedController.php" parrot_backend:/var/www/html/app/Http/Controllers/Api/ZoomEmbedController.php
docker exec parrot_backend php artisan optimize:clear >/dev/null
echo '--- branding order check ---'
docker exec parrot_backend grep -n 'useInstitutionBranding' /var/www/html/app/Support/ZoomMeetingBrandingResolver.php | head -6
echo '--- branding catch check ---'
docker exec parrot_backend grep -n 'Daily host branding failed' /var/www/html/app/Http/Controllers/Api/ZoomEmbedController.php | head -2
echo '--- Daily env ---'
docker exec parrot_backend php -r 'echo "enabled=".((config("daily.enabled")||config("services.daily.integration_enabled"))?"1":"0")." domain=".config("daily.domain", config("services.daily.domain"))." key=".(config("daily.api_key")||config("services.daily.api_key")?"set":"missing").PHP_EOL;'
echo '--- latest Daily material ---'
docker exec parrot_backend php artisan tinker --execute="
\$m = \\App\\Models\\CourseMaterial::query()->whereIn('type', ['daily','zoom'])->orderByDesc('id')->first();
if (!\$m) { echo 'NO_MATERIAL'.PHP_EOL; exit; }
echo json_encode([
  'id' => \$m->id,
  'type' => \$m->type,
  'course_id' => \$m->course_id,
  'provider' => \\App\\Support\\CourseMaterialHelper::meetingProvider(\$m)->value,
  'is_live' => \\App\\Support\\CourseMaterialHelper::isLiveClassSession(\$m),
  'is_daily' => \\App\\Support\\CourseMaterialHelper::isDailyMeeting(\$m),
  'meeting_id' => \\App\\Support\\CourseMaterialHelper::meetingId(\$m),
  'ext' => \\App\\Support\\CourseMaterialHelper::externalMeetingReference(\$m),
], JSON_UNESCAPED_SLASHES).PHP_EOL;
\$instructor = \\App\\Models\\User::query()->where('role','instructor')->orderByDesc('id')->first();
echo 'instructor='.(\$instructor?->email ?? 'none').PHP_EOL;
"
echo VERIFY_DONE
"""
    _, stdout, _ = client.exec_command(cmd, get_pty=True, timeout=180)
    ch = stdout.channel
    while True:
        while ch.recv_ready():
            sys.stdout.buffer.write(ch.recv(4096))
            sys.stdout.buffer.flush()
        if ch.exit_status_ready() and not ch.recv_ready():
            break
        time.sleep(0.05)
    code = ch.recv_exit_status()
    print("EXIT", code)
    client.close()
    return code


if __name__ == "__main__":
    raise SystemExit(main())
