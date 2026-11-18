<?php

namespace App\Services\Push;

use App\Models\AppSetting;

/**
 * Web Push (VAPID) settings. The key pair is fixed in code so it never needs
 * .env or database setup; the frontend has the same public key built in
 * (frontend/lib/push.ts). Only the contact address can be changed by admins.
 */
class PushSettingsService
{
    /** Must match VAPID_PUBLIC_KEY in frontend/lib/push.ts. */
    public const PUBLIC_KEY = 'BMBiwYmq1onmrpgjFt5_C1D3YQR_LO2dTEMBM_Ym7kmMUHt2wCU79w4L4MTpKJ8imugMWjQsQ01--DNP1hVZ0hU';

    private const PRIVATE_KEY = 'wqQ--fBdTsSPgKalF0qu9fSkjY6ZE5z9AqfBf_Bd2Kg';

    private const SUBJECT = 'webpush_subject';

    /**
     * @return array{public_key: string, private_key: string, subject: string}
     */
    public function credentials(): array
    {
        return [
            'public_key' => self::PUBLIC_KEY,
            'private_key' => self::PRIVATE_KEY,
            'subject' => $this->subject(),
        ];
    }

    public function publicKey(): string
    {
        return self::PUBLIC_KEY;
    }

    /**
     * Safe to send to the admin browser: the private key is never returned.
     *
     * @return array{public_key: string, subject: string}
     */
    public function settings(): array
    {
        return ['public_key' => self::PUBLIC_KEY, 'subject' => $this->subject()];
    }

    /**
     * @param  array{subject?: string|null}  $attributes
     * @return array{message: string, settings: array{public_key: string, subject: string}}
     */
    public function save(array $attributes): array
    {
        $subject = trim((string) ($attributes['subject'] ?? ''));
        if ($subject !== '') {
            AppSetting::updateOrCreate(['key' => self::SUBJECT], ['value' => $subject]);
        }

        return ['message' => 'Push notification settings saved.', 'settings' => $this->settings()];
    }

    private function subject(): string
    {
        $stored = AppSetting::query()->where('key', self::SUBJECT)->first()?->value;
        if ($stored) {
            return $stored;
        }

        $fallback = (string) config('mail.from.address', '');

        return 'mailto:'.($fallback !== '' ? $fallback : 'admin@example.com');
    }
}
