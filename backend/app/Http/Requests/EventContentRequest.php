<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Admin edits to an event's dashboard content. Every section is optional so
 * each admin tab can save on its own.
 */
class EventContentRequest extends FormRequest
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
        $time = ['nullable', 'date_format:H:i'];

        return [
            'programme' => ['sometimes', 'array', 'max:14'],
            'programme.*.day' => ['required', 'string', 'max:40'],
            'programme.*.date' => ['required', 'date_format:Y-m-d'],
            'programme.*.sessions' => ['present', 'array', 'max:40'],
            'programme.*.sessions.*.start' => ['required', 'date_format:H:i'],
            'programme.*.sessions.*.end' => [...$time, 'after:programme.*.sessions.*.start'],
            'programme.*.sessions.*.title' => ['required', 'string', 'max:120'],
            'programme.*.sessions.*.detail' => ['nullable', 'string', 'max:240'],

            'stream_url' => ['sometimes', 'nullable', 'url:https', 'max:500'],
            'stream_title' => ['sometimes', 'nullable', 'string', 'max:160'],
            'stream_live' => ['sometimes', 'boolean'],

            'publicity' => ['sometimes', 'array'],
            'publicity.caption' => ['nullable', 'string', 'max:600'],
            'publicity.assets' => ['sometimes', 'array', 'max:20'],
            'publicity.assets.*.title' => ['required', 'string', 'max:80'],
            'publicity.assets.*.image' => ['required', 'string', 'max:500'],

            'offers_accommodation' => ['sometimes', 'boolean'],
            'hotels' => ['sometimes', 'array', 'max:40'],
            'hotels.*.name' => ['required', 'string', 'max:120'],
            'hotels.*.area' => ['nullable', 'string', 'max:160'],
            'hotels.*.price' => ['nullable', 'integer', 'min:0'],
            'hotels.*.distance' => ['nullable', 'string', 'max:40'],
            'hotels.*.conference_rate' => ['sometimes', 'boolean'],
            'hotels.*.phone' => ['nullable', 'string', 'max:40'],
            'hotels.*.url' => ['nullable', 'url', 'max:500'],
            'hotels.*.image' => ['nullable', 'string', 'max:500'],
            'hotels.*.notes' => ['nullable', 'string', 'max:300'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'programme.*.date.required' => 'Each programme day needs a date.',
            'programme.*.sessions.*.start.required' => 'Each session needs a start time.',
            'programme.*.sessions.*.end.after' => 'A session must end after it starts.',
            'stream_url.url' => 'Use a full https:// link for the livestream.',
        ];
    }
}
