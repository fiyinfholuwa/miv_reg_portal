<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\PushSubscriptionRequest;
use App\Services\Push\PushService;
use App\Services\Push\PushSettingsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PushSubscriptionController extends Controller
{
    public function __construct(private readonly PushService $pushService) {}

    /** The VAPID public key browsers need to subscribe. Keys are created on first use. */
    public function publicKey(PushSettingsService $settings): JsonResponse
    {
        return response()->json(['public_key' => $settings->publicKey()]);
    }

    public function store(PushSubscriptionRequest $request): JsonResponse
    {
        $this->pushService->subscribe($request->user(), $request->validated());

        return response()->json(['message' => 'Push notifications are on for this device.'], 201);
    }

    public function destroy(Request $request): JsonResponse
    {
        $endpoint = $request->validate(['endpoint' => ['required', 'string', 'max:500']])['endpoint'];
        $this->pushService->unsubscribe($request->user(), $endpoint);

        return response()->json(['message' => 'Push notifications are off for this device.']);
    }
}
