import sys
from pathlib import Path
import json
import urllib.request
import urllib.error

sys.path.insert(0, str(Path(__file__).resolve().parent))
import ssh_deploy as d
import paramiko

cfg = d.load_env(d.DEPLOY / "vps.env")
user, host, port = d.parse_host(cfg["VPS_HOST"])
password = cfg["VPS_PASSWORD"]
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(hostname=host, port=port, username=user, password=password, timeout=30)

# Probe raise-hand from inside the VPS against the backend container
cmd = r"""
cd /opt/e-learning-xander/E-learning-parrot-backend/deploy
echo '=== ROUTE LIST ==='
docker compose -f docker-compose.prod.yml --env-file .env.production exec -T backend php artisan route:list --path=meetings/moderation 2>/dev/null | head -40
echo '=== CURL RAISE HAND ==='
curl -sS -o /tmp/raise.json -w 'HTTP:%{http_code}\n' -X POST 'http://127.0.0.1:8000/api/admin/meetings/moderation/raise-hand' \
  -H 'Content-Type: application/json' -H 'Accept: application/json' \
  -d '{"meeting_key":"admin-meet-main-test123","daily_session_id":"sess-e2e-1","participant_name":"ujeanmethode@gmail.com","meeting_mode":"meeting"}'
echo 'BODY:'; cat /tmp/raise.json; echo
echo '=== CURL HANDS NO AUTH ==='
curl -sS -o /tmp/hands.json -w 'HTTP:%{http_code}\n' 'http://127.0.0.1:8000/api/admin/meetings/moderation/hands?meeting_key=admin-meet-main-test123' -H 'Accept: application/json'
echo 'BODY:'; cat /tmp/hands.json; echo
echo '=== CURL RAISE VIA PUBLIC API HOST ==='
curl -sS -o /tmp/raise2.json -w 'HTTP:%{http_code}\n' -X POST 'https://api.xanderglobalacademy.com/api/admin/meetings/moderation/raise-hand' \
  -H 'Content-Type: application/json' -H 'Accept: application/json' -H 'Origin: https://xanderglobalacademy.com' \
  -d '{"meeting_key":"admin-meet-main-test123","daily_session_id":"sess-e2e-2","participant_name":"guest@test.com","meeting_mode":"webinar"}'
echo 'BODY:'; cat /tmp/raise2.json; echo
"""
raise SystemExit(d.run(client, cmd, timeout=120))
