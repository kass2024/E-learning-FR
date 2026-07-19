#!/usr/bin/env python3
"""Hotfix API root on VPS without full rebuild: patch web.php then restart php in container OR quick volume override.

Actually rebuild would take long — copy routes/web.php into running container and clear route cache.
"""
import sys, time
from pathlib import Path
import paramiko

DEPLOY = Path(__file__).resolve().parent.parent
BACKEND = DEPLOY.parent
WEB = BACKEND / "routes" / "web.php"

cfg = {}
for raw in (DEPLOY / "vps.env").read_text().splitlines():
    if raw.strip() and not raw.startswith("#") and "=" in raw:
        k, v = raw.split("=", 1)
        cfg[k.strip()] = v.strip()

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(cfg["VPS_HOST"].split("@")[1], username=cfg["VPS_HOST"].split("@")[0], password=cfg["VPS_PASSWORD"], timeout=30)

remote_web = "/opt/e-learning-xander/E-learning-parrot-backend/routes/web.php"
sftp = c.open_sftp()
sftp.put(str(WEB), remote_web)
sftp.close()

cmd = r"""
set -e
# Patch file inside container from host path (image has its own copy) — docker cp
docker cp /opt/e-learning-xander/E-learning-parrot-backend/routes/web.php parrot_backend:/var/www/html/routes/web.php
docker cp /opt/e-learning-xander/E-learning-parrot-backend/routes/web.php parrot_scheduler:/var/www/html/routes/web.php
docker exec parrot_backend php artisan route:clear || true
docker exec parrot_backend php artisan view:clear || true
curl -sk https://api.xanderglobalacademy.com/ | head -c 400; echo
curl -sk -o /dev/null -w 'www:%{http_code}\n' https://www.xanderglobalacademy.com/login
curl -sk -o /dev/null -w 'api_auth:%{http_code}\n' -X POST https://api.xanderglobalacademy.com/api/admin/auth/login -H 'Content-Type: application/json' -d '{}'
echo
echo 'OPEN THESE URLS:'
echo '  Front: https://www.xanderglobalacademy.com/login'
echo '  API:   https://api.xanderglobalacademy.com/up'
"""
_, out, _ = c.exec_command(cmd, get_pty=True, timeout=60)
ch = out.channel
while True:
    while ch.recv_ready():
        sys.stdout.buffer.write(ch.recv(4096)); sys.stdout.buffer.flush()
    if ch.exit_status_ready() and not ch.recv_ready():
        break
    time.sleep(0.05)
print("\nEXIT", ch.recv_exit_status())
c.close()
