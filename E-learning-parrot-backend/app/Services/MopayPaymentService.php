<?php

namespace App\Services;

use App\Models\Course;
use App\Models\CourseEnrollment;
use App\Models\CoursePayment;
use App\Support\EnrollmentStatusHelper;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class MopayPaymentService
{
    public function isConfigured(): bool
    {
        return !empty(config('services.mopay.auth_key'))
            && !empty(config('services.mopay.server_base_url'));
    }

    public function assertReady(): array
    {
        if (!$this->isConfigured()) {
            return [
                'ok' => false,
                'status' => 503,
                'message' => 'Mobile Money is not configured. Set MOPAY_AUTH_KEY and MOPAY_SERVER_BASE_URL in .env.',
            ];
        }

        return ['ok' => true];
    }

    public function courseAmountRwf(Course $course): int
    {
        return (int) max(0, round((float) ($course->price ?? 0)));
    }

    /**
     * Normalize Rwanda phone to local format expected by MoPay (07XXXXXXXX).
     */
    public function normalizeMsisdn(string $phone): string
    {
        $digits = preg_replace('/\D+/', '', $phone) ?? '';
        if (str_starts_with($digits, '250') && strlen($digits) >= 12) {
            $digits = substr($digits, 3);
        }
        if (str_starts_with($digits, '0')) {
            return $digits;
        }
        if (strlen($digits) === 9) {
            return '0' . $digits;
        }

        return $digits;
    }

    public function authorizationHeader(): string
    {
        $bearer = trim((string) config('services.mopay.bearer_token'));
        if ($bearer !== '') {
            return str_starts_with(strtolower($bearer), 'bearer ') ? $bearer : 'Bearer ' . $bearer;
        }

        $authKey = trim((string) config('services.mopay.auth_key'));
        $token = $this->fetchAccessToken($authKey);
        if ($token) {
            return 'Bearer ' . $token;
        }

        // Fallback: auth key as Authorization value (Bizao / MoPay PDF pattern).
        if (stripos($authKey, 'basic ') === 0 || stripos($authKey, 'bearer ') === 0) {
            return $authKey;
        }

        return 'Basic ' . $authKey;
    }

    private function fetchAccessToken(string $authKey): ?string
    {
        $base = rtrim((string) config('services.mopay.server_base_url'), '/');
        $basic = stripos($authKey, 'basic ') === 0 ? $authKey : 'Basic ' . $authKey;

        foreach ([$base . '/token', 'https://preproduction-gateway.bizao.com/token'] as $url) {
            try {
                $res = Http::withHeaders([
                    'Authorization' => $basic,
                    'Accept' => 'application/json',
                    'Content-Type' => 'application/x-www-form-urlencoded',
                ])->asForm()->timeout(20)->post($url, ['grant_type' => 'client_credentials']);

                if ($res->successful() && $res->json('access_token')) {
                    return (string) $res->json('access_token');
                }
            } catch (\Throwable $e) {
                Log::warning('MoPay token fetch failed', ['url' => $url, 'error' => $e->getMessage()]);
            }
        }

        return null;
    }

    /**
     * Register callback_url + callback_signing_key on the MoPay settings endpoint.
     */
    public function registerCallbackSettings(?string $callbackUrl = null): array
    {
        $ready = $this->assertReady();
        if (!$ready['ok']) {
            return $ready;
        }

        $secret = (string) config('services.mopay.callback_signing_key');
        if ($secret === '') {
            return ['ok' => false, 'status' => 500, 'message' => 'MOPAY_CALLBACK_SIGNING_KEY is empty.'];
        }

        $callbackUrl = $callbackUrl
            ?: (string) config('services.mopay.callback_url')
            ?: rtrim((string) config('app.url'), '/') . '/api/admin/payments/mopay/webhook';

        $base = rtrim((string) config('services.mopay.server_base_url'), '/');
        $settingsUrl = $base . '/api/v1/user/settings';
        $headers = [
            'Authorization' => $this->authorizationHeader(),
            'Accept' => 'application/json',
            'Content-Type' => 'application/json',
        ];

        $urlRes = Http::withHeaders($headers)->timeout(30)->post($settingsUrl, [
            'id' => 'callback_url',
            'value' => $callbackUrl,
        ]);

        $keyRes = Http::withHeaders($headers)->timeout(30)->post($settingsUrl, [
            'id' => 'callback_signing_key',
            'value' => $secret,
        ]);

        return [
            'ok' => $urlRes->successful() && $keyRes->successful(),
            'callback_url' => $callbackUrl,
            'callback_url_http' => $urlRes->status(),
            'callback_url_body' => $urlRes->body(),
            'signing_key_http' => $keyRes->status(),
            'signing_key_body' => $keyRes->body(),
        ];
    }

    public function requestPayment(Course $course, int $studentId, string $phone, string $mno = 'mtn'): array
    {
        $ready = $this->assertReady();
        if (!$ready['ok']) {
            return $ready;
        }

        $enrollment = CourseEnrollment::where('student_id', $studentId)
            ->where('course_id', $course->id)
            ->first();

        if (!$enrollment) {
            return ['ok' => false, 'status' => 422, 'message' => 'You must apply for this course before paying.'];
        }

        if (!EnrollmentStatusHelper::canPay($enrollment->status)) {
            return ['ok' => false, 'status' => 422, 'message' => 'Payment is not available for this enrollment status.'];
        }

        $amount = $this->courseAmountRwf($course);
        if ($amount <= 0) {
            return ['ok' => false, 'status' => 422, 'message' => 'Course price is not set for payments.'];
        }

        $msisdn = $this->normalizeMsisdn($phone);
        if (strlen($msisdn) < 10) {
            return ['ok' => false, 'status' => 422, 'message' => 'Enter a valid MTN/Airtel Rwanda mobile money number.'];
        }

        $transactionId = 'FRW_' . $course->id . '_' . $studentId . '_' . time() . '_' . random_int(1000, 9999);
        $transactionId = preg_replace('/[^A-Z0-9_]/', '', strtoupper($transactionId)) ?: ('FRW_' . time());

        $base = rtrim((string) config('services.mopay.server_base_url'), '/');
        $currency = (string) config('services.mopay.default_currency', 'RWF');
        $country = strtolower((string) config('services.mopay.default_country_code', 'rw'));
        $receiver = trim(\App\Models\SiteSetting::current()->resolvedMomoReceiverPhone());
        if ($receiver === '') {
            $receiver = trim((string) config('services.mopay.receiver_account_no'));
        }
        $useTransfer = $receiver !== '';

        $url = $useTransfer ? $base . '/api/v1/payment' : $base . '/api/v2/momo/debit';

        if ($useTransfer) {
            $payload = [
                'transactionId' => $transactionId,
                'account_no' => $msisdn,
                'title' => (string) config('services.mopay.payment_title', 'F&R Rwanda course payment'),
                'details' => 'Course: ' . ($course->title ?? $course->id),
                'payment_type' => 'momo',
                'amount' => $amount,
                'currency' => $currency,
                'message' => 'FRWANDA_COURSE_PAYMENT',
                'transfers' => [[
                    'transactionId' => $transactionId . '_T',
                    'account_no' => $this->normalizeMsisdn($receiver),
                    'payment_type' => 'momo',
                    'amount' => $amount,
                    'currency' => $currency,
                    'message' => 'FRWANDA_RECEIVER_TRANSFER',
                ]],
            ];
        } else {
            $payload = [
                'account_no' => $msisdn,
                'payment_type' => 'momo',
                'message' => 'FRWANDA_COURSE_PAYMENT',
                'transactionId' => $transactionId,
                'currency' => $currency,
                'amount' => $amount,
                'country_code' => $country,
                'mno' => $mno ?: 'mtn',
            ];
        }

        $headers = [
            'Authorization' => $this->authorizationHeader(),
            'Accept' => 'application/json',
            'Content-Type' => 'application/json',
            'category' => 'BIZAO',
        ];

        try {
            $res = Http::withHeaders($headers)->timeout(60)->post($url, $payload);
        } catch (\Throwable $e) {
            Log::error('MoPay request failed', ['error' => $e->getMessage()]);

            return ['ok' => false, 'status' => 502, 'message' => 'Unable to reach Mobile Money gateway. Try again shortly.'];
        }

        $body = $res->json() ?? [];
        $httpOk = $res->successful();

        $payment = CoursePayment::create([
            'course_id' => $course->id,
            'student_id' => $studentId,
            'amount_cents' => $amount * 100,
            'currency' => strtolower($currency),
            'provider' => 'mopay',
            'external_reference' => $transactionId,
            'msisdn' => $msisdn,
            'status' => $httpOk ? 'processing' : 'failed',
            'metadata' => [
                'request' => $payload,
                'response' => $body,
                'http_status' => $res->status(),
                'flow' => $useTransfer ? 'payment_with_transfer' : 'debit_only',
            ],
        ]);

        if (!$httpOk) {
            $message = is_array($body)
                ? (string) ($body['message'] ?? $body['error'] ?? $res->body())
                : $res->body();

            return [
                'ok' => false,
                'status' => 422,
                'message' => $message !== '' ? $message : 'Mobile Money request was rejected.',
                'payment_id' => $payment->id,
                'transaction_id' => $transactionId,
            ];
        }

        return [
            'ok' => true,
            'message' => 'Approve the payment prompt on your phone to complete enrollment.',
            'payment_id' => $payment->id,
            'transaction_id' => $transactionId,
            'amount' => $amount,
            'currency' => $currency,
            'msisdn' => $msisdn,
        ];
    }

    public function markEnrollmentPaid(int $courseId, int $studentId): void
    {
        $enrollment = CourseEnrollment::where('course_id', $courseId)
            ->where('student_id', $studentId)
            ->first();

        if (!$enrollment) {
            return;
        }

        $enrollment->status = 'paid';
        $enrollment->save();
    }

    public function verifyWebhookJwt(string $jwt): array
    {
        $secret = (string) config('services.mopay.callback_signing_key');
        if ($secret === '') {
            throw new \RuntimeException('Webhook secret not configured');
        }

        $parts = explode('.', trim($jwt));
        if (count($parts) !== 3) {
            throw new \InvalidArgumentException('Invalid JWT format');
        }

        [$headerB64, $payloadB64, $signatureB64] = $parts;
        $expected = hash_hmac('sha256', $headerB64 . '.' . $payloadB64, $secret, true);
        $given = $this->base64UrlDecode($signatureB64);

        if (!hash_equals($expected, $given)) {
            throw new \InvalidArgumentException('JWT signature verification failed');
        }

        $payload = json_decode($this->base64UrlDecode($payloadB64), true);
        if (!is_array($payload)) {
            throw new \InvalidArgumentException('JWT payload is not valid JSON');
        }

        return $payload;
    }

    private function base64UrlDecode(string $data): string
    {
        $b64 = strtr($data, '-_', '+/');
        $pad = (4 - (strlen($b64) % 4)) % 4;
        if ($pad > 0) {
            $b64 .= str_repeat('=', $pad);
        }
        $decoded = base64_decode($b64, true);
        if ($decoded === false) {
            throw new \InvalidArgumentException('Invalid base64url string');
        }

        return $decoded;
    }

    public function handleWebhookSuccess(string $transactionId, array $data): bool
    {
        $baseRef = preg_replace('/_T$/', '', $transactionId) ?: $transactionId;
        $payment = CoursePayment::query()
            ->whereIn('external_reference', array_values(array_unique([$transactionId, $baseRef])))
            ->orderByDesc('id')
            ->first();

        if (!$payment) {
            return false;
        }

        if (!in_array($payment->status, ['paid', 'succeeded', 'completed'], true)) {
            $payment->status = 'paid';
            $payment->paid_at = now();
            $meta = $payment->metadata ?? [];
            $meta['webhook'] = $data;
            $payment->metadata = $meta;
            $payment->save();
        }

        $this->markEnrollmentPaid((int) $payment->course_id, (int) $payment->student_id);

        return true;
    }
}
