<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\AttendingCardRequest;
use App\Models\Event;
use App\Services\AttendingCardService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;

class AttendingCardController extends Controller
{
    public function __construct(private readonly AttendingCardService $attendingCardService) {}

    public function store(AttendingCardRequest $request, Event $event): JsonResponse
    {
        return response()->json($this->attendingCardService->store($request->user(), $event, $request->file('card')));
    }

    /**
     * Link-preview page: crawlers read the og:image (the card), people are
     * sent straight on to the event page to register.
     */
    public function show(Event $event, string $code): Response
    {
        $image = $this->attendingCardService->find($code);
        $eventUrl = rtrim((string) config('services.frontend_url'), '/').'/events/'.rawurlencode($event->slug);
        $title = "I'll be attending {$event->title}";
        $description = ($event->date_label !== 'Date TBA' ? $event->date_label.' · ' : '').'Join me. Register free.';

        return response()
            ->view('share-card', compact('image', 'eventUrl', 'title', 'description'))
            ->header('Cache-Control', 'public, max-age=300');
    }
}
