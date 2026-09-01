<?php

namespace App\Http\Requests;

use App\Models\Category;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StoreRecurringTransactionRequest extends FormRequest
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
                'required', 'uuid',
                Rule::exists('accounts', 'id')->where(
                    fn ($query) => $query->where('user_id', $userId)->where('is_active', true)
                ),
            ],
            'categoryId' => [
                'required', 'uuid',
                Rule::exists('categories', 'id')->where('user_id', $userId),
            ],
            'merchant' => ['required', 'string', 'max:120'],
            'description' => ['nullable', 'string', 'max:255'],
            'amount' => ['required', 'numeric', 'gt:0'],
            'type' => ['required', 'in:income,expense'],
            'frequency' => ['required', 'in:weekly,biweekly,monthly,yearly'],
            'interval' => ['sometimes', 'integer', 'min:1', 'max:100'],
            'startDate' => ['required', 'date'],
            'nextDueDate' => ['sometimes', 'date', 'after_or_equal:startDate'],
            'endDate' => ['nullable', 'date', 'after_or_equal:startDate'],
            'isActive' => ['sometimes', 'boolean'],
        ];
    }

    public function after(): array
    {
        return [
            function (Validator $validator): void {
                if ($validator->errors()->hasAny([
                    'categoryId', 'type', 'startDate', 'nextDueDate', 'endDate',
                ])) {
                    return;
                }

                $category = Category::find($this->input('categoryId'));
                if ($category && $category->type !== $this->input('type')) {
                    $validator->errors()->add(
                        'categoryId',
                        'The category type must match the recurring transaction type.'
                    );
                }

                $nextDue = $this->date('nextDueDate') ?? $this->date('startDate');
                $end = $this->date('endDate');
                if ($nextDue && $end && $nextDue->isAfter($end)) {
                    $validator->errors()->add('nextDueDate', 'The next due date must not be after the end date.');
                }
            },
        ];
    }
}
