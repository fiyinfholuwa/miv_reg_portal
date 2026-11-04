<?php

namespace App\Services;

use App\Models\Event;
use App\Models\EventRegistration;
use App\Models\User;
use Illuminate\Support\Arr;
use Illuminate\Validation\ValidationException;

class EventService
{
    /**
     * @return list<array<string, mixed>>
     */
    public function publicEvents(): array
    {
        return Event::query()
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get()
            ->map(fn (Event $event): array => $this->eventPayload($event))
            ->all();
    }

    /**
     * @return array<string, mixed>
     */
    public function publicEvent(Event $event): array
    {
        return $this->eventPayload($event);
    }

    /**
     * Events the user has registered for, soonest first, undated ones last.
     *
     * @return list<array<string, mixed>>
     */
    public function registrationsFor(User $user): array
    {
        return $user->eventRegistrations()
            ->with('event')
            ->get()
            ->sortBy(fn (EventRegistration $registration): array => [
                $registration->event->starts_at === null ? 1 : 0,
                $registration->event->starts_at?->timestamp ?? 0,
                $registration->event->sort_order,
            ])
            ->values()
            ->map(fn (EventRegistration $registration): array => $this->registrationPayload($registration))
            ->all();
    }

    /**
     * Register the user for an event, or update their attendance if they already are.
     *
     * @param  array{attendance_mode?: string|null, attendance_days?: list<string>|null, needs_accommodation?: bool|null}  $attributes
     * @return array{created: bool, registration: array<string, mixed>}
     */
    public function register(User $user, Event $event, array $attributes): array
    {
        $existing = EventRegistration::where('user_id', $user->id)->where('event_id', $event->id)->first();

        if (! $existing && ! $event->registration_open) {
            throw ValidationException::withMessages([
                'event' => ['Registration for this event is not open yet.'],
            ]);
        }

        if (! $user->hasCompletedRegistration()) {
            throw ValidationException::withMessages([
                'profile' => ['Complete your profile before registering for an event.'],
            ]);
        }

        $attendance = $this->validatedAttendance($event, $attributes);
        $registration = $existing ?? new EventRegistration([
            'user_id' => $user->id,
            'event_id' => $event->id,
            'ticket_code' => $this->ticketCodeFor($user, $event),
        ]);
        $registration->fill($attendance)->save();

        if ($event->slug === EventCatalog::PRIMARY_SLUG) {
            $this->mirrorPrimaryEventOntoUser($user, $registration);
        }

        return [
            'created' => $existing === null,
            'registration' => $this->registrationPayload($registration->load('event')),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function eventPayload(Event $event): array
    {
        return [
            'id' => $event->id,
            'slug' => $event->slug,
            'title' => $event->title,
            'short_name' => $event->short_name,
            'summary' => $event->summary,
            'description' => $event->description,
            'date_label' => $event->date_label,
            'starts_at' => $event->starts_at?->toIso8601String(),
            'ends_at' => $event->ends_at?->toIso8601String(),
            'location' => $event->location,
            'image' => $event->image,
            'attendance_options' => $event->attendance_options ?? [],
            'day_options' => $event->day_options ?? [],
            'offers_accommodation' => $event->offers_accommodation,
            'programme' => $event->programme ?? [],
            'stream_url' => $event->stream_url,
            'publicity' => [
                'caption' => $event->publicity['caption'] ?? "I'm attending {$event->title}".($event->date_label !== 'Date TBA' ? " · {$event->date_label}" : '').'. Join me! #MIV',
                'assets' => $event->publicity['assets'] ?? array_values(array_filter([
                    $event->image ? ['title' => 'Event photo', 'image' => $event->image] : null,
                    ['title' => 'MIV logo', 'image' => '/images/miv-logo.png'],
                ])),
            ],
            'is_featured' => $event->is_featured,
            'registration_open' => $event->registration_open,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function registrationPayload(EventRegistration $registration): array
    {
        return [
            'id' => $registration->id,
            'ticket_code' => $registration->ticket_code,
            'attendance_mode' => $registration->attendance_mode,
            'attendance_days' => $registration->attendance_days ?? [],
            'needs_accommodation' => $registration->needs_accommodation,
            'registered_at' => $registration->created_at?->toIso8601String(),
            'event' => $this->eventPayload($registration->event),
        ];
    }

    /**
     * Only accept attendance choices this event actually offers.
     *
     * @param  array<string, mixed>  $attributes
     * @return array{attendance_mode: string|null, attendance_days: list<string>|null, needs_accommodation: bool}
     */
    private function validatedAttendance(Event $event, array $attributes): array
    {
        $modes = $event->attendance_options ?? [];
        $days = $event->day_options ?? [];
        $mode = Arr::get($attributes, 'attendance_mode');
        $chosenDays = array_values(array_unique(Arr::get($attributes, 'attendance_days') ?? []));

        $errors = [];

        if ($modes !== [] && ! in_array($mode, $modes, true)) {
            $errors['attendance_mode'] = ['Choose how you will attend: '.implode(' or ', $modes).'.'];
        }

        if ($days !== [] && ($chosenDays === [] || array_diff($chosenDays, $days) !== [])) {
            $errors['attendance_days'] = ['Choose at least one of the event days.'];
        }

        if ($errors !== []) {
            throw ValidationException::withMessages($errors);
        }

        return [
            'attendance_mode' => $modes === [] ? null : $mode,
            'attendance_days' => $days === [] ? null : $chosenDays,
            'needs_accommodation' => $event->offers_accommodation && (bool) Arr::get($attributes, 'needs_accommodation', false),
        ];
    }

    private function ticketCodeFor(User $user, Event $event): string
    {
        // IMLC keeps the delegate's existing Jan Conf ticket so passes already issued stay valid.
        if ($event->slug === EventCatalog::PRIMARY_SLUG && $user->ticket_code && ! EventRegistration::where('ticket_code', $user->ticket_code)->exists()) {
            return $user->ticket_code;
        }

        $prefix = strtoupper(preg_replace('/[^a-z0-9]/i', '', $event->slug));

        do {
            $code = 'MIV-'.$prefix.'-'.random_int(10000, 99999);
        } while (EventRegistration::where('ticket_code', $code)->exists() || User::where('ticket_code', $code)->exists());

        return $code;
    }

    /**
     * The admin dashboard still reads IMLC attendance from the user row.
     */
    private function mirrorPrimaryEventOntoUser(User $user, EventRegistration $registration): void
    {
        $user->forceFill([
            'attendance_mode' => $registration->attendance_mode,
            'attendance_days' => $registration->attendance_days,
            'needs_accommodation' => $registration->needs_accommodation,
            'ticket_code' => $registration->ticket_code,
        ])->save();
    }
}
