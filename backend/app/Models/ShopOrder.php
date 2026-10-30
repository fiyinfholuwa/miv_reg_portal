<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['user_id', 'reference', 'status', 'total', 'currency', 'payment_provider', 'pickup_code', 'paid_at', 'payment_data'])]
class ShopOrder extends Model
{
    protected function casts(): array
    {
        return [
            'total' => 'integer',
            'paid_at' => 'datetime',
            'payment_data' => 'array',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(ShopOrderItem::class);
    }
}
