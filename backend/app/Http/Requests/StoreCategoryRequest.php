<?php

namespace App\Http\Requests;

use App\Models\Category;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StoreCategoryRequest extends FormRequest
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
        /** @var Category|null $category */
        $category = $this->route('category');

        return [
            'name' => [
                'required',
                'string',
                'max:100',
                Rule::unique('categories', 'name')
                    ->where('user_id', $this->user()->id)
                    ->where('type', $this->input('type'))
                    ->ignore($category?->id),
            ],
            'type' => ['required', Rule::in(['income', 'expense'])],
            'color' => ['required', 'string', 'max:30'],
            'icon' => ['required', 'string', 'max:100'],
        ];
    }

    /**
     * @return array<int, callable(Validator): void>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                /** @var Category|null $category */
                $category = $this->route('category');

                if (! $category || ! $this->filled('type') || $this->input('type') === $category->type) {
                    return;
                }

                if (
                    $category->transactions()->exists()
                    || $category->budgets()->exists()
                    || $category->recurringTransactions()->exists()
                ) {
                    $validator->errors()->add(
                        'type',
                        'The category type cannot be changed while the category is in use.'
                    );
                }
            },
        ];
    }

    public function messages(): array
    {
        return [
            'name.unique' => 'A category with this name and type already exists.',
        ];
    }
}
