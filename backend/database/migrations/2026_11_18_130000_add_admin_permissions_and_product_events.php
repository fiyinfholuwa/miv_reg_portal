<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            // Null means full access; a list limits an admin to those areas.
            $table->json('admin_permissions')->nullable()->after('is_admin');
        });

        Schema::table('shop_products', function (Blueprint $table): void {
            $table->foreignId('event_id')->nullable()->after('id')->constrained()->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('shop_products', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('event_id');
        });

        Schema::table('users', function (Blueprint $table): void {
            $table->dropColumn('admin_permissions');
        });
    }
};
