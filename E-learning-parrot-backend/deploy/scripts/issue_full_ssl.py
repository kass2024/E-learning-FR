#!/usr/bin/env python3
import sys, time
from pathlib import Path
import paramiko

cfg = {}
for raw in Path(__file__).resolve().parent.parent.joinpath("vps.env").read_text().splitlines():
    if raw.strip() and not raw.startswith("#") and "=" in raw:
        k, v = raw.split("=", 1)
        cfg[k.strip()] = v.strip()

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(cfg["VPS_HOST"].split("@")[1], username=cfg["VPS_HOST"].split("@")[0], password=cfg["VPS_PASSWORD"], timeout=30)

cmd = r'''
set -e
echo "=== DNS from VPS ==="
getent ahostsv4 xanderglobalacademy.com www.xanderglobalacademy.com api.xanderglobalacademy.com || true

echo "=== Issue SSL for apex + www + api ==="
certbot --apache \
  -d xanderglobalacademy.com \
  -d www.xanderglobalacademy.com \
  -d api.xanderglobalacademy.com \
  --expand \
  --non-interactive --agree-tos --register-unsafely-without-email --redirect \
  && echo SSL_OK || echo SSL_EXPAND_FAIL

# If expand failed, try fresh cert name
if ! certbot certificates 2>/dev/null | grep -A2 'Certificate Name:.*xanderglobalacademy' | grep -q 'Domains:.*xanderglobalacademy.com'; then
  certbot --apache \
    -d xanderglobalacademy.com \
    -d www.xanderglobalacademy.com \
    -d api.xanderglobalacademy.com \
    --cert-name xanderglobalacademy.com \
    --non-interactive --agree-tos --register-unsafely-without-email --redirect \
    && echo SSL_NEW_OK || echo SSL_NEW_FAIL
fi

echo "=== Certs ==="
certbot certificates 2>/dev/null | sed -n '/xanderglobalacademy/,+8p;/api.xanderglobalacademy/,+8p'

echo "=== Verify SAN ==="
echo | openssl s_client -servername xanderglobalacademy.com -connect 127.0.0.1:443 2>/dev/null | openssl x509 -noout -subject -ext subjectAltName

echo "=== HTTPS checks ==="
curl -sS -o /dev/null -w 'apex:%{http_code}\n' --resolve xanderglobalacademy.com:443:127.0.0.1 https://xanderglobalacademy.com/
curl -sS -o /dev/null -w 'www:%{http_code}\n' --resolve www.xanderglobalacademy.com:443:127.0.0.1 https://www.xanderglobalacademy.com/
curl -sS -o /dev/null -w 'api:%{http_code}\n' --resolve api.xanderglobalacademy.com:443:127.0.0.1 https://api.xanderglobalacademy.com/up

# public (may still cache old DNS)
curl -sS -o /dev/null -w 'public_apex:%{http_code}\n' https://xanderglobalacademy.com/ || true
curl -sS -o /dev/null -w 'public_www:%{http_code}\n' https://www.xanderglobalacademy.com/ || true
curl -sS -o /dev/null -w 'public_api:%{http_code}\n' https://api.xanderglobalacademy.com/up || true
'''
_, out, _ = c.exec_command(cmd, get_pty=True, timeout=300)
ch = out.channel
while True:
    while ch.recv_ready():
        sys.stdout.buffer.write(ch.recv(8192)); sys.stdout.buffer.flush()
    if ch.exit_status_ready() and not ch.recv_ready():
        break
    time.sleep(0.05)
print("\nEXIT", ch.recv_exit_status())
c.close()
