<?php

use App\Services\EventCatalog;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Arr;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('events', function (Blueprint $table): void {
            $table->id();
            $table->string('slug')->unique();
            $table->string('title');
            $table->string('short_name');
            $table->text('summary')->nullable();
            $table->text('description')->nullable();
            $table->string('date_label')->default('Date TBA');
            $table->timestamp('starts_at')->nullable();
            $table->timestamp('ends_at')->nullable();
            $table->string('location')->nullable();
            $table->string('image')->nullable();
            $table->json('attendance_options')->nullable();
            $table->json('day_options')->nullable();
            $table->boolean('offers_accommodation')->default(false);
            $table->boolean('is_featured')->default(false);
            $table->boolean('registration_open')->default(true);
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::create('event_registrations', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('event_id')->constrained()->cascadeOnDelete();
            $table->string('attendance_mode')->nullable();
            $table->json('attendance_days')->nullable();
            $table->boolean('needs_accommodation')->default(false);
            $table->string('ticket_code')->unique();
            $table->timestamps();
            $table->unique(['user_id', 'event_id']);
        });

        // Seed the catalog so the IMLC row exists, then carry every delegate who
        // already completed Jan Conf registration over as an IMLC registration.
        $now = now();
        foreach (EventCatalog::rows() as $row) {
            DB::table('events')->insert([
                ...Arr::except($row, ['programme', 'publicity']),
                'attendance_options' => json_encode($row['attendance_options']),
                'day_options' => $row['day_options'] === null ? null : json_encode($row['day_options']),
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }

        $imlcId = DB::table('events')->where('slug', EventCatalog::PRIMARY_SLUG)->value('id');

        DB::table('users')
            ->whereNotNull('registration_completed_at')
            ->whereNotNull('ticket_code')
            ->orderBy('id')
            ->each(function (object $user) use ($imlcId, $now): void {
                DB::table('event_registrations')->insert([
                    'user_id' => $user->id,
                    'event_id' => $imlcId,
                    'attendance_mode' => $user->attendance_mode,
                    'attendance_days' => $user->attendance_days,
                    'needs_accommodation' => (bool) $user->needs_accommodation,
                    'ticket_code' => $user->ticket_code,
                    'created_at' => $user->registration_completed_at ?? $now,
                    'updated_at' => $now,
                ]);
            });
    }

    public function down(): void
    {
        Schema::dropIfExists('event_registrations');
        Schema::dropIfExists('events');
    }
};
