#!/usr/bin/env python3
"""Find and fix broken F&R whitespace lines in frwanda_backend .env."""
from __future__ import annotations

import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import ssh_deploy as d
import paramiko


def connect(cfg):
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
    return client


def main() -> int:
    cfg = d.load_env(d.DEPLOY / "vps.env")
    client = connect(cfg)
    cmd = r"""
set -euo pipefail
BE_CT=$(docker ps --format '{{.Names}}' | grep -i frwanda | grep -i back | head -1)
echo "BE=$BE_CT"

echo '=== lines with F&R or unquoted spaces ==='
docker exec "$BE_CT" sh -c "grep -n 'F&R\|PAYMENT_TITLE\|APP_NAME\|VITE_APP_NAME' .env || true"

echo '=== fix APP_NAME / titles ==='
docker exec "$BE_CT" sh -c "sed -i 's/^APP_NAME=F&R Rwanda Ltd$/APP_NAME=\"F\\&R Rwanda Ltd\"/' .env || true"
docker exec "$BE_CT" sh -c "sed -i 's/^APP_NAME=F&R Rwanda$/APP_NAME=\"F\\&R Rwanda\"/' .env || true"
docker exec "$BE_CT" sh -c "sed -i '/^MOPAY_/d' .env"
docker exec "$BE_CT" sh -c "sed -i '/^# MoPay/d' .env"
# Also remove any broken unquoted payment title variants
docker exec "$BE_CT" sh -c "sed -i '/PAYMENT_TITLE=F&R/d' .env"

# Write mopay keys with a Python one-liner inside container to avoid shell quote issues
docker exec "$BE_CT" php -r '
\$env = file_get_contents(".env");
\$env = preg_replace("/^MOPAY_.*$/m", "", \$env);
\$env = preg_replace("/\\n{3,}/", "\\n\\n", \$env);
\$block = <<<TXT

# MoPay / Mobile Money
MOPAY_ACCOUNT_ID=5e1d5309-2a18-46e9-92d5-6a9abf79039d
MOPAY_AUTH_KEY=cGFycm90OkZZYXZYVkV0RndHRSUuMzAxIQ==
MOPAY_SERVER_BASE_URL=http://41.186.14.66:443/
MOPAY_CALLBACK_SIGNING_KEY=DLMDFJ3asfnaXSnyFfFkNr946jQBjlxdsoNZswonIsE
MOPAY_CALLBACK_URL=https://api.frwanda.com/api/admin/payments/mopay/webhook
MOPAY_DEFAULT_CURRENCY=RWF
MOPAY_DEFAULT_COUNTRY_CODE=rw
MOPAY_DEFAULT_MNO=mtn
MOPAY_RECEIVER_ACCOUNT_NO=0788821579
MOPAY_PAYMENT_TITLE="FR Rwanda course payment"
TXT;
file_put_contents(".env", rtrim(\$env) . \$block . "\\n");
echo "env written\\n";
'

# Quote any remaining APP_NAME without quotes
docker exec "$BE_CT" php -r '
\$lines = file(".env");
\$out = [];
foreach (\$lines as \$line) {
  if (preg_match("/^APP_NAME=(.+)$/", \$line, \$m) && \$m[1][0] !== "\"" && \$m[1][0] !== "'"'"'") {
    \$out[] = "APP_NAME=\"" . trim(\$m[1]) . "\"\\n";
  } else {
    \$out[] = \$line;
  }
}
file_put_contents(".env", implode("", \$out));
echo "APP_NAME normalized\\n";
'

echo '=== validate dotenv via artisan ==='
docker exec "$BE_CT" php artisan --version
docker exec "$BE_CT" php artisan config:clear
docker exec "$BE_CT" php artisan migrate --force
docker exec "$BE_CT" php artisan db:seed --class=Database\\Seeders\\CoursePromoCodeSeeder --force
docker exec "$BE_CT" php artisan route:clear
docker exec "$BE_CT" php artisan storage:link || true
docker exec "$BE_CT" php artisan mopay:register-callbacks || true

curl -sS -w "\\npay_config:%{http_code}\\n" 'https://api.frwanda.com/api/admin/payments/config' | head -c 500
echo
curl -sS -o /dev/null -w 'webhook_ping:%{http_code}\n' 'https://api.frwanda.com/api/admin/payments/mopay/webhook?ping=1'
"""
    return d.run(client, cmd, timeout=300)


if __name__ == "__main__":
    raise SystemExit(main())
