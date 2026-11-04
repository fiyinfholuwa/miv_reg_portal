<?php

namespace App\Services;

use App\Models\ShopProduct;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ShopCartService
{
    public function payload(User $user): array
    {
        return [
            'account_id' => $user->id,
            'items' => $user->shopCartItems()
                ->with('product:id,name,price,image,tag,stock,active')
                ->get()
                ->map(fn ($item): array => [
                    'product_id' => $item->shop_product_id,
                    'name' => $item->product?->name,
                    'quantity' => $item->quantity,
                ])
                ->values()
                ->all(),
        ];
    }

    public function replace(User $user, array $items): array
    {
        $quantities = collect($items)->mapWithKeys(fn (array $item): array => [(int) $item['product_id'] => (int) $item['quantity']]);
        $products = ShopProduct::query()
            ->where('active', true)
            ->whereIn('id', $quantities->keys())
            ->get()
            ->keyBy('id');

        if ($products->count() !== $quantities->count()) {
            throw ValidationException::withMessages(['items' => ['One or more products are no longer available.']]);
        }

        foreach ($quantities as $productId => $quantity) {
            $product = $products->get($productId);
            if ($product->stock !== null && $quantity > $product->stock) {
                throw ValidationException::withMessages(['items' => ["{$product->name} does not have enough stock available."]]);
            }
        }

        DB::transaction(function () use ($user, $quantities): void {
            $user->shopCartItems()->delete();
            foreach ($quantities as $productId => $quantity) {
                $user->shopCartItems()->create([
                    'shop_product_id' => $productId,
                    'quantity' => $quantity,
                ]);
            }
        });

        return $this->payload($user);
    }

    public function clear(User $user): array
    {
        $user->shopCartItems()->delete();
        return ['items' => []];
    }
}
