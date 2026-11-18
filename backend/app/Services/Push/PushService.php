<?php

namespace App\Services\Push;

use App\Jobs\SendPushNotification;
use App\Models\Broadcast;
use App\Models\PushSubscription;
use App\Models\User;
use Illuminate\Support\Str;

/**
 * Saves browser subscriptions and sends pushes instantly (no queue).
 */
class PushService
{
    /**
     * @param  array{endpoint: string, keys: array{p256dh: string, auth: string}, content_encoding?: string|null}  $subscription
     */
    public function subscribe(User $user, array $subscription): void
    {
        PushSubscription::updateOrCreate(['endpoint' => $subscription['endpoint']], [
            'user_id' => $user->id,
            'public_key' => $subscription['keys']['p256dh'],
            'auth_token' => $subscription['keys']['auth'],
            'content_encoding' => $subscription['content_encoding'] ?? 'aes128gcm',
        ]);
    }

    public function unsubscribe(User $user, string $endpoint): void
    {
        $user->pushSubscriptions()->where('endpoint', $endpoint)->delete();
    }

    public function toUser(User $user, string $title, string $body, ?string $url, string $tag): void
    {
        if (! $user->pushSubscriptions()->exists()) {
            return;
        }

        $this->dispatch(new SendPushNotification([$user->id], $this->payload($title, $body, $url, $tag)));
    }

    /** Push a visible broadcast to every subscribed browser, once. */
    public function broadcast(Broadcast $broadcast): void
    {
        // Claim it in one atomic update so two requests can never both send it.
        $claimed = Broadcast::query()->whereKey($broadcast->getKey())->whereNull('pushed_at')->update(['pushed_at' => now()]);
        if ($claimed === 0) {
            return;
        }

        $broadcast->pushed_at = now();
        $this->dispatch(new SendPushNotification(null, $this->payload($broadcast->title, $broadcast->body, '/dashboard', 'broadcast-'.$broadcast->id)));
    }

    /**
     * Push scheduled broadcasts whose time has come. Runs by itself after API
     * requests (see PushDueBroadcasts middleware), so no cron is needed.
     */
    public function pushDueBroadcasts(): int
    {
        $due = Broadcast::query()
            ->where('status', 'scheduled')
            ->whereNull('pushed_at')
            ->where('scheduled_at', '<=', now())
            ->get();

        $due->each(fn (Broadcast $broadcast) => $this->broadcast($broadcast));

        return $due->count();
    }

    /**
     * @return array{title: string, body: string, url: string, tag: string}
     */
    private function payload(string $title, string $body, ?string $url, string $tag): array
    {
        return ['title' => $title, 'body' => Str::limit($body, 180), 'url' => $url ?: '/dashboard', 'tag' => $tag];
    }

    /** Sent immediately, in the same request: no queue or worker involved. */
    private function dispatch(SendPushNotification $job): void
    {
        dispatch_sync($job);
    }
}
