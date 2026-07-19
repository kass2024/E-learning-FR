#!/usr/bin/env python3
import sys, time, socket
from pathlib import Path
import paramiko

cfg = {}
for raw in Path(__file__).resolve().parent.parent.joinpath("vps.env").read_text().splitlines():
    if raw.strip() and not raw.startswith("#") and "=" in raw:
        k, v = raw.split("=", 1)
        cfg[k.strip()] = v.strip()

print("=== Local DNS ===")
for h in ["xanderglobalacademy.com", "www.xanderglobalacademy.com", "api.xanderglobalacademy.com"]:
    try:
        ips = sorted({i[4][0] for i in socket.getaddrinfo(h, None, socket.AF_INET)})
        print(f"  {h}: {ips}")
    except Exception as e:
        print(f"  {h}: {e}")

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(cfg["VPS_HOST"].split("@")[1], username=cfg["VPS_HOST"].split("@")[0], password=cfg["VPS_PASSWORD"], timeout=30)

cmd = r'''
set -e
echo "=== enabled academy sites ==="
ls -la /etc/apache2/sites-enabled/ | grep -iE 'xander-academy|default' || true

echo "=== SSL vhost full ==="
cat /etc/apache2/sites-enabled/xander-academy-elearning-le-ssl.conf

echo "=== HTTP vhost ==="
cat /etc/apache2/sites-enabled/xander-academy-elearning.conf

echo "=== All 443 ServerName ==="
grep -R 'ServerName\|ServerAlias\|SSLCertificateFile\|VirtualHost' /etc/apache2/sites-enabled/* 2>/dev/null | grep -v '.conf:' | head -5
grep -RnE 'ServerName|ServerAlias|SSLCertificateFile|<VirtualHost' /etc/apache2/sites-enabled/ | head -120

echo "=== Cert files and SANs ==="
for d in /etc/letsencrypt/live/xanderglobalacademy.com /etc/letsencrypt/live/api.xanderglobalacademy.com; do
  echo "-- $d --"
  if [ -f "$d/fullchain.pem" ]; then
    openssl x509 -in "$d/fullchain.pem" -noout -subject -ext subjectAltName 2>/dev/null
  fi
done

echo "=== SNI tests against THIS server ==="
for name in xanderglobalacademy.com www.xanderglobalacademy.com api.xanderglobalacademy.com; do
  echo "---- $name ----"
  echo | openssl s_client -servername "$name" -connect 127.0.0.1:443 2>/dev/null | openssl x509 -noout -subject -ext subjectAltName 2>/dev/null
  curl -sk -o /dev/null -w "local_https:%{http_code}\n" --resolve ${name}:443:127.0.0.1 "https://${name}/"
done

echo "=== Public curl from VPS ==="
curl -sS -o /dev/null -w 'pub_www:%{http_code} ssl:%{ssl_verify_result}\n' https://www.xanderglobalacademy.com/login || true
curl -sS -o /dev/null -w 'pub_apex:%{http_code} ssl:%{ssl_verify_result}\n' https://xanderglobalacademy.com/ || true
curl -sS -o /dev/null -w 'pub_api:%{http_code} ssl:%{ssl_verify_result}\n' https://api.xanderglobalacademy.com/up || true

echo "=== getent DNS ==="
getent ahostsv4 xanderglobalacademy.com www.xanderglobalacademy.com || true
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
