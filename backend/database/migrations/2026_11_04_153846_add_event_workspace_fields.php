<?php

use App\Services\EventCatalog;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('events', function (Blueprint $table): void {
            $table->json('programme')->nullable()->after('day_options');
            $table->string('stream_url')->nullable()->after('programme');
            $table->json('publicity')->nullable()->after('stream_url');
        });

        Schema::table('users', function (Blueprint $table): void {
            $table->string('photo_path')->nullable()->after('state_country');
        });

        Schema::table('testimonials', function (Blueprint $table): void {
            $table->foreignId('event_id')->nullable()->after('user_id')->constrained()->nullOnDelete();
        });

        foreach (EventCatalog::rows() as $row) {
            DB::table('events')->where('slug', $row['slug'])->update([
                'programme' => $row['programme'] === null ? null : json_encode($row['programme']),
                'publicity' => $row['publicity'] === null ? null : json_encode($row['publicity']),
            ]);
        }

        // Every testimony so far was written about Jan Conf (IMLC).
        $imlcId = DB::table('events')->where('slug', EventCatalog::PRIMARY_SLUG)->value('id');
        DB::table('testimonials')->whereNull('event_id')->update(['event_id' => $imlcId]);
    }

    public function down(): void
    {
        Schema::table('testimonials', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('event_id');
        });

        Schema::table('users', function (Blueprint $table): void {
            $table->dropColumn('photo_path');
        });

        Schema::table('events', function (Blueprint $table): void {
            $table->dropColumn(['programme', 'stream_url', 'publicity']);
        });
    }
};
