<?php

namespace App\Services;

use App\Models\Course;
use App\Models\StudyShift;
use Illuminate\Support\Collection;

class StudyShiftProvisioningService
{
    public const DEFAULT_TEMPLATES = [
        ['name' => 'Group 1', 'day_of_week' => 1, 'start_time' => '17:30', 'end_time' => '19:30'],
        ['name' => 'Group 2', 'day_of_week' => 1, 'start_time' => '18:00', 'end_time' => '20:00'],
        ['name' => 'Group 3', 'day_of_week' => 1, 'start_time' => '18:30', 'end_time' => '20:30'],
        ['name' => 'Group 4', 'day_of_week' => 1, 'start_time' => '19:00', 'end_time' => '21:00'],
        ['name' => 'Group 5', 'day_of_week' => 1, 'start_time' => '19:30', 'end_time' => '21:30'],
        ['name' => 'Group 6', 'day_of_week' => 1, 'start_time' => '20:00', 'end_time' => '22:00'],
        ['name' => 'Group 7', 'day_of_week' => 1, 'start_time' => '20:30', 'end_time' => '22:30'],
    ];

    /**
     * Shifts a learner may pick: linked via pivot, legacy course_id, or true global (no courses).
     */
    public function shiftsForCourseRegistration(Course $course, ?int $institutionId = null): Collection
    {
        $programCourseIds = $this->programCourseIds($course);

        $query = StudyShift::query()
            ->with(['courses:id,title', 'course:id,title'])
            ->withCount('enrollmentLinks')
            ->where('is_active', true)
            ->where(function ($q) use ($course, $programCourseIds) {
                // True globals: course_id null and no pivot rows
                $q->where(function ($global) {
                    $global->whereNull('course_id')->whereDoesntHave('courses');
                })
                    // Linked to this course via pivot
                    ->orWhereHas('courses', fn ($sub) => $sub->where('courses.id', $course->id))
                    // Legacy single-course FK
                    ->orWhere('course_id', $course->id);

                if ($programCourseIds !== []) {
                    $q->orWhereIn('course_id', $programCourseIds)
                        ->orWhereHas('courses', fn ($sub) => $sub->whereIn('courses.id', $programCourseIds));
                }
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
     * Create default weekly slots when a course has none (signup / admin convenience).
     */
    public function ensureDefaultsForCourse(Course $course, ?int $createdBy = null): Collection
    {
        // Always keep hub shared Monday evening slots attached to every hub course.
        $this->ensureSharedMondayEveningShiftsForTenant(
            $course->platform_institution_id ? (int) $course->platform_institution_id : null,
            $createdBy
        );

        $existing = $this->shiftsForCourseRegistration($course, $course->platform_institution_id);
        if ($existing->isNotEmpty()) {
            return $existing;
        }

        return $this->shiftsForCourseRegistration($course, $course->platform_institution_id);
    }

    /**
     * Ensure Groups 1–5 Monday evening slots exist and are attached to every course
     * in the tenant (hub = platform_institution_id null).
     *
     * @return Collection<int, StudyShift>
     */
    public function ensureSharedMondayEveningShiftsForTenant(?int $institutionId = null, ?int $createdBy = null): Collection
    {
        $courseQuery = Course::query();
        if ($institutionId === null) {
            $courseQuery->whereNull('platform_institution_id');
        } else {
            $courseQuery->where('platform_institution_id', $institutionId);
        }

        $courseIds = $courseQuery->pluck('id')->map(fn ($id) => (int) $id)->all();
        if ($courseIds === []) {
            return collect();
        }

        // Groups 1–5 only (the Mon evening windows used for enrollment).
        $templates = array_slice(self::DEFAULT_TEMPLATES, 0, 5);
        $shifts = collect();

        foreach ($templates as $template) {
            $shift = StudyShift::query()
                ->whereNull('course_id')
                ->where('name', $template['name'])
                ->where('day_of_week', $template['day_of_week'])
                ->where('start_time', $template['start_time'])
                ->where('end_time', $template['end_time'])
                ->when(
                    $institutionId === null,
                    fn ($q) => $q->whereNull('platform_institution_id'),
                    fn ($q) => $q->where('platform_institution_id', $institutionId)
                )
                ->first();

            if (!$shift) {
                $shift = StudyShift::query()->create([
                    'course_id' => null,
                    'name' => $template['name'],
                    'day_of_week' => $template['day_of_week'],
                    'start_time' => $template['start_time'],
                    'end_time' => $template['end_time'],
                    'timezone' => 'Africa/Kigali',
                    'max_students' => 20,
                    'is_active' => true,
                    'platform_institution_id' => $institutionId,
                    'created_by' => $createdBy,
                    'notes' => 'Shared Monday evening study shift for all courses.',
                ]);
            } else {
                $shift->fill([
                    'max_students' => $shift->max_students ?: 20,
                    'is_active' => true,
                    'timezone' => $shift->timezone ?: 'Africa/Kigali',
                    'notes' => $shift->notes ?: 'Shared Monday evening study shift for all courses.',
                ]);
                $shift->course_id = null;
                $shift->save();
            }

            $shift->courses()->syncWithoutDetaching($courseIds);
            $shifts->push($shift->fresh(['courses']));
        }

        return $shifts->values();
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
     * Attach one or more courses to a shift (many courses per time slot).
     *
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
