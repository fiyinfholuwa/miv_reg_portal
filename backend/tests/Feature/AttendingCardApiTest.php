<?php

namespace Tests\Feature;

use App\Models\Event;
use App\Models\EventRegistration;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class AttendingCardApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_registered_user_can_publish_a_card_and_share_page_previews_it(): void
    {
        Storage::fake('uploads');
        $user = User::factory()->create();
        $event = Event::factory()->create();
        EventRegistration::create(['user_id' => $user->id, 'event_id' => $event->id, 'ticket_code' => 'TCK-1']);

        $response = $this->withToken($user->createToken('test')->plainTextToken)
            ->post("/api/auth/events/{$event->slug}/card", ['card' => UploadedFile::fake()->image('card.png', 1080, 1350)], ['Accept' => 'application/json'])
            ->assertOk();

        $shareUrl = $response->json('share_url');
        $this->assertMatchesRegularExpression('#/api/share/'.preg_quote($event->slug).'/[a-f0-9]{24}$#', $shareUrl);
        Storage::disk('uploads')->assertExists('uploads/cards/'.basename($shareUrl).'.png');

        $this->get(parse_url($shareUrl, PHP_URL_PATH))
            ->assertOk()
            ->assertSee('<meta property="og:image" content="'.e($response->json('image_url')).'">', false)
            ->assertSee('/events/'.$event->slug, false);
    }

    public function test_card_requires_registration_and_a_png(): void
    {
        Storage::fake('uploads');
        $user = User::factory()->create();
        $event = Event::factory()->create();
        $token = $user->createToken('test')->plainTextToken;

        $this->withToken($token)
            ->post("/api/auth/events/{$event->slug}/card", ['card' => UploadedFile::fake()->image('card.png')], ['Accept' => 'application/json'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['card' => 'Register for this event before sharing a card.']);

        EventRegistration::create(['user_id' => $user->id, 'event_id' => $event->id, 'ticket_code' => 'TCK-2']);

        $this->withToken($token)
            ->post("/api/auth/events/{$event->slug}/card", ['card' => UploadedFile::fake()->create('card.pdf', 10, 'application/pdf')], ['Accept' => 'application/json'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['card']);
    }

    public function test_unknown_card_share_page_still_redirects_without_an_image(): void
    {
        Storage::fake('uploads');
        $event = Event::factory()->create();

        $this->get('/api/share/'.$event->slug.'/'.str_repeat('a', 24))
            ->assertOk()
            ->assertDontSee('og:image', false)
            ->assertSee('/events/'.$event->slug, false);
    }
}
