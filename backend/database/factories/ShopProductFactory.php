<?php

namespace Database\Factories;

use App\Models\ShopProduct;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ShopProduct>
 */
class ShopProductFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->unique()->words(2, true),
            'description' => fake()->sentence(),
            'price' => fake()->numberBetween(5, 30) * 1000,
            'image' => null,
            'tag' => null,
            'colors' => null,
            'sizes' => null,
            'stock' => null,
            'active' => true,
            'sort_order' => 0,
        ];
    }

    /** A garment offered in navy and white, sizes S to XL. */
    public function withVariants(): static
    {
        return $this->state(fn (): array => [
            'colors' => [
                ['name' => 'Navy', 'hex' => '#1b2a4e', 'image' => '/images/navy.jpg'],
                ['name' => 'White', 'hex' => '#f5f5f2', 'image' => null],
            ],
            'sizes' => ['S', 'M', 'L', 'XL'],
        ]);
    }
}
