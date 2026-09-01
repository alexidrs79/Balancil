<?php

namespace App\Services;

use App\Models\Account;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class TransactionService
{
    public function create(User $user, array $data): Transaction
    {
        return DB::transaction(function () use ($user, $data) {
            $this->validateCategoryType($user, $data);
            $this->lockAccounts([$data['accountId']]);
            $transaction = $user->transactions()->create($this->map($data));
            $this->apply($transaction, 1);

            return $transaction->refresh();
        });
    }

    public function update(User $user, Transaction $transaction, array $data): Transaction
    {
        return DB::transaction(function () use ($user, $transaction, $data) {
            $this->validateCategoryType($user, $data);
            $this->lockAccounts([$transaction->account_id, $data['accountId']]);
            $this->apply($transaction, -1);
            $transaction->update($this->map($data));
            $this->apply($transaction, 1);

            return $transaction->refresh();
        });
    }

    public function delete(Transaction $transaction): void
    {
        DB::transaction(function () use ($transaction) {
            $this->lockAccounts([$transaction->account_id]);
            $this->apply($transaction, -1);
            $transaction->delete();
        });
    }

    private function apply(Transaction $transaction, int $direction): void
    {
        if ($transaction->status !== 'completed') {
            return;
        }

        $signed = (float) $transaction->amount * ($transaction->type === 'income' ? 1 : -1) * $direction;
        Account::whereKey($transaction->account_id)->increment('balance', $signed);
    }

    /**
     * Lock in a stable order so concurrent updates spanning two accounts cannot deadlock.
     *
     * @param  array<int, string>  $accountIds
     */
    private function lockAccounts(array $accountIds): void
    {
        Account::query()
            ->whereKey(array_values(array_unique($accountIds)))
            ->orderBy('id')
            ->lockForUpdate()
            ->get();
    }

    private function validateCategoryType(User $user, array $data): void
    {
        $category = $user->categories()->findOrFail($data['categoryId']);
        if ($category->type !== $data['type']) {
            throw ValidationException::withMessages([
                'categoryId' => ['The category type must match the transaction type.'],
            ]);
        }
    }

    private function map(array $data): array
    {
        return [
            'account_id' => $data['accountId'], 'category_id' => $data['categoryId'],
            'merchant' => $data['merchant'], 'description' => $data['description'] ?? '',
            'amount' => $data['amount'], 'type' => $data['type'], 'date' => $data['date'],
            'status' => $data['status'],
        ];
    }
}
