<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Payment receipt</title>
</head>
<body style="font-family: Arial, sans-serif; color: #111; line-height: 1.5;">
  <h2 style="color: #0070D0;">F&amp;R Rwanda — Payment receipt</h2>
  <p>Hello {{ $payment->payer_name ?: 'there' }},</p>
  <p>Thank you for your payment. A PDF receipt is attached.</p>
  <table style="border-collapse: collapse; margin: 1rem 0;">
    <tr><td style="padding: 4px 12px 4px 0; color: #555;">Course</td><td><strong>{{ $payment->course_title }}</strong></td></tr>
    <tr><td style="padding: 4px 12px 4px 0; color: #555;">Amount paid</td><td><strong>{{ number_format($payment->amount_rwf) }} {{ $payment->currency }}</strong></td></tr>
    <tr><td style="padding: 4px 12px 4px 0; color: #555;">Course max</td><td>{{ number_format($payment->course_price_rwf) }} {{ $payment->currency }}</td></tr>
    <tr><td style="padding: 4px 12px 4px 0; color: #555;">Reference</td><td>{{ $payment->external_reference }}</td></tr>
    <tr><td style="padding: 4px 12px 4px 0; color: #555;">Paid at</td><td>{{ optional($payment->paid_at)->toDayDateTimeString() ?? now()->toDayDateTimeString() }}</td></tr>
  </table>
  <p style="color: #666; font-size: 13px;">This is an external Pay Now receipt and is not linked to a learner account.</p>
  <p>Regards,<br>F&amp;R Rwanda</p>
</body>
</html>
