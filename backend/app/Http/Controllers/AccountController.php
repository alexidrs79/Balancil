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
        if ($account->transactions()->exists() || $this->hasTransfers($account)) {
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
        return [
            'name' => $data['name'], 'type' => $data['type'], 'balance' => $data['balance'] ?? $account?->balance ?? 0,
            'institution' => $data['institution'], 'color' => $data['color'],
            'is_active' => $data['isActive'] ?? true,
        ];
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
