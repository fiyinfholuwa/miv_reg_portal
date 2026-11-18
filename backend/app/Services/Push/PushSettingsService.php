<?php

namespace App\Services\Push;

use App\Models\AppSetting;
use Minishlink\WebPush\VAPID;

/**
 * Web Push (VAPID) keys, stored encrypted in app_settings instead of .env.
 * Keys are created automatically the first time they are needed (or by the
 * seeder), and admins can change the contact address or replace the keys.
 */
class PushSettingsService
{
    private const PUBLIC_KEY = 'webpush_public_key';

    private const PRIVATE_KEY = 'webpush_private_key';

    private const SUBJECT = 'webpush_subject';

    /**
     * @return array{public_key: string, private_key: string, subject: string}
     */
    public function credentials(): array
    {
        $this->ensureKeys();

        return [
            'public_key' => (string) $this->value(self::PUBLIC_KEY),
            'private_key' => (string) $this->value(self::PRIVATE_KEY),
            'subject' => $this->subject(),
        ];
    }

    public function publicKey(): string
    {
        return $this->credentials()['public_key'];
    }

    /**
     * Safe to send to the admin browser: the private key is never returned.
     *
     * @return array{public_key: string, subject: string, private_key_set: bool}
     */
    public function settings(): array
    {
        $credentials = $this->credentials();

        return [
            'public_key' => $credentials['public_key'],
            'subject' => $credentials['subject'],
            'private_key_set' => $credentials['private_key'] !== '',
        ];
    }

    /**
     * Blank keys leave the current ones unchanged. Keys must be supplied as a pair.
     *
     * @param  array{subject?: string|null, public_key?: string|null, private_key?: string|null}  $attributes
     * @return array{message: string, settings: array{public_key: string, subject: string, private_key_set: bool}}
     */
    public function save(array $attributes): array
    {
        $subject = trim((string) ($attributes['subject'] ?? ''));
        if ($subject !== '') {
            $this->put(self::SUBJECT, $subject);
        }

        $publicKey = trim((string) ($attributes['public_key'] ?? ''));
        $privateKey = trim((string) ($attributes['private_key'] ?? ''));
        if ($publicKey !== '' && $privateKey !== '') {
            $this->put(self::PUBLIC_KEY, $publicKey);
            $this->put(self::PRIVATE_KEY, $privateKey);
        }

        return ['message' => 'Push notification settings saved.', 'settings' => $this->settings()];
    }

    /**
     * Replace the key pair. Every device must turn push on again afterwards.
     *
     * @return array{message: string, settings: array{public_key: string, subject: string, private_key_set: bool}}
     */
    public function regenerate(): array
    {
        $this->storeNewKeys();

        return ['message' => 'New push keys created. People need to turn push notifications on again.', 'settings' => $this->settings()];
    }

    /** Create a key pair if none is stored yet. Safe to call repeatedly. */
    public function ensureKeys(): void
    {
        if ($this->value(self::PUBLIC_KEY) && $this->value(self::PRIVATE_KEY)) {
            return;
        }

        $this->storeNewKeys();
    }

    private function storeNewKeys(): void
    {
        $keys = VAPID::createVapidKeys();
        $this->put(self::PUBLIC_KEY, $keys['publicKey']);
        $this->put(self::PRIVATE_KEY, $keys['privateKey']);
    }

    private function subject(): string
    {
        $stored = $this->value(self::SUBJECT);
        if ($stored) {
            return $stored;
        }

        $fallback = (string) config('mail.from.address', '');

        return 'mailto:'.($fallback !== '' ? $fallback : 'admin@example.com');
    }

    private function value(string $key): ?string
    {
        return AppSetting::query()->where('key', $key)->first()?->value;
    }

    private function put(string $key, string $value): void
    {
        AppSetting::updateOrCreate(['key' => $key], ['value' => $value]);
    }
}
