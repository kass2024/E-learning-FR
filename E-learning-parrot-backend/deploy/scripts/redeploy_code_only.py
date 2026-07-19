import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import ssh_deploy as d
import paramiko

cfg = d.load_env(d.DEPLOY / "vps.env")
user, host, port = d.parse_host(cfg["VPS_HOST"])
password = cfg["VPS_PASSWORD"]
vps_path = cfg.get("VPS_PATH", "/opt/e-learning-frwanda").rstrip("/")

if "e-learning-xander" in vps_path:
    raise SystemExit("Refusing to redeploy: VPS_PATH still points at Xander. Fix deploy/vps.env.")

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(hostname=host, port=port, username=user, password=password, timeout=30)
cmd = rf"""
set -e
cd {vps_path}
if [ -d .git ]; then
  git fetch origin && git reset --hard origin/main
else
  cd {vps_path}/E-learning-parrot-backend
  git fetch origin && git reset --hard origin/main
  cd {vps_path}/E-learning-parrot-frontend
  git fetch origin && git reset --hard origin/main
fi
cd {vps_path}/E-learning-parrot-backend/deploy
IMPORT_DB=0 bash scripts/vps-deploy.sh
"""
raise SystemExit(d.run(client, cmd, timeout=7200))
