<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class TestimonialRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'type' => ['required', 'in:Write,Voice,Video'],
            'content' => ['required', 'string', 'min:10', 'max:6000'],
            'topic' => ['nullable', 'string', 'max:80'],
            'show_name' => ['sometimes', 'boolean'],
        ];
    }
}
