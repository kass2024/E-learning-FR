<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SiteSetting extends Model
{
    protected $fillable = [
        'promo_banner_published',
        'promo_banner_headline',
        'promo_banner_offer_text',
        'promo_banner_coupon_code',
        'promo_banner_link_url',
        'promo_banner_background_color',
        'promo_banner_countdown_ends_at',
        'promo_banner_show_countdown',
        'promo_banner_show_coupon',
        'star_banner_published',
        'star_banner_line1',
        'star_banner_line2',
        'star_banner_link_url',
        'star_banner_background_color',
        'star_banner_text_color',
        'star_banner_expires_at',
        'momo_receiver_phone',
        'momo_receiver_name',
        'momo_whatsapp_phone',
    ];

    protected $casts = [
        'promo_banner_published' => 'boolean',
        'promo_banner_countdown_ends_at' => 'datetime',
        'promo_banner_show_countdown' => 'boolean',
        'promo_banner_show_coupon' => 'boolean',
        'star_banner_published' => 'boolean',
        'star_banner_expires_at' => 'datetime',
    ];

    public static function current(): self
    {
        return static::query()->firstOrCreate([], [
            'promo_banner_published' => false,
            'promo_banner_background_color' => '#254D81',
            'promo_banner_show_countdown' => true,
            'promo_banner_show_coupon' => true,
            'star_banner_published' => false,
            'star_banner_background_color' => '#D4AF37',
            'star_banner_text_color' => '#FFFFFF',
            'momo_receiver_phone' => '0788821579',
            'momo_receiver_name' => 'Kalisa Valens',
            'momo_whatsapp_phone' => '+250788821579',
        ]);
    }

    /** Digits-only Rwanda MoMo / phone for MoPay transfer destination. */
    public function resolvedMomoReceiverPhone(): string
    {
        $fromSettings = preg_replace('/\D+/', '', (string) ($this->momo_receiver_phone ?? '')) ?: '';
        if ($fromSettings !== '') {
            return $fromSettings;
        }

        return preg_replace('/\D+/', '', (string) config('services.mopay.receiver_account_no', '0788821579')) ?: '0788821579';
    }

    public function resolvedMomoReceiverName(): string
    {
        $name = trim((string) ($this->momo_receiver_name ?? ''));

        return $name !== '' ? $name : 'Kalisa Valens';
    }

    public function resolvedMomoWhatsappPhone(): string
    {
        $raw = trim((string) ($this->momo_whatsapp_phone ?? ''));
        if ($raw !== '') {
            return $this->formatDisplayPhone($raw);
        }

        return $this->formatDisplayPhone($this->resolvedMomoReceiverPhone(), true);
    }

    public function formatDisplayPhone(string $raw, bool $international = false): string
    {
        $digits = preg_replace('/\D+/', '', $raw) ?: '';
        if (str_starts_with($digits, '250') && strlen($digits) >= 12) {
            $local = substr($digits, 3);
        } elseif (str_starts_with($digits, '0') && strlen($digits) >= 10) {
            $local = substr($digits, 1);
        } else {
            $local = $digits;
        }

        if (strlen($local) === 9) {
            $pretty = '0' . substr($local, 0, 3) . ' ' . substr($local, 3, 3) . ' ' . substr($local, 6, 3);
            if ($international) {
                return '+250 ' . substr($local, 0, 3) . ' ' . substr($local, 3, 3) . ' ' . substr($local, 6, 3);
            }

            return $pretty;
        }

        return $raw !== '' ? $raw : ($international ? '+250 788 821 579' : '0788 821 579');
    }

    public function paymentReceiverPayload(): array
    {
        return [
            'momo_receiver_phone' => $this->momo_receiver_phone ?: $this->formatDisplayPhone($this->resolvedMomoReceiverPhone()),
            'momo_receiver_name' => $this->resolvedMomoReceiverName(),
            'momo_whatsapp_phone' => $this->momo_whatsapp_phone ?: $this->resolvedMomoWhatsappPhone(),
            'display_momo_phone' => $this->formatDisplayPhone($this->resolvedMomoReceiverPhone()),
            'display_whatsapp_phone' => $this->resolvedMomoWhatsappPhone(),
        ];
    }

    public function promoBannerPayload(): array
    {
        return [
            'published' => (bool) $this->promo_banner_published,
            'headline' => $this->promo_banner_headline,
            'offer_text' => $this->promo_banner_offer_text,
            'coupon_code' => $this->promo_banner_coupon_code,
            'link_url' => $this->promo_banner_link_url,
            'background_color' => $this->promo_banner_background_color ?: '#254D81',
            'countdown_ends_at' => $this->promo_banner_countdown_ends_at?->toIso8601String(),
            'show_countdown' => (bool) $this->promo_banner_show_countdown,
            'show_coupon' => (bool) $this->promo_banner_show_coupon,
            'revision' => $this->updated_at?->timestamp ?? 0,
        ];
    }

    public function starPromoBannerPayload(): array
    {
        return [
            'published' => (bool) $this->star_banner_published,
            'line1' => $this->star_banner_line1,
            'line2' => $this->star_banner_line2,
            'link_url' => $this->star_banner_link_url,
            'background_color' => $this->star_banner_background_color ?: '#D4AF37',
            'text_color' => $this->star_banner_text_color ?: '#FFFFFF',
            'expires_at' => $this->star_banner_expires_at?->toIso8601String(),
            'revision' => ($this->updated_at?->timestamp ?? 0) + 1000000,
        ];
    }
}
