<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\EventRegistrationRequest;
use App\Models\Event;
use App\Services\EventService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EventController extends Controller
{
    public function __construct(private readonly EventService $eventService) {}

    public function index(): JsonResponse
    {
        return response()->json(['events' => $this->eventService->publicEvents()]);
    }

    public function show(Event $event): JsonResponse
    {
        return response()->json(['event' => $this->eventService->publicEvent($event)]);
    }

    public function myEvents(Request $request): JsonResponse
    {
        return response()->json(['registrations' => $this->eventService->registrationsFor($request->user())]);
    }

    public function register(EventRegistrationRequest $request, Event $event): JsonResponse
    {
        $result = $this->eventService->register($request->user(), $event, $request->validated());

        return response()->json([
            'status' => $result['created'] ? 'registered' : 'updated',
            'registration' => $result['registration'],
        ], $result['created'] ? 201 : 200);
    }
}
