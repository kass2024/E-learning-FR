#!/usr/bin/env python3
import sys, time, socket
from pathlib import Path
import paramiko

DEPLOY = Path(__file__).resolve().parent.parent
cfg = {}
for raw in (DEPLOY / "vps.env").read_text().splitlines():
    if raw.strip() and not raw.startswith("#") and "=" in raw:
        k,v = raw.split("=",1); cfg[k.strip()]=v.strip()

print("=== Local DNS resolve ===")
for h in ["xanderglobalacademy.com","www.xanderglobalacademy.com","api.xanderglobalacademy.com"]:
    try:
        ips = sorted({i[4][0] for i in socket.getaddrinfo(h, None, socket.AF_INET)})
        print(f"  {h}: {ips}")
    except Exception as e:
        print(f"  {h}: {e}")

c = paramiko.SSHClient(); c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(cfg["VPS_HOST"].split("@")[1], username=cfg["VPS_HOST"].split("@")[0], password=cfg["VPS_PASSWORD"], timeout=30)

cmd = r'''
set -e
echo "=== Apache elearning vhosts ==="
ls -la /etc/apache2/sites-enabled/ | grep -i xander || true
echo "=== xander-academy configs ==="
for f in /etc/apache2/sites-available/xander-academy-elearning*.conf; do
  echo "---- $f ----"
  cat "$f"
done
echo "=== default / 000-default DocumentRoot ==="
grep -E 'ServerName|DocumentRoot|ProxyPass|VirtualHost' /etc/apache2/sites-enabled/* 2>/dev/null | head -80
echo "=== docker ==="
docker ps --filter name=parrot_ --format '{{.Names}} {{.Status}} {{.Ports}}'
echo "=== what responds ==="
curl -sS -D- -o /tmp/b.html -H 'Host: xanderglobalacademy.com' http://127.0.0.1/ | head -20
head -5 /tmp/b.html
echo "---"
curl -sS -o /tmp/f.html -w 'www_local:%{http_code}\n' -H 'Host: www.xanderglobalacademy.com' http://127.0.0.1/
head -c 200 /tmp/f.html; echo
curl -sS -o /tmp/a.html -w 'api_local:%{http_code}\n' -H 'Host: api.xanderglobalacademy.com' http://127.0.0.1/
head -c 200 /tmp/a.html; echo
curl -sS -o /dev/null -w 'api_up:%{http_code}\n' -H 'Host: api.xanderglobalacademy.com' http://127.0.0.1/up
# frontend container directly - is it React?
curl -sS http://$(docker inspect -f '{{range.NetworkSettings.Networks}}{{.IPAddress}}{{end}}' parrot_frontend)/ | head -c 300; echo
# public
curl -sS -o /dev/null -w 'pub_apex:%{http_code} ip_via_resolve\n' http://xanderglobalacademy.com/ || true
curl -sS -o /dev/null -w 'pub_www:%{http_code}\n' http://www.xanderglobalacademy.com/ || true
curl -sS -o /dev/null -w 'pub_api:%{http_code}\n' http://api.xanderglobalacademy.com/up || true
curl -sk -o /dev/null -w 'https_www:%{http_code}\n' https://www.xanderglobalacademy.com/ || true
curl -sk -o /dev/null -w 'https_api:%{http_code}\n' https://api.xanderglobalacademy.com/up || true
getent ahostsv4 xanderglobalacademy.com www.xanderglobalacademy.com api.xanderglobalacademy.com || true
'''
_, out, _ = c.exec_command(cmd, get_pty=True, timeout=90)
ch = out.channel
while True:
    while ch.recv_ready():
        sys.stdout.buffer.write(ch.recv(8192)); sys.stdout.buffer.flush()
    if ch.exit_status_ready() and not ch.recv_ready(): break
    time.sleep(0.05)
print("\nEXIT", ch.recv_exit_status())
c.close()
