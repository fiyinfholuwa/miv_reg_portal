<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class MarkNotificationsReadRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Without `ids`, every notification is marked read.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'ids' => ['nullable', 'array', 'max:100'],
            'ids.*' => ['string', 'max:64'],
        ];
    }
}
