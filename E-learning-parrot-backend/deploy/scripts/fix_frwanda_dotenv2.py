#!/usr/bin/env python3
"""Quote broken F&R env values, migrate, register MoPay callbacks."""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import ssh_deploy as d
import paramiko


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

    # Upload a small PHP fixer into the container and run it
    fixer = r'''<?php
$path = '/var/www/html/.env';
$lines = file($path, FILE_IGNORE_NEW_LINES);
$out = [];
$skipMopay = false;
foreach ($lines as $line) {
    if (preg_match('/^MOPAY_/', $line) || preg_match('/^# MoPay/', $line)) {
        continue;
    }
    if (preg_match('/^(VITE_APP_NAME|PLATFORM_ADMIN_NAME|APP_NAME|MOPAY_PAYMENT_TITLE)=(.*)$/', $line, $m)) {
        $val = trim($m[2]);
        if ($val !== '' && $val[0] !== '"' && $val[0] !== "'") {
            $line = $m[1] . '="' . $val . '"';
        }
    }
    $out[] = $line;
}
$block = [
    '',
    '# MoPay / Mobile Money',
    'MOPAY_ACCOUNT_ID=5e1d5309-2a18-46e9-92d5-6a9abf79039d',
    'MOPAY_AUTH_KEY=cGFycm90OkZZYXZYVkV0RndHRSUuMzAxIQ==',
    'MOPAY_SERVER_BASE_URL=http://41.186.14.66:443/',
    'MOPAY_CALLBACK_SIGNING_KEY=DLMDFJ3asfnaXSnyFfFkNr946jQBjlxdsoNZswonIsE',
    'MOPAY_CALLBACK_URL=https://api.frwanda.com/api/admin/payments/mopay/webhook',
    'MOPAY_DEFAULT_CURRENCY=RWF',
    'MOPAY_DEFAULT_COUNTRY_CODE=rw',
    'MOPAY_DEFAULT_MNO=mtn',
    'MOPAY_RECEIVER_ACCOUNT_NO=0788821579',
    'MOPAY_PAYMENT_TITLE="FR Rwanda course payment"',
];
file_put_contents($path, implode("\n", array_merge($out, $block)) . "\n");
echo "fixed\n";
'''

    sftp = client.open_sftp()
    with sftp.file('/tmp/fix_frwanda_env.php', 'w') as f:
        f.write(fixer)
    sftp.close()

    cmd = r"""
set -euo pipefail
BE_CT=$(docker ps --format '{{.Names}}' | grep -i frwanda | grep -i back | head -1)
echo "BE=$BE_CT"
docker cp /tmp/fix_frwanda_env.php "$BE_CT:/tmp/fix_frwanda_env.php"
docker exec "$BE_CT" php /tmp/fix_frwanda_env.php
docker exec "$BE_CT" sh -c "grep -n 'VITE_APP_NAME\|PLATFORM_ADMIN_NAME\|MOPAY_ACCOUNT\|MOPAY_PAYMENT' .env"
docker exec "$BE_CT" php artisan --version
docker exec "$BE_CT" php artisan config:clear
docker exec "$BE_CT" php artisan migrate --force
docker exec "$BE_CT" php artisan db:seed --class=Database\\Seeders\\CoursePromoCodeSeeder --force
docker exec "$BE_CT" php artisan route:clear
docker exec "$BE_CT" php artisan storage:link || true
docker exec "$BE_CT" php artisan mopay:register-callbacks || true
curl -sS 'https://api.frwanda.com/api/admin/payments/config' | head -c 600; echo
curl -sS -o /dev/null -w 'webhook_ping:%{http_code}\n' 'https://api.frwanda.com/api/admin/payments/mopay/webhook?ping=1'
"""
    return d.run(client, cmd, timeout=300)


if __name__ == "__main__":
    raise SystemExit(main())
