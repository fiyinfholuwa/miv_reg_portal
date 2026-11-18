<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * When the broadcast went out as a push, so scheduled ones are pushed once.
     */
    public function up(): void
    {
        Schema::table('broadcasts', function (Blueprint $table): void {
            $table->timestamp('pushed_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('broadcasts', function (Blueprint $table): void {
            $table->dropColumn('pushed_at');
        });
    }
};
