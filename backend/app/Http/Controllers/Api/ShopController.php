<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\PartnerInquiryRequest;
use App\Models\PartnerInquiry;
use App\Models\ShopProduct;
use Illuminate\Http\JsonResponse;

class ShopController extends Controller
{
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
}
