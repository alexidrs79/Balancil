<?php

namespace App\Http\Controllers;

use App\Http\Requests\ConfirmEmailChangeRequest;
use App\Http\Requests\StoreEmailChangeRequest;
use App\Http\Resources\EmailChangeRequestResource;
use App\Services\EmailChangeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class EmailChangeController extends Controller
{
    public function __construct(private readonly EmailChangeService $emailChanges) {}

    public function store(StoreEmailChangeRequest $request): JsonResponse
    {
        $change = $this->emailChanges->request(
            $request->user(),
            $request->string('email')->toString(),
            $request->string('currentPassword')->toString(),
        );

        return response()->json([
            'emailChange' => new EmailChangeRequestResource($change),
        ], 201);
    }

    public function pending(Request $request): array
    {
        $change = $this->emailChanges->pending($request->user());

        return [
            'emailChange' => $change ? new EmailChangeRequestResource($change) : null,
        ];
    }

    public function cancel(Request $request): Response
    {
        $this->emailChanges->cancel($request->user());

        return response()->noContent();
    }

    public function confirm(ConfirmEmailChangeRequest $request): array
    {
        $this->emailChanges->confirm($request->string('token')->toString());

        return ['message' => 'Email address changed successfully.'];
    }
}
