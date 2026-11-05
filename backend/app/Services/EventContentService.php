<?php

namespace App\Services;

use App\Models\Event;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Admin management of the content shown in each event's dashboard:
 * programme, livestream, publicity kit and hotels.
 */
class EventContentService
{
    public function __construct(private readonly EventService $eventService) {}

    /**
     * @return list<array<string, mixed>>
     */
    public function events(): array
    {
        return Event::query()
            ->withCount('registrations')
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get()
            ->map(fn (Event $event): array => [
                ...$this->eventService->eventPayload($event),
                'publicity' => $event->publicity ?? ['caption' => null, 'assets' => []],
                'registrations_count' => $event->registrations_count,
                'sort_order' => $event->sort_order,
            ])
            ->all();
    }

    /**
     * @param  array<string, mixed>  $attributes  Validated EventContentRequest data.
     * @return array<string, mixed>
     */
    public function update(Event $event, array $attributes): array
    {
        if (array_key_exists('programme', $attributes)) {
            $attributes['programme'] = collect($attributes['programme'])
                ->sortBy('date')
                ->map(fn (array $day): array => [
                    'day' => trim($day['day']),
                    'date' => $day['date'],
                    'sessions' => collect($day['sessions'])
                        ->sortBy('start')
                        ->map(fn (array $session): array => Arr::only($session, ['start', 'end', 'title', 'detail']) + ['end' => null, 'detail' => null])
                        ->values()
                        ->all(),
                ])
                ->values()
                ->all();
        }

        if (array_key_exists('hotels', $attributes)) {
            $attributes['hotels'] = collect($attributes['hotels'])
                ->map(fn (array $hotel): array => [
                    'name' => trim($hotel['name']),
                    'area' => $hotel['area'] ?? null,
                    'price' => isset($hotel['price']) ? (int) $hotel['price'] : null,
                    'distance' => $hotel['distance'] ?? null,
                    'conference_rate' => (bool) ($hotel['conference_rate'] ?? false),
                    'phone' => $hotel['phone'] ?? null,
                    'url' => $hotel['url'] ?? null,
                    'image' => $hotel['image'] ?? null,
                    'notes' => $hotel['notes'] ?? null,
                ])
                ->values()
                ->all();
        }

        if (array_key_exists('publicity', $attributes)) {
            $caption = trim((string) ($attributes['publicity']['caption'] ?? ''));
            $attributes['publicity'] = [
                'caption' => $caption !== '' ? $caption : null,
                'assets' => array_values($attributes['publicity']['assets'] ?? []),
            ];
        }

        if (array_key_exists('stream_url', $attributes) && ! $attributes['stream_url']) {
            $attributes['stream_live'] = false;
        }

        $event->update($attributes);

        return ['message' => "{$event->short_name} updated.", 'event' => $this->eventService->eventPayload($event->fresh())];
    }

    /**
     * @param  array<string, mixed>  $attributes  Validated EventDetailsRequest data.
     * @return array<string, mixed>
     */
    public function create(array $attributes): array
    {
        $event = Event::create($this->details($attributes));

        return ['message' => "{$event->short_name} created.", 'event' => $this->adminPayload($event)];
    }

    /**
     * @param  array<string, mixed>  $attributes  Validated EventDetailsRequest data.
     * @return array<string, mixed>
     */
    public function updateDetails(Event $event, array $attributes): array
    {
        $event->update($this->details($attributes));

        return ['message' => "{$event->short_name} saved.", 'event' => $this->adminPayload($event->fresh())];
    }

    /**
     * Events people registered for can't be deleted; close registration instead.
     *
     * @return array{message: string}
     */
    public function delete(Event $event): array
    {
        if ($event->registrations()->exists()) {
            throw ValidationException::withMessages(['event' => ["{$event->short_name} has registrations. Close registration instead of deleting it."]]);
        }

        $event->delete();

        return ['message' => "{$event->short_name} deleted."];
    }

    /**
     * @param  array<string, mixed>  $attributes
     * @return array<string, mixed>
     */
    private function details(array $attributes): array
    {
        $attributes['attendance_options'] = array_values(array_filter(array_map('trim', $attributes['attendance_options'] ?? [])));
        $attributes['day_options'] = array_values(array_filter(array_map('trim', $attributes['day_options'] ?? [])));

        return $attributes;
    }

    /**
     * @return array<string, mixed>
     */
    private function adminPayload(Event $event): array
    {
        return [
            ...$this->eventService->eventPayload($event),
            'publicity' => $event->publicity ?? ['caption' => null, 'assets' => []],
            'registrations_count' => $event->registrations()->count(),
        ];
    }

    /**
     * Stores an admin image (flyer, hotel photo) on the public disk.
     *
     * @return array{url: string, path: string}
     */
    public function upload(UploadedFile $image): array
    {
        $path = $image->storeAs('uploads/'.now()->format('Y/m'), Str::uuid().'.'.$image->extension(), 'public');

        return ['url' => Storage::disk('public')->url($path), 'path' => $path];
    }
}
