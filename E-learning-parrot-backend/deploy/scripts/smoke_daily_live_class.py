#!/usr/bin/env python3
"""Upload and run Daily live-class smoke test inside parrot_backend."""
from __future__ import annotations

import sys
import time
from pathlib import Path

import paramiko

DEPLOY = Path(__file__).resolve().parent.parent
SCRIPT = Path(__file__).with_suffix(".php")


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

    remote = "/tmp/smoke_daily_live_class.php"
    sftp = client.open_sftp()
    sftp.put(str(SCRIPT), remote)
    sftp.close()

    cmd = f"""
set -e
docker cp {remote} parrot_backend:/tmp/smoke_daily_live_class.php
docker exec parrot_backend php /tmp/smoke_daily_live_class.php
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
