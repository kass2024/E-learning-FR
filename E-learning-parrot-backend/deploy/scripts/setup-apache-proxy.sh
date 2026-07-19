#!/bin/bash
# Add ONE Apache vhost for frwanda.com → Docker 127.0.0.1:8091
# Safe: does NOT touch /var/www DocumentRoots, Xander sites, or other Docker stacks.
set -euo pipefail

PORT="${PARROT_HTTP_PORT:-8093}"
CONF="/etc/apache2/sites-available/frwanda-elearning.conf"

echo "==> Existing /var/www (left unchanged):"
ls -la /var/www 2>/dev/null || true

echo "==> Existing Docker containers (Xander parrot_* left alone):"
docker ps --format '{{.Names}}' 2>/dev/null | head -40 || true

sudo tee "$CONF" > /dev/null <<EOF
# F&R Rwanda e-learning — reverse proxy only
# Docker: 127.0.0.1:${PORT} — Apache keeps 80/443 for other /var/www sites
<VirtualHost *:80>
    ServerName frwanda.com
    ServerAlias www.frwanda.com api.frwanda.com

    ProxyPreserveHost On
    ProxyPass / http://127.0.0.1:${PORT}/
    ProxyPassReverse / http://127.0.0.1:${PORT}/

    ErrorLog \${APACHE_LOG_DIR}/frwanda-elearning-error.log
    CustomLog \${APACHE_LOG_DIR}/frwanda-elearning-access.log combined
</VirtualHost>
EOF

sudo a2enmod proxy proxy_http headers rewrite
sudo a2ensite frwanda-elearning.conf
sudo apache2ctl configtest
sudo systemctl reload apache2

echo "OK: only frwanda-elearning.conf added. /var/www and Xander vhosts untouched."
echo "HTTPS: sudo certbot --apache -d frwanda.com -d www.frwanda.com -d api.frwanda.com"
