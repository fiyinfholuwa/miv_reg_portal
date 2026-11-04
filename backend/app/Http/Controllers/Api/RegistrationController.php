<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\CompleteRegistrationRequest;
use App\Http\Requests\LoginRequest;
use App\Http\Requests\RegisterAccountRequest;
use App\Http\Requests\StartRegistrationRequest;
use App\Http\Requests\VerifyLinkRequest;
use App\Http\Requests\VerifyOtpRequest;
use App\Models\Event;
use App\Services\EventCatalog;
use App\Services\EventService;
use App\Services\RegistrationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RegistrationController extends Controller
{
    public function __construct(
        private readonly RegistrationService $registrationService,
        private readonly EventService $eventService,
    ) {}

    public function start(StartRegistrationRequest $request): JsonResponse
    {
        return response()->json($this->registrationService->start(
            $request->string('email')->toString(),
            $request->input('device_name'),
        ));
    }

    public function login(LoginRequest $request): JsonResponse
    {
        return response()->json($this->registrationService->login(
            $request->string('email')->toString(),
            $request->input('device_name'),
        ));
    }

    public function register(RegisterAccountRequest $request): JsonResponse
    {
        return response()->json($this->registrationService->register($request->validated()));
    }

    public function verifyOtp(VerifyOtpRequest $request): JsonResponse
    {
        return response()->json($this->registrationService->verifyOtp(
            $request->string('email')->toString(),
            $request->string('otp')->toString(),
            $request->input('device_name'),
        ));
    }

    public function verifyLink(VerifyLinkRequest $request): JsonResponse
    {
        return response()->json($this->registrationService->verifyLink(
            $request->string('token')->toString(),
            $request->input('device_name'),
        ));
    }

    public function complete(CompleteRegistrationRequest $request): JsonResponse
    {
        $attributes = $request->validated();
        $this->registrationService->completeProfile($request->user(), $attributes);

        if (isset($attributes['attendance_mode'])) {
            $this->eventService->register(
                $request->user()->fresh(),
                Event::where('slug', EventCatalog::PRIMARY_SLUG)->firstOrFail(),
                $attributes,
            );
        }

        return response()->json([
            'status' => 'registered',
            'profile_required' => false,
            'user' => $this->registrationService->userPayload($request->user()->fresh()),
        ]);
    }

    public function user(Request $request): JsonResponse
    {
        return response()->json(['user' => $this->registrationService->userPayload($request->user())]);
    }

    public function logout(Request $request): JsonResponse
    {
        $this->registrationService->revokeCurrentToken($request->user());

        return response()->json(['message' => 'Logged out successfully.']);
    }
}
