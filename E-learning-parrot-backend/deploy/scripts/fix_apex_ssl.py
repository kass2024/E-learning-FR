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
getent ahostsv4 xanderglobalacademy.com || true
echo "=== Current certs ==="
certbot certificates 2>/dev/null | sed -n '/Certificate Name/,+8p'
echo "=== Cert served for apex on this server ==="
echo | openssl s_client -servername xanderglobalacademy.com -connect 127.0.0.1:443 2>/dev/null | openssl x509 -noout -subject -ext subjectAltName 2>/dev/null || true
echo "=== Try issue/expand SSL for apex ==="
# Expand existing cert or create new covering apex
certbot --apache -d xanderglobalacademy.com -d api.xanderglobalacademy.com --expand --non-interactive --agree-tos --register-unsafely-without-email --redirect && echo SSL_OK || echo SSL_FAIL
# Also try standalone apex-only if expand failed
if ! certbot certificates 2>/dev/null | grep -q 'Domains:.*xanderglobalacademy.com'; then
  certbot --apache -d xanderglobalacademy.com --non-interactive --agree-tos --register-unsafely-without-email --redirect && echo SSL_APEX_OK || echo SSL_APEX_FAIL
fi
certbot certificates 2>/dev/null | sed -n '/xanderglobalacademy/,+10p'
echo | openssl s_client -servername xanderglobalacademy.com -connect 127.0.0.1:443 2>/dev/null | openssl x509 -noout -subject -ext subjectAltName 2>/dev/null || true
curl -sk -o /dev/null -w 'https_apex_local:%{http_code}\n' --resolve xanderglobalacademy.com:443:127.0.0.1 https://xanderglobalacademy.com/
curl -sk -o /dev/null -w 'https_api:%{http_code}\n' https://api.xanderglobalacademy.com/up
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
