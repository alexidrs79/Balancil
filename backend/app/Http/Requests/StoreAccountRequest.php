<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StoreAccountRequest extends FormRequest
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
        return [
            'name' => ['required', 'string', 'max:100'],
            'type' => ['required', 'in:checking,savings,credit,cash'],
            'balance' => [Rule::requiredIf($this->route('account') === null), 'numeric'],
            'institution' => ['required', 'string', 'max:100'],
            'color' => ['required', 'string', 'max:30'],
            'isActive' => ['sometimes', 'boolean'],
        ];
    }

    /**
     * @return array<int, callable(Validator): void>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                $account = $this->route('account');

                if (! $account || ! $this->has('balance') || ! is_numeric($this->input('balance'))) {
                    return;
                }

                $balanceChanged = round((float) $this->input('balance'), 2)
                    !== round((float) $account->balance, 2);

                if ($balanceChanged && ($account->transactions()->exists() || $account->outgoingTransfers()->exists() || $account->incomingTransfers()->exists())) {
                    $validator->errors()->add(
                        'balance',
                        'The balance cannot be changed after transactions have been recorded.'
                    );
                }
            },
        ];
    }
}
