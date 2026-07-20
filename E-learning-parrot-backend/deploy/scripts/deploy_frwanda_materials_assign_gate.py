#!/usr/bin/env python3
"""Hot-patch F&R materials assign gate: PHP + CourseMaterials frontend chunk."""
from __future__ import annotations

import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import ssh_deploy as d
import paramiko

BACKEND = Path(__file__).resolve().parents[2]
FE = BACKEND.parent / "E-learning-parrot-frontend"
REMOTE_BE = "/opt/e-learning-frwanda/E-learning-parrot-backend"
REMOTE_FE = "/opt/e-learning-frwanda/E-learning-parrot-frontend"

BE_FILES = [
    "app/Http/Controllers/Api/CourseMaterialController.php",
]


def connect(cfg):
    user, host, port = d.parse_host(cfg["VPS_HOST"])
    last = None
    for i in range(5):
        try:
            client = paramiko.SSHClient()
            client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            client.connect(
                hostname=host,
                port=port,
                username=user,
                password=cfg["VPS_PASSWORD"],
                timeout=120,
                banner_timeout=120,
                auth_timeout=120,
            )
            return client
        except Exception as e:
            last = e
            print(f"SSH retry {i+1}: {e}")
            time.sleep(15 * (i + 1))
    raise last


def main() -> int:
    cfg = d.load_env(d.DEPLOY / "vps.env")
    client = connect(cfg)

    for rel in BE_FILES:
        d.upload(client, BACKEND / rel, f"{REMOTE_BE}/{rel}")

    dist = FE / "dist"
    assets = list((dist / "assets").glob("CourseMaterials-*.js"))
    assets += list((dist / "assets").glob("index-*.js"))
    assets += list((dist / "assets").glob("index-*.css"))
    html = dist / "index.html"
    version = dist / "version.json"
    small = [p for p in assets + [html, version] if p.is_file() and p.stat().st_size < 2_000_000]
    small = [
        p
        for p in small
        if p.name.startswith("CourseMaterials-")
        or p.name in ("index.html", "version.json")
        or (p.suffix == ".css" and p.name.startswith("index-"))
    ]
    for p in (dist / "assets").glob("index-*.js"):
        if p.stat().st_size < 1_500_000:
            small.append(p)

    remote_asset_dir = f"{REMOTE_FE}/dist/assets"
    d.run(client, f"mkdir -p {remote_asset_dir}", timeout=30)
    for p in {str(x): x for x in small}.values():
        rel = p.relative_to(dist).as_posix()
        d.upload(client, p, f"{REMOTE_FE}/dist/{rel}")

    cmd = rf"""
set -euo pipefail
BE_CT=$(docker ps --format '{{{{.Names}}}}' | grep -i frwanda | grep -i backend | head -1)
FE_CT=$(docker ps --format '{{{{.Names}}}}' | grep -i frwanda | grep -i front | head -1)
echo "BE=$BE_CT FE=$FE_CT"
test -n "$BE_CT"
test -n "$FE_CT"

docker cp "{REMOTE_BE}/app/Http/Controllers/Api/CourseMaterialController.php" \
  "$BE_CT:/var/www/html/app/Http/Controllers/Api/CourseMaterialController.php"
docker exec "$BE_CT" php artisan cache:clear || true
docker exec "$BE_CT" sh -c 'grep -n "can_upload\|assertCanMutateMaterials\|assign_cours" /var/www/html/app/Http/Controllers/Api/CourseMaterialController.php | head -8'

if [ -f {REMOTE_FE}/dist/index.html ]; then
  docker cp {REMOTE_FE}/dist/index.html "$FE_CT:/usr/share/nginx/html/index.html"
fi
if [ -d {REMOTE_FE}/dist/assets ]; then
  for f in {REMOTE_FE}/dist/assets/CourseMaterials-*.js {REMOTE_FE}/dist/assets/index-*.js {REMOTE_FE}/dist/assets/index-*.css; do
    [ -f "$f" ] || continue
    docker cp "$f" "$FE_CT:/usr/share/nginx/html/assets/$(basename "$f")"
  done
fi
if [ -f {REMOTE_FE}/dist/version.json ]; then
  docker cp {REMOTE_FE}/dist/version.json "$FE_CT:/usr/share/nginx/html/version.json" || true
fi

curl -sS -o /dev/null -w 'front:%{{http_code}}\n' https://frwanda.com/
curl -sS -o /dev/null -w 'api:%{{http_code}}\n' https://api.frwanda.com/api/health || true
"""
    return d.run(client, cmd, timeout=180)


if __name__ == "__main__":
    raise SystemExit(main())
