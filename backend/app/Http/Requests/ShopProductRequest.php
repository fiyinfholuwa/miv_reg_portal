<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ShopProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:160'],
            'description' => ['nullable', 'string', 'max:2000'],
            'price' => ['required', 'integer', 'min:0'],
            'image' => ['nullable', 'string', 'max:500'],
            'tag' => ['nullable', 'string', 'max:80'],
            'colors' => ['nullable', 'array', 'max:12'],
            'colors.*.name' => ['required', 'string', 'max:60', 'distinct:ignore_case'],
            'colors.*.hex' => ['required', 'string', 'regex:/^#[0-9a-fA-F]{6}$/'],
            'colors.*.image' => ['nullable', 'string', 'max:500'],
            'sizes' => ['nullable', 'array', 'max:12'],
            'sizes.*' => ['required', 'string', 'max:20', 'distinct:ignore_case'],
            'stock' => ['nullable', 'integer', 'min:0'],
            'active' => ['sometimes', 'boolean'],
            'sort_order' => ['sometimes', 'integer', 'min:0'],
        ];
    }
}
