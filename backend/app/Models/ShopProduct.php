<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['name', 'description', 'price', 'image', 'tag', 'stock', 'active', 'sort_order'])]
class ShopProduct extends Model
{
    protected function casts(): array
    {
        return [
            'price' => 'integer',
            'stock' => 'integer',
            'active' => 'boolean',
            'sort_order' => 'integer',
        ];
    }
}
