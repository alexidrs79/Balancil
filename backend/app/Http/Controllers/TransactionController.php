<?php

namespace App\Http\Controllers;

use App\Http\Requests\ImportTransactionRequest;
use App\Http\Requests\IndexTransactionRequest;
use App\Http\Requests\StoreTransactionRequest;
use App\Http\Resources\TransactionResource;
use App\Models\Transaction;
use App\Services\TransactionCsvService;
use App\Services\TransactionService;

class TransactionController extends Controller
{
    public function index(IndexTransactionRequest $request, TransactionService $service)
    {
        $query = $service->filtered($request->user(), $request->filters());

        return TransactionResource::collection(
            $query->paginate($request->perPage())->withQueryString()
        )->additional(['summary' => $service->summarize($request->user(), $query)]);
    }

    /** The current view of the ledger, as a file. Honours the same filters as index. */
    public function export(IndexTransactionRequest $request, TransactionCsvService $csv)
    {
        return $csv->export($request->user(), $request->filters());
    }

    /**
     * Two passes over the same reader: `preview` reports what a file would do, and a
     * plain call writes it. An import with any bad row is refused outright rather
     * than leaving a partly-loaded ledger behind.
     */
    public function import(ImportTransactionRequest $request, TransactionCsvService $csv)
    {
        $user = $request->user();
        $review = $csv->markDuplicates($user, $csv->review($user, $request->file('file')));

        if ($request->boolean('preview')) {
            return response()->json($review);
        }

        if ($review['rows'] === []) {
            return response()->json(['message' => 'That file has no rows to import.'], 422);
        }

        if ($review['invalid'] > 0) {
            return response()->json([
                'message' => $review['invalid'].' row(s) could not be imported. Nothing was saved.',
                'review' => $review,
            ], 422);
        }

        return response()->json($csv->commit($user, $review));
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
