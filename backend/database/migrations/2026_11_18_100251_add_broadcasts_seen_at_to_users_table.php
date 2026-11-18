<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Broadcasts shown before this time count as read in the notification bell.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->timestamp('broadcasts_seen_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->dropColumn('broadcasts_seen_at');
        });
    }
};
