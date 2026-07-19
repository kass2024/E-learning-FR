#!/usr/bin/env python3
"""Deploy live-class assignment gate (admin host only if assigned)."""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import ssh_deploy as d
import paramiko

BACKEND = Path(__file__).resolve().parents[2]
FE = BACKEND.parent / "E-learning-parrot-frontend"
REMOTE_BE = "/opt/e-learning-frwanda/E-learning-parrot-backend"
REMOTE_FE = "/opt/e-learning-frwanda/E-learning-parrot-frontend"

BE_FILES = [
    "app/Http/Controllers/Api/InstructorDashboardController.php",
    "app/Http/Controllers/Api/CourseController.php",
    "app/Http/Controllers/Api/ZoomEmbedController.php",
]
FE_FILES = [
    "src/pages/dashboard/InstructorMaterials.tsx",
    "src/api/axios.ts",
]


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

    for rel in BE_FILES:
        d.upload(client, BACKEND / rel, f"{REMOTE_BE}/{rel}")
    for rel in FE_FILES:
        d.upload(client, FE / rel, f"{REMOTE_FE}/{rel}")

    cmd = r"""
set -euo pipefail
cd /opt/e-learning-frwanda/E-learning-parrot-backend/deploy
echo '==> Rebuild backend + frontend (Xander untouched)'
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build --force-recreate --no-deps backend frontend
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --force-recreate --no-deps nginx
docker compose -f docker-compose.prod.yml --env-file .env.production exec -T backend php artisan cache:clear || true
docker compose -f docker-compose.prod.yml --env-file .env.production exec -T backend sh -c 'grep -n "Assign it to yourself" /var/www/html/app/Http/Controllers/Api/CourseController.php | head -1'
docker compose -f docker-compose.prod.yml --env-file .env.production exec -T backend sh -c 'grep -n "assigned_to_me" /var/www/html/app/Http/Controllers/Api/InstructorDashboardController.php | head -2'
curl -sS -o /dev/null -w 'front:%{http_code} api:%{http_code}\n' https://frwanda.com/ https://api.frwanda.com/up || true
docker ps --filter name=parrot_nginx --format 'xander_ok {{.Names}}'
"""
    return d.run(client, cmd, timeout=1800)


if __name__ == "__main__":
    raise SystemExit(main())
