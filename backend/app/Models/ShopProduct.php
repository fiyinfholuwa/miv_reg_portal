<?php

namespace App\Models;

use Database\Factories\ShopProductFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['name', 'description', 'price', 'image', 'tag', 'colors', 'sizes', 'stock', 'active', 'sort_order'])]
class ShopProduct extends Model
{
    /** @use HasFactory<ShopProductFactory> */
    use HasFactory;

    protected function casts(): array
    {
        return [
            'price' => 'integer',
            'stock' => 'integer',
            'active' => 'boolean',
            'sort_order' => 'integer',
            'colors' => 'array',
            'sizes' => 'array',
        ];
    }

    /** @return list<string> */
    public function colorNames(): array
    {
        return array_values(array_filter(array_map(fn ($color): string => trim((string) ($color['name'] ?? '')), $this->colors ?? [])));
    }

    /** @return list<string> */
    public function sizeNames(): array
    {
        return array_values(array_filter(array_map(fn ($size): string => trim((string) $size), $this->sizes ?? [])));
    }
}
