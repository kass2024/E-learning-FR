<?php

require '/var/www/html/vendor/autoload.php';
$app = require '/var/www/html/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$m = App\Models\CourseMaterial::query()
    ->whereIn('type', ['daily', 'zoom'])
    ->orderByDesc('id')
    ->first();

if (!$m) {
    echo "NO_MATERIAL\n";
    exit(1);
}

echo 'material=' . $m->id . ' type=' . $m->type . "\n";
echo 'provider=' . App\Support\CourseMaterialHelper::meetingProvider($m)->value . "\n";
echo 'is_live=' . (int) App\Support\CourseMaterialHelper::isLiveClassSession($m) . "\n";
echo 'is_daily=' . (int) App\Support\CourseMaterialHelper::isDailyMeeting($m) . "\n";

$u = App\Models\User::query()
    ->whereRaw('LOWER(email)=?', ['instructor@xanderglobalscholars.com'])
    ->first()
    ?: App\Models\User::query()->where('role', 'instructor')->orderByDesc('id')->first();

echo 'host=' . ($u?->email ?? 'none') . "\n";

try {
    app(App\Support\ZoomMeetingBrandingResolver::class)->finalizeHostSdkBranding(
        [
            'host' => ['name' => 'x', 'email' => null, 'avatar_url' => null],
            'company' => ['name' => 'Hub'],
        ],
        ['name' => 'x', 'email' => null, 'avatar_url' => null],
        $u,
    );
    echo "branding_ok\n";
} catch (Throwable $e) {
    echo 'branding_fail=' . $e->getMessage() . "\n";
}

if (App\Support\CourseMaterialHelper::isDailyMeeting($m)) {
    try {
        $sdk = app(App\Services\Meetings\LiveMeetingJoinService::class)
            ->buildDailySdkPayload($m, 'Smoke Host', 'instructor-smoke', true);
        echo 'daily_sdk_ok room=' . ($sdk['room_name'] ?? '')
            . ' token=' . (empty($sdk['token']) ? 'missing' : 'set') . "\n";
    } catch (Throwable $e) {
        echo 'daily_sdk_fail=' . $e->getMessage() . "\n";
        exit(2);
    }
} else {
    echo "not_daily_skip_sdk\n";
}

echo "SMOKE_DONE\n";
