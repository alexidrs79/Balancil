<?php

namespace App\Http\Controllers;

use App\Http\Resources\AccountResource;
use App\Http\Resources\BudgetResource;
use App\Http\Resources\CategoryResource;
use App\Http\Resources\GoalResource;
use App\Http\Resources\TransactionResource;
use App\Http\Resources\UserResource;
use App\Services\FinanceService;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function __invoke(Request $request, FinanceService $service): array
    {
        $user = $request->user()->load('preferences');
        $trend = $service->analytics($user, 6);
        // The hero cards and spending summary are labelled "this month", so they read
        // from a calendar-month slice rather than the six-month trend window.
        $month = $service->analytics($user, 1);
        $accounts = $user->accounts()->withLedgerActivity()->latest()->get();

        return [
            'user' => new UserResource($user),
            'accounts' => AccountResource::collection($accounts),
            'categories' => CategoryResource::collection($user->categories()->get()),
            'transactions' => TransactionResource::collection($user->transactions()->latest('date')->limit(20)->get()),
            'budgets' => BudgetResource::collection($service->budgets($user)),
            'goals' => GoalResource::collection($user->goals()->orderBy('deadline')->get()),
            'monthlyTrend' => $trend['monthlyTrend'],
            'categorySpending' => $month['categorySpending'],
            'summary' => $month['summary'],
        ];
    }
}
