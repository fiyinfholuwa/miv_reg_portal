<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StartRegistrationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'email' => ['required', 'email', 'max:255'],
            'device_name' => ['nullable', 'string', 'max:100'],
        ];
    }
}
