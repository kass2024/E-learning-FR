#!/usr/bin/env python3
"""Upload clickable-error UI fix and rebuild frontend on VPS."""
from __future__ import annotations

import sys
import time
from pathlib import Path

import paramiko

DEPLOY = Path(__file__).resolve().parent.parent
FRONTEND = DEPLOY.parent.parent / "E-learning-parrot-frontend"
VPS = "/opt/e-learning-xander"


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
    user, host = cfg["VPS_HOST"].split("@", 1)

    transport = paramiko.Transport((host, 22))
    transport.connect(username=user, password=cfg["VPS_PASSWORD"])
    transport.set_keepalive(30)

    sftp = paramiko.SFTPClient.from_transport(transport)
    assert sftp is not None
    files = [
        "src/components/live/zoomClientMeeting.css",
        "src/pages/ZoomEmbedMeetingRoom.tsx",
        "src/pages/LiveCohortMeetingRoom.tsx",
    ]
    for rel in files:
        local = FRONTEND / rel
        remote = f"{VPS}/E-learning-parrot-frontend/{rel}"
        print("upload", rel)
        sftp.put(str(local), remote)
    sftp.close()

    # Start detached rebuild
    session = transport.open_session()
    session.get_pty()
    session.exec_command(
        "nohup bash /opt/e-learning-xander/E-learning-parrot-backend/deploy/scripts/remote_rebuild_frontend.sh "
        "> /tmp/frontend-rebuild.log 2>&1 & echo SPAWNED"
    )
    # First write the remote shell script via a short session
    session.close()

    remote_sh = """#!/bin/bash
cd /opt/e-learning-xander/E-learning-parrot-backend/deploy || exit 1
BUILD_ID=$(date +%Y-%m-%d-%H%M)-clickable-err
if grep -q '^VITE_APP_BUILD_ID=' .env.production; then
  sed -i "s|^VITE_APP_BUILD_ID=.*|VITE_APP_BUILD_ID=${BUILD_ID}|" .env.production
else
  echo "VITE_APP_BUILD_ID=${BUILD_ID}" >> .env.production
fi
docker compose -f docker-compose.prod.yml --env-file .env.production build frontend
docker compose -f docker-compose.prod.yml --env-file .env.production up -d frontend nginx
echo FRONTEND_REBUILD_DONE
"""
    sftp = paramiko.SFTPClient.from_transport(transport)
    assert sftp is not None
    with sftp.file("/opt/e-learning-xander/E-learning-parrot-backend/deploy/scripts/remote_rebuild_frontend.sh", "w") as f:
        f.write(remote_sh)
    sftp.chmod("/opt/e-learning-xander/E-learning-parrot-backend/deploy/scripts/remote_rebuild_frontend.sh", 0o755)
    sftp.close()

    session = transport.open_session()
    session.exec_command(
        "chmod +x /opt/e-learning-xander/E-learning-parrot-backend/deploy/scripts/remote_rebuild_frontend.sh; "
        "nohup /opt/e-learning-xander/E-learning-parrot-backend/deploy/scripts/remote_rebuild_frontend.sh "
        "> /tmp/frontend-rebuild.log 2>&1 & echo SPAWNED; sleep 1; tail -n 5 /tmp/frontend-rebuild.log"
    )
    time.sleep(2)
    out = b""
    while session.recv_ready():
        out += session.recv(4096)
    print(out.decode("utf-8", errors="replace"))

    print("==> polling rebuild (up to 20 min)")
    for i in range(120):
        time.sleep(10)
        sess = transport.open_session()
        sess.exec_command("tail -n 8 /tmp/frontend-rebuild.log; echo '---'; grep -c FRONTEND_REBUILD_DONE /tmp/frontend-rebuild.log || true")
        buf = b""
        while True:
            if sess.recv_ready():
                buf += sess.recv(8192)
            elif sess.exit_status_ready():
                while sess.recv_ready():
                    buf += sess.recv(8192)
                break
            else:
                time.sleep(0.05)
        text = buf.decode("utf-8", errors="replace")
        print(f"poll {i+1}:\n{text}")
        if "FRONTEND_REBUILD_DONE" in text:
            check = transport.open_session()
            check.exec_command(
                "docker exec parrot_frontend sh -c \"grep -R loading--interactive /usr/share/nginx/html/assets 2>/dev/null | head -2 || echo NOT_IN_ASSETS_YET\""
            )
            cbuf = b""
            while True:
                if check.recv_ready():
                    cbuf += check.recv(4096)
                elif check.exit_status_ready():
                    break
                else:
                    time.sleep(0.05)
            print(cbuf.decode("utf-8", errors="replace"))
            transport.close()
            print("OK")
            return 0

    transport.close()
    print("TIMEOUT", file=sys.stderr)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
