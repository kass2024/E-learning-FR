#!/usr/bin/env python3
"""Upload vite modulePreload fix + rebuild frontend on VPS."""
import sys
import time
from pathlib import Path

import paramiko

DEPLOY = Path(__file__).resolve().parent.parent
FRONTEND = DEPLOY.parent.parent / "E-learning-parrot-frontend"
VPS_PATH = "/opt/e-learning-xander"

cfg = {}
for raw in (DEPLOY / "vps.env").read_text(encoding="utf-8").splitlines():
    if raw.strip() and not raw.startswith("#") and "=" in raw:
        k, v = raw.split("=", 1)
        cfg[k.strip()] = v.strip()

vps_host = cfg.get("VPS_HOST", "")
user, host = vps_host.split("@", 1) if "@" in vps_host else ("root", vps_host)
password = cfg.get("VPS_PASSWORD", "")
if not host or not password:
    print("VPS_HOST and VPS_PASSWORD required in deploy/vps.env", file=sys.stderr)
    raise SystemExit(1)

uploads = [
    (FRONTEND / "vite.config.ts", f"{VPS_PATH}/E-learning-parrot-frontend/vite.config.ts"),
    (FRONTEND / "src" / "App.tsx", f"{VPS_PATH}/E-learning-parrot-frontend/src/App.tsx"),
    (FRONTEND / "docker" / "nginx.conf", f"{VPS_PATH}/E-learning-parrot-frontend/docker/nginx.conf"),
]

for local, _ in uploads:
    if not local.is_file():
        print(f"Missing local file: {local}", file=sys.stderr)
        raise SystemExit(1)

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
print(f"==> SSH {user}@{host}")
c.connect(host, username=user, password=password, timeout=30)

sftp = c.open_sftp()
for local, remote in uploads:
    print(f"upload {local.name} -> {remote}")
    sftp.put(str(local), remote)
sftp.close()

cmd = r'''
set -e
cd /opt/e-learning-xander/E-learning-parrot-backend/deploy
sed -i "s/^VITE_APP_BUILD_ID=.*/VITE_APP_BUILD_ID=$(date +%Y-%m-%d-%H%M)-npreload/" .env.production
docker compose -f docker-compose.prod.yml --env-file .env.production build --no-cache frontend
docker compose -f docker-compose.prod.yml --env-file .env.production up -d frontend nginx
sleep 3
curl -sk --resolve www.xanderglobalacademy.com:443:127.0.0.1 https://www.xanderglobalacademy.com/ | tee /tmp/home.html | head -c 500
echo
grep -E 'script|modulepreload|zoom' /tmp/home.html || true
'''

_, out, _ = c.exec_command(cmd, get_pty=True, timeout=1800)
ch = out.channel
while True:
    while ch.recv_ready():
        sys.stdout.buffer.write(ch.recv(8192))
        sys.stdout.buffer.flush()
    if ch.exit_status_ready() and not ch.recv_ready():
        break
    time.sleep(0.1)
exit_code = ch.recv_exit_status()
print(f"\nEXIT {exit_code}")

html = ""
try:
    _, stdout, _ = c.exec_command("cat /tmp/home.html", timeout=60)
    html = stdout.read().decode("utf-8", errors="replace")
except Exception as e:
    print(f"Could not read /tmp/home.html: {e}")

import re
zoom_preload = bool(
    re.search(r'rel=["\']modulepreload["\'][^>]*href=["\'][^"\']*zoom-meetingsdk', html, re.I)
    or re.search(r'href=["\'][^"\']*zoom-meetingsdk[^"\']*["\'][^>]*rel=["\']modulepreload', html, re.I)
)

title_ok = "Xander Learning Hub" in html
print("\n=== VERIFICATION ===")
print(f"modulepreload for zoom present: {zoom_preload}")
print(f"homepage title Xander Learning Hub: {title_ok}")

c.close()
raise SystemExit(0 if exit_code == 0 else exit_code)
