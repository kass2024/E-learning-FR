<?php

namespace App\Mail;

use App\Models\ExternalCoursePayment;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class ExternalPayNowReceiptMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public ExternalCoursePayment $payment,
        public string $pdfBinary,
        public string $pdfFilename
    ) {
    }

    public function build(): self
    {
        $ref = $this->payment->external_reference;

        return $this->subject('Payment receipt — ' . ($this->payment->course_title ?: 'F&R Rwanda'))
            ->view('emails.external_pay_now_receipt')
            ->with([
                'payment' => $this->payment,
            ])
            ->attachData($this->pdfBinary, $this->pdfFilename, [
                'mime' => 'application/pdf',
            ]);
    }
}
