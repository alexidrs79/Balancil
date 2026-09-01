<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreTransferRequest;
use App\Http\Resources\TransferResource;
use App\Models\AccountTransfer;
use App\Services\TransferService;

class TransferController extends Controller
{
    public function index()
    {
        return TransferResource::collection(
            request()->user()->transfers()->latest('date')->latest()->get()
        );
    }

    public function store(StoreTransferRequest $request, TransferService $service)
    {
        return (new TransferResource($service->create($request->user(), $request->validated())))
            ->response()->setStatusCode(201);
    }

    public function update(StoreTransferRequest $request, AccountTransfer $transfer, TransferService $service)
    {
        return new TransferResource($service->update($request->user(), $transfer, $request->validated()));
    }

    public function destroy(AccountTransfer $transfer, TransferService $service)
    {
        $service->delete($transfer);

        return response()->noContent();
    }
}
