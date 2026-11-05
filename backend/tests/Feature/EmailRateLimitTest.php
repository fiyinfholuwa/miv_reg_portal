<?php

namespace Tests\Feature;

use App\Mail\BroadcastMail;
use App\Mail\RegistrationOtpMail;
use App\Models\RegistrationOtp;
use App\Models\User;
use App\Services\EmailService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class EmailRateLimitTest extends TestCase
{
    use RefreshDatabase;

    private array $details = ['name' => 'Ada Obi', 'email' => 'ada@example.com', 'phone' => '+2348030000000'];

    public function test_an_address_gets_at_most_two_emails_a_minute_and_the_current_code_survives(): void
    {
        Mail::fake();

        $this->postJson('/api/auth/register', $this->details)->assertOk();
        $this->postJson('/api/auth/register', $this->details)->assertOk();
        $codeBefore = RegistrationOtp::sole()->id;

        $this->postJson('/api/auth/register', [...$this->details, 'email' => 'ADA@example.com'])
            ->assertStatus(429)
            ->assertJsonValidationErrors('email');

        Mail::assertSent(RegistrationOtpMail::class, 2);
        $this->assertSame($codeBefore, RegistrationOtp::sole()->id, 'A refused request must not replace the code already sent.');

        $this->travel(61)->seconds();
        $this->postJson('/api/auth/register', $this->details)->assertOk();
        Mail::assertSent(RegistrationOtpMail::class, 3);
    }

    public function test_the_limit_is_per_address(): void
    {
        Mail::fake();

        foreach (['a@example.com', 'a@example.com', 'b@example.com', 'b@example.com'] as $email) {
            $this->postJson('/api/auth/register', [...$this->details, 'email' => $email])->assertOk();
        }

        Mail::assertSent(RegistrationOtpMail::class, 4);
    }

    public function test_broadcasts_are_not_rate_limited(): void
    {
        Mail::fake();
        $service = app(EmailService::class);

        foreach (range(1, 4) as $index) {
            $service->sendMailable(new BroadcastMail("Update {$index}", 'Body'), 'delegate@example.com', null, rateLimited: false);
        }

        Mail::assertSent(BroadcastMail::class, 4);
    }

    public function test_the_limit_is_configurable(): void
    {
        Mail::fake();
        config(['services.elasticemail.per_recipient_per_minute' => 1]);

        $this->postJson('/api/auth/register', $this->details)->assertOk();
        $this->postJson('/api/auth/register', $this->details)->assertStatus(429);
    }

    public function test_unverified_login_codes_share_the_same_limit(): void
    {
        Mail::fake();
        User::factory()->unverified()->create(['email' => 'ada@example.com']);

        $this->postJson('/api/auth/login', ['email' => 'ada@example.com'])->assertOk();
        $this->postJson('/api/auth/login', ['email' => 'ada@example.com'])->assertOk();
        $this->postJson('/api/auth/login', ['email' => 'ada@example.com'])->assertStatus(429);
    }
}
