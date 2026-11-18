<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\MarkNotificationsReadRequest;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function __construct(private readonly NotificationService $notificationService) {}

    public function index(Request $request): JsonResponse
    {
        return response()->json($this->notificationService->feed($request->user()));
    }

    public function markRead(MarkNotificationsReadRequest $request): JsonResponse
    {
        $ids = $request->validated('ids');
        $this->notificationService->markRead($request->user(), $ids === null ? null : array_values($ids));

        return response()->json($this->notificationService->feed($request->user()->fresh()));
    }
}
