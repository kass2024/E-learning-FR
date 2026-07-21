<?php

namespace Database\Seeders;

use App\Models\CoursePromoCode;
use Illuminate\Database\Seeder;

class CoursePromoCodeSeeder extends Seeder
{
    public function run(): void
    {
        CoursePromoCode::query()->firstOrCreate(
            ['code' => 'FRWANDA2026'],
            [
                'label' => 'F&R Rwanda complimentary enrollment',
                'max_uses' => 500,
                'uses_count' => 0,
                'is_active' => true,
                'expires_at' => now()->addYear(),
                'created_by' => 'system',
            ]
        );
    }
}
