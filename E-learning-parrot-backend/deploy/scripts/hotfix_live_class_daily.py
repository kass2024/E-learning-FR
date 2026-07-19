#!/usr/bin/env python3
"""Hotfix: allow Daily live classes (type=daily) to start / join."""
from __future__ import annotations

import sys
import time
from pathlib import Path

import paramiko

DEPLOY = Path(__file__).resolve().parent.parent
BACKEND = DEPLOY.parent

FILES = [
    "app/Support/CourseMaterialHelper.php",
    "app/Support/PlatformTenantScope.php",
    "app/Support/ZoomMeetingBrandingResolver.php",
    "app/Services/Meetings/LiveMeetingJoinService.php",
    "app/Http/Controllers/Api/ZoomEmbedController.php",
    "app/Http/Controllers/Api/InstructorDashboardController.php",
    "app/Http/Controllers/Api/LearnerDashboardController.php",
    "app/Http/Controllers/Api/CourseMaterialController.php",
]


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
    password = cfg["VPS_PASSWORD"]

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(hostname, username=user, password=password, timeout=30)

    remote_root = "/opt/e-learning-xander/E-learning-parrot-backend"
    sftp = client.open_sftp()
    try:
        for rel in FILES:
            local = BACKEND / rel
            remote = f"{remote_root}/{rel}"
            print(f"upload {rel}")
            sftp.put(str(local), remote)
    finally:
        sftp.close()

    remote_cmd = f"""
set -e
ROOT={remote_root}
for f in {' '.join(FILES)}; do
  docker cp "$ROOT/$f" parrot_backend:/var/www/html/$f
  docker cp "$ROOT/$f" parrot_scheduler:/var/www/html/$f || true
done
docker exec parrot_backend php artisan optimize:clear
grep -n isLiveClassSession "$ROOT/app/Support/CourseMaterialHelper.php" | head -3
echo HOTFIX_DONE
"""
    _, stdout, _ = client.exec_command(remote_cmd, get_pty=True, timeout=120)
    channel = stdout.channel
    while True:
        while channel.recv_ready():
            sys.stdout.buffer.write(channel.recv(4096))
            sys.stdout.buffer.flush()
        if channel.exit_status_ready() and not channel.recv_ready():
            break
        time.sleep(0.05)
    code = channel.recv_exit_status()
    print("EXIT", code)
    client.close()
    return code


if __name__ == "__main__":
    raise SystemExit(main())
