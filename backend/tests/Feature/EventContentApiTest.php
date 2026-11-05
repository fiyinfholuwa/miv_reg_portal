<?php

namespace Tests\Feature;

use App\Models\Event;
use App\Models\Testimonial;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class EventContentApiTest extends TestCase
{
    use RefreshDatabase;

    private function adminToken(): string
    {
        return User::factory()->create(['is_admin' => true])->createToken('admin', ['admin'])->plainTextToken;
    }

    public function test_admin_updates_programme_live_publicity_and_hotels_and_delegates_see_them(): void
    {
        $event = Event::factory()->create();

        $this->withToken($this->adminToken())->patchJson("/api/admin/events/{$event->slug}/content", [
            'programme' => [
                ['day' => 'Wed 20', 'date' => '2027-01-20', 'sessions' => [
                    ['start' => '18:00', 'end' => '20:00', 'title' => 'Evening service', 'detail' => 'Main hall'],
                    ['start' => '09:00', 'end' => '12:00', 'title' => 'Morning plenary'],
                ]],
                ['day' => 'Tue 19', 'date' => '2027-01-19', 'sessions' => []],
            ],
            'stream_url' => 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            'stream_title' => 'Opening night',
            'stream_live' => true,
            'publicity' => ['caption' => 'Join us!', 'assets' => [['title' => 'Flyer', 'image' => '/storage/uploads/flyer.jpg']]],
            'offers_accommodation' => true,
            'hotels' => [['name' => 'Olororo Lodge', 'price' => 18000, 'phone' => '+2348000000000', 'conference_rate' => true]],
        ])
            ->assertOk()
            ->assertJsonPath('event.programme.0.date', '2027-01-19')
            ->assertJsonPath('event.programme.1.sessions.0.title', 'Morning plenary')
            ->assertJsonPath('event.programme.1.sessions.1.end', '20:00')
            ->assertJsonPath('event.stream_live', true);

        $this->getJson("/api/events/{$event->slug}")
            ->assertOk()
            ->assertJsonPath('event.stream_title', 'Opening night')
            ->assertJsonPath('event.publicity.caption', 'Join us!')
            ->assertJsonPath('event.publicity.assets.0.title', 'Flyer')
            ->assertJsonPath('event.hotels.0.name', 'Olororo Lodge')
            ->assertJsonPath('event.hotels.0.conference_rate', true)
            ->assertJsonPath('event.offers_accommodation', true);
    }

    public function test_clearing_the_stream_link_also_turns_off_live(): void
    {
        $event = Event::factory()->create(['stream_url' => 'https://youtu.be/dQw4w9WgXcQ', 'stream_live' => true]);

        $this->withToken($this->adminToken())->patchJson("/api/admin/events/{$event->slug}/content", ['stream_url' => null])
            ->assertOk()
            ->assertJsonPath('event.stream_live', false);
    }

    public function test_content_is_validated(): void
    {
        $event = Event::factory()->create();

        $this->withToken($this->adminToken())->patchJson("/api/admin/events/{$event->slug}/content", [
            'programme' => [['day' => 'Day 1', 'sessions' => [['start' => '10:00', 'end' => '09:00', 'title' => 'Backwards']]]],
            'stream_url' => 'not a link',
            'hotels' => [['price' => 100]],
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['programme.0.date', 'programme.0.sessions.0.end', 'stream_url', 'hotels.0.name']);
    }

    public function test_only_admins_manage_event_content_and_uploads(): void
    {
        $event = Event::factory()->create();
        $token = User::factory()->create()->createToken('user')->plainTextToken;

        $this->withToken($token)->getJson('/api/admin/events')->assertForbidden();
        $this->withToken($token)->patchJson("/api/admin/events/{$event->slug}/content", ['stream_live' => true])->assertForbidden();
        $this->assertFalse($event->fresh()->stream_live);
    }

    public function test_admin_uploads_an_image_to_public_storage(): void
    {
        Storage::fake('public');

        $response = $this->withToken($this->adminToken())->post('/api/admin/uploads', ['image' => UploadedFile::fake()->image('flyer.jpg', 800, 800)], ['Accept' => 'application/json'])
            ->assertCreated();

        Storage::disk('public')->assertExists($response->json('path'));
        $this->assertStringContainsString('/uploads/', $response->json('url'));

        $this->withToken($this->adminToken())->post('/api/admin/uploads', ['image' => UploadedFile::fake()->create('notes.pdf', 10, 'application/pdf')], ['Accept' => 'application/json'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['image' => 'Upload a JPG, PNG or WebP image.']);
    }

    public function test_delegates_see_their_own_pending_testimonies_but_only_published_ones_publicly(): void
    {
        $user = User::factory()->create(['email_verified_at' => now(), 'registration_completed_at' => now(), 'phone' => '+2348030000000']);
        $token = $user->createToken('test')->plainTextToken;
        $this->withToken($token)->postJson('/api/auth/events/bbr/register', ['attendance_mode' => 'Online'])->assertCreated();
        $this->withToken($token)->postJson('/api/auth/testimonials', ['type' => 'Write', 'content' => 'God restored my family.', 'event' => 'bbr', 'topic' => 'Family'])->assertCreated();

        $this->withToken($token)->getJson('/api/auth/testimonials?event=bbr')
            ->assertOk()
            ->assertJsonCount(0, 'testimonials')
            ->assertJsonCount(1, 'mine')
            ->assertJsonPath('mine.0.status', 'pending');

        $this->app['auth']->forgetGuards();
        $this->withToken($this->adminToken())->patchJson('/api/admin/testimonials/'.Testimonial::first()->id.'/review', ['status' => 'approved'])->assertOk();
        $this->app['auth']->forgetGuards();

        $this->withToken($token)->getJson('/api/auth/testimonials?event=bbr')
            ->assertJsonCount(1, 'testimonials')
            ->assertJsonPath('mine.0.status', 'published');
    }
}
