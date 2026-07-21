<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>{{ config('app.name') }} - Course payment</title>
</head>
<body style="font-family: Arial, Helvetica, sans-serif; color: #111827; line-height: 1.6; background:#f8fafc; margin:0; padding:24px;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;padding:28px;border:1px solid #e2e8f0;">
        <p style="margin-top:0;">Dear {{ $student->first_name ?? 'Learner' }},</p>

        <p>
            Please complete payment for
            <strong>{{ $course->title ?? 'your course' }}</strong>
            @if($amount > 0)
                — <strong>{{ number_format($amount, 0) }} {{ $currency }}</strong>.
            @else
                .
            @endif
        </p>

        <p style="margin-bottom:8px;"><strong>Pay online (recommended)</strong></p>
        <p style="margin-top:0;">
            Open your Pay &amp; Enroll page to pay with Mobile Money, a promo code, or upload payment proof:
        </p>
        <p style="text-align:center;margin:20px 0;">
            <a href="{{ $paymentUrl }}"
               style="display:inline-block;background:#0070D0;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:bold;">
                Open Pay &amp; Enroll
            </a>
        </p>
        <p style="font-size:12px;color:#64748b;word-break:break-all;">{{ $paymentUrl }}</p>

        <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;" />

        <p style="margin-bottom:8px;"><strong>Manual payment details</strong></p>
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
            @if(!empty($paymentDetails['momo_phone']))
            <tr>
                <td style="padding:8px 0;vertical-align:top;width:140px;color:#64748b;">MTN MoMo</td>
                <td style="padding:8px 0;">
                    @if(!empty($paymentDetails['momo_name']))
                        Nom: {{ $paymentDetails['momo_name'] }}<br>
                    @endif
                    Number: <strong style="font-family:monospace;">{{ $paymentDetails['momo_phone'] }}</strong>
                    @if(!empty($paymentDetails['momo_ussd']))
                        <br>USSD: {{ $paymentDetails['momo_ussd'] }}
                    @endif
                </td>
            </tr>
            @endif
            @if(!empty($paymentDetails['bank_account_number']))
            <tr>
                <td style="padding:8px 0;vertical-align:top;color:#64748b;">{{ $paymentDetails['bank_name'] ?? 'Bank' }}</td>
                <td style="padding:8px 0;">
                    @if(!empty($paymentDetails['bank_account_name']))
                        Nom: {{ $paymentDetails['bank_account_name'] }}<br>
                    @endif
                    Account: <strong style="font-family:monospace;">{{ $paymentDetails['bank_account_number'] }}</strong>
                </td>
            </tr>
            @endif
            @if(!empty($paymentDetails['whatsapp']))
            <tr>
                <td style="padding:8px 0;vertical-align:top;color:#64748b;">WhatsApp</td>
                <td style="padding:8px 0;">
                    Send proof to <strong style="font-family:monospace;">{{ $paymentDetails['whatsapp'] }}</strong>
                </td>
            </tr>
            @endif
        </table>

        @if(!empty($paymentDetails['note']))
            <p style="font-size:13px;color:#475569;font-style:italic;">{{ $paymentDetails['note'] }}</p>
        @endif

        <p style="margin-bottom:0;">Thank you,<br><strong>{{ config('app.name') }}</strong></p>
    </div>
</body>
</html>
