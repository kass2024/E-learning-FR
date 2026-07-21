<?php

namespace App\Console\Commands;

use App\Models\Course;
use App\Models\StudyShift;
use App\Services\StudyShiftProvisioningService;
use Illuminate\Console\Command;

class ReplaceFrwandaFlyerStudyShifts extends Command
{
    protected $signature = 'study-shifts:replace-frwanda-flyer
                            {--institution= : Platform institution id (omit for hub)}
                            {--keep-existing : Do not wipe; only ensure flyer slots exist}';

    protected $description = 'Wipe duplicate study shifts and install the official F&R Day/Evening/Weekend flyer schedule';

    public function handle(StudyShiftProvisioningService $provisioning): int
    {
        $raw = $this->option('institution');
        $institutionId = ($raw === null || $raw === '') ? null : (int) $raw;

        $before = StudyShift::query()->count();

        if ($this->option('keep-existing')) {
            $shifts = $provisioning->ensureFrwandaFlyerShiftsForTenant($institutionId);
            $this->warn('Kept existing shifts; ensured flyer slots only.');
        } else {
            $this->info("Wiping all study shifts (currently {$before})…");
            $shifts = $provisioning->replaceAllWithFrwandaFlyerSchedule($institutionId);
        }

        $courseQuery = Course::query();
        if ($institutionId === null) {
            $courseQuery->whereNull('platform_institution_id');
        } else {
            $courseQuery->where('platform_institution_id', $institutionId);
        }

        $this->info(sprintf(
            'Installed %d F&R flyer shifts for %d courses (was %d rows).',
            $shifts->count(),
            $courseQuery->count(),
            $before
        ));

        $grouped = $shifts->groupBy(fn (StudyShift $s) => $s->name . '|' . substr((string) $s->start_time, 0, 5));
        foreach ($grouped as $key => $rows) {
            /** @var StudyShift $sample */
            $sample = $rows->first();
            $days = $rows->pluck('day_of_week')->sort()->values()->implode(',');
            $this->line(sprintf(
                '  %s  %s–%s  days=[%s]  courses=%d',
                $sample->name,
                substr((string) $sample->start_time, 0, 5),
                substr((string) $sample->end_time, 0, 5),
                $days,
                $sample->courses()->count()
            ));
        }

        return self::SUCCESS;
    }
}
