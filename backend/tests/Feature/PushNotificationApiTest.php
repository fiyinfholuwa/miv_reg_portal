<?php

namespace Tests\Feature;

use App\Models\Event;
use App\Models\PushSubscription;
use App\Models\User;
use App\Services\Push\PushSender;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Collection;
use Tests\TestCase;

class PushNotificationApiTest extends TestCase
{
    use RefreshDatabase;

    /** @var list<array{endpoints: list<string>, payload: array<string, string>}> */
    private array $sent = [];

    /** @var list<string> */
    private array $expire = [];

    protected function setUp(): void
    {
        parent::setUp();
        $test = $this;
        $this->app->instance(PushSender::class, new class($test) implements PushSender
        {
            public function __construct(private PushNotificationApiTest $test) {}

            public function send(Collection $subscriptions, array $payload): array
            {
                return $this->test->record($subscriptions->pluck('endpoint')->all(), $payload);
            }
        });
    }

    /**
     * @param  list<string>  $endpoints
     * @param  array<string, string>  $payload
     * @return list<string>
     */
    public function record(array $endpoints, array $payload): array
    {
        $this->sent[] = ['endpoints' => $endpoints, 'payload' => $payload];

        return array_values(array_intersect($endpoints, $this->expire));
    }

    private function subscription(string $endpoint): array
    {
        return ['endpoint' => $endpoint, 'keys' => ['p256dh' => 'BPublicKeyValue', 'auth' => 'authSecret'], 'content_encoding' => 'aes128gcm'];
    }

    public function test_user_can_subscribe_and_unsubscribe_a_browser(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->postJson('/api/auth/push-subscriptions', $this->subscription('https://push.example.com/abc'))->assertCreated();
        $this->actingAs($user)->postJson('/api/auth/push-subscriptions', $this->subscription('https://push.example.com/abc'))->assertCreated();
        $this->assertSame(1, $user->pushSubscriptions()->count());

        $this->actingAs($user)->postJson('/api/auth/push-subscriptions', ['endpoint' => 'http://insecure.test/x', 'keys' => []])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['endpoint', 'keys.p256dh', 'keys.auth']);

        $this->actingAs($user)->deleteJson('/api/auth/push-subscriptions', ['endpoint' => 'https://push.example.com/abc'])->assertOk();
        $this->assertDatabaseCount('push_subscriptions', 0);
    }

    public function test_keys_are_created_in_the_database_on_first_use_and_exposed_for_subscribing(): void
    {
        $first = $this->getJson('/api/push/public-key')->assertOk()->json('public_key');

        $this->assertNotEmpty($first);
        $this->assertDatabaseHas('app_settings', ['key' => 'webpush_private_key']);
        $this->getJson('/api/push/public-key')->assertJsonPath('public_key', $first);
    }

    public function test_full_access_admin_can_view_change_and_regenerate_push_keys(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $token = $admin->createToken('admin', ['admin'])->plainTextToken;

        $original = $this->withToken($token)->getJson('/api/admin/settings/push')
            ->assertOk()
            ->assertJsonPath('settings.private_key_set', true)
            ->assertJsonMissingPath('settings.private_key')
            ->json('settings.public_key');

        $this->withToken($token)->putJson('/api/admin/settings/push', ['subject' => 'mailto:team@example.com'])
            ->assertOk()
            ->assertJsonPath('settings.subject', 'mailto:team@example.com')
            ->assertJsonPath('settings.public_key', $original);

        $this->withToken($token)->putJson('/api/admin/settings/push', ['subject' => 'not a contact'])->assertUnprocessable();

        $regenerated = $this->withToken($token)->postJson('/api/admin/settings/push/regenerate')->assertOk()->json('settings.public_key');
        $this->assertNotSame($original, $regenerated);
        $this->getJson('/api/push/public-key')->assertJsonPath('public_key', $regenerated);
    }

    public function test_limited_admin_cannot_manage_push_keys(): void
    {
        $admin = User::factory()->create(['is_admin' => true, 'admin_permissions' => ['media']]);
        $token = $admin->createToken('admin', ['admin'])->plainTextToken;

        $this->withToken($token)->getJson('/api/admin/settings/push')->assertForbidden();
        $this->withToken($token)->postJson('/api/admin/settings/push/regenerate')->assertForbidden();
    }

    public function test_a_new_notification_is_pushed_to_the_users_browsers_and_gone_ones_are_removed(): void
    {
        $user = User::factory()->create(['registration_completed_at' => now()]);
        PushSubscription::create(['user_id' => $user->id, 'endpoint' => 'https://push.example.com/phone', 'public_key' => 'k', 'auth_token' => 'a']);
        PushSubscription::create(['user_id' => $user->id, 'endpoint' => 'https://push.example.com/old', 'public_key' => 'k', 'auth_token' => 'a']);
        PushSubscription::create(['user_id' => User::factory()->create()->id, 'endpoint' => 'https://push.example.com/someone-else', 'public_key' => 'k', 'auth_token' => 'a']);
        $this->expire = ['https://push.example.com/old'];
        $event = Event::factory()->create();

        $this->actingAs($user)->postJson("/api/auth/events/{$event->slug}/register", ['attendance_mode' => 'Onsite'])->assertCreated();

        $this->assertCount(1, $this->sent);
        $this->assertEqualsCanonicalizing(['https://push.example.com/phone', 'https://push.example.com/old'], $this->sent[0]['endpoints']);
        $this->assertSame("You're registered for {$event->short_name}", $this->sent[0]['payload']['title']);
        $this->assertSame('/dashboard/events/'.$event->slug, $this->sent[0]['payload']['url']);
        $this->assertDatabaseMissing('push_subscriptions', ['endpoint' => 'https://push.example.com/old']);
    }

    public function test_sent_broadcast_is_pushed_to_everyone_once(): void
    {
        PushSubscription::create(['user_id' => User::factory()->create()->id, 'endpoint' => 'https://push.example.com/a', 'public_key' => 'k', 'auth_token' => 'a']);
        PushSubscription::create(['user_id' => User::factory()->create()->id, 'endpoint' => 'https://push.example.com/b', 'public_key' => 'k', 'auth_token' => 'a']);
        $admin = User::factory()->create(['is_admin' => true]);

        $this->withToken($admin->createToken('admin', ['admin'])->plainTextToken)
            ->postJson('/api/admin/broadcasts', ['title' => 'Gates open', 'body' => 'Doors open at 8am.', 'status' => 'sent'])
            ->assertCreated();

        $this->assertCount(1, $this->sent);
        $this->assertCount(2, $this->sent[0]['endpoints']);
        $this->assertSame('Gates open', $this->sent[0]['payload']['title']);

        $this->artisan('webpush:scheduled-broadcasts')->assertSuccessful();
        $this->assertCount(1, $this->sent);
    }
}
