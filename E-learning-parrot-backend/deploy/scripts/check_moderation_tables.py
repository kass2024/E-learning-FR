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
docker compose -f docker-compose.prod.yml --env-file .env.production exec -T backend php artisan migrate:status 2>/dev/null | grep -i meeting || true
docker compose -f docker-compose.prod.yml --env-file .env.production exec -T backend php -r '
require "vendor/autoload.php";
$app = require "bootstrap/app.php";
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
use Illuminate\Support\Facades\Schema;
echo "hand_raises=" . (Schema::hasTable("meeting_hand_raises") ? "1" : "0") . PHP_EOL;
echo "speaking_grants=" . (Schema::hasTable("meeting_speaking_grants") ? "1" : "0") . PHP_EOL;
echo "mod_events=" . (Schema::hasTable("meeting_moderation_events") ? "1" : "0") . PHP_EOL;
'
"""
raise SystemExit(d.run(client, cmd, timeout=120))
