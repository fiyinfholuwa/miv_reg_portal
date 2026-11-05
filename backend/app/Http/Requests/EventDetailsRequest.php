<?php

namespace App\Http\Requests;

use App\Models\Event;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

/**
 * Create or edit an event's public details (not its dashboard content,
 * which EventContentRequest covers).
 */
class EventDetailsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $slug = $this->input('slug') ?: $this->input('short_name');
        if ($slug) {
            $this->merge(['slug' => Str::slug((string) $slug)]);
        }
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        /** @var Event|null $event */
        $event = $this->route('event');

        return [
            'title' => ['required', 'string', 'max:160'],
            'short_name' => ['required', 'string', 'max:40'],
            'slug' => ['required', 'string', 'max:60', 'alpha_dash', Rule::unique('events', 'slug')->ignore($event?->id)],
            'summary' => ['nullable', 'string', 'max:300'],
            'description' => ['nullable', 'string', 'max:4000'],
            'date_label' => ['required', 'string', 'max:60'],
            'starts_at' => ['nullable', 'date'],
            'ends_at' => ['nullable', 'date', 'after_or_equal:starts_at'],
            'location' => ['nullable', 'string', 'max:200'],
            'image' => ['nullable', 'string', 'max:500'],
            'attendance_options' => ['present', 'array', 'max:4'],
            'attendance_options.*' => ['string', 'max:30', 'distinct'],
            'day_options' => ['present', 'array', 'max:14'],
            'day_options.*' => ['string', 'max:30', 'distinct'],
            'is_featured' => ['boolean'],
            'registration_open' => ['boolean'],
            'sort_order' => ['integer', 'min:0', 'max:10000'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'slug.unique' => 'Another event already uses this web address.',
            'ends_at.after_or_equal' => 'The end date must be on or after the start date.',
        ];
    }
}
