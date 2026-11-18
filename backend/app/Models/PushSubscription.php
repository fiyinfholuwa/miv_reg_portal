<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** A browser the user allowed to receive Web Push notifications. */
#[Fillable(['user_id', 'endpoint', 'public_key', 'auth_token', 'content_encoding'])]
#[Hidden(['public_key', 'auth_token'])]
class PushSubscription extends Model
{
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
