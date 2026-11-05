<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\EventRegistrationRequest;
use App\Http\Requests\JoinTeamRequest;
use App\Models\Event;
use App\Services\EventService;
use App\Services\TeamService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EventController extends Controller
{
    public function __construct(
        private readonly EventService $eventService,
        private readonly TeamService $teamService,
    ) {}

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

    public function joinTeam(JoinTeamRequest $request, Event $event): JsonResponse
    {
        return response()->json($this->teamService->join($request->user(), $event, $request->validated('code')));
    }

    public function leaveTeam(Request $request, Event $event): JsonResponse
    {
        return response()->json($this->teamService->leave($request->user(), $event));
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
