<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Admin-managed event content: live stream details and nearby hotels.
 * Existing programmes move to the dated format: each day gets a `date`
 * (Y-m-d) and sessions get 24h `start`/`end` times so the dashboard can
 * highlight what is on now.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('events', function (Blueprint $table): void {
            $table->string('stream_title')->nullable()->after('stream_url');
            $table->boolean('stream_live')->default(false)->after('stream_title');
            $table->json('hotels')->nullable()->after('publicity');
        });

        foreach (DB::table('events')->get(['id', 'slug', 'starts_at', 'programme']) as $event) {
            $updates = [];

            if ($event->programme) {
                $updates['programme'] = json_encode($this->datedProgramme(json_decode($event->programme, true) ?? [], $event->starts_at));
            }

            if ($event->slug === 'imlc') {
                $updates['hotels'] = json_encode($this->imlcHotels());
            }

            if ($updates !== []) {
                DB::table('events')->where('id', $event->id)->update($updates);
            }
        }
    }

    public function down(): void
    {
        Schema::table('events', function (Blueprint $table): void {
            $table->dropColumn(['stream_title', 'stream_live', 'hotels']);
        });
    }

    /**
     * "Sat 23" + an event starting 2027-01-19 becomes 2027-01-23; "7:00 AM" becomes "07:00".
     *
     * @param  list<array<string, mixed>>  $programme
     * @return list<array<string, mixed>>
     */
    private function datedProgramme(array $programme, ?string $startsAt): array
    {
        $start = $startsAt ? Carbon::parse($startsAt)->timezone('Africa/Lagos') : null;

        return array_map(function (array $day) use ($start): array {
            $date = $day['date'] ?? null;
            if (! $date && $start && preg_match('/\b(\d{1,2})\b/', (string) ($day['day'] ?? ''), $match)) {
                $candidate = $start->copy()->day((int) $match[1]);
                $date = ($candidate->lt($start->copy()->startOfDay()) ? $candidate->addMonth() : $candidate)->toDateString();
            }

            $sessions = $day['sessions'] ?? [];
            $sessions = array_map(function (array $session, int $index) use ($sessions): array {
                $startTime = $session['start'] ?? $this->time24($session['time'] ?? null);
                $next = $sessions[$index + 1] ?? null;

                return [
                    'start' => $startTime,
                    'end' => $session['end'] ?? ($next ? ($next['start'] ?? $this->time24($next['time'] ?? null)) : null),
                    'title' => (string) ($session['title'] ?? ''),
                    'detail' => $session['detail'] ?? null,
                ];
            }, $sessions, array_keys($sessions));

            return ['day' => (string) ($day['day'] ?? ''), 'date' => $date, 'sessions' => $sessions];
        }, $programme);
    }

    private function time24(?string $value): ?string
    {
        if (! $value) {
            return null;
        }

        try {
            return Carbon::createFromFormat('g:i A', strtoupper(trim($value)))->format('H:i');
        } catch (Throwable) {
            return null;
        }
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function imlcHotels(): array
    {
        $photo = '/images/photos/lp-hotel.webp';

        return [
            ['name' => 'Olororo Guest Lodge', 'area' => 'Olororo, Ojoo', 'price' => 18000, 'distance' => '0.8 km', 'conference_rate' => true, 'phone' => null, 'url' => null, 'image' => $photo, 'notes' => null],
            ['name' => 'Ojoo Grand Hotel', 'area' => 'Ojoo roundabout', 'price' => 25000, 'distance' => '2.4 km', 'conference_rate' => false, 'phone' => null, 'url' => null, 'image' => $photo, 'notes' => null],
            ['name' => 'Moniya Suites', 'area' => 'Oyo Road, Moniya', 'price' => 15000, 'distance' => '5.1 km', 'conference_rate' => false, 'phone' => null, 'url' => null, 'image' => $photo, 'notes' => null],
            ['name' => 'Bodija Executive Inn', 'area' => 'Bodija, Ibadan', 'price' => 35000, 'distance' => '9.6 km', 'conference_rate' => false, 'phone' => null, 'url' => null, 'image' => $photo, 'notes' => null],
        ];
    }
};
