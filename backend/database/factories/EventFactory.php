<?php

namespace Database\Factories;

use App\Models\Event;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Event>
 */
class EventFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $title = fake()->unique()->words(3, true);

        return [
            'slug' => Str::slug($title),
            'title' => Str::title($title),
            'short_name' => Str::upper(Str::substr($title, 0, 4)),
            'summary' => fake()->sentence(),
            'date_label' => 'Date TBA',
            'attendance_options' => ['Onsite', 'Online'],
            'day_options' => null,
            'offers_accommodation' => false,
            'is_featured' => false,
            'registration_open' => true,
            'sort_order' => 100,
        ];
    }

    public function closed(): static
    {
        return $this->state(['registration_open' => false]);
    }
}
