<?php

namespace App\Http\Requests;

use App\Models\Team;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class TeamRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        /** @var Team|null $team */
        $team = $this->route('team');

        return [
            'event' => [$team ? 'prohibited' : 'required', 'string', 'exists:events,slug'],
            'name' => ['required', 'string', 'max:80'],
            'leader_id' => ['nullable', 'integer', 'exists:users,id'],
            'capacity' => ['nullable', 'integer', 'min:1', 'max:5000'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
