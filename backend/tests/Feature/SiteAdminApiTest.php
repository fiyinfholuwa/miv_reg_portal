<?php

namespace Tests\Feature;

use App\Models\Broadcast;
use App\Models\Event;
use App\Models\EventRegistration;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SiteAdminApiTest extends TestCase
{
    use RefreshDatabase;

    private function adminToken(): string
    {
        return User::factory()->create(['is_admin' => true])->createToken('admin', ['admin'])->plainTextToken;
    }

    public function test_admin_saves_landing_sections_and_the_public_endpoint_returns_them(): void
    {
        $this->getJson('/api/site-content')->assertOk()->assertExactJson(['content' => []]);

        $token = $this->adminToken();
        $this->withToken($token)->putJson('/api/site-content/hero', [])->assertNotFound();
        $this->withToken($token)->putJson('/api/admin/site-content/hero', ['title' => 'Raising leaders', 'subtitle' => 'Find your next event.', 'image' => '/storage/uploads/hero.jpg'])
            ->assertOk()
            ->assertJsonPath('content.title', 'Raising leaders');
        $this->withToken($token)->putJson('/api/admin/site-content/stats', ['heading' => 'Since 1989', 'items' => [['value' => '37th', 'label' => 'Edition']]])->assertOk();

        $this->getJson('/api/site-content')
            ->assertOk()
            ->assertJsonPath('content.hero.title', 'Raising leaders')
            ->assertJsonPath('content.stats.items.0.value', '37th');
    }

    public function test_site_content_is_validated_per_section_and_unknown_sections_are_rejected(): void
    {
        $token = $this->adminToken();

        $this->withToken($token)->putJson('/api/admin/site-content/hero', ['subtitle' => 'No title'])->assertUnprocessable()->assertJsonValidationErrors('title');
        $this->withToken($token)->putJson('/api/admin/site-content/contact', ['email' => 'not-an-email'])->assertUnprocessable()->assertJsonValidationErrors('email');
        $this->withToken($token)->putJson('/api/admin/site-content/gallery', ['heading' => 'Gallery', 'items' => [['caption' => 'No image']]])->assertUnprocessable()->assertJsonValidationErrors('items.0.image');
        $this->withToken($token)->putJson('/api/admin/site-content/secrets', ['title' => 'x'])->assertNotFound();
    }

    public function test_non_admins_cannot_edit_the_landing_page(): void
    {
        $token = User::factory()->create()->createToken('user')->plainTextToken;

        $this->withToken($token)->putJson('/api/admin/site-content/hero', ['title' => 'Hacked'])->assertForbidden();
        $this->assertDatabaseCount('site_contents', 0);
    }

    public function test_admin_creates_edits_and_deletes_an_event(): void
    {
        $token = $this->adminToken();
        $payload = ['title' => 'Harvest Thanksgiving', 'short_name' => 'Harvest 2027', 'date_label' => 'Sun 5 Dec 2027', 'starts_at' => '2027-12-05T10:00:00+01:00', 'attendance_options' => ['Onsite', ' Online '], 'day_options' => [], 'is_featured' => true, 'registration_open' => true, 'sort_order' => 20];

        $this->withToken($token)->postJson('/api/admin/events', $payload)
            ->assertCreated()
            ->assertJsonPath('event.slug', 'harvest-2027')
            ->assertJsonPath('event.attendance_options', ['Onsite', 'Online']);

        $this->getJson('/api/events/harvest-2027')->assertOk()->assertJsonPath('event.title', 'Harvest Thanksgiving');

        $this->withToken($token)->postJson('/api/admin/events', $payload)->assertUnprocessable()->assertJsonValidationErrors(['slug' => 'Another event already uses this web address.']);

        $this->withToken($token)->patchJson('/api/admin/events/harvest-2027', [...$payload, 'title' => 'Harvest Service', 'registration_open' => false])
            ->assertOk()
            ->assertJsonPath('event.title', 'Harvest Service')
            ->assertJsonPath('event.registration_open', false);

        $this->withToken($token)->deleteJson('/api/admin/events/harvest-2027')->assertOk();
        $this->assertDatabaseMissing('events', ['slug' => 'harvest-2027']);
    }

    public function test_events_with_registrations_cannot_be_deleted(): void
    {
        $event = Event::factory()->create();
        EventRegistration::create(['user_id' => User::factory()->create()->id, 'event_id' => $event->id, 'ticket_code' => 'MIV-T-10001']);

        $this->withToken($this->adminToken())->deleteJson("/api/admin/events/{$event->slug}")
            ->assertUnprocessable()
            ->assertJsonValidationErrors('event');
        $this->assertDatabaseHas('events', ['id' => $event->id]);
    }

    public function test_delegates_only_see_sent_or_due_announcements(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        foreach ([['Sent', 'sent', null], ['Draft', 'draft', null], ['Due', 'scheduled', now()->subHour()], ['Later', 'scheduled', now()->addDay()]] as [$title, $status, $at]) {
            Broadcast::create(['created_by' => $admin->id, 'title' => $title, 'body' => 'Body', 'status' => $status, 'scheduled_at' => $at]);
        }

        $titles = $this->withToken(User::factory()->create()->createToken('user')->plainTextToken)
            ->getJson('/api/auth/broadcasts')->assertOk()->json('broadcasts.*.title');

        $this->assertEqualsCanonicalizing(['Sent', 'Due'], $titles);
    }
}
