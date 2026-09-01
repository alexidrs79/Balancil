<?php

namespace Tests\Feature;

use App\Models\Goal;
use App\Models\GoalContribution;
use App\Models\User;
use App\Services\GoalContributionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class GoalContributionTest extends TestCase
{
    use RefreshDatabase;

    public function test_creating_a_goal_with_saved_seeds_a_contribution_and_keeps_saved_in_sync(): void
    {
        $user = $this->goalUser();
        Sanctum::actingAs($user);

        $goal = $this->postJson('/api/goals', $this->goalPayload([
            'saved' => 100.50,
        ]))->assertCreated()
            ->assertJsonPath('saved', 100.5)
            ->json();

        $this->getJson('/api/goals/'.$goal['id'].'/contributions')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.amount', 100.5)
            ->assertJsonPath('0.goalId', $goal['id']);

        $this->assertDatabaseCount('goal_contributions', 1);
        $this->assertSame(100.5, (float) Goal::query()->findOrFail($goal['id'])->saved);
    }

    public function test_creating_a_goal_with_zero_saved_does_not_create_a_contribution(): void
    {
        $user = $this->goalUser();
        Sanctum::actingAs($user);

        $goal = $this->postJson('/api/goals', $this->goalPayload(['saved' => 0]))
            ->assertCreated()
            ->assertJsonPath('saved', 0)
            ->json();

        $this->getJson('/api/goals/'.$goal['id'].'/contributions')
            ->assertOk()
            ->assertJsonCount(0);
        $this->assertDatabaseCount('goal_contributions', 0);
    }

    public function test_goal_update_accepts_saved_for_compatibility_but_does_not_mutate_it(): void
    {
        $user = $this->goalUser();
        Sanctum::actingAs($user);

        $goal = $this->postJson('/api/goals', $this->goalPayload(['saved' => 200]))
            ->assertCreated()
            ->json();

        $this->putJson('/api/goals/'.$goal['id'], $this->goalPayload([
            'name' => 'Renamed',
            'target' => 4000,
            'saved' => 999,
        ]))->assertOk()
            ->assertJsonPath('name', 'Renamed')
            ->assertJsonPath('target', 4000)
            ->assertJsonPath('saved', 200);

        $this->getJson('/api/goals/'.$goal['id'].'/contributions')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.amount', 200);
    }

    public function test_adding_and_deleting_contributions_updates_saved_atomically(): void
    {
        $user = $this->goalUser();
        Sanctum::actingAs($user);

        $goal = $this->postJson('/api/goals', $this->goalPayload(['saved' => 0]))
            ->assertCreated()
            ->json();

        $first = $this->postJson('/api/goals/'.$goal['id'].'/contributions', [
            'amount' => 25.25,
            'date' => now()->toDateString(),
            'note' => 'Paycheck',
        ])->assertCreated()
            ->assertJsonPath('amount', 25.25)
            ->assertJsonPath('note', 'Paycheck')
            ->assertJsonPath('goalId', $goal['id'])
            ->json();

        $this->getJson('/api/goals')->assertOk()->assertJsonPath('0.saved', 25.25);

        $second = $this->postJson('/api/goals/'.$goal['id'].'/contributions', [
            'amount' => 14.75,
            'date' => now()->subDay()->toDateString(),
        ])->assertCreated()->json();

        $this->getJson('/api/goals')->assertOk()->assertJsonPath('0.saved', 40);
        $this->getJson('/api/goals/'.$goal['id'].'/contributions')
            ->assertOk()
            ->assertJsonCount(2)
            ->assertJsonPath('0.id', $first['id']);

        $this->deleteJson('/api/goals/'.$goal['id'].'/contributions/'.$first['id'])
            ->assertNoContent();
        $this->assertDatabaseMissing('goal_contributions', ['id' => $first['id']]);
        $this->getJson('/api/goals')->assertOk()->assertJsonPath('0.saved', 14.75);

        $this->deleteJson('/api/goals/'.$goal['id'].'/contributions/'.$second['id'])
            ->assertNoContent();
        $this->getJson('/api/goals')->assertOk()->assertJsonPath('0.saved', 0);
        $this->getJson('/api/goals/'.$goal['id'].'/contributions')->assertOk()->assertJsonCount(0);
    }

    public function test_contribution_validation_rejects_invalid_amounts_and_payloads(): void
    {
        $user = $this->goalUser();
        Sanctum::actingAs($user);
        $goal = $this->postJson('/api/goals', $this->goalPayload(['saved' => 0]))
            ->assertCreated()
            ->json();

        $this->postJson('/api/goals/'.$goal['id'].'/contributions', [
            'amount' => 0,
            'date' => now()->toDateString(),
        ])->assertUnprocessable()->assertJsonValidationErrors('amount');

        $this->postJson('/api/goals/'.$goal['id'].'/contributions', [
            'amount' => -5,
            'date' => now()->toDateString(),
        ])->assertUnprocessable()->assertJsonValidationErrors('amount');

        $this->postJson('/api/goals/'.$goal['id'].'/contributions', [
            'amount' => 10,
        ])->assertUnprocessable()->assertJsonValidationErrors('date');

        $this->postJson('/api/goals/'.$goal['id'].'/contributions', [
            'amount' => 10,
            'date' => now()->toDateString(),
            'note' => str_repeat('x', 256),
        ])->assertUnprocessable()->assertJsonValidationErrors('note');

        $this->assertSame(0.0, (float) Goal::query()->findOrFail($goal['id'])->saved);
        $this->assertDatabaseCount('goal_contributions', 0);
    }

    public function test_contributions_cannot_cross_users_or_goals(): void
    {
        $owner = $this->goalUser();
        Sanctum::actingAs($owner);
        $goal = $this->postJson('/api/goals', $this->goalPayload(['name' => 'Trip', 'saved' => 0]))
            ->assertCreated()
            ->json();
        $otherGoal = $this->postJson('/api/goals', $this->goalPayload(['name' => 'Car', 'saved' => 0]))
            ->assertCreated()
            ->json();
        $contribution = $this->postJson('/api/goals/'.$goal['id'].'/contributions', [
            'amount' => 40,
            'date' => now()->toDateString(),
        ])->assertCreated()->json();

        $this->deleteJson('/api/goals/'.$otherGoal['id'].'/contributions/'.$contribution['id'])
            ->assertNotFound();
        $this->assertDatabaseHas('goal_contributions', ['id' => $contribution['id']]);
        $this->assertSame(40.0, (float) Goal::query()->findOrFail($goal['id'])->saved);
        $this->assertSame(0.0, (float) Goal::query()->findOrFail($otherGoal['id'])->saved);

        $stranger = $this->goalUser();
        Sanctum::actingAs($stranger);

        $this->getJson('/api/goals/'.$goal['id'].'/contributions')->assertNotFound();
        $this->postJson('/api/goals/'.$goal['id'].'/contributions', [
            'amount' => 1,
            'date' => now()->toDateString(),
        ])->assertNotFound();
        $this->deleteJson('/api/goals/'.$goal['id'].'/contributions/'.$contribution['id'])
            ->assertNotFound();

        $strangerGoal = $this->postJson('/api/goals', $this->goalPayload(['saved' => 0]))
            ->assertCreated()
            ->json();
        $this->deleteJson('/api/goals/'.$strangerGoal['id'].'/contributions/'.$contribution['id'])
            ->assertNotFound();

        $this->assertDatabaseHas('goal_contributions', [
            'id' => $contribution['id'],
            'user_id' => $owner->id,
            'goal_id' => $goal['id'],
            'amount' => 40,
        ]);
        $this->assertSame(40.0, (float) Goal::withoutGlobalScopes()->findOrFail($goal['id'])->saved);
        $this->assertSame(1, GoalContribution::withoutGlobalScopes()->count());
    }

    public function test_backfill_seeds_contributions_for_nonzero_saved_without_changing_progress(): void
    {
        $user = $this->goalUser();
        $tracked = $user->goals()->create([
            'name' => 'Already tracked',
            'target' => 1000,
            'saved' => 0,
            'deadline' => now()->addYear()->toDateString(),
            'color' => '#16a34a',
        ]);
        $user->goalContributions()->create([
            'goal_id' => $tracked->id,
            'amount' => 75,
            'date' => now()->toDateString(),
        ]);
        $tracked->update(['saved' => 75]);

        $legacy = $user->goals()->create([
            'name' => 'Legacy progress',
            'target' => 2000,
            'saved' => 350.25,
            'deadline' => now()->addYear()->toDateString(),
            'color' => '#16a34a',
        ]);
        $zero = $user->goals()->create([
            'name' => 'Empty',
            'target' => 500,
            'saved' => 0,
            'deadline' => now()->addYear()->toDateString(),
            'color' => '#16a34a',
        ]);

        $service = app(GoalContributionService::class);
        $service->backfillFromExistingSaved();
        $service->backfillFromExistingSaved();

        $this->assertSame(350.25, (float) $legacy->refresh()->saved);
        $this->assertSame(75.0, (float) $tracked->refresh()->saved);
        $this->assertSame(0.0, (float) $zero->refresh()->saved);
        $this->assertSame(1, $legacy->contributions()->count());
        $this->assertSame(1, $tracked->contributions()->count());
        $this->assertSame(0, $zero->contributions()->count());
        $this->assertSame(350.25, (float) $legacy->contributions()->first()->amount);
        $this->assertSame($legacy->created_at->toDateString(), $legacy->contributions()->first()->date->toDateString());
    }

    public function test_deleting_a_goal_cascades_contributions(): void
    {
        $user = $this->goalUser();
        Sanctum::actingAs($user);
        $goal = $this->postJson('/api/goals', $this->goalPayload(['saved' => 80]))
            ->assertCreated()
            ->json();

        $this->deleteJson('/api/goals/'.$goal['id'])->assertNoContent();
        $this->assertDatabaseMissing('goals', ['id' => $goal['id']]);
        $this->assertDatabaseCount('goal_contributions', 0);
    }

    private function goalUser(): User
    {
        $user = User::factory()->create();
        $user->preferences()->create(['currency' => 'USD']);

        return $user;
    }

    /**
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    private function goalPayload(array $overrides = []): array
    {
        return [
            ...[
                'name' => 'Emergency fund',
                'target' => 3000,
                'saved' => 0,
                'deadline' => now()->addYear()->toDateString(),
                'color' => '#123456',
            ],
            ...$overrides,
        ];
    }
}
