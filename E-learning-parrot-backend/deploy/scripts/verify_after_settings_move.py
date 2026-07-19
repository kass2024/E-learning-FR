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
docker compose -f docker-compose.prod.yml --env-file .env.production exec -T backend php artisan migrate --force
curl -sS -o /dev/null -w 'local:%{http_code}\n' -H 'Host: xanderglobalacademy.com' http://127.0.0.1:8090/
curl -sS -o /dev/null -w 'https:%{http_code}\n' https://xanderglobalacademy.com/
"""
raise SystemExit(d.run(client, cmd, timeout=120))
