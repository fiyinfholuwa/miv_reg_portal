<?php

namespace App\Services;

use App\Models\ShopProduct;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;

/**
 * Turns raw cart/order lines ({product_id, quantity, color?, size?}) into
 * validated lines. Checks that each product is active, that the colour and
 * size are ones the product offers (and are chosen when it offers any), and
 * that total quantity per product fits its stock. Identical lines are merged.
 */
class ShopLineItems
{
    /**
     * @return Collection<int, array{product: ShopProduct, color: string, size: string, quantity: int}>
     */
    public function resolve(array $items): Collection
    {
        $products = ShopProduct::query()
            ->where('active', true)
            ->whereIn('id', collect($items)->pluck('product_id')->map(fn ($id): int => (int) $id)->unique())
            ->get()
            ->keyBy('id');

        $lines = [];
        foreach ($items as $item) {
            $product = $products->get((int) $item['product_id']);
            if (! $product) {
                throw ValidationException::withMessages(['items' => ['One or more products are no longer available.']]);
            }

            $color = $this->option($product, 'colors', trim((string) ($item['color'] ?? '')), 'colour');
            $size = $this->option($product, 'sizes', trim((string) ($item['size'] ?? '')), 'size');
            $key = "{$product->id}|{$color}|{$size}";

            $lines[$key] ??= ['product' => $product, 'color' => $color, 'size' => $size, 'quantity' => 0];
            $lines[$key]['quantity'] += (int) $item['quantity'];
        }

        $lines = collect(array_values($lines));

        $lines->groupBy(fn (array $line): int => $line['product']->id)->each(function (Collection $productLines): void {
            $product = $productLines->first()['product'];
            if ($product->stock !== null && $productLines->sum('quantity') > $product->stock) {
                throw ValidationException::withMessages(['items' => ["{$product->name} does not have enough stock available."]]);
            }
        });

        return $lines;
    }

    private function option(ShopProduct $product, string $field, string $chosen, string $label): string
    {
        $offered = $field === 'colors' ? $product->colorNames() : $product->sizeNames();

        if ($offered === []) {
            return '';
        }
        if ($chosen === '') {
            throw ValidationException::withMessages(['items' => ["Choose a {$label} for {$product->name}."]]);
        }

        foreach ($offered as $option) {
            if (strcasecmp($option, $chosen) === 0) {
                return $option;
            }
        }

        throw ValidationException::withMessages(['items' => ["{$chosen} is not an available {$label} for {$product->name}."]]);
    }
}
