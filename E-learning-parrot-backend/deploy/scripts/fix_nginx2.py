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

# Upload with LF
content = (DEPLOY / "nginx" / "edge.conf").read_text(encoding="utf-8").replace("\r\n", "\n").replace("\r", "\n")
sftp = c.open_sftp()
with sftp.file("/opt/e-learning-xander/E-learning-parrot-backend/deploy/nginx/edge.conf", "w") as f:
    f.write(content)
sftp.close()

cmd = r"""
set -e
cd /opt/e-learning-xander/E-learning-parrot-backend/deploy
echo '--- remote edge.conf head ---'
head -5 nginx/edge.conf
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --force-recreate nginx
sleep 3
docker ps --filter name=parrot_nginx --format '{{.Names}} {{.Status}}'
docker logs parrot_nginx --tail 20 2>&1
curl -sS -o /dev/null -w 'frontend:%{http_code}\n' -H 'Host: xanderglobalacademy.com' http://127.0.0.1:8090/ || true
curl -sS -w '\n%{http_code}\n' -H 'Host: api.xanderglobalacademy.com' http://127.0.0.1:8090/up || true
# also test backend container directly
curl -sS -o /dev/null -w 'backend_direct:%{http_code}\n' http://$(docker inspect -f '{{range.NetworkSettings.Networks}}{{.IPAddress}}{{end}}' parrot_backend)/up || true
curl -sS -o /dev/null -w 'frontend_direct:%{http_code}\n' http://$(docker inspect -f '{{range.NetworkSettings.Networks}}{{.IPAddress}}{{end}}' parrot_frontend)/ || true
systemctl reload apache2
curl -sS -o /dev/null -w 'apache_front:%{http_code}\n' -H 'Host: xanderglobalacademy.com' http://127.0.0.1/ || true
curl -sS -o /dev/null -w 'apache_api:%{http_code}\n' -H 'Host: api.xanderglobalacademy.com' http://127.0.0.1/up || true
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
