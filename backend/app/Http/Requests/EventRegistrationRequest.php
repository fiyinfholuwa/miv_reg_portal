<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Shape checks only; EventService checks the values against the event's own options.
 */
class EventRegistrationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'attendance_mode' => ['nullable', 'string', 'max:100'],
            'attendance_days' => ['nullable', 'array', 'max:31'],
            'attendance_days.*' => ['string', 'max:40'],
            'needs_accommodation' => ['sometimes', 'boolean'],
        ];
    }
}
