<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\FeedbackRequest;
use App\Http\Requests\TestimonialRequest;
use App\Services\DashboardService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function __construct(private readonly DashboardService $dashboardService) {}

    public function testimonials(): JsonResponse
    {
        return response()->json(['testimonials' => $this->dashboardService->testimonials()]);
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
        return response()->json(['broadcasts' => \App\Models\Broadcast::query()->where('status', 'sent')->orWhere('status', 'scheduled')->latest()->limit(20)->get()]);
    }
}
