#!/usr/bin/env python3
"""Deploy MoPay payment changes: PHP + env + migrate + frontend dist + register callbacks."""
from __future__ import annotations

import sys
import tarfile
import tempfile
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import ssh_deploy as d
import paramiko

ROOT = Path(__file__).resolve().parents[3]
BE = ROOT / "E-learning-parrot-backend"
FE = ROOT / "E-learning-parrot-frontend"
DIST = FE / "dist"
REMOTE = "/opt/e-learning-frwanda"


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
    if not (DIST / "index.html").is_file():
        raise SystemExit(f"Missing frontend dist at {DIST} — run npm run build first")

    cfg = d.load_env(d.DEPLOY / "vps.env")
    client = connect(cfg)

    php_files = [
        "app/Services/MopayPaymentService.php",
        "app/Http/Controllers/Api/PaymentController.php",
        "app/Http/Controllers/Api/AdminReportsController.php",
        "app/Http/Controllers/Api/LearnerDashboardController.php",
        "app/Models/CoursePayment.php",
        "app/Models/CoursePromoCode.php",
        "app/Support/EnrollmentStatusHelper.php",
        "app/Console/Commands/RegisterMopayCallbacks.php",
        "config/services.php",
        "routes/api.php",
        "database/migrations/2026_07_21_100000_add_mopay_and_proof_to_course_payments.php",
        "database/migrations/2026_07_21_100100_create_course_promo_codes_table.php",
        "database/seeders/CoursePromoCodeSeeder.php",
    ]

    for rel in php_files:
        local = BE / rel
        remote = f"{REMOTE}/E-learning-parrot-backend/{rel}"
        print(f"upload {rel}")
        d.upload(client, local, remote)

    # Sync mopay env keys into container .env.production / app .env
    env_snippet = r"""
set -euo pipefail
ENVF=/opt/e-learning-frwanda/E-learning-parrot-backend/deploy/.env.production
APPENV=/opt/e-learning-frwanda/E-learning-parrot-backend/.env
for F in "$ENVF" "$APPENV"; do
  test -f "$F" || continue
  grep -q '^MOPAY_ACCOUNT_ID=' "$F" 2>/dev/null && sed -i '/^MOPAY_/d' "$F" || true
  cat >> "$F" <<'EOF'

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
MOPAY_PAYMENT_TITLE=F&R Rwanda course payment
EOF
done

BE_CT=$(docker ps --format '{{.Names}}' | grep -i frwanda | grep -i back | head -1)
echo "BE=$BE_CT"
test -n "$BE_CT"

# Copy updated PHP into running container
docker cp /opt/e-learning-frwanda/E-learning-parrot-backend/app/. "$BE_CT:/var/www/html/app/"
docker cp /opt/e-learning-frwanda/E-learning-parrot-backend/config/services.php "$BE_CT:/var/www/html/config/services.php"
docker cp /opt/e-learning-frwanda/E-learning-parrot-backend/routes/api.php "$BE_CT:/var/www/html/routes/api.php"
docker cp /opt/e-learning-frwanda/E-learning-parrot-backend/database/migrations/. "$BE_CT:/var/www/html/database/migrations/"
docker cp /opt/e-learning-frwanda/E-learning-parrot-backend/database/seeders/CoursePromoCodeSeeder.php "$BE_CT:/var/www/html/database/seeders/CoursePromoCodeSeeder.php"

# Refresh container env from deploy file if present
if [ -f "$ENVF" ]; then
  docker cp "$ENVF" "$BE_CT:/var/www/html/.env" || true
fi

docker exec "$BE_CT" php artisan migrate --force
docker exec "$BE_CT" php artisan db:seed --class=CoursePromoCodeSeeder --force || true
docker exec "$BE_CT" php artisan config:clear
docker exec "$BE_CT" php artisan route:clear
docker exec "$BE_CT" php artisan storage:link || true
docker exec "$BE_CT" php artisan mopay:register-callbacks || true

curl -sS -o /dev/null -w 'webhook_ping:%{http_code}\n' 'https://api.frwanda.com/api/admin/payments/mopay/webhook?ping=1' || true
curl -sS -o /dev/null -w 'pay_config:%{http_code}\n' 'https://api.frwanda.com/api/admin/payments/config' || true
"""
    d.run(client, env_snippet, timeout=300)

    with tempfile.TemporaryDirectory() as tmp:
        tar_path = Path(tmp) / "dist.tar.gz"
        print(f"Packing {DIST} ...")
        with tarfile.open(tar_path, "w:gz") as tar:
            tar.add(DIST, arcname="dist")
        print(f"Upload {tar_path.stat().st_size // (1024 * 1024)} MB")
        d.upload(client, tar_path, "/tmp/frwanda-frontend-dist.tar.gz")

    fe_cmd = r"""
set -euo pipefail
FE_CT=$(docker ps --format '{{.Names}}' | grep -i frwanda | grep -i front | head -1)
echo "FE=$FE_CT"
rm -rf /opt/e-learning-frwanda/E-learning-parrot-frontend/dist
mkdir -p /opt/e-learning-frwanda/E-learning-parrot-frontend
tar -xzf /tmp/frwanda-frontend-dist.tar.gz -C /opt/e-learning-frwanda/E-learning-parrot-frontend
rm -f /tmp/frwanda-frontend-dist.tar.gz
docker exec "$FE_CT" sh -c 'rm -rf /usr/share/nginx/html/*'
docker cp /opt/e-learning-frwanda/E-learning-parrot-frontend/dist/. "$FE_CT:/usr/share/nginx/html/"
ENTRY=$(grep -oE 'assets/index-[^"]+\.js' /opt/e-learning-frwanda/E-learning-parrot-frontend/dist/index.html | head -1)
echo "entry=$ENTRY"
docker exec "$FE_CT" test -f "/usr/share/nginx/html/$ENTRY"
docker exec "$FE_CT" cat /usr/share/nginx/html/version.json
curl -sS -o /dev/null -w 'front:%{http_code}\n' https://frwanda.com/
"""
    return d.run(client, fe_cmd, timeout=300)


if __name__ == "__main__":
    raise SystemExit(main())
