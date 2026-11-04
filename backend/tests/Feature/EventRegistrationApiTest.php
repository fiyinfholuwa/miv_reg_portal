<?php

namespace Tests\Feature;

use App\Mail\RegistrationOtpMail;
use App\Models\Event;
use App\Models\EventRegistration;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class EventRegistrationApiTest extends TestCase
{
    use RefreshDatabase;

    private function onboardedUser(array $attributes = []): User
    {
        return User::factory()->create([
            'email_verified_at' => now(),
            'registration_completed_at' => now(),
            'phone' => '+2348030000000',
            ...$attributes,
        ]);
    }

    public function test_new_account_registers_with_name_email_and_phone_then_verifies_by_otp(): void
    {
        Mail::fake();

        $this->postJson('/api/auth/register', [
            'name' => 'Ngozi Bello',
            'email' => 'Ngozi@Example.com',
            'phone' => '+234 803 111 2222',
        ])->assertOk()->assertJsonPath('status', 'otp_required');

        $this->assertDatabaseHas('users', ['email' => 'ngozi@example.com', 'name' => 'Ngozi Bello', 'phone' => '+234 803 111 2222', 'email_verified_at' => null]);

        $otp = null;
        Mail::assertSent(RegistrationOtpMail::class, function (RegistrationOtpMail $mail) use (&$otp): bool {
            $otp = $mail->otp;

            return true;
        });

        $this->postJson('/api/auth/verify-otp', ['email' => 'ngozi@example.com', 'otp' => $otp])
            ->assertOk()
            ->assertJsonPath('status', 'authenticated')
            ->assertJsonPath('profile_required', true)
            ->assertJsonPath('user.name', 'Ngozi Bello');
    }

    public function test_register_returns_422_when_a_verified_account_already_uses_the_email(): void
    {
        Mail::fake();
        $this->onboardedUser(['email' => 'taken@example.com']);

        $this->postJson('/api/auth/register', ['name' => 'Someone', 'email' => 'taken@example.com', 'phone' => '08031112222'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['email' => 'An account already exists for this email. Log in with your email instead.']);

        Mail::assertNothingSent();
    }

    public function test_register_rejects_missing_details_and_an_invalid_phone(): void
    {
        $this->postJson('/api/auth/register', [])->assertUnprocessable()->assertJsonValidationErrors(['name', 'email', 'phone']);

        $this->postJson('/api/auth/register', ['name' => 'Ade', 'email' => 'ade@example.com', 'phone' => 'call me maybe'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['phone' => 'Enter a valid phone number, e.g. +234 803 456 7821.']);
    }

    public function test_login_returns_a_token_for_a_verified_account_without_sending_a_code(): void
    {
        Mail::fake();
        $this->onboardedUser(['email' => 'back@example.com']);

        $this->postJson('/api/auth/login', ['email' => 'BACK@example.com'])
            ->assertOk()
            ->assertJsonPath('status', 'authenticated')
            ->assertJsonPath('profile_required', false);

        Mail::assertNothingSent();
    }

    public function test_login_sends_a_code_when_the_account_never_verified_its_email(): void
    {
        Mail::fake();
        User::factory()->create(['email' => 'halfway@example.com', 'email_verified_at' => null]);

        $this->postJson('/api/auth/login', ['email' => 'halfway@example.com'])->assertOk()->assertJsonPath('status', 'otp_required');

        Mail::assertSent(RegistrationOtpMail::class);
    }

    public function test_login_returns_422_for_an_unknown_email_or_an_admin(): void
    {
        $this->onboardedUser(['email' => 'admin@example.com', 'is_admin' => true]);

        foreach (['nobody@example.com', 'admin@example.com'] as $email) {
            $this->postJson('/api/auth/login', ['email' => $email])
                ->assertUnprocessable()
                ->assertJsonValidationErrors(['email' => 'We could not find an account with this email. Register to create one.']);
        }
    }

    public function test_public_event_list_returns_the_catalog_in_order(): void
    {
        $this->getJson('/api/events')
            ->assertOk()
            ->assertJsonCount(12, 'events')
            ->assertJsonPath('events.0.slug', 'imlc')
            ->assertJsonPath('events.0.day_options.0', 'Tue 19');

        $this->getJson('/api/events/does-not-exist')->assertNotFound();
    }

    public function test_registering_for_an_event_returns_401_without_a_token(): void
    {
        $this->postJson('/api/auth/events/bbr/register', ['attendance_mode' => 'Online'])->assertUnauthorized();
    }

    public function test_registering_creates_a_ticket_and_registering_again_updates_it(): void
    {
        $user = $this->onboardedUser();
        $token = $user->createToken('test')->plainTextToken;

        $created = $this->withToken($token)->postJson('/api/auth/events/bbr/register', ['attendance_mode' => 'Online'])
            ->assertCreated()
            ->assertJsonPath('status', 'registered')
            ->assertJsonPath('registration.event.slug', 'bbr')
            ->assertJsonPath('registration.attendance_mode', 'Online');

        $this->assertMatchesRegularExpression('/^MIV-BBR-\d{5}$/', $created->json('registration.ticket_code'));

        $this->withToken($token)->postJson('/api/auth/events/bbr/register', ['attendance_mode' => 'Onsite'])
            ->assertOk()
            ->assertJsonPath('status', 'updated')
            ->assertJsonPath('registration.ticket_code', $created->json('registration.ticket_code'));

        $this->assertSame(1, EventRegistration::where('user_id', $user->id)->count());
        $this->assertDatabaseHas('event_registrations', ['user_id' => $user->id, 'attendance_mode' => 'Onsite']);
    }

    public function test_registering_rejects_attendance_the_event_does_not_offer(): void
    {
        $token = $this->onboardedUser()->createToken('test')->plainTextToken;

        $this->withToken($token)->postJson('/api/auth/events/imlc/register', ['attendance_mode' => 'Onsite', 'attendance_days' => ['Mon 18']])
            ->assertUnprocessable()
            ->assertJsonValidationErrors([
                'attendance_mode' => 'Choose how you will attend: Onsite in Ibadan or Online.',
                'attendance_days' => 'Choose at least one of the event days.',
            ]);

        $this->assertDatabaseCount('event_registrations', 0);
    }

    public function test_registering_returns_422_when_registration_is_closed_or_profile_is_incomplete(): void
    {
        $closed = Event::factory()->closed()->create();
        $onboarded = $this->onboardedUser()->createToken('test')->plainTextToken;
        $notOnboarded = User::factory()->create(['registration_completed_at' => null])->createToken('test')->plainTextToken;

        $this->withToken($onboarded)->postJson("/api/auth/events/{$closed->slug}/register", ['attendance_mode' => 'Online'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['event' => 'Registration for this event is not open yet.']);

        $this->app['auth']->forgetGuards();
        $this->withToken($notOnboarded)->postJson('/api/auth/events/bbr/register', ['attendance_mode' => 'Online'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['profile' => 'Complete your profile before registering for an event.']);

        $this->assertDatabaseCount('event_registrations', 0);
    }

    public function test_imlc_registration_keeps_the_existing_jan_conf_ticket_and_mirrors_attendance(): void
    {
        $user = $this->onboardedUser(['ticket_code' => 'JC27-DLG-12345']);

        $this->withToken($user->createToken('test')->plainTextToken)
            ->postJson('/api/auth/events/imlc/register', ['attendance_mode' => 'Online', 'attendance_days' => ['Tue 19'], 'needs_accommodation' => true])
            ->assertCreated()
            ->assertJsonPath('registration.ticket_code', 'JC27-DLG-12345')
            ->assertJsonPath('registration.needs_accommodation', true);

        $this->assertDatabaseHas('users', ['id' => $user->id, 'attendance_mode' => 'Online', 'ticket_code' => 'JC27-DLG-12345']);
    }

    public function test_my_events_lists_only_the_users_own_registrations(): void
    {
        $user = $this->onboardedUser();
        $other = $this->onboardedUser();
        $token = $user->createToken('test')->plainTextToken;

        $this->withToken($token)->postJson('/api/auth/events/family/register', ['attendance_mode' => 'Online'])->assertCreated();
        $this->app['auth']->forgetGuards();
        $this->withToken($other->createToken('test')->plainTextToken)->postJson('/api/auth/events/awg/register', ['attendance_mode' => 'Online'])->assertCreated();
        $this->app['auth']->forgetGuards();

        $this->withToken($token)->getJson('/api/auth/events')
            ->assertOk()
            ->assertJsonCount(1, 'registrations')
            ->assertJsonPath('registrations.0.event.slug', 'family');

        $this->withToken($token)->getJson('/api/auth/user')->assertJsonPath('user.registered_events', ['family']);
    }
}
