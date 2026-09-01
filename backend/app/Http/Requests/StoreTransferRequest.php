<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreTransferRequest extends FormRequest
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
        $ownedActiveAccount = Rule::exists('accounts', 'id')
            ->where('user_id', $userId)
            ->where('is_active', true);

        return [
            'fromAccountId' => ['required', 'uuid', $ownedActiveAccount],
            'toAccountId' => ['required', 'uuid', 'different:fromAccountId', $ownedActiveAccount],
            'amount' => ['required', 'numeric', 'gt:0'],
            'date' => ['required', 'date'],
            'description' => ['nullable', 'string', 'max:255'],
            'status' => ['required', 'in:completed,pending,failed'],
        ];
    }
}
