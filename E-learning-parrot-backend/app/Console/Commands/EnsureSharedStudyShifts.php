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

    protected $description = 'Attach shared Monday evening study shifts (Groups 1–5) to all courses in a tenant';

    public function handle(StudyShiftProvisioningService $provisioning): int
    {
        $raw = $this->option('institution');
        $institutionId = ($raw === null || $raw === '') ? null : (int) $raw;

        $shifts = $provisioning->ensureSharedMondayEveningShiftsForTenant($institutionId);

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
            'Ensured %d shared shifts attached to %d courses (institution=%s).',
            $shifts->count(),
            $courseCount,
            $institutionId === null ? 'hub' : (string) $institutionId
        ));

        foreach ($shifts as $shift) {
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

        return self::SUCCESS;
    }
}
