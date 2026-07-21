<?php

namespace App\Mail;

use App\Models\Course;
use App\Models\Student;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class CoursePaymentLinkMail extends Mailable
{
    use Queueable, SerializesModels;

    /**
     * @param  array{
     *   momo_name?: string,
     *   momo_phone?: string,
     *   momo_ussd?: string,
     *   bank_name?: string,
     *   bank_account_name?: string,
     *   bank_account_number?: string,
     *   whatsapp?: string,
     *   currency?: string,
     *   note?: string
     * }  $paymentDetails
     */
    public function __construct(
        public Student $student,
        public Course $course,
        public string $paymentUrl,
        public float $amount,
        public array $paymentDetails = []
    ) {
    }

    public function build(): self
    {
        $currency = strtoupper((string) ($this->paymentDetails['currency'] ?? 'RWF'));

        return $this->subject('Payment details for ' . ($this->course->title ?? 'your course'))
            ->view('emails.course_payment_link')
            ->with([
                'student' => $this->student,
                'course' => $this->course,
                'paymentUrl' => $this->paymentUrl,
                'amount' => $this->amount,
                'currency' => $currency,
                'paymentDetails' => $this->paymentDetails,
            ]);
    }
}
