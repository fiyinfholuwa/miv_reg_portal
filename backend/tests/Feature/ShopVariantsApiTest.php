<?php

namespace Tests\Feature;

use App\Models\ShopProduct;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class ShopVariantsApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_cart_keeps_separate_lines_per_colour_and_size(): void
    {
        $product = ShopProduct::factory()->withVariants()->create();
        $user = User::factory()->create();

        $this->actingAs($user)->putJson('/api/shop/cart', ['items' => [
            ['product_id' => $product->id, 'color' => 'Navy', 'size' => 'L', 'quantity' => 1],
            ['product_id' => $product->id, 'color' => 'white', 'size' => 'M', 'quantity' => 2],
            ['product_id' => $product->id, 'color' => 'Navy', 'size' => 'L', 'quantity' => 1],
        ]])
            ->assertOk()
            ->assertJsonCount(2, 'items')
            ->assertJsonFragment(['product_id' => $product->id, 'color' => 'Navy', 'size' => 'L', 'quantity' => 2])
            ->assertJsonFragment(['product_id' => $product->id, 'color' => 'White', 'size' => 'M', 'quantity' => 2]);

        $this->actingAs($user)->getJson('/api/shop/cart')->assertOk()->assertJsonCount(2, 'items');
    }

    public function test_variant_products_require_a_valid_colour_and_size(): void
    {
        $product = ShopProduct::factory()->withVariants()->create();
        $user = User::factory()->create();

        $this->actingAs($user)->putJson('/api/shop/cart', ['items' => [['product_id' => $product->id, 'size' => 'L', 'quantity' => 1]]])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['items' => "Choose a colour for {$product->name}."]);

        $this->actingAs($user)->putJson('/api/shop/cart', ['items' => [['product_id' => $product->id, 'color' => 'Red', 'size' => 'L', 'quantity' => 1]]])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['items' => "Red is not an available colour for {$product->name}."]);

        $this->actingAs($user)->putJson('/api/shop/cart', ['items' => [['product_id' => $product->id, 'color' => 'Navy', 'quantity' => 1]]])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['items' => "Choose a size for {$product->name}."]);
    }

    public function test_products_without_options_ignore_colour_and_size(): void
    {
        $product = ShopProduct::factory()->create();

        $this->actingAs(User::factory()->create())->putJson('/api/shop/cart', ['items' => [['product_id' => $product->id, 'color' => 'Navy', 'quantity' => 1]]])
            ->assertOk()
            ->assertJsonPath('items.0.color', null)
            ->assertJsonPath('items.0.size', null);
    }

    public function test_stock_is_checked_across_all_variants_of_a_product(): void
    {
        $product = ShopProduct::factory()->withVariants()->create(['stock' => 3]);

        $this->actingAs(User::factory()->create())->putJson('/api/shop/cart', ['items' => [
            ['product_id' => $product->id, 'color' => 'Navy', 'size' => 'L', 'quantity' => 2],
            ['product_id' => $product->id, 'color' => 'White', 'size' => 'S', 'quantity' => 2],
        ]])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['items' => "{$product->name} does not have enough stock available."]);
    }

    public function test_order_records_the_chosen_colour_and_size(): void
    {
        config(['services.paystack.secret_key' => 'sk_test', 'services.paystack.base_url' => 'https://paystack.test']);
        Http::fake(['paystack.test/*' => Http::response(['status' => true, 'data' => ['authorization_url' => 'https://pay.test/abc']])]);
        $product = ShopProduct::factory()->withVariants()->create(['price' => 13000]);

        $this->actingAs(User::factory()->create())->postJson('/api/shop/orders/initialize', ['items' => [
            ['product_id' => $product->id, 'color' => 'White', 'size' => 'XL', 'quantity' => 2],
            ['product_id' => $product->id, 'color' => 'Navy', 'size' => 'M', 'quantity' => 1],
        ]])
            ->assertOk()
            ->assertJsonPath('order.total', 39000)
            ->assertJsonFragment(['name' => $product->name, 'color' => 'White', 'size' => 'XL', 'quantity' => 2, 'line_total' => 26000])
            ->assertJsonFragment(['name' => $product->name, 'color' => 'Navy', 'size' => 'M', 'quantity' => 1, 'line_total' => 13000]);

        $this->assertDatabaseHas('shop_order_items', ['shop_product_id' => $product->id, 'color' => 'White', 'size' => 'XL', 'quantity' => 2]);
    }

    public function test_admin_can_save_colours_and_sizes_and_bad_colour_codes_are_rejected(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $payload = ['name' => 'Revival polo', 'price' => 13000, 'sizes' => ['S', 'M'], 'colors' => [['name' => 'Navy', 'hex' => '#1b2a4e', 'image' => '/images/navy.jpg']]];

        $this->actingAs($admin)->postJson('/api/admin/shop/products', $payload)
            ->assertCreated()
            ->assertJsonPath('product.colors.0.name', 'Navy')
            ->assertJsonPath('product.sizes', ['S', 'M']);

        $this->actingAs($admin)->postJson('/api/admin/shop/products', [...$payload, 'colors' => [['name' => 'Navy', 'hex' => 'navy']]])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('colors.0.hex');

        $this->getJson('/api/shop/products')->assertOk()->assertJsonPath('products.0.colors.0.hex', '#1b2a4e');
    }
}
