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
docker compose -f docker-compose.prod.yml --env-file .env.production exec -T backend ls -la database/migrations/2026_07_17_090000_create_meeting_engagement_tables.php
docker compose -f docker-compose.prod.yml --env-file .env.production exec -T backend php artisan migrate:status | tail -n 40
docker compose -f docker-compose.prod.yml --env-file .env.production exec -T backend php -r "require 'vendor/autoload.php'; \$app=require 'bootstrap/app.php'; \$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap(); echo 'qa='.(Schema::hasTable('meeting_qa_items')?'1':'0').PHP_EOL; echo 'polls='.(Schema::hasTable('meeting_polls')?'1':'0').PHP_EOL; echo 'breakouts='.(Schema::hasTable('meeting_breakout_rooms')?'1':'0').PHP_EOL; echo 'stage='.(Schema::hasTable('meeting_stage_members')?'1':'0').PHP_EOL;"
"""
raise SystemExit(d.run(client, cmd, timeout=120))
