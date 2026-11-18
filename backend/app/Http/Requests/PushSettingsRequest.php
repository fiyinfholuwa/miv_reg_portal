<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class PushSettingsRequest extends FormRequest
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
            'subject' => ['nullable', 'string', 'max:190', 'regex:/^(mailto:\S+@\S+|https:\/\/\S+)$/'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return ['subject.regex' => 'Use a contact like mailto:you@example.com or an https:// link.'];
    }
}
