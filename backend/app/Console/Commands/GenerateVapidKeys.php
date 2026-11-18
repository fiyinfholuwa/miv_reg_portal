<?php

namespace App\Console\Commands;

use App\Services\Push\PushSettingsService;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('webpush:vapid')]
#[Description('Show the built-in Web Push public key')]
class GenerateVapidKeys extends Command
{
    public function handle(PushSettingsService $settings): int
    {
        $this->info('Web Push keys are built into the code (App\Services\Push\PushSettingsService). Public key: '.$settings->publicKey());

        return self::SUCCESS;
    }
}
