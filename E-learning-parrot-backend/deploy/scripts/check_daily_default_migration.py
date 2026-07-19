import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import ssh_deploy as d
import paramiko

cfg = d.load_env(d.DEPLOY / "vps.env")
user, host, port = d.parse_host(cfg["VPS_HOST"])
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(hostname=host, port=port, username=user, password=cfg["VPS_PASSWORD"], timeout=30)
cmd = r"""
cd /opt/e-learning-xander/E-learning-parrot-backend/deploy
docker compose -f docker-compose.prod.yml --env-file .env.production exec -T backend ls database/migrations/2026_07_17_100000_prefer_daily_meeting_provider_defaults.php
docker compose -f docker-compose.prod.yml --env-file .env.production exec -T backend php artisan migrate:status | grep 2026_07_17
"""
raise SystemExit(d.run(client, cmd, timeout=60))
