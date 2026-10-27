<?php

namespace Tests\Feature;

use App\Mail\RegistrationOtpMail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class RegistrationApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_new_email_can_verify_otp_and_complete_registration(): void
    {
        Mail::fake();

        $start = $this->postJson('/api/auth/start', [
            'email' => 'adebayo@example.com',
            'device_name' => 'web-test',
        ]);

        $start->assertOk()->assertJsonPath('status', 'otp_required');

        $otp = null;
        Mail::assertSent(RegistrationOtpMail::class, function (RegistrationOtpMail $mail) use (&$otp): bool {
            $otp = $mail->otp;

            return true;
        });

        $verified = $this->postJson('/api/auth/verify-otp', [
            'email' => 'adebayo@example.com',
            'otp' => $otp,
            'device_name' => 'web-test',
        ]);

        $verified->assertOk()
            ->assertJsonPath('status', 'authenticated')
            ->assertJsonPath('profile_required', true);

        $token = $verified->json('token');

        $this->withHeader('Authorization', "Bearer {$token}")
            ->putJson('/api/auth/profile', [
                'name' => 'Adebayo Ogunleye',
                'phone' => '+2348034567821',
                'role' => 'Delegate',
                'church' => 'Christ Life Assembly',
                'state_country' => 'Oyo, Nigeria',
                'attendance_mode' => 'Onsite in Ibadan',
                'attendance_days' => ['Tue 19', 'Wed 20'],
                'needs_accommodation' => false,
            ])
            ->assertOk()
            ->assertJsonPath('status', 'registered')
            ->assertJsonPath('profile_required', false)
            ->assertJsonPath('user.registration_completed', true);
    }

    public function test_verified_email_logs_in_without_an_otp(): void
    {
        Mail::fake();

        $user = \App\Models\User::factory()->create([
            'email' => 'verified@example.com',
            'email_verified_at' => now(),
        ]);

        $this->postJson('/api/auth/start', ['email' => $user->email])
            ->assertOk()
            ->assertJsonPath('status', 'authenticated')
            ->assertJsonPath('profile_required', true);

        Mail::assertNothingSent();
    }

    public function test_verification_link_can_complete_the_email_step(): void
    {
        Mail::fake();

        $this->postJson('/api/auth/start', ['email' => 'link@example.com'])->assertOk();

        $verificationUrl = null;
        Mail::assertSent(RegistrationOtpMail::class, function (RegistrationOtpMail $mail) use (&$verificationUrl): bool {
            $verificationUrl = $mail->verificationUrl;

            return true;
        });

        parse_str((string) parse_url((string) $verificationUrl, PHP_URL_QUERY), $query);

        $this->postJson('/api/auth/verify-link', [
            'token' => $query['token'],
            'device_name' => 'link-test',
        ])->assertOk()
            ->assertJsonPath('status', 'authenticated')
            ->assertJsonPath('profile_required', true);
    }
}
