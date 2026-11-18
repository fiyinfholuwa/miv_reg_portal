<?php

namespace App\Services\Push;

use App\Models\PushSubscription;
use Illuminate\Support\Collection;

/**
 * Delivers a payload to browser push subscriptions. Swapped for a fake in tests.
 */
interface PushSender
{
    /**
     * @param  Collection<int, PushSubscription>  $subscriptions
     * @param  array{title: string, body: string, url: string, tag: string}  $payload
     * @return list<string> endpoints that are gone (404/410) and should be deleted
     */
    public function send(Collection $subscriptions, array $payload): array;
}
