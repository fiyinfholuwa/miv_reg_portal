<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

/**
 * An in-app notification for the delegate's bell (stored in the database only).
 * `kind` groups it for the icon: order, testimony, event or team.
 */
class AccountNotification extends Notification
{
    use Queueable;

    public function __construct(
        public string $kind,
        public string $title,
        public string $body,
        public ?string $link = null,
    ) {}

    /**
     * @return list<string>
     */
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    /**
     * @return array{kind: string, title: string, body: string, link: string|null}
     */
    public function toArray(object $notifiable): array
    {
        return ['kind' => $this->kind, 'title' => $this->title, 'body' => $this->body, 'link' => $this->link];
    }
}
