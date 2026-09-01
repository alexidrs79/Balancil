<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreTransactionRequest;
use App\Http\Resources\TransactionResource;
use App\Models\Transaction;
use App\Services\TransactionService;

class TransactionController extends Controller
{
    public function index()
    {
        return TransactionResource::collection(
            request()->user()->transactions()->latest('date')->latest()->get()
        );
    }

    public function store(StoreTransactionRequest $request, TransactionService $service)
    {
        return (new TransactionResource($service->create($request->user(), $request->validated())))
            ->response()->setStatusCode(201);
    }

    public function update(StoreTransactionRequest $request, Transaction $transaction, TransactionService $service)
    {
        return new TransactionResource($service->update($request->user(), $transaction, $request->validated()));
    }

    public function destroy(Transaction $transaction, TransactionService $service)
    {
        $service->delete($transaction);

        return response()->noContent();
    }
}
