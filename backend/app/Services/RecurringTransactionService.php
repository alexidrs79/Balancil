<?php

namespace App\Services;

use App\Models\RecurringTransaction;
use App\Models\User;
use Carbon\Carbon;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\DB;

class RecurringTransactionService
{
    public const MAX_DRAFTS_PER_TEMPLATE = 120;

    public function create(User $user, array $data): RecurringTransaction
    {
        return $user->recurringTransactions()->create($this->map($data));
    }

    public function update(RecurringTransaction $template, array $data): RecurringTransaction
    {
        return DB::transaction(function () use ($template, $data): RecurringTransaction {
            $template->update($this->map($data));
            $template->refresh();

            $template->dueDrafts()
                ->where('status', 'pending')
                ->lockForUpdate()
                ->get()
                ->each(function ($draft) use ($template): void {
                    $draft->update(['payload' => $this->snapshot($template, $draft->due_date)]);
                });

            return $template;
        });
    }

    public function generateThrough(CarbonInterface|string|null $through = null): int
    {
        $requestedThrough = $through === null ? null : Carbon::parse($through)->startOfDay();
        $generated = 0;

        $templates = RecurringTransaction::query()
            ->withoutGlobalScope('owned')
            ->where('is_active', true);
        if ($requestedThrough !== null) {
            $templates->whereDate('next_due_date', '<=', $requestedThrough);
        }

        $templates->eachById(function (RecurringTransaction $template) use ($requestedThrough, &$generated): void {
            $generated += DB::transaction(function () use ($template, $requestedThrough): int {
                $template = RecurringTransaction::query()
                    ->withoutGlobalScope('owned')
                    ->lockForUpdate()
                    ->findOrFail($template->id);
                $template->loadMissing('user.preferences');
                $through = $requestedThrough ?? Carbon::now(
                    $template->user->preferences?->timezone ?? 'UTC'
                )->startOfDay();

                if (
                    ! $template->is_active
                    || $template->next_due_date->toDateString() > $through->toDateString()
                ) {
                    return 0;
                }

                $count = 0;
                $iterations = 0;
                $due = $template->next_due_date->copy();
                while (
                    $iterations < self::MAX_DRAFTS_PER_TEMPLATE
                    && $due->toDateString() <= $through->toDateString()
                    && (
                        ! $template->end_date
                        || $due->toDateString() <= $template->end_date->toDateString()
                    )
                ) {
                    $draft = $template->user->recurringDueDrafts()
                        ->withoutGlobalScope('owned')
                        ->firstOrCreate(
                            [
                                'recurring_transaction_id' => $template->id,
                                'due_date' => $due->copy(),
                            ],
                            [
                                'payload' => $this->snapshot($template, $due),
                                'status' => 'pending',
                            ]
                        );
                    $count += $draft->wasRecentlyCreated ? 1 : 0;
                    $iterations++;
                    $due = $this->nextDueDate($template, $due);
                }

                $template->update([
                    'next_due_date' => $due,
                    'is_active' => ! $template->end_date || $due->lte($template->end_date),
                ]);

                return $count;
            });
        });

        return $generated;
    }

    public function advancePast(RecurringTransaction $template, CarbonInterface $date): void
    {
        $next = $template->next_due_date->copy();
        while ($next->lte($date)) {
            $next = $this->nextDueDate($template, $next);
        }

        $template->update([
            'next_due_date' => $next,
            'is_active' => $template->is_active && (! $template->end_date || $next->lte($template->end_date)),
        ]);
    }

    public function nextDueDate(RecurringTransaction $template, CarbonInterface $due): Carbon
    {
        $interval = $template->interval;

        return match ($template->frequency) {
            'weekly' => Carbon::instance($due)->addWeeks($interval),
            'biweekly' => Carbon::instance($due)->addWeeks(2 * $interval),
            'monthly' => $this->nextMonthlyDate($template, $due, $interval),
            'yearly' => $this->nextYearlyDate($template, $due, $interval),
        };
    }

    private function nextMonthlyDate(
        RecurringTransaction $template,
        CarbonInterface $due,
        int $interval
    ): Carbon {
        $target = Carbon::instance($due)->startOfMonth()->addMonths($interval);
        $start = $template->start_date;
        $day = $start->isLastOfMonth() ? $target->daysInMonth : min($start->day, $target->daysInMonth);

        return $target->day($day);
    }

    private function nextYearlyDate(
        RecurringTransaction $template,
        CarbonInterface $due,
        int $interval
    ): Carbon {
        $start = $template->start_date;
        $target = Carbon::create($due->year + $interval, $start->month, 1);

        return $target->day(min($start->day, $target->daysInMonth));
    }

    private function snapshot(RecurringTransaction $template, CarbonInterface $due): array
    {
        return [
            'accountId' => $template->account_id,
            'categoryId' => $template->category_id,
            'merchant' => $template->merchant,
            'description' => $template->description,
            'amount' => (float) $template->amount,
            'type' => $template->type,
            'date' => $due->toDateString(),
            'status' => 'completed',
        ];
    }

    private function map(array $data): array
    {
        $mapped = [
            'account_id' => $data['accountId'],
            'category_id' => $data['categoryId'],
            'merchant' => $data['merchant'],
            'description' => $data['description'] ?? '',
            'amount' => $data['amount'],
            'type' => $data['type'],
            'frequency' => $data['frequency'],
            'interval' => $data['interval'] ?? 1,
            'start_date' => $data['startDate'],
            'end_date' => $data['endDate'] ?? null,
            'is_active' => $data['isActive'] ?? true,
        ];

        $mapped['next_due_date'] = $data['nextDueDate'] ?? $data['startDate'];

        return $mapped;
    }
}
