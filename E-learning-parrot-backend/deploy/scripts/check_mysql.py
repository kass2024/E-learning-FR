#!/usr/bin/env python3
import sys, time
from pathlib import Path
import paramiko

DEPLOY = Path(__file__).resolve().parent.parent
cfg = {}
for raw in (DEPLOY / "vps.env").read_text(encoding="utf-8").splitlines():
    line = raw.strip()
    if line and not line.startswith("#") and "=" in line:
        k, v = line.split("=", 1)
        cfg[k.strip()] = v.strip()

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(hostname=cfg["VPS_HOST"].split("@")[1], username=cfg["VPS_HOST"].split("@")[0], password=cfg["VPS_PASSWORD"], timeout=30)

cmd = r"""
echo '=== mysql logs ==='
docker logs parrot_mysql --tail 80 2>&1
echo '=== all compose services ==='
cd /opt/e-learning-xander/E-learning-parrot-backend/deploy
docker compose -f docker-compose.prod.yml --env-file .env.production ps -a
echo '=== env db vars (masked) ==='
grep -E '^(DB_|MYSQL_)' .env.production | sed 's/\(PASSWORD=\).*/\1***/'
echo '=== inspect mysql exit ==='
docker inspect parrot_mysql --format '{{.State.ExitCode}} {{.State.Error}} {{.State.Status}}'
"""

stdin, stdout, stderr = client.exec_command(cmd, get_pty=True, timeout=60)
ch = stdout.channel
while True:
    while ch.recv_ready():
        sys.stdout.buffer.write(ch.recv(4096)); sys.stdout.buffer.flush()
    if ch.exit_status_ready() and not ch.recv_ready():
        break
    time.sleep(0.1)
print("\nEXIT", ch.recv_exit_status())
client.close()
