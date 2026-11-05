<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Validates one landing page section. The section comes from the route and
 * is limited to SiteContentRequest::SECTIONS by the route constraint.
 */
class SiteContentRequest extends FormRequest
{
    public const SECTIONS = ['hero', 'about', 'stats', 'events', 'hosts', 'gallery', 'shop', 'partner', 'contact'];

    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $text = fn (int $max, bool $required = false): array => [$required ? 'required' : 'nullable', 'string', "max:{$max}"];
        $media = ['nullable', 'string', 'max:500'];
        $link = ['nullable', 'string', 'max:500'];

        return match ($this->route('section')) {
            'hero' => [
                'eyebrow' => $text(120),
                'title' => $text(120, true),
                'subtitle' => $text(300),
                'image' => $media,
                'image_mobile' => $media,
                'primary_label' => $text(40),
                'secondary_label' => $text(40),
            ],
            'about' => [
                'eyebrow' => $text(60),
                'lead' => $text(400, true),
                'body' => $text(600),
                'image_1' => $media,
                'image_2' => $media,
                'link_label' => $text(40),
                'link_url' => $link,
            ],
            'stats' => [
                'heading' => $text(120, true),
                'subheading' => $text(240),
                'items' => ['present', 'array', 'max:6'],
                'items.*.value' => $text(20, true),
                'items.*.label' => $text(60, true),
            ],
            'events' => [
                'eyebrow' => $text(60),
                'heading' => $text(120, true),
                'subheading' => $text(240),
            ],
            'hosts' => [
                'eyebrow' => $text(80),
                'name' => $text(120, true),
                'paragraphs' => ['present', 'array', 'max:5'],
                'paragraphs.*' => $text(1200, true),
                'image' => $media,
                'link_label' => $text(40),
                'link_url' => $link,
            ],
            'gallery' => [
                'heading' => $text(160, true),
                'subheading' => $text(240),
                'items' => ['present', 'array', 'max:60'],
                'items.*.image' => ['required', 'string', 'max:500'],
                'items.*.caption' => $text(80, true),
                'items.*.event' => ['nullable', 'string', 'max:80'],
                'items.*.video_url' => ['nullable', 'url', 'max:500'],
                'items.*.duration' => $text(10),
            ],
            'shop' => [
                'eyebrow' => $text(60),
                'heading' => $text(120, true),
            ],
            'partner' => [
                'heading' => $text(120, true),
                'body' => $text(600),
                'image' => $media,
                'button_label' => $text(40),
                'types' => ['present', 'array', 'max:10'],
                'types.*' => $text(60, true),
            ],
            'contact' => [
                'email' => ['nullable', 'email', 'max:160'],
                'phone' => $text(40),
                'address' => $text(240),
                'copyright' => $text(160),
            ],
            default => [],
        };
    }
}
