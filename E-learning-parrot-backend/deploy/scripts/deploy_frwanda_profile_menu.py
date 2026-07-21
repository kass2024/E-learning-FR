#!/usr/bin/env python3
"""Deploy profile/avatar auth endpoints for F&R."""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import ssh_deploy as d
import paramiko

BE = Path(__file__).resolve().parents[2]
FILES = [
    "app/Http/Controllers/Api/AuthController.php",
    "app/Models/Student.php",
    "routes/api.php",
]


def main() -> int:
    cfg = d.load_env(d.DEPLOY / "vps.env")
    user, host, port = d.parse_host(cfg["VPS_HOST"])
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
    for rel in FILES:
        d.upload(client, BE / rel, f"/opt/e-learning-frwanda/E-learning-parrot-backend/{rel}")

    cmd = r"""
set -euo pipefail
BE_CT=$(docker ps --format '{{.Names}}' | grep -i frwanda | grep -i back | head -1)
echo "BE=$BE_CT"
for f in app/Http/Controllers/Api/AuthController.php app/Models/Student.php routes/api.php; do
  docker cp "/opt/e-learning-frwanda/E-learning-parrot-backend/$f" "$BE_CT:/var/www/html/$f"
done
docker exec "$BE_CT" php -l /var/www/html/app/Http/Controllers/Api/AuthController.php
docker exec "$BE_CT" php -r 'if (function_exists("opcache_reset")) { opcache_reset(); echo "opcache_reset ok\n"; }'
docker exec "$BE_CT" grep -n "uploadAvatar\|auth/avatar" /var/www/html/app/Http/Controllers/Api/AuthController.php /var/www/html/routes/api.php | head -10
echo DONE
"""
    return d.run(client, cmd, timeout=120)


if __name__ == "__main__":
    raise SystemExit(main())
