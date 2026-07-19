import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import ssh_deploy as d
import paramiko

cfg = d.load_env(d.DEPLOY / "vps.env")
user, host, port = d.parse_host(cfg["VPS_HOST"])
password = cfg["VPS_PASSWORD"]
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(hostname=host, port=port, username=user, password=password, timeout=30)

cmd = r"""
cd /opt/e-learning-xander/E-learning-parrot-backend/deploy
echo '=== INTERNAL CURL VIA NGINX/BACKEND NETWORK ==='
docker compose -f docker-compose.prod.yml --env-file .env.production exec -T backend php -r '
require "vendor/autoload.php";
$app = require "bootstrap/app.php";
$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);
$request = Illuminate\Http\Request::create(
  "/api/admin/meetings/moderation/raise-hand",
  "POST",
  [],
  [],
  [],
  ["CONTENT_TYPE" => "application/json", "HTTP_ACCEPT" => "application/json"],
  json_encode([
    "meeting_key" => "admin-meet-main-test123",
    "daily_session_id" => "sess-e2e-3",
    "participant_name" => "ujeanmethode@gmail.com",
    "meeting_mode" => "meeting",
  ])
);
try {
  $response = $kernel->handle($request);
  echo "STATUS=" . $response->getStatusCode() . PHP_EOL;
  echo $response->getContent() . PHP_EOL;
} catch (Throwable $e) {
  echo "EX=" . $e->getMessage() . PHP_EOL;
  echo $e->getTraceAsString() . PHP_EOL;
}
'
echo '=== LAST LOG ==='
docker compose -f docker-compose.prod.yml --env-file .env.production exec -T backend sh -c 'tail -n 80 storage/logs/laravel.log 2>/dev/null || tail -n 80 storage/logs/*.log 2>/dev/null | tail -n 80'
"""
raise SystemExit(d.run(client, cmd, timeout=120))
