#!/usr/bin/env python3
"""Sync local backend .env secrets onto VPS .env.production (keep live DB passwords)."""
from __future__ import annotations

import sys
import time
from pathlib import Path

import paramiko

BACKEND = Path(__file__).resolve().parents[2]
DEPLOY = BACKEND / "deploy"
LOCAL_ENV = BACKEND / ".env"
REMOTE_ENV = "/opt/e-learning-xander/E-learning-parrot-backend/deploy/.env.production"

# Keys copied from local .env into production (plus forced production overrides)
COPY_KEYS = [
    "APP_KEY", "APP_NAME",
    "ZOOM_ACCOUNT_ID", "ZOOM_CLIENT_ID", "ZOOM_CLIENT_SECRET", "ZOOM_HOST_USER_ID",
    "ZOOM_EMBED_CLIENT_ID", "ZOOM_EMBED_CLIENT_SECRET", "ZOOM_HOST_POOL", "ZOOM_PLATFORM_HOST_POOL",
    "STRIPE_SECRET_KEY", "STRIPE_PUBLIC_KEY",
    "PCLOUD_ACCESS_TOKEN", "PCLOUD_ROOT_FOLDER_ID", "PCLOUD_API_URL", "PCLOUD_ROOT_FOLDER",
    "MAIL_USERNAME", "MAIL_PASSWORD", "MAIL_FROM_ADDRESS", "MAIL_FROM_NAME",
    "MAIL_MAILER", "MAIL_PORT", "MAIL_SCHEME", "MAIL_ENCRYPTION", "MAIL_EHLO_DOMAIN",
    "MAIL_VERIFY_PEER", "MAIL_TIMEOUT", "MAIL_HOST",
    "SEED_PLATFORM_PASSWORD", "PLATFORM_ADMIN_EMAIL", "MIGRATE_TOKEN", "SEED_PARTNER_PASSWORD",
    "DAILY_INTEGRATION_ENABLED", "DAILY_API_KEY", "DAILY_DOMAIN", "DAILY_API_BASE_URL",
    "DAILY_WEBHOOK_HMAC", "DAILY_WEBHOOK_UUID", "DAILY_WEBHOOK_RETRY_TYPE",
    "DAILY_WEBHOOK_BASE_URL", "DAILY_DEFAULT_LANGUAGE", "DAILY_REDIRECT_ON_MEETING_EXIT",
    "DAILY_ROOM_GRACE_MINUTES", "DAILY_TOKEN_GRACE_MINUTES", "DAILY_RECORDING_ENABLED",
    "MAIN_PLATFORM_MEETING_PROVIDER",
    "PATHWAYS_TIMEZONE", "PATHWAYS_ZOOM_JOIN_URL", "PATHWAYS_ZOOM_MEETING_ID", "PATHWAYS_ZOOM_START_URL",
]

FORCE = {
    "APP_ENV": "production",
    "APP_DEBUG": "false",
    "APP_URL": "https://api.xanderglobalacademy.com",
    "FRONTEND_URL": "https://xanderglobalacademy.com",
    "VITE_API_URL": "https://api.xanderglobalacademy.com/api/admin",
    "DB_HOST": "mysql",
    "DB_PORT": "3306",
    "DB_DATABASE": "learning_xander",
    "DB_USERNAME": "parrot",
    "AUTO_MIGRATE": "true",
    "AUTO_SEED_DEMO": "false",
    "PARROT_HTTP_PORT": "8090",
    # production Daily webhook base
    "DAILY_WEBHOOK_BASE_URL": "https://api.xanderglobalacademy.com",
    "DAILY_INTEGRATION_ENABLED": "true",
    "MAIN_PLATFORM_MEETING_PROVIDER": "daily",
}

# Never overwrite these from local / random regen — keep MySQL volume credentials
PRESERVE = {"MYSQL_ROOT_PASSWORD", "DB_PASSWORD", "DB_USERNAME", "DB_DATABASE", "DB_HOST", "DB_PORT"}


def parse_env(text: str) -> dict[str, str]:
    out: dict[str, str] = {}
    for raw in text.splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        out[k.strip()] = v.strip()
    return out


def dump_env(data: dict[str, str], preferred_order: list[str]) -> str:
    lines = []
    seen = set()
    for k in preferred_order:
        if k in data:
            lines.append(f"{k}={data[k]}")
            seen.add(k)
    for k in sorted(data.keys()):
        if k not in seen:
            lines.append(f"{k}={data[k]}")
    return "\n".join(lines) + "\n"


def load_vps():
    cfg = {}
    for raw in (DEPLOY / "vps.env").read_text(encoding="utf-8").splitlines():
        if raw.strip() and not raw.startswith("#") and "=" in raw:
            k, v = raw.split("=", 1)
            cfg[k.strip()] = v.strip()
    return cfg


def main() -> int:
    local = parse_env(LOCAL_ENV.read_text(encoding="utf-8"))
    vps = load_vps()

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(
        hostname=vps["VPS_HOST"].split("@")[1],
        username=vps["VPS_HOST"].split("@")[0],
        password=vps["VPS_PASSWORD"],
        timeout=30,
    )

    sftp = client.open_sftp()
    with sftp.file(REMOTE_ENV, "r") as f:
        remote = parse_env(f.read().decode("utf-8"))

    merged = dict(remote)
    for k in COPY_KEYS:
        if k in PRESERVE:
            continue
        if k in local and local[k] != "":
            merged[k] = local[k]
    for k, v in FORCE.items():
        if k not in PRESERVE:
            merged[k] = v

    # Keep existing DB credentials
    for k in PRESERVE:
        if k in remote and remote[k]:
            merged[k] = remote[k]

    # Ensure Daily key from local
    if local.get("DAILY_API_KEY"):
        merged["DAILY_API_KEY"] = local["DAILY_API_KEY"]
    if local.get("DAILY_DOMAIN"):
        merged["DAILY_DOMAIN"] = local["DAILY_DOMAIN"]

    order = list(remote.keys()) + [k for k in COPY_KEYS if k not in remote] + list(FORCE.keys())
    # unique preserve order
    seen = set()
    preferred = []
    for k in order:
        if k not in seen and k in merged:
            preferred.append(k)
            seen.add(k)

    content = dump_env(merged, preferred)
    # also save local copy
    (DEPLOY / ".env.production").write_text(content, encoding="utf-8")

    with sftp.file(REMOTE_ENV, "w") as f:
        f.write(content)
    sftp.close()

    print("Uploaded .env.production")
    print("DAILY_INTEGRATION_ENABLED=", merged.get("DAILY_INTEGRATION_ENABLED"))
    print("DAILY_DOMAIN=", merged.get("DAILY_DOMAIN"))
    print("DAILY_API_KEY=", "SET" if merged.get("DAILY_API_KEY") else "EMPTY")
    print("DAILY_WEBHOOK_BASE_URL=", merged.get("DAILY_WEBHOOK_BASE_URL"))
    print("APP_URL=", merged.get("APP_URL"))
    print("FRONTEND_URL=", merged.get("FRONTEND_URL"))

    cmd = r'''
set -e
cd /opt/e-learning-xander/E-learning-parrot-backend/deploy
# Recreate API containers so env_file is re-read
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --force-recreate backend scheduler
sleep 4
docker exec parrot_backend printenv | grep -E '^(DAILY_|APP_URL|FRONTEND_URL)=' | sed 's/\(DAILY_API_KEY=\).*/\1***/'
curl -sk -o /dev/null -w 'api_up:%{http_code}\n' https://api.xanderglobalacademy.com/up
docker ps --filter name=parrot_ --format '{{.Names}} {{.Status}}'
'''
    _, out, _ = client.exec_command(cmd, get_pty=True, timeout=180)
    ch = out.channel
    while True:
        while ch.recv_ready():
            sys.stdout.buffer.write(ch.recv(4096))
            sys.stdout.buffer.flush()
        if ch.exit_status_ready() and not ch.recv_ready():
            break
        time.sleep(0.05)
    code = ch.recv_exit_status()
    client.close()
    print("\nEXIT", code)
    return code


if __name__ == "__main__":
    raise SystemExit(main())
