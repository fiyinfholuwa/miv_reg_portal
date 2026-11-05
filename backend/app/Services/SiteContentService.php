<?php

namespace App\Services;

use App\Models\SiteContent;
use App\Models\User;

/**
 * Landing page content edited by admins. Only saved sections are returned;
 * the frontend fills anything missing from its built-in defaults.
 */
class SiteContentService
{
    /**
     * @return array<string, array<string, mixed>>
     */
    public function all(): array
    {
        return SiteContent::query()->pluck('content', 'section')->all();
    }

    /**
     * @param  array<string, mixed>  $content  Validated SiteContentRequest data.
     * @return array{message: string, section: string, content: array<string, mixed>}
     */
    public function save(User $admin, string $section, array $content): array
    {
        $saved = SiteContent::updateOrCreate(['section' => $section], ['content' => $content, 'updated_by' => $admin->id]);

        return ['message' => 'Landing page updated.', 'section' => $section, 'content' => $saved->content];
    }
}
