<?php

namespace App\Http\Requests;

use App\Models\Transaction;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreTransactionRequest extends FormRequest
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
        $userId = $this->user()->id;
        $transaction = $this->route('transaction');
        $accountRule = Rule::exists('accounts', 'id')->where('user_id', $userId);
        if (
            ! $transaction instanceof Transaction
            || $transaction->account_id !== $this->input('accountId')
        ) {
            $accountRule->where('is_active', true);
        }

        return [
            'merchant' => ['required', 'string', 'max:120'],
            'description' => ['nullable', 'string', 'max:255'],
            'amount' => ['required', 'numeric', 'gt:0'],
            'type' => ['required', 'in:income,expense'],
            'categoryId' => ['required', 'uuid', Rule::exists('categories', 'id')->where('user_id', $userId)],
            'accountId' => ['required', 'uuid', $accountRule],
            'date' => ['required', 'date'],
            'status' => ['required', 'in:completed,pending,failed'],
        ];
    }
}
