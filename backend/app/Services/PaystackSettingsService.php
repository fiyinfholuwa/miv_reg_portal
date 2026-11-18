<?php

namespace App\Services;

use App\Models\AppSetting;

class PaystackSettingsService
{
    private const PUBLIC_KEY = 'paystack_public_key';

    private const SECRET_KEY = 'paystack_secret_key';

    /**
     * Values safe to send to the admin browser. The secret itself is never returned.
     *
     * @return array{public_key: string, secret_key_set: bool}
     */
    public function settings(): array
    {
        return [
            'public_key' => (string) ($this->value(self::PUBLIC_KEY) ?: config('services.paystack.public_key', '')),
            'secret_key_set' => $this->secretKey() !== '',
        ];
    }

    /**
     * @return array{public_key: string, secret_key: string}
     */
    public function credentials(): array
    {
        return [
            'public_key' => (string) ($this->value(self::PUBLIC_KEY) ?: config('services.paystack.public_key', '')),
            'secret_key' => $this->secretKey(),
        ];
    }

    /**
     * A blank secret_key intentionally leaves the existing key unchanged.
     *
     * @param  array{public_key?: string|null, secret_key?: string|null}  $attributes
     * @return array{message: string, settings: array{public_key: string, secret_key_set: bool}}
     */
    public function save(array $attributes): array
    {
        $publicKey = trim((string) ($attributes['public_key'] ?? ''));
        $secretKey = trim((string) ($attributes['secret_key'] ?? ''));

        AppSetting::updateOrCreate(['key' => self::PUBLIC_KEY], ['value' => $publicKey !== '' ? $publicKey : null]);

        if ($secretKey !== '') {
            AppSetting::updateOrCreate(['key' => self::SECRET_KEY], ['value' => $secretKey]);
        }

        return ['message' => 'Paystack settings saved.', 'settings' => $this->settings()];
    }

    private function secretKey(): string
    {
        return (string) ($this->value(self::SECRET_KEY) ?: config('services.paystack.secret_key', ''));
    }

    private function value(string $key): ?string
    {
        return AppSetting::query()->where('key', $key)->first()?->value;
    }
}
