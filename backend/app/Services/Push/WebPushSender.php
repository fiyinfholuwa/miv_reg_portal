<?php

namespace App\Services\Push;

use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;
use Minishlink\WebPush\Subscription;
use Minishlink\WebPush\WebPush;

/**
 * Standard Web Push with VAPID (no Firebase). Queues every message and flushes
 * in batches, so a broadcast to thousands of browsers is one pass.
 */
class WebPushSender implements PushSender
{
    private const BATCH_SIZE = 200;

    public function __construct(private readonly PushSettingsService $settings) {}

    public function send(Collection $subscriptions, array $payload): array
    {
        $vapid = $this->settings->credentials();

        $webPush = new WebPush(['VAPID' => [
            'subject' => $vapid['subject'],
            'publicKey' => $vapid['public_key'],
            'privateKey' => $vapid['private_key'],
        ]], ['TTL' => 86400, 'urgency' => 'normal', 'topic' => substr((string) preg_replace('/[^A-Za-z0-9_-]/', '', $payload['tag']), 0, 32) ?: null]);
        $webPush->setReuseVAPIDHeaders(true);

        $json = (string) json_encode($payload);
        foreach ($subscriptions as $subscription) {
            $webPush->queueNotification(Subscription::create([
                'endpoint' => $subscription->endpoint,
                'publicKey' => $subscription->public_key,
                'authToken' => $subscription->auth_token,
                'contentEncoding' => $subscription->content_encoding,
            ]), $json);
        }

        $expired = [];
        foreach ($webPush->flush(self::BATCH_SIZE) as $report) {
            if ($report->isSubscriptionExpired()) {
                $expired[] = $report->getEndpoint();
            } elseif (! $report->isSuccess()) {
                Log::info('Web Push failed', ['endpoint' => $report->getEndpoint(), 'reason' => $report->getReason()]);
            }
        }

        return $expired;
    }
}
