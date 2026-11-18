<?php

namespace App\Jobs;

use App\Models\PushSubscription;
use App\Services\Push\PushSender;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

/**
 * Pushes one payload to the browsers of the given users, or to every
 * subscribed browser when $userIds is null (admin broadcasts).
 */
class SendPushNotification implements ShouldQueue
{
    use Queueable;

    public int $tries = 2;

    /**
     * @param  list<int>|null  $userIds
     * @param  array{title: string, body: string, url: string, tag: string}  $payload
     */
    public function __construct(public ?array $userIds, public array $payload) {}

    public function handle(PushSender $sender): void
    {
        PushSubscription::query()
            ->when($this->userIds !== null, fn ($query) => $query->whereIn('user_id', $this->userIds))
            ->chunkById(500, function ($subscriptions) use ($sender): void {
                $expired = $sender->send($subscriptions, $this->payload);
                if ($expired !== []) {
                    PushSubscription::query()->whereIn('endpoint', $expired)->delete();
                }
            });
    }
}
