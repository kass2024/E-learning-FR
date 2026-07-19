#!/usr/bin/env python3
import sys, time
from pathlib import Path
import paramiko

cfg = {}
for r in Path(__file__).resolve().parent.parent.joinpath("vps.env").read_text().splitlines():
    if r.strip() and not r.startswith("#") and "=" in r:
        k, v = r.split("=", 1)
        cfg[k.strip()] = v.strip()

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(cfg["VPS_HOST"].split("@")[1], username=cfg["VPS_HOST"].split("@")[0], password=cfg["VPS_PASSWORD"], timeout=30)

cmd = r"""
echo '=== file ==='
grep -E '^DAILY_|^MAIN_PLATFORM' /opt/e-learning-xander/E-learning-parrot-backend/deploy/.env.production | sed 's/API_KEY=.*/API_KEY=***/'
echo '=== container printenv ==='
docker exec parrot_backend printenv | grep -E '^DAILY_|^MAIN_PLATFORM' | sed 's/API_KEY=.*/API_KEY=***/' || echo NONE
echo '=== artisan tinker env ==='
docker exec parrot_backend php artisan tinker --execute="echo 'enabled='.(config('services.daily.enabled') ?? env('DAILY_INTEGRATION_ENABLED')).PHP_EOL; echo 'key='.(env('DAILY_API_KEY') ? 'SET' : 'EMPTY').PHP_EOL; echo 'domain='.env('DAILY_DOMAIN').PHP_EOL;"
"""
_, out, _ = c.exec_command(cmd, get_pty=True, timeout=60)
ch = out.channel
while True:
    while ch.recv_ready():
        sys.stdout.buffer.write(ch.recv(4096)); sys.stdout.buffer.flush()
    if ch.exit_status_ready() and not ch.recv_ready():
        break
    time.sleep(0.05)
print("EXIT", ch.recv_exit_status())
c.close()
