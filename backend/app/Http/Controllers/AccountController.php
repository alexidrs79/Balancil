<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreAccountRequest;
use App\Http\Resources\AccountResource;
use App\Models\Account;

class AccountController extends Controller
{
    public function index()
    {
        return AccountResource::collection(
            request()->user()->accounts()->withLedgerActivity()->latest()->get()
        );
    }

    public function store(StoreAccountRequest $request)
    {
        $account = $request->user()->accounts()->create($this->map($request->validated()));

        return (new AccountResource($this->withActivity($account)))->response()->setStatusCode(201);
    }

    public function update(StoreAccountRequest $request, Account $account): AccountResource
    {
        $account->update($this->map($request->validated(), $account));

        return new AccountResource($this->withActivity($account));
    }

    public function destroy(Account $account)
    {
        if ($this->hasActivity($account)) {
            return response()->json(['message' => 'Accounts with transactions cannot be deleted.'], 409);
        }
        if ($account->recurringTransactions()->exists()) {
            return response()->json([
                'message' => 'Accounts used by recurring schedules cannot be deleted.',
            ], 409);
        }
        $account->delete();

        return response()->noContent();
    }

    private function map(array $data, ?Account $account = null): array
    {
        $fields = [
            'name' => $data['name'], 'type' => $data['type'],
            'institution' => $data['institution'], 'color' => $data['color'],
            'is_active' => $data['isActive'] ?? true,
        ];

        // A balance is only settable while the account has no activity; after that the
        // ledger maintains it. The opening balance moves with it, and only with it, so
        // that ledger:reconcile has an independent figure to check against.
        if (array_key_exists('balance', $data) && ($account === null || ! $this->hasActivity($account))) {
            $fields['balance'] = $data['balance'];
            $fields['opening_balance'] = $data['balance'];
        }

        return $fields;
    }

    private function hasActivity(Account $account): bool
    {
        return $account->transactions()->exists() || $this->hasTransfers($account);
    }

    /** Re-read the row with its movement sums so the response can explain the balance. */
    private function withActivity(Account $account): Account
    {
        return Account::query()->withLedgerActivity()->findOrFail($account->id);
    }

    private function hasTransfers(Account $account): bool
    {
        return $account->outgoingTransfers()->exists() || $account->incomingTransfers()->exists();
    }
}
