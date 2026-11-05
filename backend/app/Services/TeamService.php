<?php

namespace App\Services;

use App\Models\Event;
use App\Models\EventRegistration;
use App\Models\Team;
use App\Models\User;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Teams group delegates of one event (a church, ministry or committee).
 * Admins create teams and assign people; delegates can also join with the
 * team code.
 */
class TeamService
{
    /**
     * @return list<array<string, mixed>>
     */
    public function teams(?string $eventSlug): array
    {
        return Team::query()
            ->with(['event:id,slug,short_name', 'leader:id,name,email'])
            ->withCount('members')
            ->when($eventSlug, fn ($query) => $query->whereHas('event', fn ($event) => $event->where('slug', $eventSlug)))
            ->orderBy('name')
            ->get()
            ->map(fn (Team $team): array => $this->payload($team))
            ->all();
    }

    /**
     * @param  array<string, mixed>  $attributes
     * @return array<string, mixed>
     */
    public function create(array $attributes): array
    {
        $event = Event::where('slug', $attributes['event'])->firstOrFail();
        $this->ensureUniqueName($event->id, $attributes['name']);

        $team = Team::create([
            'event_id' => $event->id,
            'name' => trim($attributes['name']),
            'code' => $this->newCode($event),
            'leader_id' => $attributes['leader_id'] ?? null,
            'capacity' => $attributes['capacity'] ?? null,
            'notes' => $attributes['notes'] ?? null,
        ]);

        return ['message' => "{$team->name} created.", 'team' => $this->payload($team->loadCount('members')->load('event', 'leader'))];
    }

    /**
     * @param  array<string, mixed>  $attributes
     * @return array<string, mixed>
     */
    public function update(Team $team, array $attributes): array
    {
        $this->ensureUniqueName($team->event_id, $attributes['name'], $team->id);
        $team->update([
            'name' => trim($attributes['name']),
            'leader_id' => $attributes['leader_id'] ?? null,
            'capacity' => $attributes['capacity'] ?? null,
            'notes' => $attributes['notes'] ?? null,
        ]);

        return ['message' => "{$team->name} saved.", 'team' => $this->payload($team->fresh(['event', 'leader'])->loadCount('members'))];
    }

    /**
     * Deleting a team keeps its delegates registered; they just have no team.
     *
     * @return array{message: string}
     */
    public function delete(Team $team): array
    {
        $team->delete();

        return ['message' => "{$team->name} deleted."];
    }

    /**
     * Team members plus the event's delegates who have no team yet.
     *
     * @return array{members: list<array<string, mixed>>, unassigned: list<array<string, mixed>>}
     */
    public function members(Team $team): array
    {
        $person = fn (EventRegistration $registration): array => [
            'registration_id' => $registration->id,
            'user_id' => $registration->user_id,
            'name' => $registration->user?->name,
            'email' => $registration->user?->email,
            'phone' => $registration->user?->phone,
            'church' => $registration->user?->church,
            'ticket_code' => $registration->ticket_code,
            'attendance_mode' => $registration->attendance_mode,
        ];

        return [
            'members' => $team->members()->with('user')->get()->sortBy('user.name')->map($person)->values()->all(),
            'unassigned' => EventRegistration::query()->where('event_id', $team->event_id)->whereNull('team_id')->with('user')->get()->sortBy('user.name')->map($person)->values()->all(),
        ];
    }

    /**
     * @param  list<int>  $registrationIds
     * @return array{message: string}
     */
    public function addMembers(Team $team, array $registrationIds): array
    {
        $registrations = EventRegistration::query()->whereIn('id', $registrationIds)->get();

        if ($registrations->contains(fn (EventRegistration $registration): bool => $registration->event_id !== $team->event_id)) {
            throw ValidationException::withMessages(['registration_ids' => ['Only delegates registered for this event can join this team.']]);
        }
        if ($team->capacity !== null && $team->members()->count() + $registrations->whereNotIn('team_id', [$team->id])->count() > $team->capacity) {
            throw ValidationException::withMessages(['registration_ids' => ["{$team->name} only has room for {$team->capacity} people."]]);
        }

        EventRegistration::query()->whereIn('id', $registrations->pluck('id'))->update(['team_id' => $team->id]);

        return ['message' => $registrations->count() === 1 ? 'Added to the team.' : "{$registrations->count()} people added to the team."];
    }

    /**
     * @return array{message: string}
     */
    public function removeMember(Team $team, EventRegistration $registration): array
    {
        if ($registration->team_id !== $team->id) {
            throw ValidationException::withMessages(['registration' => ['That person is not in this team.']]);
        }
        $registration->update(['team_id' => null]);

        return ['message' => 'Removed from the team.'];
    }

    /**
     * A delegate joins a team of the same event with its code.
     *
     * @return array<string, mixed>
     */
    public function join(User $user, Event $event, string $code): array
    {
        $registration = EventRegistration::where('user_id', $user->id)->where('event_id', $event->id)->first();
        $team = Team::where('event_id', $event->id)->where('code', Str::upper(trim($code)))->first();

        if (! $registration) {
            throw ValidationException::withMessages(['code' => ['Register for this event before joining a team.']]);
        }
        if (! $team) {
            throw ValidationException::withMessages(['code' => ['We could not find a team with that code for this event.']]);
        }
        if ($registration->team_id !== $team->id && $team->isFull()) {
            throw ValidationException::withMessages(['code' => ["{$team->name} is full."]]);
        }

        $registration->update(['team_id' => $team->id]);

        return ['message' => "You joined {$team->name}.", 'team' => $this->delegatePayload($team)];
    }

    /**
     * @return array{message: string}
     */
    public function leave(User $user, Event $event): array
    {
        EventRegistration::where('user_id', $user->id)->where('event_id', $event->id)->update(['team_id' => null]);

        return ['message' => 'You left the team.'];
    }

    /**
     * What a delegate sees about their own team.
     *
     * @return array<string, mixed>|null
     */
    public function delegatePayload(?Team $team): ?array
    {
        if (! $team) {
            return null;
        }

        return [
            'name' => $team->name,
            'code' => $team->code,
            'leader' => $team->leader?->name,
            'leader_phone' => $team->leader?->phone,
            'members_count' => $team->members()->count(),
            'notes' => $team->notes,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function payload(Team $team): array
    {
        return [
            'id' => $team->id,
            'name' => $team->name,
            'code' => $team->code,
            'event' => ['slug' => $team->event?->slug, 'short_name' => $team->event?->short_name],
            'leader' => $team->leader ? ['id' => $team->leader->id, 'name' => $team->leader->name, 'email' => $team->leader->email] : null,
            'capacity' => $team->capacity,
            'members_count' => (int) ($team->members_count ?? 0),
            'notes' => $team->notes,
            'created_at' => $team->created_at?->toIso8601String(),
        ];
    }

    private function ensureUniqueName(int $eventId, string $name, ?int $ignoreId = null): void
    {
        $exists = Team::where('event_id', $eventId)->where('name', trim($name))->when($ignoreId, fn ($query) => $query->whereKeyNot($ignoreId))->exists();
        if ($exists) {
            throw ValidationException::withMessages(['name' => ['This event already has a team with that name.']]);
        }
    }

    private function newCode(Event $event): string
    {
        $prefix = Str::upper(Str::substr(preg_replace('/[^a-z0-9]/i', '', $event->slug), 0, 6));
        do {
            $code = "{$prefix}-T".random_int(1000, 9999);
        } while (Team::where('code', $code)->exists());

        return $code;
    }
}
