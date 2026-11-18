<?php

namespace App\Services;

use App\Models\Event;
use App\Models\EventRegistration;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

/**
 * Public copies of "I will be attending" cards. Social apps only show an image
 * for a link when the page has an og:image, so each card is stored below the
 * web root and served from a small share page that points crawlers at it.
 */
class AttendingCardService
{
    private const DISK = 'uploads';

    private const DIRECTORY = 'uploads/cards';

    public function __construct(private readonly UploadUrlService $uploadUrlService) {}

    /** @return array{code: string, share_url: string, image_url: string} */
    public function store(User $user, Event $event, UploadedFile $card): array
    {
        $registered = EventRegistration::where('user_id', $user->id)->where('event_id', $event->id)->exists();
        if (! $registered) {
            throw ValidationException::withMessages(['card' => 'Register for this event before sharing a card.']);
        }

        $code = $this->code($user, $event);
        $disk = Storage::disk(self::DISK);
        $disk->makeDirectory(self::DIRECTORY);
        $card->storeAs(self::DIRECTORY, $code.'.png', self::DISK);

        return [
            'code' => $code,
            'share_url' => $this->uploadUrlService->url('api/share/'.$event->slug.'/'.$code),
            'image_url' => $this->imageUrl($code),
        ];
    }

    /** The image URL for a stored card, or null when it does not exist. */
    public function find(string $code): ?string
    {
        if (! preg_match('/^[a-f0-9]{24}$/', $code) || ! Storage::disk(self::DISK)->exists($this->path($code))) {
            return null;
        }

        return $this->imageUrl($code);
    }

    /** Stable per user and event, so re-sharing replaces the old card. Not guessable. */
    private function code(User $user, Event $event): string
    {
        return substr(hash_hmac('sha256', 'card:'.$user->id.':'.$event->id, (string) config('app.key')), 0, 24);
    }

    private function path(string $code): string
    {
        return self::DIRECTORY.'/'.$code.'.png';
    }

    private function imageUrl(string $code): string
    {
        // Version by modification time so apps re-fetch an updated card.
        $version = Storage::disk(self::DISK)->lastModified($this->path($code));

        return $this->uploadUrlService->url($this->path($code)).'?v='.$version;
    }
}
