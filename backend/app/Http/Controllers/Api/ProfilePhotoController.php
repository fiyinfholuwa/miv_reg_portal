<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\ProfilePhotoRequest;
use App\Services\ProfilePhotoService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ProfilePhotoController extends Controller
{
    public function __construct(private readonly ProfilePhotoService $profilePhotoService) {}

    public function show(Request $request): Response
    {
        return $this->profilePhotoService->response($request->user())
            ?? response()->json(['message' => 'No photo uploaded yet.'], 404);
    }

    public function store(ProfilePhotoRequest $request): JsonResponse
    {
        $this->profilePhotoService->store($request->user(), $request->file('photo'));

        return response()->json(['message' => 'Photo saved.', 'has_photo' => true]);
    }

    public function destroy(Request $request): JsonResponse
    {
        $this->profilePhotoService->delete($request->user());

        return response()->json(['message' => 'Photo removed.', 'has_photo' => false]);
    }
}
