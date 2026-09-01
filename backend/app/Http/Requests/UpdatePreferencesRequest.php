<?php

namespace App\Http\Requests;

use DateTimeZone;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdatePreferencesRequest extends FormRequest
{
    public const SUPPORTED_LOCALES = [
        'de-DE',
        'en-GB',
        'en-US',
        'es-ES',
        'fr-FR',
        'it-IT',
        'ja-JP',
        'ko-KR',
        'pt-BR',
        'zh-CN',
        'zh-TW',
    ];

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'currency' => ['sometimes', 'required', 'string', 'size:3'],
            'locale' => ['sometimes', 'required', Rule::in(self::SUPPORTED_LOCALES)],
            'timezone' => ['sometimes', 'required', Rule::in(DateTimeZone::listIdentifiers(DateTimeZone::ALL_WITH_BC))],
            'weekStart' => ['sometimes', 'required', Rule::in(['mon', 'sun'])],
        ];
    }
}
