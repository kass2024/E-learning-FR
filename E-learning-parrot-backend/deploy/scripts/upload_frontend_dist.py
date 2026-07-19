#!/usr/bin/env python3
"""Swap existing local frontend/dist into parrot_frontend on VPS."""
from __future__ import annotations

import sys
import tarfile
import time
from io import BytesIO
from pathlib import Path

import paramiko

DEPLOY = Path(__file__).resolve().parent.parent
FRONTEND = DEPLOY.parent.parent / "E-learning-parrot-frontend"


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
    dist = FRONTEND / "dist"
    if not dist.is_dir():
        print("dist missing — run npm run build first", file=sys.stderr)
        return 1

    buf = BytesIO()
    with tarfile.open(fileobj=buf, mode="w:gz") as tar:
        tar.add(dist, arcname="dist")
    payload = buf.getvalue()
    print(f"tarball {len(payload)} bytes")

    user, host = cfg["VPS_HOST"].split("@", 1)
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(host, username=user, password=cfg["VPS_PASSWORD"], timeout=30)
    client.get_transport().set_keepalive(15)

    remote_tar = "/tmp/frontend-dist-clickable.tar.gz"
    sftp = client.open_sftp()
    with sftp.file(remote_tar, "wb") as rf:
        rf.write(payload)
    sftp.close()
    print("uploaded")

    cmd = f"""
set -e
rm -rf /tmp/frontend-dist-clickable
mkdir -p /tmp/frontend-dist-clickable
tar -xzf {remote_tar} -C /tmp/frontend-dist-clickable
docker cp /tmp/frontend-dist-clickable/dist/. parrot_frontend:/usr/share/nginx/html/
docker exec parrot_frontend nginx -s reload || docker restart parrot_frontend
(grep -R "loading--interactive" /tmp/frontend-dist-clickable/dist/assets/*.css 2>/dev/null || true) | head -3
echo SWAP_DONE
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
