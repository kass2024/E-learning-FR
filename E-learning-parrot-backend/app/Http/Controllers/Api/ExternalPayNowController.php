<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\ExternalPayNowService;
use Illuminate\Http\Request;

class ExternalPayNowController extends Controller
{
    public function __construct(
        private readonly ExternalPayNowService $payNow
    ) {
    }

    public function courses()
    {
        return response()->json([
            'courses' => $this->payNow->listPayableCourses(),
            'receiver_phone' => \App\Models\SiteSetting::current()->paymentReceiverPayload()['display_momo_phone'] ?? null,
            'allows_partial_amount' => true,
            'currency' => strtoupper((string) config('services.mopay.default_currency', 'RWF')),
            'configured' => app(\App\Services\Mopay\MopayGatewayClient::class)->isConfigured(),
        ]);
    }

    public function request(Request $request)
    {
        $validated = $request->validate([
            'course_id' => 'required|integer|exists:courses,id',
            'amount' => 'required|numeric|min:1',
            'phone' => 'required|string|min:9|max:20',
            'email' => 'required|email|max:190',
            'payer_name' => 'nullable|string|max:120',
            'mno' => 'nullable|string|in:mtn,airtel',
        ]);

        $result = $this->payNow->requestPayment(
            (int) $validated['course_id'],
            (int) floor((float) $validated['amount']),
            $validated['phone'],
            $validated['email'],
            $validated['payer_name'] ?? null,
            $validated['mno'] ?? 'mtn'
        );

        if (empty($result['ok'])) {
            return response()->json([
                'message' => $result['message'] ?? 'Unable to start payment.',
                'max_amount' => $result['max_amount'] ?? null,
                'payment' => $result['payment'] ?? null,
            ], $result['status'] ?? 500);
        }

        return response()->json($result);
    }

    public function status(string $reference)
    {
        $payment = $this->payNow->findByReference($reference);
        if (!$payment) {
            return response()->json(['message' => 'Payment not found.'], 404);
        }

        // If already paid but email failed earlier, retry once on status poll.
        if (in_array($payment->status, ['paid', 'succeeded', 'completed'], true) && !$payment->receipt_emailed) {
            $this->payNow->ensureReceiptEmailed($payment->fresh());
            $payment = $payment->fresh();
        }

        return response()->json([
            'payment' => $this->payNow->mapPayment($payment),
        ]);
    }
}
