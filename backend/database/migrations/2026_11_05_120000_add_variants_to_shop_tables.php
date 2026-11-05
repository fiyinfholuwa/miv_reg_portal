<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Colour and size options for shop products.
 *
 * - shop_products.colors: [{name, hex, image?}]; sizes: ["S", "M", ...]
 * - cart and order lines record the chosen colour/size. Cart lines use ''
 *   (not NULL) for "no option" so the unique index covers every line.
 */
return new class extends Migration
{
    private const SIZES = ['S', 'M', 'L', 'XL', 'XXL', '3XL'];

    public function up(): void
    {
        Schema::table('shop_products', function (Blueprint $table): void {
            $table->json('colors')->nullable()->after('tag');
            $table->json('sizes')->nullable()->after('colors');
        });

        Schema::table('shop_cart_items', function (Blueprint $table): void {
            $table->string('color', 60)->default('')->after('shop_product_id');
            $table->string('size', 20)->default('')->after('color');
            // Add the new index first: it starts with user_id, so MySQL keeps
            // using it for the user_id foreign key once the old one is dropped.
            $table->unique(['user_id', 'shop_product_id', 'color', 'size'], 'shop_cart_items_line_unique');
        });

        Schema::table('shop_cart_items', function (Blueprint $table): void {
            $table->dropUnique(['user_id', 'shop_product_id']);
        });

        Schema::table('shop_order_items', function (Blueprint $table): void {
            $table->string('color', 60)->nullable()->after('name');
            $table->string('size', 20)->nullable()->after('color');
        });

        // Give the launch collection its real colours and sizes.
        $defaults = [
            'Revival hoodie' => [['name' => 'Black', 'hex' => '#16171b', 'image' => '/images/merch/revival-hoodie.jpg']],
            'Revival polo' => [
                ['name' => 'Navy', 'hex' => '#1b2a4e', 'image' => '/images/merch/revival-polo-navy.jpg'],
                ['name' => 'White', 'hex' => '#f5f5f2', 'image' => '/images/merch/revival-polo-white.jpg'],
            ],
            'Revival baseball shirt' => [['name' => 'Cream', 'hex' => '#efe6cf', 'image' => '/images/merch/revival-baseball.jpg']],
            'Revival T-shirt' => [['name' => 'Charcoal', 'hex' => '#3a3b3f', 'image' => '/images/merch/revival-tee.jpg']],
        ];
        foreach ($defaults as $name => $colors) {
            DB::table('shop_products')->where('name', $name)->whereNull('colors')->update([
                'colors' => json_encode($colors),
                'sizes' => json_encode(self::SIZES),
            ]);
        }
    }

    public function down(): void
    {
        // Collapse variant lines back to one line per product before restoring the old index.
        DB::table('shop_cart_items')->where(fn ($query) => $query->where('color', '!=', '')->orWhere('size', '!=', ''))->delete();

        Schema::table('shop_cart_items', function (Blueprint $table): void {
            $table->unique(['user_id', 'shop_product_id']);
        });

        Schema::table('shop_cart_items', function (Blueprint $table): void {
            $table->dropUnique('shop_cart_items_line_unique');
            $table->dropColumn(['color', 'size']);
        });

        Schema::table('shop_order_items', function (Blueprint $table): void {
            $table->dropColumn(['color', 'size']);
        });

        Schema::table('shop_products', function (Blueprint $table): void {
            $table->dropColumn(['colors', 'sizes']);
        });
    }
};
