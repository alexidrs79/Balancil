<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreGoalContributionRequest;
use App\Http\Resources\GoalContributionResource;
use App\Models\Goal;
use App\Models\GoalContribution;
use App\Services\GoalContributionService;

class GoalContributionController extends Controller
{
    public function index(Goal $goal)
    {
        return GoalContributionResource::collection(
            $goal->contributions()->latest('date')->latest()->get()
        );
    }

    public function store(StoreGoalContributionRequest $request, Goal $goal, GoalContributionService $service)
    {
        return (new GoalContributionResource(
            $service->create($request->user(), $goal, $request->validated())
        ))->response()->setStatusCode(201);
    }

    public function destroy(Goal $goal, GoalContribution $contribution, GoalContributionService $service)
    {
        $service->delete(request()->user(), $goal, $contribution);

        return response()->noContent();
    }
}
