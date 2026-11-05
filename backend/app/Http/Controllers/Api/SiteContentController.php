<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\SiteContentRequest;
use App\Services\AdminService;
use App\Services\SiteContentService;
use Illuminate\Http\JsonResponse;

class SiteContentController extends Controller
{
    public function __construct(
        private readonly SiteContentService $siteContentService,
        private readonly AdminService $adminService,
    ) {}

    public function index(): JsonResponse
    {
        return response()->json(['content' => (object) $this->siteContentService->all()]);
    }

    public function update(SiteContentRequest $request, string $section): JsonResponse
    {
        $this->adminService->ensureAdmin($request->user());

        return response()->json($this->siteContentService->save($request->user(), $section, $request->validated()));
    }
}
