<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['event_registration_id', 'meal', 'served_on', 'served_by'])]
class MealRedemption extends Model
{
    public const MEALS = ['Breakfast', 'Lunch', 'Dinner'];

    protected function casts(): array
    {
        return ['served_on' => 'date'];
    }

    public function registration(): BelongsTo
    {
        return $this->belongsTo(EventRegistration::class, 'event_registration_id');
    }
}
