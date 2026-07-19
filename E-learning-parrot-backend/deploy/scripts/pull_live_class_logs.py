#!/usr/bin/env python3
"""Pull recent Laravel/docker logs related to live-class / zoom embed errors."""
from __future__ import annotations

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

    cmd = r"""
set -e
echo '=== docker logs parrot_backend (last 200) ==='
docker logs parrot_backend --tail 200 2>&1 | tail -n 200
echo
echo '=== laravel log tail ==='
docker exec parrot_backend sh -c 'ls -lt storage/logs 2>/dev/null | head -5; echo; tail -n 150 storage/logs/laravel.log 2>/dev/null || tail -n 150 storage/logs/*.log 2>/dev/null | tail -n 150'
"""
    _, stdout, _ = client.exec_command(cmd, get_pty=True, timeout=60)
    channel = stdout.channel
    while True:
        while channel.recv_ready():
            sys.stdout.buffer.write(channel.recv(4096))
            sys.stdout.buffer.flush()
        if channel.exit_status_ready() and not channel.recv_ready():
            break
        time.sleep(0.05)
    code = channel.recv_exit_status()
    client.close()
    return code


if __name__ == "__main__":
    raise SystemExit(main())
