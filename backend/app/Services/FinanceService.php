<?php

namespace App\Services;

use App\Models\Budget;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class FinanceService
{
    public function budgets(User $user): Collection
    {
        return $user->budgets()->latest()->get()->each(function (Budget $budget) use ($user) {
            [$start, $end] = $this->periodBounds($user, $budget->period);
            $budget->spent = $this->money((float) $user->transactions()
                ->where('category_id', $budget->category_id)
                ->where('type', 'expense')->where('status', 'completed')
                ->whereDate('date', '>=', $start->toDateString())
                ->whereDate('date', '<=', $end->toDateString())
                ->sum('amount'));
        });
    }

    public function analytics(User $user, int $months, ?string $from = null, ?string $to = null): array
    {
        $months = max(1, min($months, 24));
        $now = $this->nowFor($user);
        $start = $from
            ? Carbon::parse($from, $now->getTimezone())->startOfDay()
            : $now->copy()->startOfMonth()->subMonths($months - 1);
        // Preset windows use the full current calendar month so Overview, budgets,
        // and Analytics agree on "this month", including completed dates still ahead.
        $end = $to
            ? Carbon::parse($to, $now->getTimezone())->endOfDay()
            : $now->copy()->endOfMonth();
        $transactions = $user->transactions()->where('status', 'completed')
            ->whereDate('date', '>=', $start->toDateString())
            ->whereDate('date', '<=', $end->toDateString())
            ->get();
        $income = $this->money((float) $transactions->where('type', 'income')->sum('amount'));
        $expenses = $this->money((float) $transactions->where('type', 'expense')->sum('amount'));
        $expenseRows = $transactions->where('type', 'expense')->groupBy('category_id')
            ->map(fn ($items, $categoryId) => [
                'categoryId' => $categoryId,
                'amount' => $this->money((float) $items->sum('amount')),
                'percentage' => $expenses > 0 ? round($items->sum('amount') / $expenses * 100, 1) : 0,
            ])->values()->all();
        $monthCursor = $start->copy()->startOfMonth();
        $lastMonth = $end->copy()->startOfMonth();
        $monthlyTrend = collect();

        while ($monthCursor->lte($lastMonth)) {
            $month = $monthCursor->copy();
            $items = $transactions->filter(fn ($item) => $item->date->isSameMonth($month));
            $monthIncome = $this->money((float) $items->where('type', 'income')->sum('amount'));
            $monthExpenses = $this->money((float) $items->where('type', 'expense')->sum('amount'));
            $monthlyTrend->push([
                'month' => $month->format('M'),
                'period' => $month->format('Y-m'),
                'income' => $monthIncome,
                'expenses' => $monthExpenses,
                'savings' => $this->money($monthIncome - $monthExpenses),
            ]);
            $monthCursor->addMonth();
        }

        return [
            'summary' => [
                'income' => $income,
                'expenses' => $expenses,
                'savings' => $this->money($income - $expenses),
            ],
            'monthlyTrend' => $monthlyTrend->all(),
            'categorySpending' => $expenseRows,
            'savingsRate' => $income > 0 ? round(($income - $expenses) / $income * 100, 1) : 0,
            'range' => [
                'from' => $start->toDateString(),
                'to' => $end->toDateString(),
            ],
        ];
    }

    private function periodBounds(User $user, string $period): array
    {
        $now = $this->nowFor($user);
        $weekStartsSunday = $user->preferences?->week_start === 'sun';
        $weekStart = $weekStartsSunday ? Carbon::SUNDAY : Carbon::MONDAY;
        $weekEnd = $weekStartsSunday ? Carbon::SATURDAY : Carbon::SUNDAY;

        return match ($period) {
            'weekly' => [
                $now->copy()->startOfWeek($weekStart)->startOfDay(),
                $now->copy()->endOfWeek($weekEnd)->endOfDay(),
            ],
            'yearly' => [$now->copy()->startOfYear(), $now->copy()->endOfYear()],
            default => [$now->copy()->startOfMonth(), $now->copy()->endOfMonth()],
        };
    }

    private function nowFor(User $user): Carbon
    {
        $user->loadMissing('preferences');

        return Carbon::now($user->preferences?->timezone ?? 'UTC');
    }

    private function money(float $value): float
    {
        return round($value, 2);
    }
}
