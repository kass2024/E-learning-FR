<?php

namespace App\Services;

use App\Models\Course;
use App\Models\CourseEnrollment;
use App\Models\StudyShift;
use App\Support\ApiListCache;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class StudyShiftProvisioningService
{
    /** Weekdays Mon–Fri (0=Sun … 6=Sat). */
    public const WEEKDAYS = [1, 2, 3, 4, 5];

    public const WEEKEND_DAYS = [0, 6];

    /**
     * Official F&R Rwanda preparation schedule (flyer).
     * Each entry expands across days_of_week into one DB row per day.
     *
     * @var array<int, array{name: string, start_time: string, end_time: string, language: string, days: array<int, int>, notes: string}>
     */
    public const FRWANDA_FLYER_SLOTS = [
        [
            'name' => 'Day Group 1 · English Beginners',
            'start_time' => '09:00',
            'end_time' => '11:00',
            'language' => 'english',
            'days' => self::WEEKDAYS,
            'notes' => 'F&R Day Program — English Beginners',
        ],
        [
            'name' => 'Day Group 2 · French Beginners',
            'start_time' => '11:00',
            'end_time' => '13:00',
            'language' => 'french',
            'days' => self::WEEKDAYS,
            'notes' => 'F&R Day Program — French Beginners',
        ],
        [
            'name' => 'Day Group 3 · English Elementary',
            'start_time' => '13:00',
            'end_time' => '15:00',
            'language' => 'english',
            'days' => self::WEEKDAYS,
            'notes' => 'F&R Day Program — English Elementary',
        ],
        [
            'name' => 'Day Group 4 · French Elementary',
            'start_time' => '15:00',
            'end_time' => '17:00',
            'language' => 'french',
            'days' => self::WEEKDAYS,
            'notes' => 'F&R Day Program — French Elementary',
        ],
        [
            'name' => 'Evening · English Intermediate',
            'start_time' => '17:00',
            'end_time' => '19:00',
            'language' => 'english',
            'days' => self::WEEKDAYS,
            'notes' => 'F&R Evening Program — English Intermediate',
        ],
        [
            'name' => 'Evening · French Intermediate',
            'start_time' => '19:00',
            'end_time' => '21:00',
            'language' => 'french',
            'days' => self::WEEKDAYS,
            'notes' => 'F&R Evening Program — French Intermediate',
        ],
        [
            'name' => 'Weekend Intensive',
            'start_time' => '09:00',
            'end_time' => '15:00',
            'language' => 'all',
            'days' => self::WEEKEND_DAYS,
            'notes' => 'F&R Weekend Intensive — Listening, Speaking, Reading, Writing, Practice Tests & Strategy',
        ],
    ];

    /** @deprecated Kept for backwards compatibility; flyer slots replace Groups 1–7. */
    public const DEFAULT_TEMPLATES = [];

    /**
     * Shifts a learner may pick: linked via pivot, legacy course_id, or true global (no courses).
     */
    public function shiftsForCourseRegistration(Course $course, ?int $institutionId = null): Collection
    {
        $query = StudyShift::query()
            ->with(['courses:id,title', 'course:id,title'])
            ->withCount('enrollmentLinks')
            ->where('is_active', true)
            ->where(function ($q) use ($course) {
                // True globals: course_id null and no pivot rows
                $q->where(function ($global) {
                    $global->whereNull('course_id')->whereDoesntHave('courses');
                })
                    // Linked to this course via pivot
                    ->orWhereHas('courses', fn ($sub) => $sub->where('courses.id', $course->id))
                    // Legacy single-course FK
                    ->orWhere('course_id', $course->id);
            });

        $this->applyInstitutionScope($query, $course, $institutionId);

        return $query
            ->orderBy('day_of_week')
            ->orderBy('start_time')
            ->get()
            ->unique('id')
            ->values();
    }

    /**
     * When a course has no shifts, seed the official F&R flyer schedule for the tenant.
     */
    public function ensureDefaultsForCourse(Course $course, ?int $createdBy = null): Collection
    {
        $institutionId = $course->platform_institution_id
            ? (int) $course->platform_institution_id
            : null;

        $existing = $this->shiftsForCourseRegistration($course, $institutionId);
        if ($existing->isNotEmpty()) {
            return $existing;
        }

        $this->ensureFrwandaFlyerShiftsForTenant($institutionId, $createdBy);

        return $this->shiftsForCourseRegistration($course, $institutionId);
    }

    /**
     * Alias kept for artisan/deploy scripts — now seeds the F&R flyer schedule.
     *
     * @return Collection<int, StudyShift>
     */
    public function ensureSharedMondayEveningShiftsForTenant(?int $institutionId = null, ?int $createdBy = null): Collection
    {
        return $this->ensureFrwandaFlyerShiftsForTenant($institutionId, $createdBy);
    }

    /**
     * Delete every study shift (and enrollment links), then insert the F&R flyer schedule.
     *
     * @return Collection<int, StudyShift>
     */
    public function replaceAllWithFrwandaFlyerSchedule(?int $institutionId = null, ?int $createdBy = null): Collection
    {
        return DB::transaction(function () use ($institutionId, $createdBy) {
            $this->wipeAllStudyShifts();

            return $this->ensureFrwandaFlyerShiftsForTenant($institutionId, $createdBy);
        });
    }

    /**
     * Idempotent: create missing flyer slots and attach matching courses.
     *
     * @return Collection<int, StudyShift>
     */
    public function ensureFrwandaFlyerShiftsForTenant(?int $institutionId = null, ?int $createdBy = null): Collection
    {
        $courses = $this->tenantCourses($institutionId);
        if ($courses->isEmpty()) {
            return collect();
        }

        $englishIds = $this->courseIdsMatchingLanguage($courses, 'english');
        $frenchIds = $this->courseIdsMatchingLanguage($courses, 'french');
        $allIds = $courses->pluck('id')->map(fn ($id) => (int) $id)->all();

        // Unmatched courses (e.g. Kinyarwanda) still get weekend intensive.
        $fallbackIds = array_values(array_diff($allIds, $englishIds, $frenchIds));

        $shifts = collect();

        foreach (self::FRWANDA_FLYER_SLOTS as $slot) {
            $courseIds = match ($slot['language']) {
                'english' => $englishIds !== [] ? $englishIds : $allIds,
                'french' => $frenchIds !== [] ? $frenchIds : $allIds,
                default => $allIds,
            };

            if ($slot['language'] === 'all' && $fallbackIds !== []) {
                $courseIds = $allIds;
            }

            foreach ($slot['days'] as $day) {
                $shift = StudyShift::query()
                    ->where('name', $slot['name'])
                    ->where('day_of_week', $day)
                    ->where('start_time', $slot['start_time'])
                    ->where('end_time', $slot['end_time'])
                    ->when(
                        $institutionId === null,
                        fn ($q) => $q->whereNull('platform_institution_id'),
                        fn ($q) => $q->where('platform_institution_id', $institutionId)
                    )
                    ->first();

                if (!$shift) {
                    $shift = StudyShift::query()->create([
                        'course_id' => $courseIds[0] ?? null,
                        'name' => $slot['name'],
                        'day_of_week' => $day,
                        'start_time' => $slot['start_time'],
                        'end_time' => $slot['end_time'],
                        'timezone' => 'Africa/Kigali',
                        'max_students' => 20,
                        'is_active' => true,
                        'platform_institution_id' => $institutionId,
                        'created_by' => $createdBy,
                        'notes' => $slot['notes'],
                    ]);
                } else {
                    $shift->fill([
                        'max_students' => $shift->max_students ?: 20,
                        'is_active' => true,
                        'timezone' => $shift->timezone ?: 'Africa/Kigali',
                        'notes' => $slot['notes'],
                        'course_id' => $courseIds[0] ?? $shift->course_id,
                    ]);
                    $shift->save();
                }

                $this->syncShiftCourses($shift, $courseIds);
                $shifts->push($shift->fresh(['courses']));
            }
        }

        if (class_exists(ApiListCache::class)) {
            try {
                ApiListCache::bump('study_shifts');
            } catch (\Throwable) {
                // optional
            }
        }

        return $shifts->values();
    }

    public function wipeAllStudyShifts(): void
    {
        CourseEnrollment::query()
            ->whereNotNull('study_shift_id')
            ->update(['study_shift_id' => null]);

        DB::table('course_enrollment_study_shifts')->delete();

        if (DB::getSchemaBuilder()->hasTable('study_shift_change_requests')) {
            DB::table('study_shift_change_requests')->delete();
        }

        if (DB::getSchemaBuilder()->hasTable('course_study_shift')) {
            DB::table('course_study_shift')->delete();
        }

        StudyShift::query()->delete();

        if (class_exists(ApiListCache::class)) {
            try {
                ApiListCache::bump('study_shifts');
            } catch (\Throwable) {
                // optional
            }
        }
    }

    /**
     * @return Collection<int, Course>
     */
    public function tenantCourses(?int $institutionId): Collection
    {
        $query = Course::query();
        if ($institutionId === null) {
            $query->whereNull('platform_institution_id');
        } else {
            $query->where('platform_institution_id', $institutionId);
        }

        return $query->orderBy('id')->get();
    }

    /**
     * @param  Collection<int, Course>  $courses
     * @return array<int, int>
     */
    public function courseIdsMatchingLanguage(Collection $courses, string $language): array
    {
        $englishHints = ['english', 'ielts', 'celpip', 'toefl', 'pte'];
        $frenchHints = ['french', 'français', 'francais', 'delf', 'dalf', 'tef', 'tcf'];

        $hints = $language === 'french' ? $frenchHints : $englishHints;

        return $courses
            ->filter(function (Course $course) use ($hints) {
                $title = mb_strtolower((string) $course->title);

                foreach ($hints as $hint) {
                    if (str_contains($title, $hint)) {
                        return true;
                    }
                }

                return false;
            })
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->values()
            ->all();
    }

    /**
     * @return array<int, int>
     */
    public function programCourseIds(Course $course): array
    {
        if (!$course->program_id) {
            return [];
        }

        return Course::query()
            ->where('program_id', $course->program_id)
            ->where('id', '!=', $course->id)
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->all();
    }

    public function shiftAppliesToCourse(StudyShift $shift, Course $course): bool
    {
        if ($shift->relationLoaded('courses')) {
            if ($shift->courses->contains('id', $course->id)) {
                return true;
            }
        } elseif ($shift->courses()->where('courses.id', $course->id)->exists()) {
            return true;
        }

        if ($shift->course_id === null && !$shift->courses()->exists()) {
            return true;
        }

        if ((int) $shift->course_id === (int) $course->id) {
            return true;
        }

        if (!$course->program_id || !$shift->course_id) {
            return false;
        }

        return Course::query()
            ->where('id', $shift->course_id)
            ->where('program_id', $course->program_id)
            ->exists();
    }

    /**
     * @param array<int, int> $courseIds
     */
    public function syncShiftCourses(StudyShift $shift, array $courseIds): void
    {
        $courseIds = array_values(array_unique(array_filter(array_map('intval', $courseIds))));

        if ($courseIds === []) {
            $shift->courses()->detach();

            return;
        }

        $shift->courses()->sync($courseIds);
        $shift->course_id = $courseIds[0];
        $shift->save();
    }

    private function applyInstitutionScope($query, Course $course, ?int $institutionId): void
    {
        if ($institutionId !== null) {
            $query->where(function ($q) use ($institutionId) {
                $q->whereNull('platform_institution_id')
                    ->orWhere('platform_institution_id', $institutionId);
            });

            return;
        }

        $query->where(function ($q) use ($course) {
            $q->whereNull('platform_institution_id');
            if (!empty($course->platform_institution_id)) {
                $q->orWhere('platform_institution_id', (int) $course->platform_institution_id);
            }
        });
    }
}
