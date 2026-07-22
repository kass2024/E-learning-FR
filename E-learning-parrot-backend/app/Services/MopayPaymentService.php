<?php

namespace App\Services;

use App\Models\Course;
use App\Models\CourseEnrollment;
use App\Models\CoursePayment;
use App\Models\SiteSetting;
use App\Services\Mopay\MopayGatewayClient;
use App\Support\EnrollmentStatusHelper;
use Illuminate\Support\Facades\Log;

/**
 * F&R course enrollment payments on top of the portable MoPay gateway client.
 * Gateway HTTP/auth lives in MopayGatewayClient so other projects can reuse it with their own env.
 */
class MopayPaymentService
{
    private readonly MopayGatewayClient $gateway;

    public function __construct(?MopayGatewayClient $gateway = null)
    {
        $this->gateway = $gateway ?? new MopayGatewayClient();
    }

    public function gateway(): MopayGatewayClient
    {
        return $this->gateway;
    }

    public function isConfigured(): bool
    {
        return $this->gateway->isConfigured();
    }

    public function assertReady(): array
    {
        if (!$this->isConfigured()) {
            return [
                'ok' => false,
                'status' => 503,
                'message' => 'Mobile Money is not configured. Set MOPAY_AUTH_KEY and MOPAY_SERVER_BASE_URL in this project\'s .env.',
            ];
        }

        return ['ok' => true];
    }

    public function courseAmountRwf(Course $course): int
    {
        return (int) max(0, round((float) ($course->price ?? 0)));
    }

    public function normalizeMsisdn(string $phone): string
    {
        return $this->gateway->normalizeMsisdn($phone);
    }

    public function authorizationHeader(): string
    {
        return $this->gateway->authorizationHeader();
    }

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

        $result = $this->gateway->registerCallbackSettings($callbackUrl);
        if (!$result['ok'] && ($result['callback_url_body'] ?? '') === 'MOPAY_CALLBACK_SIGNING_KEY is empty.') {
            return ['ok' => false, 'status' => 500, 'message' => 'MOPAY_CALLBACK_SIGNING_KEY is empty.'];
        }

        return $result;
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
        if (strlen($msisdn) < 12) {
            return ['ok' => false, 'status' => 422, 'message' => 'Enter a valid MTN/Airtel Rwanda mobile money number.'];
        }

        $slug = strtoupper(preg_replace('/[^A-Z0-9]/', '', (string) config('services.mopay.project_slug', 'FRW')) ?: 'FRW');
        $transactionId = $slug . '_' . $course->id . '_' . $studentId . '_' . time() . '_' . random_int(1000, 9999);
        $transactionId = preg_replace('/[^A-Z0-9_]/', '', strtoupper($transactionId)) ?: ($slug . '_' . time());

        $currency = (string) config('services.mopay.default_currency', 'RWF');
        $receiver = trim(SiteSetting::current()->resolvedMomoReceiverPhone());
        if ($receiver === '') {
            $receiver = trim((string) config('services.mopay.receiver_account_no'));
        }

        $prefix = (string) config('services.mopay.message_prefix', 'FRWANDA');
        $title = (string) config('services.mopay.payment_title', 'FR_Rwanda_course_payment');

        try {
            $gatewayResult = $this->gateway->initiateCollection([
                'account_no' => $msisdn,
                'amount' => $amount,
                'transaction_id' => $transactionId,
                'title' => $title,
                'details' => 'Course: ' . ($course->title ?? $course->id),
                'message' => $prefix . '_COURSE_PAYMENT',
                'transfer_message' => $prefix . '_RECEIVER_TRANSFER',
                'receiver_account_no' => $receiver,
                'currency' => $currency,
                'country_code' => (string) config('services.mopay.default_country_code', 'rw'),
                'mno' => $mno ?: (string) config('services.mopay.default_mno', 'mtn'),
                'use_transfer' => $receiver !== '',
            ]);
        } catch (\Throwable $e) {
            Log::error('MoPay request failed', [
                'project' => config('services.mopay.project_slug'),
                'error' => $e->getMessage(),
            ]);

            return ['ok' => false, 'status' => 502, 'message' => 'Unable to reach Mobile Money gateway. Try again shortly.'];
        }

        $body = is_array($gatewayResult['response'] ?? null) ? $gatewayResult['response'] : [];
        $httpOk = (bool) ($gatewayResult['ok'] ?? false);
        $msisdnStored = (string) ($gatewayResult['msisdn'] ?? $msisdn);

        $payment = CoursePayment::create([
            'course_id' => $course->id,
            'student_id' => $studentId,
            'amount_cents' => $amount * 100,
            'currency' => strtolower($currency),
            'provider' => 'mopay',
            'external_reference' => $transactionId,
            'msisdn' => $msisdnStored,
            'status' => $httpOk ? 'processing' : 'failed',
            'metadata' => [
                'request' => $gatewayResult['request'] ?? null,
                'response' => $body,
                'http_status' => $gatewayResult['http_status'] ?? null,
                'flow' => $gatewayResult['flow'] ?? null,
                'auth_mode' => $gatewayResult['auth_mode'] ?? null,
                'project' => config('services.mopay.project_slug'),
            ],
        ]);

        if (!$httpOk) {
            $message = is_array($body)
                ? (string) ($body['message'] ?? $body['error'] ?? ($gatewayResult['raw'] ?? ''))
                : (string) ($gatewayResult['raw'] ?? '');

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
            'msisdn' => $msisdnStored,
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
