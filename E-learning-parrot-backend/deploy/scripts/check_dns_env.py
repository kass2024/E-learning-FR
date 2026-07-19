#!/usr/bin/env python3
"""Check DNS + verify deployed .env.production (secrets masked)."""
from __future__ import annotations

import socket
import sys
import time
from pathlib import Path

import paramiko

DEPLOY = Path(__file__).resolve().parent.parent
LOCAL_ENV = DEPLOY / ".env.production"
VPS_ENV = DEPLOY / "vps.env"

IMPORTANT_KEYS = [
    "APP_URL", "FRONTEND_URL", "VITE_API_URL", "APP_ENV", "APP_DEBUG", "APP_KEY",
    "DB_HOST", "DB_DATABASE", "DB_USERNAME", "DB_PASSWORD", "MYSQL_ROOT_PASSWORD",
    "AUTO_MIGRATE", "PARROT_HTTP_PORT",
    "ZOOM_ACCOUNT_ID", "ZOOM_CLIENT_ID", "ZOOM_CLIENT_SECRET", "ZOOM_HOST_USER_ID",
    "ZOOM_EMBED_CLIENT_ID", "ZOOM_EMBED_CLIENT_SECRET",
    "STRIPE_SECRET_KEY", "STRIPE_PUBLIC_KEY",
    "PCLOUD_ACCESS_TOKEN", "PCLOUD_ROOT_FOLDER_ID",
    "MAIL_HOST", "MAIL_USERNAME", "MAIL_PASSWORD", "MAIL_FROM_ADDRESS",
]


def load_kv(path: Path) -> dict[str, str]:
    out = {}
    if not path.exists():
        return out
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        out[k.strip()] = v.strip()
    return out


def mask(k: str, v: str) -> str:
    if not v:
        return "(EMPTY)"
    secretish = any(x in k.upper() for x in ("PASSWORD", "SECRET", "TOKEN", "KEY", "PWD"))
    if secretish:
        if k == "APP_KEY":
            return f"SET({len(v)} chars, starts {v[:10]}...)" if len(v) > 10 else "SET"
        return f"SET({len(v)} chars)"
    return v


def resolve(host: str) -> list[str]:
    try:
        infos = socket.getaddrinfo(host, None, socket.AF_INET)
        ips = sorted({i[4][0] for i in infos})
        return ips
    except Exception as e:
        return [f"ERROR:{e}"]


def run(client, cmd, timeout=120):
    _, stdout, _ = client.exec_command(cmd, get_pty=True, timeout=timeout)
    ch = stdout.channel
    buf = b""
    while True:
        while ch.recv_ready():
            buf += ch.recv(4096)
        if ch.exit_status_ready() and not ch.recv_ready():
            break
        time.sleep(0.05)
    return ch.recv_exit_status(), buf.decode("utf-8", errors="replace")


def main() -> int:
    print("=== DNS (from this machine) ===")
    for host in (
        "xanderglobalacademy.com",
        "www.xanderglobalacademy.com",
        "api.xanderglobalacademy.com",
    ):
        ips = resolve(host)
        print(f"  {host} -> {', '.join(ips)}")
        if host.startswith("api."):
            ok = ips == ["66.29.135.120"]
            print(f"    API DNS OK: {ok}")
        else:
            has_vps = "66.29.135.120" in ips
            extras = [i for i in ips if i != "66.29.135.120" and not i.startswith("ERROR")]
            print(f"    Has VPS IP: {has_vps}; extra A records: {extras or 'none'}")

    vps = load_kv(VPS_ENV)
    local = load_kv(LOCAL_ENV)

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(
        hostname=vps["VPS_HOST"].split("@")[1],
        username=vps["VPS_HOST"].split("@")[0],
        password=vps["VPS_PASSWORD"],
        timeout=30,
    )

    remote_path = "/opt/e-learning-xander/E-learning-parrot-backend/deploy/.env.production"
    code, remote_raw = run(client, f"cat {remote_path}")
    if code != 0:
        print("FAIL: cannot read remote .env.production")
        client.close()
        return 1

    remote = {}
    for raw in remote_raw.splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        remote[k.strip()] = v.strip()

    print("\n=== Remote .env.production (masked) ===")
    missing = []
    mismatch = []
    for k in IMPORTANT_KEYS:
        lv = local.get(k, "")
        rv = remote.get(k, "")
        print(f"  {k}={mask(k, rv)}")
        if not rv:
            missing.append(k)
        elif lv and rv != lv:
            # VITE_* only baked at frontend build — still show mismatch
            mismatch.append(k)

    print("\n=== Local vs remote ===")
    if missing:
        print("  EMPTY on remote:", ", ".join(missing))
    else:
        print("  All important keys present on remote.")
    if mismatch:
        print("  Differ from local:", ", ".join(mismatch))
    else:
        print("  Matches local prepare-env output for checked keys.")

    print("\n=== Live HTTP checks on VPS ===")
    checks = r"""
curl -sS -o /dev/null -w 'local_front:%{http_code}\n' -H 'Host: xanderglobalacademy.com' http://127.0.0.1:8090/
curl -sS -o /dev/null -w 'local_api:%{http_code}\n' -H 'Host: api.xanderglobalacademy.com' http://127.0.0.1:8090/up
curl -sS -o /dev/null -w 'apache_front:%{http_code}\n' -H 'Host: xanderglobalacademy.com' http://127.0.0.1/
curl -sS -o /dev/null -w 'apache_api:%{http_code}\n' -H 'Host: api.xanderglobalacademy.com' http://127.0.0.1/up
curl -sS -o /dev/null -w 'public_api:%{http_code}\n' http://api.xanderglobalacademy.com/up || true
curl -sS -o /dev/null -w 'public_front:%{http_code}\n' http://xanderglobalacademy.com/ || true
docker ps --filter name=parrot_ --format '{{.Names}} {{.Status}}'
"""
    _, out = run(client, checks)
    print(out)

    # Re-sync env from local if anything important empty
    need_upload = bool(missing)
    if need_upload and LOCAL_ENV.exists():
        print("==> Re-uploading local .env.production (had empty keys)")
        sftp = client.open_sftp()
        sftp.put(str(LOCAL_ENV), remote_path)
        sftp.close()
        run(client, "cd /opt/e-learning-xander/E-learning-parrot-backend/deploy && docker compose -f docker-compose.prod.yml --env-file .env.production up -d backend scheduler")
        print("Backend/scheduler restarted with fresh env.")

    client.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
