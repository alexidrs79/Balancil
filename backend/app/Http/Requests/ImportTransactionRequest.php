<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class ImportTransactionRequest extends FormRequest
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
            // Spreadsheet exports arrive with a range of types, so the extension is
            // what is checked; the contents are parsed and reported on either way.
            'file' => ['required', 'file', 'max:5120', 'extensions:csv,txt'],
            'preview' => ['sometimes', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'file.max' => 'The file must be 5 MB or smaller.',
            'file.extensions' => 'Upload a .csv file.',
        ];
    }
}
