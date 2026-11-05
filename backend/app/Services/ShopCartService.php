<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\DB;

class ShopCartService
{
    public function __construct(private readonly ShopLineItems $lineItems) {}

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
                    'color' => $item->color !== '' ? $item->color : null,
                    'size' => $item->size !== '' ? $item->size : null,
                    'quantity' => $item->quantity,
                ])
                ->values()
                ->all(),
        ];
    }

    public function replace(User $user, array $items): array
    {
        $lines = $this->lineItems->resolve($items);

        DB::transaction(function () use ($user, $lines): void {
            $user->shopCartItems()->delete();
            foreach ($lines as $line) {
                $user->shopCartItems()->create([
                    'shop_product_id' => $line['product']->id,
                    'color' => $line['color'],
                    'size' => $line['size'],
                    'quantity' => $line['quantity'],
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
