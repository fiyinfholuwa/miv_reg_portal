<?php

namespace Tests\Feature;

use App\Models\Event;
use App\Models\EventRegistration;
use App\Models\ShopOrder;
use App\Models\Team;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AdminOperationsApiTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    private string $token;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = User::factory()->create(['is_admin' => true, 'password' => Hash::make('OldPassword123')]);
        $this->token = $this->admin->createToken('admin', ['admin'])->plainTextToken;
    }

    private function register(User $user, Event $event, string $code): EventRegistration
    {
        return EventRegistration::create(['user_id' => $user->id, 'event_id' => $event->id, 'ticket_code' => $code, 'attendance_mode' => 'Onsite']);
    }

    public function test_registrants_are_searchable_filterable_paginated_and_bulk_reviewable(): void
    {
        $event = Event::factory()->create(['slug' => 'harvest']);
        $ada = User::factory()->create(['name' => 'Ada Obi', 'approval_status' => 'pending']);
        $this->register($ada, $event, 'MIV-HARVEST-10001');
        User::factory()->count(20)->create(['approval_status' => 'approved']);

        $this->withToken($this->token)->getJson('/api/admin/registrants?per_page=10')
            ->assertOk()->assertJsonCount(10, 'data')->assertJsonPath('meta.total', 21)->assertJsonPath('meta.last_page', 3)->assertJsonPath('counts.pending', 1);
        $this->withToken($this->token)->getJson('/api/admin/registrants?search=HARVEST-10001')->assertJsonPath('meta.total', 1)->assertJsonPath('data.0.events.0.short_name', $event->short_name);
        $this->withToken($this->token)->getJson('/api/admin/registrants?event=harvest&status=pending')->assertJsonPath('meta.total', 1);

        $this->withToken($this->token)->patchJson('/api/admin/registrants/review', ['ids' => [$ada->id], 'status' => 'approved'])->assertOk()->assertJsonPath('updated', 1);
        $this->assertSame('approved', $ada->fresh()->approval_status);
    }

    public function test_admin_manages_teams_and_delegates_join_with_the_code(): void
    {
        $event = Event::factory()->create();
        $leader = User::factory()->create();
        $created = $this->withToken($this->token)->postJson('/api/admin/teams', ['event' => $event->slug, 'name' => 'Ibadan North', 'leader_id' => $leader->id, 'capacity' => 2])
            ->assertCreated()->json('team');
        $this->withToken($this->token)->postJson('/api/admin/teams', ['event' => $event->slug, 'name' => 'Ibadan North'])->assertUnprocessable()->assertJsonValidationErrors('name');

        $first = $this->register(User::factory()->create(), $event, 'T-1');
        $second = $this->register(User::factory()->create(), $event, 'T-2');
        $this->withToken($this->token)->postJson("/api/admin/teams/{$created['id']}/members", ['registration_ids' => [$first->id]])->assertOk();
        $this->withToken($this->token)->getJson("/api/admin/teams/{$created['id']}/members")->assertJsonCount(1, 'members')->assertJsonCount(1, 'unassigned');

        $this->app['auth']->forgetGuards();
        $delegateToken = $second->user->createToken('user')->plainTextToken;
        $this->withToken($delegateToken)->postJson("/api/auth/events/{$event->slug}/team", ['code' => 'nope'])->assertUnprocessable();
        $this->withToken($delegateToken)->postJson("/api/auth/events/{$event->slug}/team", ['code' => strtolower($created['code'])])->assertOk()->assertJsonPath('team.name', 'Ibadan North')->assertJsonPath('team.members_count', 2);
        $this->withToken($delegateToken)->getJson('/api/auth/events')->assertJsonPath('registrations.0.team.leader', $leader->name);

        $third = $this->register(User::factory()->create(), $event, 'T-3');
        $this->app['auth']->forgetGuards();
        $this->withToken($third->user->createToken('user')->plainTextToken)->postJson("/api/auth/events/{$event->slug}/team", ['code' => $created['code']])
            ->assertUnprocessable()->assertJsonValidationErrors(['code' => 'Ibadan North is full.']);

        $this->app['auth']->forgetGuards();
        $this->withToken($this->token)->deleteJson("/api/admin/teams/{$created['id']}/members/{$first->id}")->assertOk();
        $this->assertNull($first->fresh()->team_id);
        $this->withToken($this->token)->deleteJson("/api/admin/teams/{$created['id']}")->assertOk();
        $this->assertNull($second->fresh()->team_id);
    }

    public function test_check_in_and_meals_are_recorded_once(): void
    {
        $event = Event::factory()->create();
        $registration = $this->register(User::factory()->create(['name' => 'Tobi']), $event, 'MIV-X-55555');

        $this->withToken($this->token)->getJson('/api/admin/check-in/lookup?code=miv-x-55555')->assertOk()->assertJsonPath('registration.name', 'Tobi')->assertJsonPath('registration.checked_in_at', null);
        $this->withToken($this->token)->getJson('/api/admin/check-in/lookup?code=WRONG')->assertUnprocessable()->assertJsonValidationErrors('code');

        $this->withToken($this->token)->postJson("/api/admin/check-in/{$registration->id}")->assertOk();
        $this->withToken($this->token)->postJson("/api/admin/check-in/{$registration->id}")->assertUnprocessable();

        $this->withToken($this->token)->postJson("/api/admin/check-in/{$registration->id}/meals", ['meal' => 'Lunch'])->assertOk()->assertJsonPath('registration.meals_today.Breakfast', null);
        $this->withToken($this->token)->postJson("/api/admin/check-in/{$registration->id}/meals", ['meal' => 'Lunch'])->assertUnprocessable()->assertJsonValidationErrors('meal');
        $this->withToken($this->token)->postJson("/api/admin/check-in/{$registration->id}/meals", ['meal' => 'Supper'])->assertUnprocessable();

        $this->withToken($this->token)->getJson("/api/admin/check-in/events/{$event->slug}")
            ->assertOk()->assertJsonPath('registered', 1)->assertJsonPath('checked_in', 1)->assertJsonPath('meals_today.Lunch', 1)->assertJsonCount(2, 'recent');

        $this->withToken($this->token)->deleteJson("/api/admin/check-in/{$registration->id}")->assertOk();
        $this->assertNull($registration->fresh()->checked_in_at);
    }

    public function test_paid_orders_are_collected_once_by_pickup_code(): void
    {
        $order = ShopOrder::create(['user_id' => User::factory()->create()->id, 'reference' => 'R-1', 'status' => 'paid', 'total' => 1000, 'currency' => 'NGN', 'payment_provider' => 'paystack', 'pickup_code' => 'JC27-ORD-ABCD1234', 'paid_at' => now()]);
        ShopOrder::create(['user_id' => User::factory()->create()->id, 'reference' => 'R-2', 'status' => 'pending', 'total' => 1000, 'currency' => 'NGN', 'payment_provider' => 'paystack', 'pickup_code' => 'JC27-ORD-PENDING1']);

        $this->withToken($this->token)->postJson('/api/admin/shop/orders/collect', ['pickup_code' => 'jc27-ord-abcd1234'])->assertOk()->assertJsonPath('order.reference', 'R-1');
        $this->assertNotNull($order->fresh()->collected_at);
        $this->withToken($this->token)->postJson('/api/admin/shop/orders/collect', ['pickup_code' => 'JC27-ORD-ABCD1234'])->assertUnprocessable();
        $this->withToken($this->token)->postJson('/api/admin/shop/orders/collect', ['pickup_code' => 'JC27-ORD-PENDING1'])->assertUnprocessable();
    }

    public function test_admin_updates_profile_password_and_manages_admins(): void
    {
        $other = $this->admin->createToken('laptop', ['admin']);

        $this->withToken($this->token)->putJson('/api/admin/account', ['name' => 'Chief Admin', 'email' => 'Chief@MIV.test'])->assertOk()->assertJsonPath('admin.email', 'chief@miv.test');

        $this->withToken($this->token)->putJson('/api/admin/account/password', ['current_password' => 'wrong', 'password' => 'NewPassword456', 'password_confirmation' => 'NewPassword456'])
            ->assertUnprocessable()->assertJsonValidationErrors('current_password');
        $this->withToken($this->token)->putJson('/api/admin/account/password', ['current_password' => 'OldPassword123', 'password' => 'NewPassword456', 'password_confirmation' => 'NewPassword456'])->assertOk();
        $this->assertTrue(Hash::check('NewPassword456', $this->admin->fresh()->password));
        $this->assertDatabaseMissing('personal_access_tokens', ['id' => $other->accessToken->id]);

        $created = $this->withToken($this->token)->postJson('/api/admin/admins', ['name' => 'Desk Lead', 'email' => 'desk@miv.test', 'password' => 'DeskPassword1'])->assertCreated()->json('admin');
        $this->withToken($this->token)->getJson('/api/admin/account')->assertJsonCount(2, 'admins');
        $this->withToken($this->token)->deleteJson("/api/admin/admins/{$this->admin->id}")->assertUnprocessable();
        $this->withToken($this->token)->deleteJson("/api/admin/admins/{$created['id']}")->assertOk();
        $this->assertFalse(User::find($created['id'])->is_admin);
    }

    public function test_operations_require_an_admin(): void
    {
        $token = User::factory()->create()->createToken('user')->plainTextToken;
        $team = Team::factory()->create();

        $this->withToken($token)->getJson('/api/admin/registrants')->assertForbidden();
        $this->withToken($token)->getJson('/api/admin/check-in/lookup?code=X')->assertForbidden();
        $this->withToken($token)->deleteJson("/api/admin/teams/{$team->id}")->assertForbidden();
        $this->withToken($token)->getJson('/api/admin/account')->assertForbidden();
    }
}
