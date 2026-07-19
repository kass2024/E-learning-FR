#!/usr/bin/env python3
"""Fix MySQL image for old CPU and bring stack up with DB import."""
import sys, time
from pathlib import Path
import paramiko

DEPLOY = Path(__file__).resolve().parent.parent

def load_env(path):
    out = {}
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            out[k.strip()] = v.strip()
    return out

def upload(client, local, remote):
    print(f"upload {local} -> {remote}")
    sftp = client.open_sftp()
    try:
        sftp.put(str(local), remote)
    finally:
        sftp.close()

def run(client, cmd, timeout=7200):
    print(f"\n$ {cmd[:120]}...")
    _, stdout, _ = client.exec_command(cmd, get_pty=True, timeout=timeout)
    ch = stdout.channel
    while True:
        while ch.recv_ready():
            sys.stdout.buffer.write(ch.recv(4096)); sys.stdout.buffer.flush()
        if ch.exit_status_ready() and not ch.recv_ready():
            break
        time.sleep(0.1)
    code = ch.recv_exit_status()
    print(f"\n[exit {code}]")
    return code

cfg = load_env(DEPLOY / "vps.env")
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(hostname=cfg["VPS_HOST"].split("@")[1], username=cfg["VPS_HOST"].split("@")[0], password=cfg["VPS_PASSWORD"], timeout=30)

remote = "/opt/e-learning-xander/E-learning-parrot-backend/deploy"
upload(client, DEPLOY / "docker-compose.prod.yml", f"{remote}/docker-compose.prod.yml")
upload(client, DEPLOY / ".env.production", f"{remote}/.env.production")
upload(client, DEPLOY / "db" / "latest.sql.gz", f"{remote}/db/latest.sql.gz")
upload(client, DEPLOY / "scripts" / "vps-deploy.sh", f"{remote}/scripts/vps-deploy.sh")
upload(client, DEPLOY / "scripts" / "setup-apache-proxy.sh", f"{remote}/scripts/setup-apache-proxy.sh")

cmd = f"""
set -e
cd {remote}
sed -i 's/\\r$//' scripts/*.sh docker-compose.prod.yml || true
chmod +x scripts/*.sh
# Reset broken mysql volume from x86-64-v2 image crash
docker compose -f docker-compose.prod.yml --env-file .env.production down || true
docker volume rm deploy_parrot_mysql_data 2>/dev/null || docker volume rm e-learning-parrot-backend_parrot_mysql_data 2>/dev/null || true
docker volume ls | grep -i mysql || true
# Find exact volume name
VOL=$(docker volume ls -q | grep -i parrot_mysql || true)
if [ -n "$VOL" ]; then docker volume rm $VOL || true; fi
IMPORT_DB=1 bash scripts/vps-deploy.sh
"""
code = run(client, cmd)
client.close()
raise SystemExit(code)
