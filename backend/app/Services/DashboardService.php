<?php

namespace App\Services;

use App\Models\Event;
use App\Models\Feedback;
use App\Models\Testimonial;
use App\Models\User;
use Illuminate\Validation\ValidationException;

class DashboardService
{
    /**
     * Published testimonies, optionally limited to one event.
     *
     * @return list<array<string, mixed>>
     */
    public function testimonials(?Event $event = null): array
    {
        return Testimonial::query()
            ->where('status', 'published')
            ->when($event, fn ($query) => $query->where('event_id', $event->id))
            ->with(['user:id,name,state_country,attendance_mode', 'event:id,short_name'])
            ->latest('published_at')
            ->latest()
            ->get()
            ->map(fn (Testimonial $testimonial): array => $this->testimonialPayload($testimonial))
            ->all();
    }

    /**
     * Everything the user has shared (any status), newest first, so they can
     * see what is still waiting for the media team.
     *
     * @return list<array<string, mixed>>
     */
    public function testimonialsBy(User $user, ?Event $event = null): array
    {
        return $user->testimonials()
            ->when($event, fn ($query) => $query->where('event_id', $event->id))
            ->with(['user:id,name,state_country,attendance_mode', 'event:id,short_name'])
            ->latest()
            ->get()
            ->map(fn (Testimonial $testimonial): array => $this->testimonialPayload($testimonial))
            ->all();
    }

    public function submitTestimonial(User $user, array $attributes): array
    {
        $event = isset($attributes['event']) ? Event::where('slug', $attributes['event'])->firstOrFail() : null;

        if ($event && ! $user->eventRegistrations()->where('event_id', $event->id)->exists()) {
            throw ValidationException::withMessages([
                'event' => ['You can only share a testimony for an event you registered for.'],
            ]);
        }

        unset($attributes['event']);

        $testimonial = $user->testimonials()->create([
            'event_id' => $event?->id,
            ...$attributes,
            'status' => 'pending',
            'likes' => 0,
        ]);

        return $this->testimonialPayload($testimonial->load(['user:id,name,state_country,attendance_mode', 'event:id,short_name']));
    }

    public function submitFeedback(User $user, array $attributes): array
    {
        $feedback = Feedback::updateOrCreate(['user_id' => $user->id], $attributes);

        return [
            'id' => $feedback->id,
            'message' => 'Thank you. Your feedback has been recorded.',
        ];
    }

    private function testimonialPayload(Testimonial $testimonial): array
    {
        $user = $testimonial->user;

        return [
            'id' => $testimonial->id,
            'name' => $testimonial->show_name ? ($user?->name ?: 'A delegate') : 'A delegate',
            'meta' => trim(implode(' · ', array_filter([$user?->state_country, $user?->attendance_mode, $testimonial->event?->short_name]))),
            'tag' => $testimonial->topic ?: 'Testimony',
            'quote' => $testimonial->content,
            'likes' => $testimonial->likes,
            'status' => $testimonial->status,
            'show_name' => $testimonial->show_name,
            'created_at' => $testimonial->created_at?->toIso8601String(),
        ];
    }
}
