<?php

namespace App\Services;

use App\Models\Broadcast;
use App\Models\User;
use App\Notifications\AccountNotification;
use App\Services\Push\PushService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Notifications\DatabaseNotification;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

/**
 * The delegate's notification bell: their own database notifications plus
 * admin broadcasts. Broadcasts are shared rows, so their read state is a
 * single "seen up to" timestamp on the user instead of a row per person.
 */
class NotificationService
{
    private const LIMIT = 30;

    private const BROADCAST_PREFIX = 'broadcast-';

    public function __construct(private readonly PushService $pushService) {}

    /** Store an in-app notification and push it to the user's browsers. */
    public function notify(?User $user, string $kind, string $title, string $body, ?string $link = null): void
    {
        if (! $user) {
            return;
        }

        $user->notify(new AccountNotification($kind, $title, $body, $link));
        $this->pushService->toUser($user, $title, $body, $link, $kind.'-'.now()->timestamp);
    }

    /**
     * @return array{notifications: list<array<string, mixed>>, unread_count: int}
     */
    public function feed(User $user): array
    {
        $personal = $user->notifications()->latest()->limit(self::LIMIT)->get()->map(fn (DatabaseNotification $notification): array => [
            'id' => $notification->id,
            'kind' => $notification->data['kind'] ?? 'general',
            'title' => $notification->data['title'] ?? '',
            'body' => $notification->data['body'] ?? '',
            'link' => $notification->data['link'] ?? null,
            'read' => $notification->read_at !== null,
            'created_at' => $notification->created_at?->toIso8601String(),
        ]);

        $seenAt = $user->broadcasts_seen_at;
        $broadcasts = $this->visibleBroadcasts()->latest()->limit(self::LIMIT)->get()->map(function (Broadcast $broadcast) use ($seenAt): array {
            $shownAt = $this->shownAt($broadcast);

            return [
                'id' => self::BROADCAST_PREFIX.$broadcast->id,
                'kind' => 'announcement',
                'title' => $broadcast->title,
                'body' => $broadcast->body,
                'link' => '/dashboard',
                'read' => $seenAt !== null && $shownAt->lessThanOrEqualTo($seenAt),
                'created_at' => $shownAt->toIso8601String(),
            ];
        });

        /** @var Collection<int, array<string, mixed>> $items */
        $items = $personal->concat($broadcasts)->sortByDesc('created_at')->take(self::LIMIT)->values();
        $unreadBroadcasts = $this->visibleBroadcasts()
            ->when($seenAt, fn (Builder $query) => $query->whereRaw('COALESCE(scheduled_at, created_at) > ?', [$seenAt]))
            ->count();

        return [
            'notifications' => $items->all(),
            'unread_count' => $user->unreadNotifications()->count() + $unreadBroadcasts,
        ];
    }

    /**
     * Mark everything read, or only the given ids. A broadcast id marks every
     * broadcast up to and including that one as read.
     *
     * @param  list<string>|null  $ids
     */
    public function markRead(User $user, ?array $ids = null): void
    {
        if ($ids === null) {
            $user->unreadNotifications()->update(['read_at' => now()]);
            $user->forceFill(['broadcasts_seen_at' => now()])->save();

            return;
        }

        $broadcastIds = collect($ids)->filter(fn (string $id): bool => str_starts_with($id, self::BROADCAST_PREFIX))
            ->map(fn (string $id): int => (int) substr($id, strlen(self::BROADCAST_PREFIX)));
        $notificationIds = collect($ids)->reject(fn (string $id): bool => str_starts_with($id, self::BROADCAST_PREFIX))->values();

        if ($notificationIds->isNotEmpty()) {
            $user->unreadNotifications()->whereIn('id', $notificationIds)->update(['read_at' => now()]);
        }

        $latest = $this->visibleBroadcasts()->whereIn('id', $broadcastIds)->get()->map(fn (Broadcast $broadcast): Carbon => $this->shownAt($broadcast))->max();
        if ($latest && (! $user->broadcasts_seen_at || $latest->greaterThan($user->broadcasts_seen_at))) {
            $user->forceFill(['broadcasts_seen_at' => $latest])->save();
        }
    }

    /**
     * @return Builder<Broadcast>
     */
    private function visibleBroadcasts(): Builder
    {
        return Broadcast::query()->where(fn (Builder $query) => $query->where('status', 'sent')
            ->orWhere(fn (Builder $scheduled) => $scheduled->where('status', 'scheduled')->where('scheduled_at', '<=', now())));
    }

    private function shownAt(Broadcast $broadcast): Carbon
    {
        return $broadcast->scheduled_at ?? $broadcast->created_at;
    }
}
