#!/usr/bin/env python3
"""Repair MoPay env in frwanda_backend and finish migrate/callbacks."""
from __future__ import annotations

import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import ssh_deploy as d
import paramiko


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
            time.sleep(8 * (i + 1))
    raise last


def main() -> int:
    cfg = d.load_env(d.DEPLOY / "vps.env")
    client = connect(cfg)
    cmd = r"""
set -euo pipefail
BE_CT=$(docker ps --format '{{.Names}}' | grep -i frwanda | grep -i back | head -1)
echo "BE=$BE_CT"
test -n "$BE_CT"

# Strip broken MoPay lines and any unquoted payment title leftovers
docker exec "$BE_CT" sh -c 'sed -i "/^MOPAY_/d" .env'
docker exec "$BE_CT" sh -c 'sed -i "/^# MoPay/d" .env'

docker exec "$BE_CT" sh -c 'cat >> .env <<EOF

# MoPay / Mobile Money (Bizao gateway)
MOPAY_ACCOUNT_ID=5e1d5309-2a18-46e9-92d5-6a9abf79039d
MOPAY_AUTH_KEY=cGFycm90OkZZYXZYVkV0RndHRSUuMzAxIQ==
MOPAY_SERVER_BASE_URL=http://41.186.14.66:443/
MOPAY_CALLBACK_SIGNING_KEY=DLMDFJ3asfnaXSnyFfFkNr946jQBjlxdsoNZswonIsE
MOPAY_CALLBACK_URL=https://api.frwanda.com/api/admin/payments/mopay/webhook
MOPAY_DEFAULT_CURRENCY=RWF
MOPAY_DEFAULT_COUNTRY_CODE=rw
MOPAY_DEFAULT_MNO=mtn
MOPAY_RECEIVER_ACCOUNT_NO=0788821579
MOPAY_PAYMENT_TITLE="F&R Rwanda course payment"
EOF'

# Ensure PHP files present
docker cp /opt/e-learning-frwanda/E-learning-parrot-backend/app/. "$BE_CT:/var/www/html/app/"
docker cp /opt/e-learning-frwanda/E-learning-parrot-backend/config/services.php "$BE_CT:/var/www/html/config/services.php"
docker cp /opt/e-learning-frwanda/E-learning-parrot-backend/routes/api.php "$BE_CT:/var/www/html/routes/api.php"
docker cp /opt/e-learning-frwanda/E-learning-parrot-backend/database/migrations/. "$BE_CT:/var/www/html/database/migrations/"
docker cp /opt/e-learning-frwanda/E-learning-parrot-backend/database/seeders/CoursePromoCodeSeeder.php "$BE_CT:/var/www/html/database/seeders/CoursePromoCodeSeeder.php"

docker exec "$BE_CT" php artisan config:clear
docker exec "$BE_CT" php artisan migrate --force
docker exec "$BE_CT" php artisan db:seed --class=Database\\Seeders\\CoursePromoCodeSeeder --force
docker exec "$BE_CT" php artisan route:clear
docker exec "$BE_CT" php artisan storage:link || true
docker exec "$BE_CT" php artisan mopay:register-callbacks || true

echo '--- mopay env ---'
docker exec "$BE_CT" sh -c 'grep ^MOPAY_ .env | sed "s/AUTH_KEY=.*/AUTH_KEY=***/"'
echo '--- probes ---'
curl -sS -o /tmp/pc.json -w 'pay_config:%{http_code}\n' 'https://api.frwanda.com/api/admin/payments/config'
head -c 400 /tmp/pc.json; echo
curl -sS -o /dev/null -w 'webhook_ping:%{http_code}\n' 'https://api.frwanda.com/api/admin/payments/mopay/webhook?ping=1'
"""
    return d.run(client, cmd, timeout=300)


if __name__ == "__main__":
    raise SystemExit(main())
