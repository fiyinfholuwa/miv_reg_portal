<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class FeedbackRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'likelihood' => ['required', 'integer', 'between:1,5'],
            'ratings' => ['required', 'array'],
            'ratings.*' => ['integer', 'between:0,5'],
            'highlight' => ['nullable', 'string', 'max:80'],
            'improvement' => ['nullable', 'string', 'max:2000'],
        ];
    }
}
