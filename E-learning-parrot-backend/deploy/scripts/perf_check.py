#!/usr/bin/env python3
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

cmd = r'''
set -e
echo "=== timing www homepage ==="
curl -sk -o /dev/null -w 'dns:%{time_namelookup} connect:%{time_connect} tls:%{time_appconnect} ttfb:%{time_starttransfer} total:%{time_total} size:%{size_download} code:%{http_code}\n' https://www.xanderglobalacademy.com/
echo "=== compression? ==="
curl -sk -I -H 'Accept-Encoding: gzip, deflate, br' https://www.xanderglobalacademy.com/ | tr -d '\r' | grep -iE 'HTTP/|content-type|content-encoding|content-length|cache-control|server'
echo "=== asset sizes in frontend container ==="
docker exec parrot_frontend sh -c 'ls -lhS /usr/share/nginx/html/assets 2>/dev/null | head -20'
echo "=== sample JS timing ==="
JS=$(curl -sk https://www.xanderglobalacademy.com/ | grep -oE '/assets/[^"]+\.js' | head -3)
for u in $JS; do
  curl -sk -o /dev/null -w "$u total:%{time_total} size:%{size_download} encoding:%{header_json}\n" -H 'Accept-Encoding: gzip' "https://www.xanderglobalacademy.com$u" 2>/dev/null || \
  curl -sk -o /dev/null -D- -o /tmp/js.bin -H 'Accept-Encoding: gzip' "https://www.xanderglobalacademy.com$u" | tr -d '\r' | grep -iE 'HTTP/|content-encoding|content-length|content-type'
  echo "--- $u ---"
  curl -sk -o /tmp/js.bin -D /tmp/jh -H 'Accept-Encoding: gzip, br' "https://www.xanderglobalacademy.com$u"
  tr -d '\r' < /tmp/jh | grep -iE 'HTTP/|content-encoding|content-length|content-type|cache'
  ls -lh /tmp/js.bin
done
echo "=== edge nginx gzip ==="
docker exec parrot_nginx nginx -T 2>/dev/null | grep -i gzip | head -20 || true
docker exec parrot_frontend nginx -T 2>/dev/null | grep -i gzip | head -20 || true
'''
_, out, _ = c.exec_command(cmd, get_pty=True, timeout=120)
ch = out.channel
while True:
    while ch.recv_ready():
        sys.stdout.buffer.write(ch.recv(8192)); sys.stdout.buffer.flush()
    if ch.exit_status_ready() and not ch.recv_ready():
        break
    time.sleep(0.05)
print("\nEXIT", ch.recv_exit_status())
c.close()
