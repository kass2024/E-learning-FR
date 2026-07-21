#!/usr/bin/env python3
"""Pull recent Laravel errors related to student registration."""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import ssh_deploy as d
import paramiko


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
    cmd = r"""
set -euo pipefail
BE_CT=$(docker ps --format '{{.Names}}' | grep -i frwanda | grep -i back | head -1)
echo "BE=$BE_CT"
docker exec "$BE_CT" sh -c 'ls -la storage/logs | tail -20'
echo '--- last errors ---'
docker exec "$BE_CT" sh -c 'grep -n "registerStudent\|Failed to create\|SQLSTATE\|Exception\|ukipi2023" storage/logs/laravel.log 2>/dev/null | tail -40 || true'
echo '--- tail ---'
docker exec "$BE_CT" sh -c 'tail -n 120 storage/logs/laravel.log'
"""
    return d.run(client, cmd, timeout=90)


if __name__ == "__main__":
    raise SystemExit(main())
