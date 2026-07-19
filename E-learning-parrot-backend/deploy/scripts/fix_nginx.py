#!/usr/bin/env python3
import sys, time
from pathlib import Path
import paramiko

DEPLOY = Path(__file__).resolve().parent.parent
cfg = {}
for raw in (DEPLOY / "vps.env").read_text().splitlines():
    if raw.strip() and not raw.startswith("#") and "=" in raw:
        k,v = raw.split("=",1); cfg[k.strip()]=v.strip()

c = paramiko.SSHClient(); c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(cfg["VPS_HOST"].split("@")[1], username=cfg["VPS_HOST"].split("@")[0], password=cfg["VPS_PASSWORD"], timeout=30)

sftp = c.open_sftp()
sftp.put(str(DEPLOY / "nginx" / "edge.conf"), "/opt/e-learning-xander/E-learning-parrot-backend/deploy/nginx/edge.conf")
sftp.close()

cmd = r"""
set -e
cd /opt/e-learning-xander/E-learning-parrot-backend/deploy
docker compose -f docker-compose.prod.yml --env-file .env.production up -d nginx
sleep 2
docker ps --filter name=parrot_ --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
echo '--- curl ---'
curl -sS -o /dev/null -w 'frontend:%{http_code}\n' -H 'Host: xanderglobalacademy.com' http://127.0.0.1:8090/
curl -sS -w '\napi_up_body_and:%{http_code}\n' -H 'Host: api.xanderglobalacademy.com' http://127.0.0.1:8090/up
echo '--- apache reload ---'
a2ensite xander-academy-elearning.conf >/dev/null 2>&1 || true
apache2ctl configtest && systemctl reload apache2
echo '--- apache host test ---'
curl -sS -o /dev/null -w 'apache_front:%{http_code}\n' -H 'Host: xanderglobalacademy.com' http://127.0.0.1/
curl -sS -o /dev/null -w 'apache_api:%{http_code}\n' -H 'Host: api.xanderglobalacademy.com' http://127.0.0.1/up
docker logs parrot_nginx --tail 15 2>&1
docker logs parrot_backend --tail 30 2>&1
"""
_, out, _ = c.exec_command(cmd, get_pty=True, timeout=120)
ch = out.channel
while True:
    while ch.recv_ready():
        sys.stdout.buffer.write(ch.recv(4096)); sys.stdout.buffer.flush()
    if ch.exit_status_ready() and not ch.recv_ready(): break
    time.sleep(0.1)
print("\nEXIT", ch.recv_exit_status())
c.close()
