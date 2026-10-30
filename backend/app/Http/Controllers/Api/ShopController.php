<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\PartnerInquiryRequest;
use App\Http\Requests\ShopOrderRequest;
use App\Models\PartnerInquiry;
use App\Models\ShopProduct;
use App\Services\ShopOrderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ShopController extends Controller
{
    public function __construct(private readonly ShopOrderService $orderService) {}

    public function products(): JsonResponse
    {
        return response()->json([
            'products' => ShopProduct::query()
                ->where('active', true)
                ->orderBy('sort_order')
                ->latest('id')
                ->get(),
        ]);
    }

    public function partnerInquiry(PartnerInquiryRequest $request): JsonResponse
    {
        $inquiry = PartnerInquiry::create($request->validated());

        return response()->json([
            'message' => 'Thank you. The partnership team will contact you shortly.',
            'id' => $inquiry->id,
        ], 201);
    }

    public function initializeOrder(ShopOrderRequest $request): JsonResponse
    {
        return response()->json($this->orderService->initialize($request->user(), $request->validated('items')));
    }

    public function verifyOrder(Request $request, string $reference): JsonResponse
    {
        return response()->json(['order' => $this->orderService->verify($request->user(), $reference)]);
    }

    public function orders(Request $request): JsonResponse
    {
        return response()->json(['orders' => $this->orderService->orders($request->user())]);
    }
}
