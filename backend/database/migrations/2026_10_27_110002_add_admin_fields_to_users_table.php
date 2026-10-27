<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->boolean('is_admin')->default(false)->after('email');
            $table->string('approval_status')->default('approved')->index()->after('registration_completed_at');
            $table->string('ticket_code', 32)->nullable()->unique()->after('approval_status');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->dropUnique(['ticket_code']);
            $table->dropColumn(['is_admin', 'approval_status', 'ticket_code']);
        });
    }
};
