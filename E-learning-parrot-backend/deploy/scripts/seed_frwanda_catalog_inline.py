#!/usr/bin/env python3
"""Seed F&R courses inside frwanda_backend container (image has no host bind for app code)."""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import ssh_deploy as d
import paramiko

PHP = r"""<?php
require '/var/www/html/vendor/autoload.php';
$app = require '/var/www/html/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Course;
use App\Models\User;
use App\Support\PlatformUserService;
use Illuminate\Support\Facades\Hash;

$password = PlatformUserService::seedPassword();
PlatformUserService::ensureAdminFromEnv($password);

$instructor = User::updateOrCreate(
    ['email' => 'instructor@frwanda.com'],
    [
        'name' => 'F&R Language Instructor',
        'password' => $password,
        'role' => 'instructor',
        'status' => 'Active',
        'platform_institution_id' => null,
    ]
);

$courses = [
    [
        'title' => 'English Course',
        'description' => 'Online English for fluency and proficiency. Monthly 100,000 RWF · Termly (3 months) 240,000 RWF · VIP one-on-one 250,000 RWF/month.',
        'price' => 100000,
        'duration' => 'Flexible (monthly or termly)',
        'requirements' => 'Open to all levels. Interactive online classes with experienced instructors.',
        'status' => 'Active',
        'general_information' => 'Quality Language Education at Affordable Prices.',
    ],
    [
        'title' => 'French Course',
        'description' => 'Online French for fluency and proficiency. Monthly 100,000 RWF · Termly (3 months) 240,000 RWF · VIP one-on-one 250,000 RWF/month.',
        'price' => 100000,
        'duration' => 'Flexible (monthly or termly)',
        'requirements' => 'Open to all levels. Interactive online classes with experienced instructors.',
        'status' => 'Active',
        'general_information' => 'Ecole de la langue francaise au Rwanda.',
    ],
    [
        'title' => 'Kinyarwanda Course',
        'description' => 'Online Kinyarwanda for communication and confidence. Monthly 100,000 RWF · Termly (3 months) 240,000 RWF · VIP one-on-one 250,000 RWF/month.',
        'price' => 100000,
        'duration' => 'Flexible (monthly or termly)',
        'requirements' => 'Open to all levels. Interactive online classes with experienced instructors.',
        'status' => 'Active',
        'general_information' => 'Learn Kinyarwanda online with flexible schedules.',
    ],
];

foreach ($courses as $data) {
    $course = Course::updateOrCreate(
        ['title' => $data['title'], 'platform_institution_id' => null],
        $data
    );
    if (method_exists($instructor, 'assignedCourses')) {
        $instructor->assignedCourses()->syncWithoutDetaching([$course->id]);
    }
    echo "course={$course->id} {$course->title}\n";
}

echo 'total_courses=' . Course::count() . "\n";
echo "done\n";
"""


def main() -> int:
    cfg = d.load_env(d.DEPLOY / "vps.env")
    user, host, port = d.parse_host(cfg["VPS_HOST"])
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(
        hostname=host,
        port=port,
        username=user,
        password=cfg["VPS_PASSWORD"],
        timeout=30,
    )

    sftp = client.open_sftp()
    remote = "/tmp/seed_frwanda_catalog.php"
    with sftp.file(remote, "w") as f:
        f.write(PHP)
    sftp.close()

    cmd = f"""
set -euo pipefail
docker cp {remote} frwanda_backend:/tmp/seed_frwanda_catalog.php
docker exec frwanda_backend php /tmp/seed_frwanda_catalog.php
docker exec frwanda_backend php artisan cache:clear || true
echo '==> API'
curl -sS https://api.frwanda.com/api/admin/courses | head -c 1000
echo
curl -sS -o /dev/null -w 'courses_http:%{{http_code}}\\n' https://api.frwanda.com/api/admin/courses
"""
    return d.run(client, cmd, timeout=180)


if __name__ == "__main__":
    raise SystemExit(main())
