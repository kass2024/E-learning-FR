#!/usr/bin/env python3
"""Quick remote debug / resume deploy."""
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
set -x
cd /opt/e-learning-xander/E-learning-parrot-backend/deploy
ls -la
ls -la scripts/
head -5 scripts/vps-deploy.sh | od -c | head -20
which docker; docker --version
docker compose version || docker-compose version || true
# fix CRLF
sed -i 's/\r$//' scripts/*.sh
chmod +x scripts/*.sh
IMPORT_DB=1 bash -x scripts/vps-deploy.sh 2>&1 | tail -n 200
"""

stdin, stdout, stderr = client.exec_command(cmd, get_pty=True, timeout=7200)
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
