#!/usr/bin/env python3
"""Rebuild F&R frontend image so RWF pricing and latest UI ship."""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import ssh_deploy as d
import paramiko

BACKEND = Path(__file__).resolve().parents[2]
ROOT = BACKEND.parent


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
        timeout=30,
    )

    # Upload apiConfig price formatting fix into frontend tree on host,
    # then rebuild frontend container from that context.
    d.upload(
        client,
        ROOT / "E-learning-parrot-frontend" / "src" / "lib" / "apiConfig.ts",
        "/opt/e-learning-frwanda/E-learning-parrot-frontend/src/lib/apiConfig.ts",
    )

    cmd = r"""
set -euo pipefail
cd /opt/e-learning-frwanda/E-learning-parrot-backend/deploy
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build --force-recreate --no-deps frontend
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --force-recreate --no-deps nginx
curl -sS -o /dev/null -w 'front:%{http_code}\n' https://frwanda.com/
curl -sS -o /dev/null -w 'courses:%{http_code}\n' https://api.frwanda.com/api/admin/courses
docker ps --filter name=parrot_nginx --format 'xander_ok {{.Names}}'
"""
    return d.run(client, cmd, timeout=900)


if __name__ == "__main__":
    raise SystemExit(main())
