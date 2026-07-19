#!/usr/bin/env python3
"""Force Apache SSL config clean for academy domains and ensure proxy works."""
import sys, time
from pathlib import Path
import paramiko

cfg = {}
for raw in Path(__file__).resolve().parent.parent.joinpath("vps.env").read_text().splitlines():
    if raw.strip() and not raw.startswith("#") and "=" in raw:
        k, v = raw.split("=", 1)
        cfg[k.strip()] = v.strip()

SSL_CONF = """<IfModule mod_ssl.c>
# Xander Global Academy — frontend + API (force correct cert)
<VirtualHost *:443>
    Protocols h2 http/1.1
    ServerName xanderglobalacademy.com
    ServerAlias www.xanderglobalacademy.com

    ProxyPreserveHost On
    ProxyPass / http://127.0.0.1:8090/
    ProxyPassReverse / http://127.0.0.1:8090/
    ProxyTimeout 600

    ErrorLog ${APACHE_LOG_DIR}/xander-academy-front-ssl-error.log
    CustomLog ${APACHE_LOG_DIR}/xander-academy-front-ssl-access.log combined

    Include /etc/letsencrypt/options-ssl-apache.conf
    SSLCertificateFile /etc/letsencrypt/live/xanderglobalacademy.com/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/xanderglobalacademy.com/privkey.pem
</VirtualHost>

<VirtualHost *:443>
    Protocols h2 http/1.1
    ServerName api.xanderglobalacademy.com

    ProxyPreserveHost On
    ProxyPass / http://127.0.0.1:8090/
    ProxyPassReverse / http://127.0.0.1:8090/
    ProxyTimeout 600

    ErrorLog ${APACHE_LOG_DIR}/xander-academy-api-ssl-error.log
    CustomLog ${APACHE_LOG_DIR}/xander-academy-api-ssl-access.log combined

    Include /etc/letsencrypt/options-ssl-apache.conf
    SSLCertificateFile /etc/letsencrypt/live/xanderglobalacademy.com/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/xanderglobalacademy.com/privkey.pem
</VirtualHost>
</IfModule>
"""

HTTP_CONF = """# Xander Global Academy — HTTP → HTTPS + proxy
<VirtualHost *:80>
    ServerName xanderglobalacademy.com
    ServerAlias www.xanderglobalacademy.com api.xanderglobalacademy.com

    RewriteEngine on
    RewriteRule ^ https://%{SERVER_NAME}%{REQUEST_URI} [END,NE,R=permanent]
</VirtualHost>
"""

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(cfg["VPS_HOST"].split("@")[1], username=cfg["VPS_HOST"].split("@")[0], password=cfg["VPS_PASSWORD"], timeout=30)

sftp = c.open_sftp()
for path, content in [
    ("/etc/apache2/sites-available/xander-academy-elearning-le-ssl.conf", SSL_CONF),
    ("/etc/apache2/sites-available/xander-academy-elearning.conf", HTTP_CONF),
]:
    with sftp.file(path, "w") as f:
        f.write(content.replace("\r\n", "\n"))
sftp.close()

cmd = r'''
set -e
a2enmod ssl proxy proxy_http headers rewrite http2 >/dev/null
a2ensite xander-academy-elearning.conf xander-academy-elearning-le-ssl.conf >/dev/null
# Ensure docker stack up
cd /opt/e-learning-xander/E-learning-parrot-backend/deploy
docker compose -f docker-compose.prod.yml --env-file .env.production up -d
apache2ctl configtest
systemctl reload apache2

echo "=== cert SAN ==="
openssl x509 -in /etc/letsencrypt/live/xanderglobalacademy.com/fullchain.pem -noout -ext subjectAltName

echo "=== SNI ==="
for name in www.xanderglobalacademy.com xanderglobalacademy.com api.xanderglobalacademy.com; do
  echo "-- $name --"
  echo | openssl s_client -servername "$name" -connect 127.0.0.1:443 2>/dev/null | openssl x509 -noout -ext subjectAltName | head -3
  curl -sk -o /dev/null -w "code:%{http_code}\n" --resolve ${name}:443:127.0.0.1 "https://${name}/"
done

docker ps --filter name=parrot_ --format '{{.Names}} {{.Status}}'
'''
_, out, _ = c.exec_command(cmd, get_pty=True, timeout=180)
ch = out.channel
while True:
    while ch.recv_ready():
        sys.stdout.buffer.write(ch.recv(8192)); sys.stdout.buffer.flush()
    if ch.exit_status_ready() and not ch.recv_ready():
        break
    time.sleep(0.05)
print("\nEXIT", ch.recv_exit_status())
c.close()
