<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Course;
use App\Models\CourseEnrollment;
use App\Models\CoursePayment;
use App\Models\CoursePromoCode;
use App\Support\ApiListCache;
use App\Support\EnrollmentStatusHelper;
use App\Support\PlatformTenantScope;
use App\Services\MopayPaymentService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class PaymentController extends Controller
{
    public function __construct(
        private readonly MopayPaymentService $mopayPayments
    ) {
    }

    private function mapPaymentRow(CoursePayment $payment): array
    {
        $student = $payment->student;

        return [
            'id' => $payment->id,
            'course_id' => $payment->course_id,
            'course_title' => $payment->course?->title,
            'student_id' => $payment->student_id,
            'student_name' => $student
                ? trim(($student->first_name ?? '') . ' ' . ($student->last_name ?? ''))
                : null,
            'student_email' => $student?->email,
            'student_country' => $student?->country,
            'amount' => round($payment->amount_cents / 100, 2),
            'currency' => strtoupper($payment->currency ?? 'rwf'),
            'provider' => $payment->provider ?? 'mopay',
            'status' => $payment->status,
            'msisdn' => $payment->msisdn,
            'external_reference' => $payment->external_reference,
            'promo_code' => $payment->promo_code,
            'proof_path' => $payment->proof_path,
            'proof_url' => $payment->proof_path
                ? url('/api/admin/public-storage/' . ltrim($payment->proof_path, '/'))
                : null,
            'proof_note' => $payment->proof_note,
            'paid_at' => $payment->paid_at,
            'created_at' => $payment->created_at,
        ];
    }

    public function index(Request $request)
    {
        $tenantId = PlatformTenantScope::resolveTenantId($request);

        $query = CoursePayment::query()
            ->with(['course:id,title,price', 'student:id,first_name,last_name,email,country'])
            ->orderByDesc('id');

        if ($tenantId !== null) {
            $courseIds = PlatformTenantScope::tenantCourseIds($tenantId);
            $query->whereIn('course_id', $courseIds ?: [-1]);
            $payments = $query->get()->map(fn (CoursePayment $p) => $this->mapPaymentRow($p));

            return response()->json($payments, 200);
        }

        $payments = ApiListCache::remember('payments', 'admin_all', 120, function () use ($query) {
            return $query->get()->map(fn (CoursePayment $p) => $this->mapPaymentRow($p));
        });

        return response()->json($payments, 200);
    }

    public function updateStatus(Request $request, CoursePayment $payment)
    {
        $data = $request->validate([
            'status' => 'required|string|in:pending,processing,paid,succeeded,completed,failed,cancelled,refunded,proof_pending',
        ]);

        $payment->status = $data['status'];
        if (in_array($data['status'], ['paid', 'succeeded', 'completed'], true) && !$payment->paid_at) {
            $payment->paid_at = now();
        }
        $payment->save();

        if (in_array($data['status'], ['paid', 'succeeded', 'completed'], true)) {
            $this->mopayPayments->markEnrollmentPaid((int) $payment->course_id, (int) $payment->student_id);
        }

        ApiListCache::bump('payments');
        ApiListCache::bump('analytics');

        return response()->json([
            'message' => 'Payment status updated',
            'payment' => $this->mapPaymentRow($payment->fresh(['course', 'student'])),
        ], 200);
    }

    /** Public payment provider config for the learner checkout page. */
    public function paymentConfig()
    {
        $mopayReady = $this->mopayPayments->isConfigured();

        return response()->json([
            'provider' => 'mopay',
            'configured' => $mopayReady,
            'currency' => strtoupper((string) config('services.mopay.default_currency', 'RWF')),
            'default_mno' => config('services.mopay.default_mno', 'mtn'),
            'guidelines' => [
                'packs' => [
                    ['name' => 'Pack Intensif', 'online' => '80 000 RWF', 'in_person' => '150 000 RWF', 'duration' => '1 mois'],
                    ['name' => 'Pack Réussite', 'online' => '230 000 RWF', 'in_person' => '420 000 RWF', 'duration' => '3 mois', 'featured' => true],
                    ['name' => 'Coaching VIP 1-to-1', 'from' => '250 000 RWF/mois', 'duration' => 'Flexible'],
                ],
                'methods' => [
                    [
                        'type' => 'bank',
                        'label' => 'Equity Bank',
                        'account_name' => 'Kalisa Valens',
                        'account_number' => '4015101074908',
                    ],
                    [
                        'type' => 'momo',
                        'label' => 'MTN Mobile Money',
                        'account_name' => 'Kalisa Valens',
                        'phone' => '0788 821 579',
                        'ussd' => '*182#',
                    ],
                    [
                        'type' => 'whatsapp',
                        'label' => 'WhatsApp confirmation',
                        'phone' => '+250 788 821 579',
                    ],
                ],
                'note' => 'Envoyez la preuve de paiement pour confirmation.',
            ],
        ], 200);
    }

    /** @deprecated Prefer paymentConfig — kept so older clients do not break. */
    public function stripeConfig()
    {
        $cfg = $this->paymentConfig()->getData(true);

        return response()->json([
            'configured' => $cfg['configured'] ?? false,
            'publishable_key' => null,
            'provider' => 'Mobile Money (MoPay)',
            'sdk_installed' => true,
            'currency' => $cfg['currency'] ?? 'RWF',
            'guidelines' => $cfg['guidelines'] ?? null,
        ], 200);
    }

    public function requestMomo(Request $request)
    {
        $validated = $request->validate([
            'course_id' => 'required|integer|exists:courses,id',
            'student_id' => 'required|integer',
            'phone' => 'required|string|min:9|max:20',
            'mno' => 'nullable|string|in:mtn,airtel',
        ]);

        $course = Course::findOrFail($validated['course_id']);
        $result = $this->mopayPayments->requestPayment(
            $course,
            (int) $validated['student_id'],
            $validated['phone'],
            $validated['mno'] ?? 'mtn'
        );

        if (empty($result['ok'])) {
            return response()->json([
                'message' => $result['message'] ?? 'Unable to start Mobile Money payment.',
            ], $result['status'] ?? 500);
        }

        ApiListCache::bump('payments');

        return response()->json($result);
    }

    public function applyPromo(Request $request)
    {
        $validated = $request->validate([
            'course_id' => 'required|integer|exists:courses,id',
            'student_id' => 'required|integer|exists:students,id',
            'code' => 'required|string|max:64',
        ]);

        $course = Course::findOrFail($validated['course_id']);
        $enrollment = CourseEnrollment::where('student_id', $validated['student_id'])
            ->where('course_id', $course->id)
            ->first();

        if (!$enrollment) {
            return response()->json(['message' => 'Apply for the course before using a promo code.'], 422);
        }

        if (EnrollmentStatusHelper::isPaid($enrollment->status)) {
            return response()->json(['message' => 'This enrollment is already paid.'], 422);
        }

        if (!EnrollmentStatusHelper::canPay($enrollment->status)) {
            return response()->json(['message' => 'Promo codes cannot be applied to this enrollment status.'], 422);
        }

        $promo = CoursePromoCode::whereRaw('UPPER(code) = ?', [strtoupper(trim($validated['code']))])->first();
        if (!$promo || !$promo->isRedeemable((int) $course->id)) {
            return response()->json(['message' => 'Invalid or expired promo code.'], 422);
        }

        $amount = $this->mopayPayments->courseAmountRwf($course);

        DB::transaction(function () use ($promo, $course, $validated, $amount, $enrollment) {
            $promo->increment('uses_count');
            $enrollment->status = 'paid';
            $enrollment->save();

            CoursePayment::create([
                'course_id' => $course->id,
                'student_id' => $validated['student_id'],
                'amount_cents' => $amount * 100,
                'currency' => 'rwf',
                'provider' => 'promo',
                'promo_code' => $promo->code,
                'status' => 'paid',
                'paid_at' => now(),
                'metadata' => ['promo_code_id' => $promo->id],
            ]);
        });

        ApiListCache::bump('payments');

        return response()->json([
            'message' => 'Promo code applied. You are enrolled and marked as paid.',
            'enrollment_status' => 'paid',
        ]);
    }

    public function submitProof(Request $request)
    {
        $validated = $request->validate([
            'course_id' => 'required|integer|exists:courses,id',
            'student_id' => 'required|integer|exists:students,id',
            'note' => 'nullable|string|max:2000',
            'proof' => 'required|file|mimes:jpg,jpeg,png,webp,pdf|max:10240',
        ]);

        $course = Course::findOrFail($validated['course_id']);
        $enrollment = CourseEnrollment::where('student_id', $validated['student_id'])
            ->where('course_id', $course->id)
            ->first();

        if (!$enrollment) {
            return response()->json(['message' => 'Apply for the course before uploading payment proof.'], 422);
        }

        if (EnrollmentStatusHelper::isPaid($enrollment->status)) {
            return response()->json(['message' => 'This enrollment is already paid.'], 422);
        }

        if (!EnrollmentStatusHelper::canPay($enrollment->status)) {
            return response()->json(['message' => 'Payment proof cannot be submitted for this enrollment status.'], 422);
        }

        $path = $request->file('proof')->store(
            'uploads/payment-proofs/' . $course->id . '/' . $validated['student_id'],
            'public'
        );

        $amount = $this->mopayPayments->courseAmountRwf($course);

        $payment = CoursePayment::create([
            'course_id' => $course->id,
            'student_id' => $validated['student_id'],
            'amount_cents' => $amount * 100,
            'currency' => 'rwf',
            'provider' => 'proof',
            'proof_path' => $path,
            'proof_note' => $validated['note'] ?? null,
            'status' => 'proof_pending',
            'metadata' => ['original_name' => $request->file('proof')->getClientOriginalName()],
        ]);

        ApiListCache::bump('payments');

        return response()->json([
            'message' => 'Payment proof submitted. An administrator will confirm and activate your enrollment.',
            'payment' => $this->mapPaymentRow($payment),
        ], 201);
    }

    public function registerMopayCallbacks(Request $request)
    {
        $result = $this->mopayPayments->registerCallbackSettings(
            $request->input('callback_url')
        );

        return response()->json($result, !empty($result['ok']) ? 200 : 502);
    }

    public function mopayWebhook(Request $request)
    {
        if ($request->isMethod('get') && $request->boolean('ping')) {
            return response()->json(['ok' => true, 'message' => 'mopay webhook ping ok']);
        }

        $raw = trim((string) $request->getContent());
        if ($raw === '') {
            return response()->json(['status' => 400, 'message' => 'Empty webhook body'], 400);
        }

        $jwt = $raw;
        if (stripos($jwt, 'bearer ') === 0) {
            $jwt = trim(substr($jwt, 7));
        }
        if (str_starts_with($raw, '{')) {
            $maybe = json_decode($raw, true);
            if (is_array($maybe)) {
                $jwt = (string) ($maybe['jwt'] ?? $maybe['token'] ?? $raw);
            }
        }

        try {
            $payload = $this->mopayPayments->verifyWebhookJwt($jwt);
        } catch (\Throwable $e) {
            Log::warning('MoPay webhook JWT failed', ['error' => $e->getMessage()]);

            return response()->json(['status' => 401, 'message' => $e->getMessage()], 401);
        }

        $data = $payload['data'] ?? null;
        if (is_string($data) && $data !== '' && (str_starts_with(ltrim($data), '{') || str_starts_with(ltrim($data), '['))) {
            $decoded = json_decode($data, true);
            if (is_array($decoded)) {
                $data = $decoded;
            }
        }

        $transactionId = is_array($data)
            ? (string) ($data['transactionId'] ?? $data['referenceId'] ?? '')
            : '';
        $status = is_array($data) ? strtolower((string) ($data['status'] ?? '')) : '';

        if ($transactionId === '') {
            return response()->json(['status' => 200, 'message' => 'Webhook received (no transaction id)'], 200);
        }

        $known = CoursePayment::where('external_reference', $transactionId)
            ->orWhere('external_reference', preg_replace('/_T$/', '', $transactionId))
            ->exists();

        // MoPay validates the callback URL by expecting 404 for unknown transactions.
        if (!$known) {
            return response()->json([
                'status' => 404,
                'message' => 'Transaction not found',
                'transactionId' => $transactionId,
            ], 404);
        }

        $success = in_array($status, ['success', 'successful', 'completed', 'paid', 'ok'], true)
            || (isset($data['statusCode']) && (int) $data['statusCode'] === 200);

        if ($success) {
            $this->mopayPayments->handleWebhookSuccess($transactionId, is_array($data) ? $data : []);
            ApiListCache::bump('payments');
        } else {
            $payment = CoursePayment::where('external_reference', preg_replace('/_T$/', '', $transactionId))->first()
                ?? CoursePayment::where('external_reference', $transactionId)->first();
            if ($payment && !in_array($payment->status, ['paid', 'succeeded', 'completed'], true)) {
                $payment->status = 'failed';
                $meta = $payment->metadata ?? [];
                $meta['webhook'] = $data;
                $payment->metadata = $meta;
                $payment->save();
            }
        }

        return response()->json([
            'status' => 200,
            'message' => 'Webhook processed',
            'transactionId' => $transactionId,
        ], 200);
    }

    private function mapPromoCodeRow(CoursePromoCode $promo): array
    {
        return [
            'id' => $promo->id,
            'code' => $promo->code,
            'label' => $promo->label,
            'max_uses' => (int) $promo->max_uses,
            'uses_count' => (int) $promo->uses_count,
            'is_active' => (bool) $promo->is_active,
            'expires_at' => $promo->expires_at?->toIso8601String(),
            'course_id' => $promo->course_id,
            'course_title' => $promo->course?->title,
            'created_by' => $promo->created_by,
            'created_at' => $promo->created_at?->toIso8601String(),
        ];
    }

    public function promoCodes(Request $request)
    {
        $tenantId = PlatformTenantScope::resolveTenantId($request);
        $query = CoursePromoCode::query()
            ->with(['course:id,title'])
            ->orderByDesc('id');

        if ($tenantId !== null) {
            $courseIds = PlatformTenantScope::tenantCourseIds($tenantId);
            $query->where(function ($q) use ($courseIds) {
                $q->whereNull('course_id');
                if ($courseIds) {
                    $q->orWhereIn('course_id', $courseIds);
                }
            });
        }

        return response()->json(
            $query->get()->map(fn (CoursePromoCode $p) => $this->mapPromoCodeRow($p))->values(),
            200
        );
    }

    public function storePromoCode(Request $request)
    {
        $data = $request->validate([
            'code' => 'required|string|max:64|unique:course_promo_codes,code',
            'label' => 'nullable|string|max:255',
            'max_uses' => 'nullable|integer|min:1|max:100000',
            'expires_at' => 'nullable|date',
            'course_id' => 'nullable|integer|exists:courses,id',
            'is_active' => 'nullable|boolean',
        ]);

        $promo = CoursePromoCode::create([
            'code' => strtoupper(trim($data['code'])),
            'label' => $data['label'] ?? null,
            'max_uses' => $data['max_uses'] ?? 100,
            'uses_count' => 0,
            'is_active' => array_key_exists('is_active', $data) ? (bool) $data['is_active'] : true,
            'expires_at' => $data['expires_at'] ?? null,
            'course_id' => $data['course_id'] ?? null,
            'created_by' => $request->user()?->email ?? $request->input('created_by'),
        ]);

        return response()->json([
            'message' => 'Course promo code created',
            'promo_code' => $this->mapPromoCodeRow($promo->load('course:id,title')),
        ], 201);
    }

    public function updatePromoCode(Request $request, CoursePromoCode $coursePromoCode)
    {
        $data = $request->validate([
            'label' => 'nullable|string|max:255',
            'max_uses' => 'nullable|integer|min:1|max:100000',
            'expires_at' => 'nullable|date',
            'course_id' => 'nullable|integer|exists:courses,id',
            'is_active' => 'nullable|boolean',
        ]);

        if (array_key_exists('label', $data)) {
            $coursePromoCode->label = $data['label'];
        }
        if (array_key_exists('max_uses', $data)) {
            $coursePromoCode->max_uses = $data['max_uses'];
        }
        if (array_key_exists('expires_at', $data)) {
            $coursePromoCode->expires_at = $data['expires_at'];
        }
        if (array_key_exists('course_id', $data)) {
            $coursePromoCode->course_id = $data['course_id'];
        }
        if (array_key_exists('is_active', $data)) {
            $coursePromoCode->is_active = (bool) $data['is_active'];
        }
        $coursePromoCode->save();

        return response()->json([
            'message' => 'Course promo code updated',
            'promo_code' => $this->mapPromoCodeRow($coursePromoCode->fresh(['course:id,title'])),
        ]);
    }

    /** Stripe checkout kept but disabled in favour of MoPay. */
    public function createCheckout(Request $request)
    {
        return response()->json([
            'message' => 'Card checkout is disabled. Use Mobile Money, a promo code, or upload payment proof.',
        ], 410);
    }

    public function confirmCheckout(Request $request)
    {
        return response()->json(['message' => 'Card checkout is disabled.'], 410);
    }

    public function createIntent(Request $request)
    {
        return response()->json(['message' => 'Card checkout is disabled.'], 410);
    }
}
