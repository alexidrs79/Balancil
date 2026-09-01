<?php

namespace App\Http\Controllers;

use App\Http\Requests\PostRecurringDueDraftRequest;
use App\Http\Resources\RecurringDueDraftResource;
use App\Models\RecurringDueDraft;
use App\Services\RecurringDueDraftService;

class RecurringDueDraftController extends Controller
{
    public function pending()
    {
        return RecurringDueDraftResource::collection(
            request()->user()->recurringDueDrafts()
                ->where('status', 'pending')
                ->oldest('due_date')
                ->get()
        );
    }

    public function history()
    {
        return RecurringDueDraftResource::collection(
            request()->user()->recurringDueDrafts()
                ->whereIn('status', ['posted', 'skipped'])
                ->latest('reviewed_at')
                ->get()
        );
    }

    public function post(
        PostRecurringDueDraftRequest $request,
        RecurringDueDraft $draft,
        RecurringDueDraftService $service
    ) {
        return new RecurringDueDraftResource(
            $service->post($draft, $request->validated())
        );
    }

    public function skip(
        RecurringDueDraft $draft,
        RecurringDueDraftService $service
    ) {
        return new RecurringDueDraftResource($service->skip($draft));
    }
}
