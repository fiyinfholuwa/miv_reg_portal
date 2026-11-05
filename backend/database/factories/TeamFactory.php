<?php

namespace Database\Factories;

use App\Models\Event;
use App\Models\Team;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Team>
 */
class TeamFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'event_id' => Event::factory(),
            'name' => fake()->unique()->city().' team',
            'code' => 'TEAM-'.Str::upper(Str::random(6)),
            'capacity' => null,
        ];
    }
}
