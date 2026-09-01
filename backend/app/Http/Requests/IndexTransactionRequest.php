<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class IndexTransactionRequest extends FormRequest
{
    public const MAX_PER_PAGE = 100;

    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $userId = $this->user()->id;
        $owned = fn (string $table) => Rule::exists($table, 'id')->where('user_id', $userId);

        return [
            'page' => ['nullable', 'integer', 'min:1'],
            'perPage' => ['nullable', 'integer', 'min:1', 'max:'.self::MAX_PER_PAGE],
            'search' => ['nullable', 'string', 'max:255'],
            'type' => ['nullable', 'in:income,expense'],
            'status' => ['nullable', 'in:completed,pending,failed'],
            'categoryId' => ['nullable', 'uuid', $owned('categories')],
            'accountId' => ['nullable', 'uuid', $owned('accounts')],
            'dateFrom' => ['nullable', 'date'],
            'dateTo' => ['nullable', 'date'],
            'sort' => ['nullable', 'in:newest,oldest,highest,lowest'],
        ];
    }

    /**
     * Blank query strings mean "no filter", so they are dropped before validation
     * rather than failing the `in:` and `uuid` rules.
     *
     * @return array<string, mixed>
     */
    public function filters(): array
    {
        return array_filter(
            $this->safe()->except(['page', 'perPage']),
            fn ($value) => $value !== null && $value !== '',
        );
    }

    public function perPage(): int
    {
        return (int) ($this->validated('perPage') ?? 25);
    }

    protected function prepareForValidation(): void
    {
        $this->replace(array_filter(
            $this->all(),
            fn ($value) => $value !== null && $value !== '',
        ));
    }
}
