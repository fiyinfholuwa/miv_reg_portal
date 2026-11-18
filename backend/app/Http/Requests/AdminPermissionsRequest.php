<?php

namespace App\Http\Requests;

use App\Support\AdminPermissions;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class AdminPermissionsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Null permissions mean full access; otherwise at least one area.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'permissions' => ['present', 'nullable', 'array', 'min:1'],
            'permissions.*' => ['string', 'distinct', Rule::in(AdminPermissions::ALL)],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return ['permissions.min' => 'Choose at least one area, or give full access.'];
    }
}
