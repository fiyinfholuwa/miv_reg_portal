<?php

namespace App\Console\Commands;

use App\Models\Broadcast;
use App\Services\Push\PushService;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('webpush:scheduled-broadcasts')]
#[Description('Push scheduled broadcasts whose time has come (runs every minute from the scheduler)')]
class PushScheduledBroadcasts extends Command
{
    public function handle(PushService $pushService): int
    {
        $due = Broadcast::query()
            ->where('status', 'scheduled')
            ->whereNull('pushed_at')
            ->where('scheduled_at', '<=', now())
            ->get();

        $due->each(fn (Broadcast $broadcast) => $pushService->broadcast($broadcast));
        $this->info("Pushed {$due->count()} scheduled broadcast(s).");

        return self::SUCCESS;
    }
}
