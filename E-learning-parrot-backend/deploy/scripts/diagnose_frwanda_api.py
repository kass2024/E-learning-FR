#!/usr/bin/env python3
"""Diagnose F&R frontend↔API wiring and rebuild frontend if needed."""
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
        timeout=30,
    )

    diag = r"""
set -e
echo '=== env vite ==='
grep -E '^(VITE_API_URL|FRONTEND_URL|APP_URL|PARROT_HTTP_PORT)=' /opt/e-learning-frwanda/E-learning-parrot-backend/deploy/.env.production

echo '=== api health ==='
curl -sS -w '\nup_http:%{http_code}\n' https://api.frwanda.com/up | head -5

echo '=== courses endpoint ==='
curl -sS -w '\ncourses_http:%{http_code}\n' https://api.frwanda.com/api/admin/courses | head -c 500
echo

echo '=== CORS headers from API ==='
curl -sS -D - -o /dev/null \
  -H 'Origin: https://frwanda.com' \
  https://api.frwanda.com/api/admin/courses | head -30

echo '=== frontend baked API URL strings ==='
docker exec frwanda_frontend sh -c "grep -oE 'https://[^\"'\'']+api[^\"'\'']*' /usr/share/nginx/html/assets/*.js 2>/dev/null | sort -u | head -20"
docker exec frwanda_frontend sh -c "grep -oE 'xanderglobal[^\"'\'']*|frwanda[^\"'\'']*|localhost:8000' /usr/share/nginx/html/assets/*.js 2>/dev/null | sort -u | head -30"

echo '=== local docker edge ==='
curl -sS -o /dev/null -w 'edge_front:%{http_code}\n' -H 'Host: frwanda.com' http://127.0.0.1:8093/
curl -sS -o /dev/null -w 'edge_api_up:%{http_code}\n' -H 'Host: api.frwanda.com' http://127.0.0.1:8093/up
curl -sS -w '\nedge_courses:%{http_code}\n' -H 'Host: api.frwanda.com' http://127.0.0.1:8093/api/admin/courses | head -c 300
echo
"""
    return d.run(client, diag, timeout=90)


if __name__ == "__main__":
    raise SystemExit(main())
