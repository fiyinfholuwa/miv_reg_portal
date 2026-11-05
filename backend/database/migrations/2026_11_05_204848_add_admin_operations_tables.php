<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Event-day operations: teams, venue check-in, meal redemptions and
 * store collection.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('teams', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('event_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('code')->unique();
            $table->foreignId('leader_id')->nullable()->constrained('users')->nullOnDelete();
            $table->unsignedInteger('capacity')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->unique(['event_id', 'name']);
        });

        Schema::table('event_registrations', function (Blueprint $table): void {
            $table->foreignId('team_id')->nullable()->after('ticket_code')->constrained()->nullOnDelete();
            $table->timestamp('checked_in_at')->nullable()->after('team_id');
            $table->foreignId('checked_in_by')->nullable()->after('checked_in_at')->constrained('users')->nullOnDelete();
        });

        Schema::create('meal_redemptions', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('event_registration_id')->constrained()->cascadeOnDelete();
            $table->string('meal', 20);
            $table->date('served_on');
            $table->foreignId('served_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->unique(['event_registration_id', 'meal', 'served_on']);
        });

        Schema::table('shop_orders', function (Blueprint $table): void {
            $table->timestamp('collected_at')->nullable()->after('paid_at');
            $table->foreignId('collected_by')->nullable()->after('collected_at')->constrained('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('shop_orders', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('collected_by');
            $table->dropColumn('collected_at');
        });

        Schema::dropIfExists('meal_redemptions');

        Schema::table('event_registrations', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('checked_in_by');
            $table->dropColumn('checked_in_at');
            $table->dropConstrainedForeignId('team_id');
        });

        Schema::dropIfExists('teams');
    }
};
