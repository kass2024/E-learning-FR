#!/usr/bin/env python3
import sys, time
from pathlib import Path
import paramiko

DEPLOY = Path(__file__).resolve().parent.parent

def load_env(path):
    out = {}
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        out[k.strip()] = v.strip()
    return out

cfg = load_env(DEPLOY / "vps.env")
host = cfg["VPS_HOST"].split("@", 1)[-1]
user = cfg["VPS_HOST"].split("@", 1)[0]
password = cfg["VPS_PASSWORD"]

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(hostname=host, port=22, username=user, password=password, timeout=30)

cmd = r"""
set -e
echo '=== /var/www (must be unchanged) ==='
ls /var/www
echo '=== docker ps ==='
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
echo '=== compose ps ==='
cd /opt/e-learning-xander/E-learning-parrot-backend/deploy
docker compose -f docker-compose.prod.yml --env-file .env.production ps
echo '=== curl frontend ==='
curl -sS -o /dev/null -w '%{http_code}\n' -H 'Host: xanderglobalacademy.com' http://127.0.0.1:8090/ || true
echo '=== curl api /up ==='
curl -sS -w '\n%{http_code}\n' -H 'Host: api.xanderglobalacademy.com' http://127.0.0.1:8090/up || true
echo '=== apache sites ==='
ls /etc/apache2/sites-enabled/ 2>/dev/null || true
echo '=== backend logs ==='
docker logs parrot_backend --tail 40 2>&1 || true
echo '=== nginx edge logs ==='
docker logs parrot_nginx --tail 20 2>&1 || true
"""

stdin, stdout, stderr = client.exec_command(cmd, get_pty=True, timeout=120)
channel = stdout.channel
while True:
    while channel.recv_ready():
        sys.stdout.buffer.write(channel.recv(4096))
        sys.stdout.buffer.flush()
    if channel.exit_status_ready() and not channel.recv_ready():
        break
    time.sleep(0.1)
print("\nEXIT", channel.recv_exit_status())
client.close()
