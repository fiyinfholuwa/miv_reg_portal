<?php

namespace App\Http\Middleware;

use App\Services\Push\PushService;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

/**
 * Sends scheduled announcements on time without a cron job: after an API
 * response has gone out, check (at most every 20 seconds) for broadcasts whose
 * time has come and push them. Signed-in dashboards poll every minute, so
 * there is always traffic to drive it.
 */
class PushDueBroadcasts
{
    private const CHECK_EVERY_SECONDS = 20;

    public function __construct(private readonly PushService $pushService) {}

    public function handle(Request $request, Closure $next): Response
    {
        return $next($request);
    }

    public function terminate(Request $request, Response $response): void
    {
        if (! Cache::add('push-due-broadcasts-check', true, self::CHECK_EVERY_SECONDS)) {
            return;
        }

        try {
            $this->pushService->pushDueBroadcasts();
        } catch (Throwable $exception) {
            report($exception);
        }
    }
}
