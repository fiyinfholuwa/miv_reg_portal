<?php

namespace App\Models;

use Database\Factories\EventFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'slug',
    'title',
    'short_name',
    'summary',
    'description',
    'date_label',
    'starts_at',
    'ends_at',
    'location',
    'image',
    'attendance_options',
    'day_options',
    'programme',
    'stream_url',
    'stream_title',
    'stream_live',
    'publicity',
    'hotels',
    'offers_accommodation',
    'is_featured',
    'registration_open',
    'sort_order',
])]
class Event extends Model
{
    /** @use HasFactory<EventFactory> */
    use HasFactory;

    public function getRouteKeyName(): string
    {
        return 'slug';
    }

    protected function casts(): array
    {
        return [
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
            'attendance_options' => 'array',
            'day_options' => 'array',
            'programme' => 'array',
            'publicity' => 'array',
            'hotels' => 'array',
            'stream_live' => 'boolean',
            'offers_accommodation' => 'boolean',
            'is_featured' => 'boolean',
            'registration_open' => 'boolean',
        ];
    }

    public function registrations(): HasMany
    {
        return $this->hasMany(EventRegistration::class);
    }
}
