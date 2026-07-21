<?php

namespace App\Console\Commands;

use App\Models\Course;
use App\Services\StudyShiftProvisioningService;
use App\Support\ApiListCache;
use Illuminate\Console\Command;

class EnsureSharedStudyShifts extends Command
{
    protected $signature = 'study-shifts:ensure-shared
                            {--institution= : Platform institution id (omit for hub courses)}';

    protected $description = 'Ensure official F&R Day/Evening/Weekend flyer study shifts exist for the tenant';

    public function handle(StudyShiftProvisioningService $provisioning): int
    {
        $raw = $this->option('institution');
        $institutionId = ($raw === null || $raw === '') ? null : (int) $raw;

        $shifts = $provisioning->ensureFrwandaFlyerShiftsForTenant($institutionId);

        $courseQuery = Course::query();
        if ($institutionId === null) {
            $courseQuery->whereNull('platform_institution_id');
        } else {
            $courseQuery->where('platform_institution_id', $institutionId);
        }
        $courseCount = $courseQuery->count();

        if (class_exists(ApiListCache::class)) {
            ApiListCache::bump('study_shifts');
        }

        $this->info(sprintf(
            'Ensured %d F&R flyer shifts attached across %d courses (institution=%s).',
            $shifts->count(),
            $courseCount,
            $institutionId === null ? 'hub' : (string) $institutionId
        ));

        foreach ($shifts->take(20) as $shift) {
            $this->line(sprintf(
                '  #%d %s · day %d %s–%s · courses=%d',
                $shift->id,
                $shift->name,
                $shift->day_of_week,
                substr((string) $shift->start_time, 0, 5),
                substr((string) $shift->end_time, 0, 5),
                $shift->courses()->count()
            ));
        }

        if ($shifts->count() > 20) {
            $this->line('  …');
        }

        return self::SUCCESS;
    }
}
