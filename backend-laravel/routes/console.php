<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use App\Mail\SendOtpMail;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('mail:send-otp {email} {name} {otp}', function (string $email, string $name, string $otp) {
    try {
        Mail::to($email)->send(new SendOtpMail($otp, $name));
        Log::info("Background OTP successfully sent to {$email}");
    } catch (\Throwable $e) {
        Log::warning("Background OTP to {$email} failed: " . $e->getMessage());
    }
})->purpose('Dispatch OTP verification email in background');
