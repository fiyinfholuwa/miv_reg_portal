<?php

namespace App\Console\Commands;

use App\Services\Push\PushService;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('webpush:scheduled-broadcasts')]
#[Description('Push scheduled broadcasts whose time has come (also runs automatically after API requests)')]
class PushScheduledBroadcasts extends Command
{
    public function handle(PushService $pushService): int
    {
        $count = $pushService->pushDueBroadcasts();
        $this->info("Pushed {$count} scheduled broadcast(s).");

        return self::SUCCESS;
    }
}
