<?php

namespace App\Services;

use App\Models\Course;
use App\Models\PlatformInstitution;
use App\Models\SiteSetting;

/**
 * Resolves MoMo receive number + brand for main platform vs partner institutions.
 * Institution courses use the institution owner number when set; otherwise main SiteSetting.
 */
class PaymentReceiverService
{
    public function mainBrandName(): string
    {
        $name = trim((string) config('app.name', ''));
        if ($name !== '' && strcasecmp($name, 'Laravel') !== 0) {
            return $name;
        }

        return 'F&R Rwanda';
    }

    /**
     * @return array{
     *   source: 'institution'|'main',
     *   brand_name: string,
     *   brand_logo_url: ?string,
     *   brand_primary_color: string,
     *   platform_institution_id: ?int,
     *   momo_receiver_phone: string,
     *   momo_receiver_name: string,
     *   momo_whatsapp_phone: string,
     *   display_momo_phone: string,
     *   display_whatsapp_phone: string,
     *   receiver_account_no: string
     * }
     */
    public function resolve(?Course $course = null): array
    {
        $institution = $this->institutionForCourse($course);
        $settings = SiteSetting::current();

        if ($institution) {
            $digits = preg_replace('/\D+/', '', (string) ($institution->momo_receiver_phone ?? '')) ?: '';
            if ($digits !== '') {
                $ownerName = trim((string) ($institution->momo_receiver_name ?? ''));
                if ($ownerName === '') {
                    $ownerName = trim((string) $institution->name) ?: 'Institution owner';
                }
                $waRaw = trim((string) ($institution->momo_whatsapp_phone ?? ''));
                $primary = $this->institutionPrimaryColor($institution);

                return [
                    'source' => 'institution',
                    'brand_name' => trim((string) $institution->name) ?: $this->mainBrandName(),
                    'brand_logo_url' => $institution->logo_url,
                    'brand_primary_color' => $primary,
                    'platform_institution_id' => (int) $institution->id,
                    'momo_receiver_phone' => (string) ($institution->momo_receiver_phone ?: $settings->formatDisplayPhone($digits)),
                    'momo_receiver_name' => $ownerName,
                    'momo_whatsapp_phone' => $waRaw !== '' ? $waRaw : $settings->formatDisplayPhone($digits, true),
                    'display_momo_phone' => $settings->formatDisplayPhone($digits),
                    'display_whatsapp_phone' => $waRaw !== ''
                        ? $settings->formatDisplayPhone($waRaw, true)
                        : $settings->formatDisplayPhone($digits, true),
                    'receiver_account_no' => $digits,
                ];
            }
        }

        $payload = $settings->paymentReceiverPayload();

        return [
            'source' => 'main',
            'brand_name' => $this->mainBrandName(),
            'brand_logo_url' => null,
            'brand_primary_color' => '#0070D0',
            'platform_institution_id' => null,
            'momo_receiver_phone' => (string) ($payload['momo_receiver_phone'] ?? ''),
            'momo_receiver_name' => (string) ($payload['momo_receiver_name'] ?? ''),
            'momo_whatsapp_phone' => (string) ($payload['momo_whatsapp_phone'] ?? ''),
            'display_momo_phone' => (string) ($payload['display_momo_phone'] ?? ''),
            'display_whatsapp_phone' => (string) ($payload['display_whatsapp_phone'] ?? ''),
            'receiver_account_no' => $settings->resolvedMomoReceiverPhone(),
        ];
    }

    public function receiverAccountNo(?Course $course = null): string
    {
        $resolved = $this->resolve($course);
        $digits = preg_replace('/\D+/', '', (string) ($resolved['receiver_account_no'] ?? '')) ?: '';
        if ($digits !== '') {
            return $digits;
        }

        return trim((string) config('services.mopay.receiver_account_no', ''));
    }

    private function institutionForCourse(?Course $course): ?PlatformInstitution
    {
        if (!$course) {
            return null;
        }

        $instId = (int) ($course->platform_institution_id ?? 0);
        if ($instId <= 0) {
            return null;
        }

        if ($course->relationLoaded('platformInstitution')) {
            return $course->platformInstitution;
        }

        return PlatformInstitution::query()->find($instId);
    }

    private function institutionPrimaryColor(PlatformInstitution $institution): string
    {
        $color = strtoupper(trim((string) ($institution->portal_primary_color ?? '')));
        if ($color !== '' && preg_match('/^#[0-9A-F]{3}([0-9A-F]{3})?([0-9A-F]{2})?$/', $color)) {
            return $color;
        }

        return '#0070D0';
    }
}
