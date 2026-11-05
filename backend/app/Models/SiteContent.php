<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['section', 'content', 'updated_by'])]
class SiteContent extends Model
{
    protected function casts(): array
    {
        return ['content' => 'array'];
    }
}
