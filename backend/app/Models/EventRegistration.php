<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'user_id',
    'event_id',
    'attendance_mode',
    'attendance_days',
    'needs_accommodation',
    'ticket_code',
    'team_id',
    'checked_in_at',
    'checked_in_by',
])]
class EventRegistration extends Model
{
    protected function casts(): array
    {
        return [
            'attendance_days' => 'array',
            'needs_accommodation' => 'boolean',
            'checked_in_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class);
    }

    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }

    public function meals(): HasMany
    {
        return $this->hasMany(MealRedemption::class);
    }
}
