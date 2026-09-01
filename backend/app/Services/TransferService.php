<?php

namespace App\Services;

use App\Models\Account;
use App\Models\AccountTransfer;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class TransferService
{
    public function create(User $user, array $data): AccountTransfer
    {
        return DB::transaction(function () use ($user, $data) {
            $transfer = $user->transfers()->create($this->map($data));
            $this->apply($transfer, 1);

            return $transfer->refresh();
        });
    }

    public function update(User $user, AccountTransfer $transfer, array $data): AccountTransfer
    {
        return DB::transaction(function () use ($transfer, $data) {
            $this->apply($transfer, -1);
            $transfer->update($this->map($data));
            $this->apply($transfer, 1);

            return $transfer->refresh();
        });
    }

    public function delete(AccountTransfer $transfer): void
    {
        DB::transaction(function () use ($transfer) {
            $this->apply($transfer, -1);
            $transfer->delete();
        });
    }

    private function apply(AccountTransfer $transfer, int $direction): void
    {
        if ($transfer->status !== 'completed') {
            return;
        }

        $signed = (float) $transfer->amount * $direction;
        $ids = collect([$transfer->from_account_id, $transfer->to_account_id])->sort()->values();
        Account::whereIn('id', $ids)->lockForUpdate()->get();
        Account::whereKey($transfer->from_account_id)->increment('balance', -$signed);
        Account::whereKey($transfer->to_account_id)->increment('balance', $signed);
    }

    private function map(array $data): array
    {
        return [
            'from_account_id' => $data['fromAccountId'],
            'to_account_id' => $data['toAccountId'],
            'amount' => $data['amount'],
            'date' => $data['date'],
            'description' => $data['description'] ?? '',
            'status' => $data['status'],
        ];
    }
}
