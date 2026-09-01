<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreRecurringTransactionRequest;
use App\Http\Resources\RecurringTransactionResource;
use App\Models\RecurringTransaction;
use App\Services\RecurringTransactionService;

class RecurringTransactionController extends Controller
{
    public function index()
    {
        return RecurringTransactionResource::collection(
            request()->user()->recurringTransactions()->latest()->get()
        );
    }

    public function store(
        StoreRecurringTransactionRequest $request,
        RecurringTransactionService $service
    ) {
        return (new RecurringTransactionResource(
            $service->create($request->user(), $request->validated())
        ))->response()->setStatusCode(201);
    }

    public function show(RecurringTransaction $recurringTransaction)
    {
        return new RecurringTransactionResource($recurringTransaction);
    }

    public function update(
        StoreRecurringTransactionRequest $request,
        RecurringTransaction $recurringTransaction,
        RecurringTransactionService $service
    ) {
        return new RecurringTransactionResource(
            $service->update($recurringTransaction, $request->validated())
        );
    }

    public function destroy(RecurringTransaction $recurringTransaction)
    {
        $recurringTransaction->delete();

        return response()->noContent();
    }
}
