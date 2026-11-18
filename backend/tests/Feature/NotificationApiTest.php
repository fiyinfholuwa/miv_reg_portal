<?php

namespace Tests\Feature;

use App\Models\Broadcast;
use App\Models\Event;
use App\Models\ShopOrder;
use App\Models\Testimonial;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class NotificationApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_feed_merges_broadcasts_and_marking_read_clears_the_unread_count(): void
    {
        $user = User::factory()->create();
        Broadcast::create(['title' => 'Venue update', 'body' => 'Gate B opens at 8am.', 'status' => 'sent']);
        Broadcast::create(['title' => 'Draft', 'body' => 'Not yet.', 'status' => 'draft']);
        Broadcast::create(['title' => 'Later', 'body' => 'Tomorrow.', 'status' => 'scheduled', 'scheduled_at' => now()->addDay()]);

        $this->actingAs($user)->getJson('/api/auth/notifications')
            ->assertOk()
            ->assertJsonPath('unread_count', 1)
            ->assertJsonCount(1, 'notifications')
            ->assertJsonPath('notifications.0.title', 'Venue update')
            ->assertJsonPath('notifications.0.read', false);

        $this->actingAs($user)->postJson('/api/auth/notifications/read')
            ->assertOk()
            ->assertJsonPath('unread_count', 0)
            ->assertJsonPath('notifications.0.read', true);

        $this->travel(1)->minutes();
        Broadcast::create(['title' => 'Lunch', 'body' => 'Served at 1pm.', 'status' => 'sent']);
        $this->actingAs($user)->getJson('/api/auth/notifications')->assertJsonPath('unread_count', 1);
    }

    public function test_paid_and_collected_orders_notify_the_buyer(): void
    {
        config(['services.paystack.secret_key' => 'sk_test', 'services.paystack.base_url' => 'https://paystack.test']);
        Http::fake(['paystack.test/*' => Http::response(['status' => true, 'data' => ['status' => 'success', 'amount' => 500000]])]);
        $buyer = User::factory()->create();
        ShopOrder::create(['user_id' => $buyer->id, 'reference' => 'R-PAY', 'status' => 'pending', 'total' => 5000, 'currency' => 'NGN', 'payment_provider' => 'paystack']);

        $this->actingAs($buyer)->getJson('/api/shop/orders/R-PAY/verify')->assertOk();

        $feed = $this->actingAs($buyer)->getJson('/api/auth/notifications')
            ->assertJsonPath('unread_count', 1)
            ->assertJsonPath('notifications.0.kind', 'order')
            ->assertJsonPath('notifications.0.title', 'Order paid')
            ->assertJsonPath('notifications.0.link', '/dashboard/order-history');

        $this->actingAs($buyer)->postJson('/api/auth/notifications/read', ['ids' => [$feed->json('notifications.0.id')]])->assertJsonPath('unread_count', 0);

        $admin = User::factory()->create(['is_admin' => true]);
        $this->app['auth']->forgetGuards();
        $this->withToken($admin->createToken('admin', ['admin'])->plainTextToken)
            ->postJson('/api/admin/shop/orders/collect', ['pickup_code' => ShopOrder::first()->pickup_code])
            ->assertOk();

        $this->assertSame('Order collected', $buyer->fresh()->unreadNotifications()->first()?->data['title']);
    }

    public function test_reviewing_a_testimony_notifies_its_author_with_a_link_to_the_event(): void
    {
        $author = User::factory()->create();
        $event = Event::factory()->create();
        $testimonial = Testimonial::create(['user_id' => $author->id, 'event_id' => $event->id, 'type' => 'Write', 'content' => 'God healed me.', 'status' => 'pending', 'show_name' => true]);
        $admin = User::factory()->create(['is_admin' => true]);

        $this->withToken($admin->createToken('admin', ['admin'])->plainTextToken)
            ->patchJson("/api/admin/testimonials/{$testimonial->id}/review", ['status' => 'approved'])
            ->assertOk();

        $this->actingAs($author)->getJson('/api/auth/notifications')
            ->assertJsonPath('notifications.0.kind', 'testimony')
            ->assertJsonPath('notifications.0.title', 'Your testimony was published')
            ->assertJsonPath('notifications.0.link', "/dashboard/events/{$event->slug}/testimonials");
    }

    public function test_notifications_require_sign_in(): void
    {
        $this->getJson('/api/auth/notifications')->assertUnauthorized();
    }
}
