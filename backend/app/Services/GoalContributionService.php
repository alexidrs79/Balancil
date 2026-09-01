<?php

namespace App\Services;

use App\Models\Goal;
use App\Models\GoalContribution;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class GoalContributionService
{
    public function create(User $user, Goal $goal, array $data): GoalContribution
    {
        return DB::transaction(function () use ($user, $goal, $data) {
            $this->lockOwnedGoal($user, $goal);

            $contribution = $user->goalContributions()->create([
                'goal_id' => $goal->id,
                'amount' => $data['amount'],
                'date' => $data['date'],
                'note' => $data['note'] ?? null,
            ]);

            Goal::whereKey($goal->id)->increment('saved', (float) $contribution->amount);

            return $contribution->refresh();
        });
    }

    public function delete(User $user, Goal $goal, GoalContribution $contribution): void
    {
        DB::transaction(function () use ($user, $goal, $contribution) {
            $this->lockOwnedGoal($user, $goal);
            $this->assertPaired($goal, $contribution, $user);

            $amount = (float) $contribution->amount;
            $contribution->delete();
            Goal::whereKey($goal->id)->decrement('saved', $amount);
        });
    }

    public function seedInitialSaved(User $user, Goal $goal, float $amount): void
    {
        if ($amount <= 0) {
            return;
        }

        $this->create($user, $goal, [
            'amount' => $amount,
            'date' => now()->toDateString(),
            'note' => null,
        ]);
    }

    public function backfillFromExistingSaved(): void
    {
        Goal::withoutGlobalScopes()
            ->where('saved', '!=', 0)
            ->whereDoesntHave('contributions')
            ->orderBy('id')
            ->each(function (Goal $goal) {
                $this->insertMatchingCurrentSaved($goal);
            });
    }

    private function insertMatchingCurrentSaved(Goal $goal): void
    {
        (new GoalContribution)->forceFill([
            'user_id' => $goal->user_id,
            'goal_id' => $goal->id,
            'amount' => $goal->saved,
            'date' => optional($goal->created_at)->toDateString() ?? now()->toDateString(),
            'note' => null,
        ])->save();
    }

    private function lockOwnedGoal(User $user, Goal $goal): Goal
    {
        $locked = Goal::withoutGlobalScopes()
            ->whereKey($goal->id)
            ->where('user_id', $user->id)
            ->lockForUpdate()
            ->first();

        abort_unless($locked, 404);

        return $locked;
    }

    private function assertPaired(Goal $goal, GoalContribution $contribution, User $user): void
    {
        abort_unless(
            $contribution->goal_id === $goal->id && $contribution->user_id === $user->id,
            404
        );
    }
}
