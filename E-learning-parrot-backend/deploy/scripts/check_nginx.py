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
cmd = r"""
docker logs parrot_nginx --tail 80 2>&1
echo '---'
cat /opt/e-learning-xander/E-learning-parrot-backend/deploy/nginx/edge.conf
echo '---'
docker inspect parrot_nginx --format '{{json .HostConfig.PortBindings}}'
ss -tlnp | grep -E '8090|80 |443' || netstat -tlnp | grep -E '8090|80 |443' || true
"""
_, out, _ = c.exec_command(cmd, get_pty=True, timeout=60)
ch = out.channel
while True:
    while ch.recv_ready():
        sys.stdout.buffer.write(ch.recv(4096)); sys.stdout.buffer.flush()
    if ch.exit_status_ready() and not ch.recv_ready(): break
    time.sleep(0.1)
c.close()
