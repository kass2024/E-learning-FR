#!/usr/bin/env python3
"""Issue SSL for domains that already point only to this VPS."""
import sys, time
from pathlib import Path
import paramiko

DEPLOY = Path(__file__).resolve().parent.parent
cfg = {}
for raw in (DEPLOY / "vps.env").read_text().splitlines():
    if raw.strip() and not raw.startswith("#") and "=" in raw:
        k, v = raw.split("=", 1)
        cfg[k.strip()] = v.strip()

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(cfg["VPS_HOST"].split("@")[1], username=cfg["VPS_HOST"].split("@")[0], password=cfg["VPS_PASSWORD"], timeout=30)

cmd = r"""
set -e
echo '=== DNS from VPS ==='
getent hosts api.xanderglobalacademy.com www.xanderglobalacademy.com xanderglobalacademy.com || true
echo '=== Try SSL for api + www (apex may still have multi-A) ==='
certbot --apache -d api.xanderglobalacademy.com -d www.xanderglobalacademy.com --non-interactive --agree-tos --register-unsafely-without-email --redirect && echo SSL_API_WWW_OK || echo SSL_API_WWW_FAILED
echo '=== Try apex alone ==='
certbot --apache -d xanderglobalacademy.com --non-interactive --agree-tos --register-unsafely-without-email --redirect && echo SSL_APEX_OK || echo SSL_APEX_FAILED
certbot certificates 2>/dev/null | sed -n '/xanderglobalacademy/,+6p' || true
curl -sk -o /dev/null -w 'https_api:%{http_code}\n' https://api.xanderglobalacademy.com/up || true
curl -sk -o /dev/null -w 'https_www:%{http_code}\n' https://www.xanderglobalacademy.com/ || true
"""
_, out, _ = c.exec_command(cmd, get_pty=True, timeout=300)
ch = out.channel
while True:
    while ch.recv_ready():
        sys.stdout.buffer.write(ch.recv(4096)); sys.stdout.buffer.flush()
    if ch.exit_status_ready() and not ch.recv_ready():
        break
    time.sleep(0.1)
print("\nEXIT", ch.recv_exit_status())
c.close()
