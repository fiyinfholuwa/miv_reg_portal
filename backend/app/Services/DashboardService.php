<?php

namespace App\Services;

use App\Models\Feedback;
use App\Models\Testimonial;
use App\Models\User;

class DashboardService
{
    public function testimonials(): array
    {
        return Testimonial::query()
            ->where('status', 'published')
            ->with('user:id,name,state_country,attendance_mode')
            ->latest('published_at')
            ->latest()
            ->get()
            ->map(fn (Testimonial $testimonial): array => $this->testimonialPayload($testimonial))
            ->all();
    }

    public function submitTestimonial(User $user, array $attributes): array
    {
        $testimonial = $user->testimonials()->create([
            ...$attributes,
            'status' => 'pending',
            'likes' => 0,
        ]);

        return $this->testimonialPayload($testimonial->load('user:id,name,state_country,attendance_mode'));
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
            'meta' => trim(implode(' · ', array_filter([$user?->state_country, $user?->attendance_mode, 'Jan. Conf 2027']))),
            'tag' => $testimonial->topic ?: 'Testimony',
            'quote' => $testimonial->content,
            'likes' => $testimonial->likes,
            'status' => $testimonial->status,
        ];
    }
}
