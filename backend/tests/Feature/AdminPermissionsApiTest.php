<?php

namespace Tests\Feature;

use App\Models\Event;
use App\Models\EventRegistration;
use App\Models\ShopProduct;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminPermissionsApiTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @param  list<string>|null  $permissions
     */
    private function adminToken(?array $permissions = null): string
    {
        $this->app['auth']->forgetGuards();
        $admin = User::factory()->create(['is_admin' => true, 'admin_permissions' => $permissions]);

        return $admin->createToken('admin', ['admin'])->plainTextToken;
    }

    public function test_limited_admin_can_only_use_permitted_areas(): void
    {
        $token = $this->adminToken(['merch']);

        $this->withToken($token)->getJson('/api/admin/shop/products')->assertOk();
        $this->withToken($token)->getJson('/api/admin/shop/orders')->assertOk();
        $this->withToken($token)->getJson('/api/admin/overview')->assertOk();
        $this->withToken($token)->getJson('/api/admin/account')->assertOk()->assertJsonPath('admin.permissions', ['merch'])->assertJsonCount(0, 'admins');

        $this->withToken($token)->getJson('/api/admin/registrants')->assertForbidden();
        $this->withToken($token)->getJson('/api/admin/broadcasts')->assertForbidden();
        $this->withToken($token)->getJson('/api/admin/settings/paystack')->assertForbidden();
        $this->withToken($token)->postJson('/api/admin/admins', ['name' => 'X', 'email' => 'x@miv.test', 'password' => 'Password1234'])->assertForbidden();
    }

    public function test_check_in_and_meals_are_separate_permissions(): void
    {
        $event = Event::factory()->create();
        $registration = EventRegistration::create(['user_id' => User::factory()->create()->id, 'event_id' => $event->id, 'ticket_code' => 'MEAL-1']);

        $mealsToken = $this->adminToken(['meals']);
        $this->withToken($mealsToken)->postJson("/api/admin/check-in/{$registration->id}")->assertForbidden();
        $this->withToken($mealsToken)->getJson("/api/admin/check-in/lookup?code=MEAL-1&event={$event->slug}")->assertOk();

        $this->withToken($this->adminToken(['check_in']))->postJson("/api/admin/check-in/{$registration->id}")->assertOk();
    }

    public function test_accommodation_admin_only_sees_people_needing_a_room(): void
    {
        $event = Event::factory()->create(['slug' => 'retreat']);
        EventRegistration::create(['user_id' => User::factory()->create()->id, 'event_id' => $event->id, 'ticket_code' => 'R-1', 'needs_accommodation' => true]);
        EventRegistration::create(['user_id' => User::factory()->create()->id, 'event_id' => $event->id, 'ticket_code' => 'R-2']);

        $this->withToken($this->adminToken(['accommodation']))->getJson('/api/admin/registrants?event=retreat')
            ->assertOk()->assertJsonPath('meta.total', 1)->assertJsonPath('data.0.events.0.needs_accommodation', true);
        $this->withToken($this->adminToken())->getJson('/api/admin/registrants?event=retreat')->assertJsonPath('meta.total', 2);
    }

    public function test_super_admin_creates_and_updates_limited_admins(): void
    {
        $token = $this->adminToken();

        $created = $this->withToken($token)->postJson('/api/admin/admins', ['name' => 'Media Lead', 'email' => 'media@miv.test', 'password' => 'MediaPassword1', 'permissions' => ['media']])
            ->assertCreated()->assertJsonPath('admin.permissions', ['media'])->json('admin');

        $this->withToken($token)->postJson('/api/admin/admins', ['name' => 'Bad', 'email' => 'bad@miv.test', 'password' => 'BadPassword12', 'permissions' => ['everything']])
            ->assertUnprocessable()->assertJsonValidationErrors('permissions.0');

        $this->withToken($token)->patchJson("/api/admin/admins/{$created['id']}", ['permissions' => ['media', 'finance']])->assertOk()->assertJsonPath('admin.permissions', ['media', 'finance']);
        $this->withToken($token)->patchJson("/api/admin/admins/{$created['id']}", ['permissions' => null])->assertOk()->assertJsonPath('admin.permissions', null);
        $this->withToken($token)->patchJson("/api/admin/admins/{$created['id']}", ['permissions' => []])->assertUnprocessable();
    }

    public function test_overview_and_orders_can_be_filtered_by_event(): void
    {
        $event = Event::factory()->create(['slug' => 'harvest']);
        $other = Event::factory()->create();
        EventRegistration::create(['user_id' => User::factory()->create()->id, 'event_id' => $event->id, 'ticket_code' => 'H-1', 'attendance_mode' => 'Online', 'checked_in_at' => now()]);
        EventRegistration::create(['user_id' => User::factory()->create()->id, 'event_id' => $event->id, 'ticket_code' => 'H-2', 'attendance_mode' => 'Onsite']);
        EventRegistration::create(['user_id' => User::factory()->create()->id, 'event_id' => $other->id, 'ticket_code' => 'O-1']);
        $token = $this->adminToken();

        $this->withToken($token)->getJson('/api/admin/overview?event=harvest')->assertOk()
            ->assertJsonPath('event.slug', 'harvest')->assertJsonPath('registered', 2)->assertJsonPath('online', 1)->assertJsonPath('onsite', 1)->assertJsonPath('checked_in', 1);
        $this->withToken($token)->getJson('/api/admin/overview?event=missing')->assertNotFound();

        $product = ShopProduct::factory()->create(['event_id' => $event->id]);
        $this->getJson('/api/shop/products')->assertJsonPath('products.0.event.slug', 'harvest');
        $this->withToken($token)->getJson('/api/admin/shop/products')->assertJsonPath('products.0.event.short_name', $event->short_name);
        $this->withToken($token)->patchJson("/api/admin/shop/products/{$product->id}", ['name' => $product->name, 'price' => 100, 'event_id' => null])->assertOk()->assertJsonPath('product.event', null);
    }
}
