<?php

namespace Tests\Feature;

use App\Mail\RegistrationOtpMail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Hash;
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

    public function test_authenticated_user_can_submit_testimony_and_feedback(): void
    {
        $user = \App\Models\User::factory()->create();
        $token = $user->createToken('test')->plainTextToken;

        $this->withToken($token)->postJson('/api/auth/testimonials', [
            'type' => 'Write',
            'content' => 'The conference gave our ministry a clear next step.',
            'topic' => 'Ministry',
            'show_name' => true,
        ])->assertCreated()->assertJsonPath('status', 'submitted');

        $this->withToken($token)->postJson('/api/auth/feedback', [
            'likelihood' => 5,
            'ratings' => ['Registration' => 5, 'Venue & seating' => 4],
            'highlight' => 'Worship',
            'improvement' => 'Add more shuttle times.',
        ])->assertOk()->assertJsonPath('message', 'Thank you. Your feedback has been recorded.');
    }

    public function test_admin_can_login_review_and_create_broadcast(): void
    {
        $admin = \App\Models\User::factory()->create([
            'email' => 'admin@test.local',
            'password' => Hash::make('secret-password'),
            'is_admin' => true,
        ]);

        $login = $this->postJson('/api/admin/login', [
            'email' => $admin->email,
            'password' => 'secret-password',
        ])->assertOk();

        $token = $login->json('token');

        $this->withToken($token)->getJson('/api/admin/overview')->assertOk()->assertJsonStructure(['registered', 'onsite', 'online', 'daily']);

        $this->withToken($token)->postJson('/api/admin/broadcasts', [
            'title' => 'Gate update',
            'body' => 'Gate B opens at 1:15 PM.',
            'status' => 'sent',
        ])->assertCreated()->assertJsonPath('message', 'Broadcast saved.');
    }
}
