<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->string('phone')->nullable()->after('email');
            $table->string('role')->nullable()->after('phone');
            $table->string('church')->nullable()->after('role');
            $table->string('state_country')->nullable()->after('church');
            $table->string('attendance_mode')->nullable()->after('state_country');
            $table->json('attendance_days')->nullable()->after('attendance_mode');
            $table->boolean('needs_accommodation')->default(false)->after('attendance_days');
            $table->timestamp('registration_completed_at')->nullable()->after('needs_accommodation');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->dropColumn([
                'phone',
                'role',
                'church',
                'state_country',
                'attendance_mode',
                'attendance_days',
                'needs_accommodation',
                'registration_completed_at',
            ]);
        });
    }
};
