<?php

namespace Database\Seeders;

use App\Models\Course;
use App\Models\User;
use App\Support\ApiListCache;
use App\Support\PlatformUserService;
use Illuminate\Database\Seeder;

/**
 * Starter catalog for F&R Rwanda Ltd (flyer: English / French / Kinyarwanda).
 */
class FrwandaCatalogSeeder extends Seeder
{
    public function run(): void
    {
        $password = PlatformUserService::seedPassword();

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

        PlatformUserService::ensureAdminFromEnv($password);

        $courses = [
            [
                'title' => 'English Course',
                'description' => 'Online English for fluency and proficiency. Monthly 100,000 RWF · Termly (3 months) 240,000 RWF · VIP one-on-one 250,000 RWF/month.',
                'price' => 100000,
                'duration' => 'Flexible (monthly or termly)',
                'requirements' => 'Open to all levels. Interactive online classes with experienced instructors.',
                'status' => 'Active',
                'general_information' => 'Quality Language Education at Affordable Prices — Learn Today. Master Tomorrow. Succeed Globally.',
            ],
            [
                'title' => 'French Course',
                'description' => 'Online French for fluency and proficiency. Monthly 100,000 RWF · Termly (3 months) 240,000 RWF · VIP one-on-one 250,000 RWF/month.',
                'price' => 100000,
                'duration' => 'Flexible (monthly or termly)',
                'requirements' => 'Open to all levels. Interactive online classes with experienced instructors.',
                'status' => 'Active',
                'general_information' => 'École de la langue française au Rwanda — School of Fluency and Proficiency.',
            ],
            [
                'title' => 'Kinyarwanda Course',
                'description' => 'Online Kinyarwanda for communication and confidence. Monthly 100,000 RWF · Termly (3 months) 240,000 RWF · VIP one-on-one 250,000 RWF/month.',
                'price' => 100000,
                'duration' => 'Flexible (monthly or termly)',
                'requirements' => 'Open to all levels. Interactive online classes with experienced instructors.',
                'status' => 'Active',
                'general_information' => 'Learn Kinyarwanda online with flexible schedules and personalized feedback.',
            ],
        ];

        foreach ($courses as $courseData) {
            $course = Course::updateOrCreate(
                ['title' => $courseData['title'], 'platform_institution_id' => null],
                $courseData
            );
            $instructor->assignedCourses()->syncWithoutDetaching([$course->id]);
        }

        if (class_exists(ApiListCache::class)) {
            try {
                ApiListCache::bump('courses');
            } catch (\Throwable) {
                // optional
            }
        }
    }
}
