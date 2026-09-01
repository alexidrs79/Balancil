<?php

namespace App\Services;

use App\Models\Account;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class TransactionService
{
    /**
     * The ledger query behind both the paginated rows and their totals, so a page
     * of results and the summary above it can never disagree.
     *
     * @param  array<string, mixed>  $filters
     */
    public function filtered(User $user, array $filters): Builder
    {
        $query = $user->transactions()->getQuery();

        if ($search = $filters['search'] ?? null) {
            // lower() rather than ILIKE so the same query works on SQLite and Postgres.
            $term = '%'.mb_strtolower(trim($search)).'%';
            $query->where(fn (Builder $matches) => $matches
                ->whereRaw('lower(merchant) like ?', [$term])
                ->orWhereRaw('lower(description) like ?', [$term]));
        }
        foreach (['categoryId' => 'category_id', 'accountId' => 'account_id', 'type' => 'type', 'status' => 'status'] as $key => $column) {
            if ($value = $filters[$key] ?? null) {
                $query->where($column, $value);
            }
        }
        if ($from = $filters['dateFrom'] ?? null) {
            $query->whereDate('date', '>=', $from);
        }
        if ($to = $filters['dateTo'] ?? null) {
            $query->whereDate('date', '<=', $to);
        }

        // Every ordering ends with a unique column so paging cannot repeat or skip
        // a row when two transactions share a date or amount.
        return match ($filters['sort'] ?? 'newest') {
            'oldest' => $query->oldest('date')->orderBy('id'),
            'highest' => $query->orderByDesc('amount')->orderBy('id'),
            'lowest' => $query->orderBy('amount')->orderBy('id'),
            default => $query->latest('date')->orderByDesc('id'),
        };
    }

    /**
     * Totals for the whole filtered ledger, not just the page being shown.
     *
     * @return array<string, float|int>
     */
    public function summarize(User $user, Builder $query): array
    {
        $completed = (clone $query)->reorder()->where('status', 'completed');
        $income = (float) (clone $completed)->where('type', 'income')->sum('amount');
        $expenses = (float) (clone $completed)->where('type', 'expense')->sum('amount');

        return [
            'income' => round($income, 2),
            'expenses' => round($expenses, 2),
            'savings' => round($income - $expenses, 2),
            'completedCount' => (clone $completed)->count(),
            // The unfiltered size of the ledger, so the UI can say "12 of 340".
            'ledgerTotal' => $user->transactions()->count(),
        ];
    }

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
