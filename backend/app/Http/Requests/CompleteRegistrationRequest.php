<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CompleteRegistrationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'phone' => ['required', 'string', 'max:40'],
            'role' => ['required', 'in:Delegate,International delegate,Minister,Leader,Guest'],
            'church' => ['nullable', 'string', 'max:255'],
            'state_country' => ['nullable', 'string', 'max:255'],
            // Legacy Jan Conf form only: when sent, the user is also registered for IMLC.
            'attendance_mode' => ['sometimes', 'in:Onsite in Ibadan,Online'],
            'attendance_days' => ['required_with:attendance_mode', 'array', 'min:1'],
            'attendance_days.*' => ['string', 'in:Tue 19,Wed 20,Thu 21,Fri 22,Sat 23,Sun 24'],
            'needs_accommodation' => ['sometimes', 'boolean'],
        ];
    }
}
