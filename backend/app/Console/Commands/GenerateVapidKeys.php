<?php

namespace App\Console\Commands;

use App\Services\Push\PushSettingsService;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('webpush:vapid {--fresh : Replace the existing keys (devices must re-enable push)}')]
#[Description('Create the Web Push (VAPID) keys in the database if they are missing')]
class GenerateVapidKeys extends Command
{
    public function handle(PushSettingsService $settings): int
    {
        if ($this->option('fresh')) {
            $settings->regenerate();
        } else {
            $settings->ensureKeys();
        }

        $this->info('Web Push keys are stored in the database. Public key: '.$settings->publicKey());

        return self::SUCCESS;
    }
}
