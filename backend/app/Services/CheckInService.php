<?php

namespace App\Services;

use App\Models\Event;
use App\Models\EventRegistration;
use App\Models\MealRedemption;
use App\Models\User;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Venue desk operations. Staff scan (or type) a delegate's ticket barcode to
 * check them in and to serve meals; each meal can be served once per person
 * per day (Lagos time).
 */
class CheckInService
{
    private const TIMEZONE = 'Africa/Lagos';

    /**
     * @return array<string, mixed>
     */
    public function lookup(string $code, ?string $eventSlug = null): array
    {
        $registration = EventRegistration::query()
            ->where('ticket_code', Str::upper(trim($code)))
            ->when($eventSlug, fn ($query) => $query->whereHas('event', fn ($event) => $event->where('slug', $eventSlug)))
            ->with(['user', 'event:id,slug,short_name,title', 'team:id,name'])
            ->first();

        if (! $registration) {
            throw ValidationException::withMessages(['code' => [$eventSlug ? 'No ticket with that code for this event.' : 'No ticket with that code.']]);
        }

        return ['registration' => $this->payload($registration)];
    }

    /**
     * @return array<string, mixed>
     */
    public function checkIn(User $staff, EventRegistration $registration): array
    {
        if ($registration->checked_in_at) {
            throw ValidationException::withMessages(['registration' => ["{$registration->user?->name} was already checked in at {$registration->checked_in_at->timezone(self::TIMEZONE)->format('g:i A, j M')}."]]);
        }

        $registration->update(['checked_in_at' => now(), 'checked_in_by' => $staff->id]);

        return ['message' => "{$registration->user?->name} checked in.", 'registration' => $this->payload($registration->fresh(['user', 'event', 'team']))];
    }

    /**
     * @return array<string, mixed>
     */
    public function undoCheckIn(EventRegistration $registration): array
    {
        $registration->update(['checked_in_at' => null, 'checked_in_by' => null]);

        return ['message' => 'Check-in undone.', 'registration' => $this->payload($registration->fresh(['user', 'event', 'team']))];
    }

    /**
     * @return array<string, mixed>
     */
    public function serveMeal(User $staff, EventRegistration $registration, string $meal): array
    {
        $today = now(self::TIMEZONE)->toDateString();
        $already = MealRedemption::where('event_registration_id', $registration->id)->where('meal', $meal)->whereDate('served_on', $today)->first();

        if ($already) {
            throw ValidationException::withMessages(['meal' => ["{$meal} was already served to {$registration->user?->name} today at {$already->created_at->timezone(self::TIMEZONE)->format('g:i A')}."]]);
        }

        MealRedemption::create(['event_registration_id' => $registration->id, 'meal' => $meal, 'served_on' => $today, 'served_by' => $staff->id]);

        return ['message' => "{$meal} served to {$registration->user?->name}.", 'registration' => $this->payload($registration->fresh(['user', 'event', 'team']))];
    }

    /**
     * Desk totals for one event, plus the latest scans.
     *
     * @return array<string, mixed>
     */
    public function stats(Event $event): array
    {
        $today = now(self::TIMEZONE)->toDateString();
        $registrations = EventRegistration::where('event_id', $event->id);
        $meals = MealRedemption::query()->whereHas('registration', fn ($query) => $query->where('event_id', $event->id))->whereDate('served_on', $today);

        $recentCheckIns = (clone $registrations)->whereNotNull('checked_in_at')->with('user:id,name')->latest('checked_in_at')->limit(15)->get()
            ->map(fn (EventRegistration $registration): array => ['type' => 'Check-in', 'name' => $registration->user?->name, 'ticket_code' => $registration->ticket_code, 'at' => $registration->checked_in_at?->toIso8601String()]);
        $recentMeals = (clone $meals)->with('registration.user:id,name')->latest()->limit(15)->get()
            ->map(fn (MealRedemption $redemption): array => ['type' => $redemption->meal, 'name' => $redemption->registration?->user?->name, 'ticket_code' => $redemption->registration?->ticket_code, 'at' => $redemption->created_at?->toIso8601String()]);

        return [
            'date' => $today,
            'registered' => (clone $registrations)->count(),
            'checked_in' => (clone $registrations)->whereNotNull('checked_in_at')->count(),
            'checked_in_today' => (clone $registrations)->where('checked_in_at', '>=', now(self::TIMEZONE)->startOfDay()->utc())->count(),
            'meals_today' => collect(MealRedemption::MEALS)->mapWithKeys(fn (string $meal): array => [$meal => (clone $meals)->where('meal', $meal)->count()])->all(),
            'recent' => $recentCheckIns->concat($recentMeals)->sortByDesc('at')->take(20)->values()->all(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function payload(EventRegistration $registration): array
    {
        $today = now(self::TIMEZONE)->toDateString();
        $servedToday = $registration->meals()->whereDate('served_on', $today)->get()->mapWithKeys(fn (MealRedemption $redemption): array => [$redemption->meal => $redemption->created_at?->toIso8601String()]);

        return [
            'id' => $registration->id,
            'ticket_code' => $registration->ticket_code,
            'name' => $registration->user?->name,
            'email' => $registration->user?->email,
            'phone' => $registration->user?->phone,
            'role' => $registration->user?->role,
            'church' => $registration->user?->church,
            'approval_status' => $registration->user?->approval_status,
            'event' => ['slug' => $registration->event?->slug, 'short_name' => $registration->event?->short_name],
            'attendance_mode' => $registration->attendance_mode,
            'attendance_days' => $registration->attendance_days ?? [],
            'needs_accommodation' => $registration->needs_accommodation,
            'team' => $registration->team?->name,
            'checked_in_at' => $registration->checked_in_at?->toIso8601String(),
            'meals_today' => collect(MealRedemption::MEALS)->mapWithKeys(fn (string $meal): array => [$meal => $servedToday[$meal] ?? null])->all(),
        ];
    }
}
