<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * The photo used on "I will be attending" cards. Stored on the private disk and
 * served through the API so only its owner can fetch it, and so the frontend can
 * draw it onto a canvas without cross-origin tainting.
 */
class ProfilePhotoService
{
    private const DISK = 'local';

    public function store(User $user, UploadedFile $photo): void
    {
        $previous = $user->photo_path;
        $path = $photo->storeAs('photos', $user->id.'-'.now()->timestamp.'.'.$photo->extension(), self::DISK);

        $user->forceFill(['photo_path' => $path])->save();

        if ($previous && $previous !== $path) {
            Storage::disk(self::DISK)->delete($previous);
        }
    }

    public function response(User $user): ?StreamedResponse
    {
        if (! $user->photo_path || ! Storage::disk(self::DISK)->exists($user->photo_path)) {
            return null;
        }

        return Storage::disk(self::DISK)->response($user->photo_path, null, ['Cache-Control' => 'private, max-age=300']);
    }

    public function delete(User $user): void
    {
        if ($user->photo_path) {
            Storage::disk(self::DISK)->delete($user->photo_path);
        }

        $user->forceFill(['photo_path' => null])->save();
    }
}
