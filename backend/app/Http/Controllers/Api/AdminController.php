<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\AdminLoginRequest;
use App\Http\Requests\BroadcastRequest;
use App\Http\Requests\ReviewRequest;
use App\Http\Requests\PartnerInquiryReviewRequest;
use App\Http\Requests\ShopProductRequest;
use App\Services\AdminService;
use App\Models\PartnerInquiry;
use App\Models\ShopProduct;
use App\Models\Testimonial;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminController extends Controller
{
    public function __construct(private readonly AdminService $adminService) {}

    public function login(AdminLoginRequest $request): JsonResponse
    {
        return response()->json($this->adminService->login(
            $request->string('email')->toString(),
            $request->string('password')->toString(),
            $request->input('device_name'),
        ));
    }

    public function overview(Request $request): JsonResponse
    {
        return response()->json($this->adminService->overview($request->user()));
    }

    public function registrants(Request $request): JsonResponse
    {
        return response()->json(['registrants' => $this->adminService->registrants($request->user(), $request->input('status'))]);
    }

    public function reviewRegistrant(ReviewRequest $request, User $registrant): JsonResponse
    {
        return response()->json($this->adminService->reviewRegistrant($request->user(), $registrant, $request->string('status')->toString()));
    }

    public function testimonials(Request $request): JsonResponse
    {
        return response()->json(['testimonials' => $this->adminService->testimonials($request->user())]);
    }

    public function reviewTestimonial(ReviewRequest $request, Testimonial $testimonial): JsonResponse
    {
        return response()->json($this->adminService->reviewTestimonial($request->user(), $testimonial, $request->string('status')->toString()));
    }

    public function broadcasts(Request $request): JsonResponse
    {
        return response()->json(['broadcasts' => $this->adminService->broadcasts($request->user())]);
    }

    public function createBroadcast(BroadcastRequest $request): JsonResponse
    {
        return response()->json($this->adminService->createBroadcast($request->user(), $request->validated()), 201);
    }

    public function shopProducts(Request $request): JsonResponse
    {
        return response()->json(['products' => $this->adminService->shopProducts($request->user())]);
    }

    public function createShopProduct(ShopProductRequest $request): JsonResponse
    {
        return response()->json($this->adminService->createShopProduct($request->user(), $request->validated()), 201);
    }

    public function updateShopProduct(ShopProductRequest $request, ShopProduct $product): JsonResponse
    {
        return response()->json($this->adminService->updateShopProduct($request->user(), $product, $request->validated()));
    }

    public function deleteShopProduct(Request $request, ShopProduct $product): JsonResponse
    {
        return response()->json($this->adminService->deleteShopProduct($request->user(), $product));
    }

    public function partnerInquiries(Request $request): JsonResponse
    {
        return response()->json(['inquiries' => $this->adminService->partnerInquiries($request->user())]);
    }

    public function reviewPartnerInquiry(PartnerInquiryReviewRequest $request, PartnerInquiry $inquiry): JsonResponse
    {
        return response()->json($this->adminService->reviewPartnerInquiry($request->user(), $inquiry, $request->string('status')->toString()));
    }
}
