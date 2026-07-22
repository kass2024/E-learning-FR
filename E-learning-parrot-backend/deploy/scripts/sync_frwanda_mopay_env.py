"""Sync F&R MoPay project env (independent callback signing) into VPS host + container .env."""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import paramiko
import ssh_deploy as d

MOPAY_BLOCK = """# MoPay / Mobile Money — F&R dedicated project identity
MOPAY_PROJECT_SLUG=frwanda
MOPAY_MESSAGE_PREFIX=FRWANDA
MOPAY_ACCOUNT_ID=5e1d5309-2a18-46e9-92d5-6a9abf79039d
MOPAY_AUTH_KEY=cGFycm90OkZZYXZYVkV0RndHRSUuMzAxIQ==
MOPAY_SERVER_BASE_URL=http://41.186.14.66:443/
MOPAY_CALLBACK_SIGNING_KEY=tfcqzu7dVI19gVUSXU4eOFhiTzfQtLBPwq82gislW6o
MOPAY_CALLBACK_URL=https://api.frwanda.com/api/admin/payments/mopay/webhook
MOPAY_CATEGORY=BIZAO
MOPAY_DEFAULT_CURRENCY=RWF
MOPAY_DEFAULT_COUNTRY_CODE=rw
MOPAY_DEFAULT_MNO=mtn
MOPAY_RECEIVER_ACCOUNT_NO=0788821579
MOPAY_PAYMENT_TITLE=FR_Rwanda_course_payment
MOPAY_PAYMENT_DETAILS=Course_enrollment_payment"""


def main() -> int:
    cfg = d.load_env(d.DEPLOY / "vps.env")
    user, host, port = d.parse_host(cfg["VPS_HOST"])
    password = cfg["VPS_PASSWORD"]
    vps_path = cfg.get("VPS_PATH", "/opt/e-learning-frwanda").rstrip("/")

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(hostname=host, port=port, username=user, password=password, timeout=30)

    # Write block to a temp file on VPS to avoid shell quoting issues
    sftp = client.open_sftp()
    remote_tmp = "/tmp/frwanda_mopay.env.snippet"
    with sftp.file(remote_tmp, "w") as f:
        f.write(MOPAY_BLOCK + "\n")
    sftp.close()

    cmd = rf"""
set -euo pipefail
for F in \
  {vps_path}/E-learning-parrot-backend/.env \
  {vps_path}/E-learning-parrot-backend/deploy/.env.production; do
  test -f "$F" || continue
  grep -q '^MOPAY_' "$F" 2>/dev/null && sed -i '/^MOPAY_/d;/^# MoPay/d' "$F" || true
  printf '\n' >> "$F"
  cat {remote_tmp} >> "$F"
  echo "updated $F"
done

BE_CT=$(docker ps --format '{{{{.Names}}}}' | grep -i frwanda | grep -iE 'back|api' | head -1)
echo "BE=$BE_CT"
test -n "$BE_CT"
docker cp {remote_tmp} "$BE_CT:/tmp/frwanda_mopay.env.snippet"
docker exec "$BE_CT" sh -c 'grep -q "^MOPAY_" .env 2>/dev/null && sed -i "/^MOPAY_/d;/^# MoPay/d" .env || true'
docker exec "$BE_CT" sh -c 'printf "\n" >> .env; cat /tmp/frwanda_mopay.env.snippet >> .env'
docker exec "$BE_CT" php artisan config:clear
docker exec "$BE_CT" php artisan config:cache || true
docker exec "$BE_CT" php -r '
require "vendor/autoload.php";
$app = require "bootstrap/app.php";
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
echo "project=".config("services.mopay.project_slug").PHP_EOL;
echo "title=".config("services.mopay.payment_title").PHP_EOL;
echo "callback=".config("services.mopay.callback_url").PHP_EOL;
echo "signing_len=".strlen((string)config("services.mopay.callback_signing_key")).PHP_EOL;
echo "auth_set=".(config("services.mopay.auth_key") ? "yes" : "no").PHP_EOL;
'
"""
    return d.run(client, cmd, timeout=180)


if __name__ == "__main__":
    raise SystemExit(main())
