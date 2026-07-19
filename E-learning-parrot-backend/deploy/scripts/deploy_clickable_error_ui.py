#!/usr/bin/env python3
"""Upload clickable error-panel fix + rebuild frontend on VPS."""
from __future__ import annotations

import sys
import time
from pathlib import Path

import paramiko

DEPLOY = Path(__file__).resolve().parent.parent
FRONTEND = DEPLOY.parent.parent / "E-learning-parrot-frontend"
VPS_PATH = "/opt/e-learning-xander"


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
    vps_host = cfg.get("VPS_HOST", "")
    user, host = vps_host.split("@", 1) if "@" in vps_host else ("root", vps_host)
    password = cfg.get("VPS_PASSWORD", "")
    if not host or not password:
        print("VPS_HOST and VPS_PASSWORD required in deploy/vps.env", file=sys.stderr)
        return 1

    uploads = [
        (
            FRONTEND / "src/components/live/zoomClientMeeting.css",
            f"{VPS_PATH}/E-learning-parrot-frontend/src/components/live/zoomClientMeeting.css",
        ),
        (
            FRONTEND / "src/pages/ZoomEmbedMeetingRoom.tsx",
            f"{VPS_PATH}/E-learning-parrot-frontend/src/pages/ZoomEmbedMeetingRoom.tsx",
        ),
        (
            FRONTEND / "src/pages/LiveCohortMeetingRoom.tsx",
            f"{VPS_PATH}/E-learning-parrot-frontend/src/pages/LiveCohortMeetingRoom.tsx",
        ),
    ]
    for local, _ in uploads:
        if not local.is_file():
            print(f"Missing local file: {local}", file=sys.stderr)
            return 1

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    print(f"==> SSH {user}@{host}")
    client.connect(host, username=user, password=password, timeout=30)

    sftp = client.open_sftp()
    for local, remote in uploads:
        print(f"upload {local.name} -> {remote}")
        sftp.put(str(local), remote)
    sftp.close()

    cmd = r"""
set -e
cd /opt/e-learning-xander/E-learning-parrot-backend/deploy
sed -i "s/^VITE_APP_BUILD_ID=.*/VITE_APP_BUILD_ID=$(date +%Y-%m-%d-%H%M)-clickable-err/" .env.production || \
  echo "VITE_APP_BUILD_ID=$(date +%Y-%m-%d-%H%M)-clickable-err" >> .env.production
docker compose -f docker-compose.prod.yml --env-file .env.production build frontend
docker compose -f docker-compose.prod.yml --env-file .env.production up -d frontend nginx
echo FRONTEND_REBUILD_DONE
"""
    _, stdout, _ = client.exec_command(cmd, get_pty=True, timeout=1800)
    ch = stdout.channel
    while True:
        while ch.recv_ready():
            sys.stdout.buffer.write(ch.recv(8192))
            sys.stdout.buffer.flush()
        if ch.exit_status_ready() and not ch.recv_ready():
            break
        time.sleep(0.1)
    code = ch.recv_exit_status()
    print(f"\nEXIT {code}")
    client.close()
    return code


if __name__ == "__main__":
    raise SystemExit(main())
