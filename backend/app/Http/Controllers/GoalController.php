<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreGoalRequest;
use App\Http\Resources\GoalResource;
use App\Models\Goal;
use App\Services\GoalContributionService;
use Illuminate\Support\Facades\DB;

class GoalController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        return GoalResource::collection(request()->user()->goals()->orderBy('deadline')->get());
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StoreGoalRequest $request, GoalContributionService $contributions)
    {
        $data = $request->validated();
        $initialSaved = (float) $data['saved'];

        $goal = DB::transaction(function () use ($request, $data, $initialSaved, $contributions) {
            $goal = $request->user()->goals()->create($this->map($data));
            $contributions->seedInitialSaved($request->user(), $goal, $initialSaved);

            return $goal->refresh();
        });

        return (new GoalResource($goal))->response()->setStatusCode(201);
    }

    /**
     * Display the specified resource.
     */
    public function update(StoreGoalRequest $request, Goal $goal)
    {
        $goal->update($this->map($request->validated()));

        return new GoalResource($goal->refresh());
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Goal $goal)
    {
        $goal->delete();

        return response()->noContent();
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function map(array $data): array
    {
        return [
            'name' => $data['name'],
            'target' => $data['target'],
            'deadline' => $data['deadline'],
            'color' => $data['color'],
        ];
    }
}
