<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreBudgetRequest extends FormRequest
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
        $budget = $this->route('budget');

        return [
            'categoryId' => [
                'required', 'uuid',
                Rule::exists('categories', 'id')
                    ->where('user_id', $this->user()->id)
                    ->where('type', 'expense'),
                Rule::unique('budgets', 'category_id')
                    ->where('user_id', $this->user()->id)
                    ->where('period', $this->input('period', 'monthly'))
                    ->ignore($budget?->id),
            ],
            'limit' => ['required', 'numeric', 'gt:0'],
            'period' => ['sometimes', 'in:weekly,monthly,yearly'],
        ];
    }

    public function messages(): array
    {
        return [
            'categoryId.unique' => 'A budget already exists for this category and period.',
        ];
    }
}
