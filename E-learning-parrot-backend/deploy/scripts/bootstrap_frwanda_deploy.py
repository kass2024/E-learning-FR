#!/usr/bin/env python3
"""First-time bootstrap for F&R Rwanda on VPS — isolated from Xander."""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import ssh_deploy as d
import paramiko

REPO = "https://github.com/kass2024/E-learning-FR.git"
VPS_PATH = "/opt/e-learning-frwanda"


def main() -> int:
    cfg = d.load_env(d.DEPLOY / "vps.env")
    user, host, port = d.parse_host(cfg["VPS_HOST"])
    password = cfg["VPS_PASSWORD"]
    vps_path = cfg.get("VPS_PATH", VPS_PATH).rstrip("/")

    if "e-learning-xander" in vps_path:
        print("Refusing: VPS_PATH points at Xander")
        return 1

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(hostname=host, port=port, username=user, password=password, timeout=30)

    # Safety snapshot — must not modify these
    print("==> Pre-check: existing stacks (left alone)")
    d.run(
        client,
        "echo '--- docker ---'; docker ps --format '{{.Names}}\t{{.Ports}}' | head -40; "
        "echo '--- apache sites ---'; ls /etc/apache2/sites-enabled 2>/dev/null; "
        "echo '--- /var/www ---'; ls /var/www 2>/dev/null; "
        "echo '--- xander path ---'; ls -d /opt/e-learning-xander 2>/dev/null || echo 'xander path ok'",
        timeout=60,
    )

    bootstrap = f"""
set -euo pipefail
VPS_PATH='{vps_path}'
REPO='{REPO}'

# Never touch Xander or /var/www content
test ! -e "$VPS_PATH" -o -d "$VPS_PATH"
if [ -d /opt/e-learning-xander ]; then
  echo "Xander present at /opt/e-learning-xander (will not modify)"
fi

if [ ! -d "$VPS_PATH/.git" ]; then
  echo "==> Clone monorepo to $VPS_PATH"
  rm -rf "$VPS_PATH"
  git clone "$REPO" "$VPS_PATH"
else
  echo "==> Repo exists — pull latest"
  git -C "$VPS_PATH" fetch origin
  git -C "$VPS_PATH" reset --hard origin/main
fi

mkdir -p "$VPS_PATH/E-learning-parrot-backend/deploy"
chmod +x "$VPS_PATH/E-learning-parrot-backend/deploy/scripts/"*.sh || true
echo "Bootstrap tree ready"
ls -la "$VPS_PATH"
"""
    code = d.run(client, bootstrap, timeout=300)
    if code != 0:
        return code

    # Upload production env (not in git)
    local_env = d.DEPLOY / ".env.production"
    if not local_env.is_file():
        print(f"Missing {local_env}")
        return 1
    remote_env = f"{vps_path}/E-learning-parrot-backend/deploy/.env.production"
    d.upload(client, local_env, remote_env)

    deploy = f"""
set -euo pipefail
cd {vps_path}/E-learning-parrot-backend/deploy
IMPORT_DB=0 bash scripts/vps-deploy.sh
"""
    code = d.run(client, deploy, timeout=7200)
    if code != 0:
        return code

    # SSL via certbot (Apache plugin) — only for frwanda hosts
    ssl = """
set -euo pipefail
if command -v certbot >/dev/null 2>&1; then
  echo "==> Issue/renew SSL for frwanda.com (Apache only for these names)"
  certbot --apache -n --agree-tos --register-unsafely-without-email \
    -d frwanda.com -d www.frwanda.com -d api.frwanda.com \
    --redirect || certbot --apache -n --agree-tos --register-unsafely-without-email \
    -d frwanda.com -d api.frwanda.com --redirect || true
else
  echo "certbot not installed — HTTP proxy is up; install SSL later"
fi
echo "==> Post-check health"
curl -sS -o /dev/null -w "local_front:%{http_code}\\n" -H "Host: frwanda.com" http://127.0.0.1:8091/ || true
curl -sS -o /dev/null -w "local_api:%{http_code}\\n" -H "Host: api.frwanda.com" http://127.0.0.1:8091/up || true
curl -sS -o /dev/null -w "public_front:%{http_code}\\n" https://frwanda.com/ || true
curl -sS -o /dev/null -w "public_api:%{http_code}\\n" https://api.frwanda.com/up || true
echo "==> Confirm Xander containers still running"
docker ps --format '{{.Names}}' | grep -E '^parrot_' || echo "(no parrot_ containers listed)"
echo "DONE"
"""
    return d.run(client, ssl, timeout=600)


if __name__ == "__main__":
    raise SystemExit(main())
