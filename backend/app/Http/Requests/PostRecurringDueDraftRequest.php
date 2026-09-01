<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class PostRecurringDueDraftRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $userId = $this->user()->id;

        return [
            'accountId' => [
                'sometimes', 'uuid',
                Rule::exists('accounts', 'id')->where(
                    fn ($query) => $query->where('user_id', $userId)->where('is_active', true)
                ),
            ],
            'categoryId' => [
                'sometimes', 'uuid',
                Rule::exists('categories', 'id')->where('user_id', $userId),
            ],
            'merchant' => ['sometimes', 'string', 'max:120'],
            'description' => ['sometimes', 'nullable', 'string', 'max:255'],
            'amount' => ['sometimes', 'numeric', 'gt:0'],
            'type' => ['sometimes', 'in:income,expense'],
            'date' => ['sometimes', 'date'],
        ];
    }
}
