#!/usr/bin/env python3
"""Push frontend perf fix: lazy Zoom routes + rebuild frontend + HTTP/2 on Apache."""
import sys, time
from pathlib import Path
import paramiko

DEPLOY = Path(__file__).resolve().parent.parent
FRONTEND = DEPLOY.parent.parent / "E-learning-parrot-frontend"
cfg = {}
for raw in (DEPLOY / "vps.env").read_text().splitlines():
    if raw.strip() and not raw.startswith("#") and "=" in raw:
        k, v = raw.split("=", 1)
        cfg[k.strip()] = v.strip()

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(cfg["VPS_HOST"].split("@")[1], username=cfg["VPS_HOST"].split("@")[0], password=cfg["VPS_PASSWORD"], timeout=30)

# Upload critical files that may not be on git yet
sftp = c.open_sftp()
for local, remote in [
    (FRONTEND / "src" / "App.tsx", "/opt/e-learning-xander/E-learning-parrot-frontend/src/App.tsx"),
    (FRONTEND / "docker" / "nginx.conf", "/opt/e-learning-xander/E-learning-parrot-frontend/docker/nginx.conf"),
    (DEPLOY / "nginx" / "edge.conf", "/opt/e-learning-xander/E-learning-parrot-backend/deploy/nginx/edge.conf"),
]:
    print("upload", local.name)
    sftp.put(str(local), remote)
sftp.close()

cmd = r'''
set -e
a2enmod http2 >/dev/null 2>&1 || true
# Enable HTTP/2 for SSL vhosts
if ! grep -q 'Protocols h2' /etc/apache2/sites-available/xander-academy-elearning-le-ssl.conf 2>/dev/null; then
  sed -i '/<VirtualHost \*:443>/a\    Protocols h2 http/1.1' /etc/apache2/sites-available/xander-academy-elearning-le-ssl.conf
fi
apache2ctl configtest && systemctl reload apache2

cd /opt/e-learning-xander/E-learning-parrot-backend/deploy
# bump build id so browsers fetch new assets
if grep -q '^VITE_APP_BUILD_ID=' .env.production; then
  sed -i "s/^VITE_APP_BUILD_ID=.*/VITE_APP_BUILD_ID=$(date +%Y-%m-%d-%H%M)-fast/" .env.production
else
  echo "VITE_APP_BUILD_ID=$(date +%Y-%m-%d-%H%M)-fast" >> .env.production
fi

echo "==> Rebuild frontend (lazy Zoom)..."
docker compose -f docker-compose.prod.yml --env-file .env.production build --no-cache frontend
docker compose -f docker-compose.prod.yml --env-file .env.production up -d frontend nginx

sleep 2
echo "==> Asset inventory after rebuild"
docker exec parrot_frontend sh -c 'ls -lhS /usr/share/nginx/html/assets | head -12'
echo "==> HTML script refs (should NOT include zoom-meetingsdk on first paint)"
curl -sk https://www.xanderglobalacademy.com/ | grep -oE '/assets/[^"]+\.js' | head -10
echo "==> timings"
curl -sk -o /dev/null -w 'home total:%{time_total} size:%{size_download}\n' https://www.xanderglobalacademy.com/
curl -sk -o /dev/null -w 'login total:%{time_total}\n' https://www.xanderglobalacademy.com/login
'''

_, out, _ = c.exec_command(cmd, get_pty=True, timeout=900)
ch = out.channel
while True:
    while ch.recv_ready():
        sys.stdout.buffer.write(ch.recv(8192)); sys.stdout.buffer.flush()
    if ch.exit_status_ready() and not ch.recv_ready():
        break
    time.sleep(0.1)
print("\nEXIT", ch.recv_exit_status())
c.close()
