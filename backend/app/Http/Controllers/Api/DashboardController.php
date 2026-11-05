<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\FeedbackRequest;
use App\Http\Requests\TestimonialRequest;
use App\Models\Broadcast;
use App\Models\Event;
use App\Services\DashboardService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function __construct(private readonly DashboardService $dashboardService) {}

    public function testimonials(Request $request): JsonResponse
    {
        $event = $request->filled('event') ? Event::where('slug', $request->string('event')->toString())->first() : null;

        return response()->json([
            'testimonials' => $this->dashboardService->testimonials($event),
            'mine' => $this->dashboardService->testimonialsBy($request->user(), $event),
        ]);
    }

    public function submitTestimonial(TestimonialRequest $request): JsonResponse
    {
        return response()->json([
            'status' => 'submitted',
            'testimonial' => $this->dashboardService->submitTestimonial($request->user(), $request->validated()),
        ], 201);
    }

    public function submitFeedback(FeedbackRequest $request): JsonResponse
    {
        return response()->json($this->dashboardService->submitFeedback($request->user(), $request->validated()));
    }

    public function broadcasts(): JsonResponse
    {
        $broadcasts = Broadcast::query()
            ->where(fn ($query) => $query->where('status', 'sent')
                ->orWhere(fn ($scheduled) => $scheduled->where('status', 'scheduled')->where('scheduled_at', '<=', now())))
            ->latest()
            ->limit(20)
            ->get(['id', 'title', 'body', 'scheduled_at', 'created_at']);

        return response()->json(['broadcasts' => $broadcasts]);
    }
}
