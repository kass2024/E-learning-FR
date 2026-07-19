<?php

return [
    'contact_email' => env('PLATFORM_CONTACT_EMAIL', 'frwanda19juillet2020@gmail.com'),
    /** Default dashboard password — local dev and cPanel (override via SEED_PLATFORM_PASSWORD in .env). */
    'default_password' => 'Frwanda@2026',
    'seed_password' => trim(
        (string) env('SEED_PLATFORM_PASSWORD', 'Frwanda@2026'),
        " \t\n\r\0\x0B'\""
    ),
    'admin_name' => trim((string) env('PLATFORM_ADMIN_NAME', 'F&R Rwanda Admin')),
    'certificate_prefix' => 'FR',
    'admin_email' => strtolower(trim((string) env(
        'PLATFORM_ADMIN_EMAIL',
        'frwanda19juillet2020@gmail.com'
    ))),
];
