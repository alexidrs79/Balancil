<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreBudgetRequest;
use App\Http\Resources\BudgetResource;
use App\Models\Budget;
use App\Services\FinanceService;

class BudgetController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        return BudgetResource::collection(app(FinanceService::class)->budgets(request()->user()));
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StoreBudgetRequest $request)
    {
        $budget = $request->user()->budgets()->create([
            'category_id' => $request->validated('categoryId'),
            'limit' => $request->validated('limit'),
            'period' => $request->validated('period', 'monthly'),
        ]);
        $budget->spent = 0;

        return (new BudgetResource($budget))->response()->setStatusCode(201);
    }

    /**
     * Display the specified resource.
     */
    public function update(StoreBudgetRequest $request, Budget $budget)
    {
        $budget->update([
            'category_id' => $request->validated('categoryId'),
            'limit' => $request->validated('limit'),
            'period' => $request->validated('period', 'monthly'),
        ]);
        $budget = app(FinanceService::class)->budgets($request->user())->firstWhere('id', $budget->id);

        return new BudgetResource($budget);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Budget $budget)
    {
        $budget->delete();

        return response()->noContent();
    }
}
