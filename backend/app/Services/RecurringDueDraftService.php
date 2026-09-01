<?php

namespace App\Services;

use App\Models\RecurringDueDraft;
use App\Models\RecurringTransaction;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;

class RecurringDueDraftService
{
    public function __construct(
        private readonly TransactionService $transactions,
        private readonly RecurringTransactionService $recurringTransactions,
    ) {}

    public function post(RecurringDueDraft $draft, array $overrides): RecurringDueDraft
    {
        return DB::transaction(function () use ($draft, $overrides): RecurringDueDraft {
            $draft = RecurringDueDraft::query()->lockForUpdate()->findOrFail($draft->id);

            if ($draft->status === 'posted') {
                return $draft;
            }
            if ($draft->status === 'skipped') {
                throw new ConflictHttpException('A skipped recurring draft cannot be posted.');
            }

            $template = RecurringTransaction::query()->lockForUpdate()->findOrFail(
                $draft->recurring_transaction_id
            );
            $data = array_replace($draft->payload, $overrides);
            $data['status'] = 'completed';
            $data['date'] ??= $draft->due_date->toDateString();

            $account = $draft->user->accounts()
                ->whereKey($data['accountId'])
                ->where('is_active', true)
                ->first();
            if (! $account) {
                throw ValidationException::withMessages([
                    'accountId' => ['The selected account must be an active account you own.'],
                ]);
            }

            $category = $draft->user->categories()->find($data['categoryId']);
            if (! $category) {
                throw ValidationException::withMessages([
                    'categoryId' => ['The selected category must be a category you own.'],
                ]);
            }
            if ($category->type !== $data['type']) {
                throw ValidationException::withMessages([
                    'categoryId' => ['The category type must match the transaction type.'],
                ]);
            }

            $transaction = $this->transactions->create($draft->user, $data);
            $draft->update([
                'status' => 'posted',
                'transaction_id' => $transaction->id,
                'reviewed_at' => now(),
            ]);
            $this->recurringTransactions->advancePast($template, $draft->due_date);

            return $draft->refresh();
        });
    }

    public function skip(RecurringDueDraft $draft): RecurringDueDraft
    {
        return DB::transaction(function () use ($draft): RecurringDueDraft {
            $draft = RecurringDueDraft::query()->lockForUpdate()->findOrFail($draft->id);

            if ($draft->status === 'posted') {
                throw new ConflictHttpException('A posted recurring draft cannot be skipped.');
            }
            if ($draft->status === 'pending') {
                $draft->update(['status' => 'skipped', 'reviewed_at' => now()]);
            }

            return $draft->refresh();
        });
    }
}
