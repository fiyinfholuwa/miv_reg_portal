<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ProfilePhotoApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_uploading_a_photo_stores_it_privately_and_replaces_the_previous_one(): void
    {
        Storage::fake('local');
        $user = User::factory()->create();
        $token = $user->createToken('test')->plainTextToken;

        $this->withToken($token)->post('/api/auth/photo', ['photo' => UploadedFile::fake()->image('me.jpg', 600, 800)], ['Accept' => 'application/json'])
            ->assertOk()
            ->assertJsonPath('has_photo', true);

        $first = $user->fresh()->photo_path;
        Storage::disk('local')->assertExists($first);

        $this->travel(2)->seconds();
        $this->withToken($token)->post('/api/auth/photo', ['photo' => UploadedFile::fake()->image('me.png', 400, 400)], ['Accept' => 'application/json'])->assertOk();

        Storage::disk('local')->assertMissing($first);
        Storage::disk('local')->assertExists($user->fresh()->photo_path);

        $this->withToken($token)->get('/api/auth/photo')->assertOk()->assertHeader('Content-Type', 'image/png');
        $this->withToken($token)->getJson('/api/auth/user')->assertJsonPath('user.has_photo', true)->assertJsonMissingPath('user.photo_path');
    }

    public function test_upload_rejects_files_that_are_not_photos_or_too_large(): void
    {
        Storage::fake('local');
        $token = User::factory()->create()->createToken('test')->plainTextToken;

        $this->withToken($token)->post('/api/auth/photo', ['photo' => UploadedFile::fake()->create('notes.pdf', 20, 'application/pdf')], ['Accept' => 'application/json'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['photo' => 'Upload a JPG, PNG or WebP photo.']);

        $this->withToken($token)->post('/api/auth/photo', ['photo' => UploadedFile::fake()->image('huge.jpg')->size(6000)], ['Accept' => 'application/json'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['photo' => 'Your photo must be 5 MB or smaller.']);
    }

    public function test_photo_returns_404_before_upload_and_after_removal(): void
    {
        Storage::fake('local');
        $user = User::factory()->create();
        $token = $user->createToken('test')->plainTextToken;

        $this->withToken($token)->getJson('/api/auth/photo')->assertNotFound();

        $this->withToken($token)->post('/api/auth/photo', ['photo' => UploadedFile::fake()->image('me.jpg')], ['Accept' => 'application/json'])->assertOk();
        $path = $user->fresh()->photo_path;

        $this->withToken($token)->deleteJson('/api/auth/photo')->assertOk()->assertJsonPath('has_photo', false);

        Storage::disk('local')->assertMissing($path);
        $this->withToken($token)->getJson('/api/auth/photo')->assertNotFound();
    }

    public function test_photo_endpoints_return_401_without_a_token(): void
    {
        $this->getJson('/api/auth/photo')->assertUnauthorized();
        $this->postJson('/api/auth/photo')->assertUnauthorized();
    }
}
