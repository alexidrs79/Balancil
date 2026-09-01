<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class TransferTest extends TestCase
{
    use RefreshDatabase;

    public function test_completed_transfer_moves_balance_and_is_not_income_or_expense(): void
    {
        [$user, $from, $to] = $this->transferUser();
        Sanctum::actingAs($user);

        $transfer = $this->postJson('/api/transfers', $this->payload($from, $to, [
            'amount' => 150.25,
            'status' => 'completed',
            'description' => 'Move to savings',
        ]))->assertCreated()
            ->assertJsonPath('fromAccountId', $from->id)
            ->assertJsonPath('toAccountId', $to->id)
            ->assertJsonPath('amount', 150.25)
            ->assertJsonPath('status', 'completed')
            ->assertJsonPath('description', 'Move to savings')
            ->json();

        $this->assertSame(849.75, (float) $from->refresh()->balance);
        $this->assertSame(650.25, (float) $to->refresh()->balance);
        $this->assertDatabaseHas('account_transfers', ['id' => $transfer['id']]);
        $this->assertSame(0, $user->transactions()->count());

        $this->getJson('/api/transfers')->assertOk()->assertJsonCount(1);
        $this->getJson('/api/analytics')
            ->assertOk()
            ->assertJsonPath('summary.income', 0)
            ->assertJsonPath('summary.expenses', 0)
            ->assertJsonPath('summary.savings', 0);
        $this->getJson('/api/dashboard')
            ->assertOk()
            ->assertJsonPath('summary.income', 0)
            ->assertJsonPath('summary.expenses', 0);
    }

    public function test_pending_and_failed_transfers_do_not_change_balances(): void
    {
        [$user, $from, $to] = $this->transferUser();
        Sanctum::actingAs($user);

        $this->postJson('/api/transfers', $this->payload($from, $to, [
            'amount' => 80,
            'status' => 'pending',
        ]))->assertCreated();
        $this->assertSame(1000.0, (float) $from->refresh()->balance);
        $this->assertSame(500.0, (float) $to->refresh()->balance);

        $this->postJson('/api/transfers', $this->payload($from, $to, [
            'amount' => 40,
            'status' => 'failed',
        ]))->assertCreated();
        $this->assertSame(1000.0, (float) $from->refresh()->balance);
        $this->assertSame(500.0, (float) $to->refresh()->balance);
    }

    public function test_updating_a_transfer_reverses_then_reapplies_completed_balances(): void
    {
        [$user, $from, $to] = $this->transferUser();
        $other = $this->createAccount($user, ['name' => 'Cash', 'type' => 'cash', 'balance' => 200]);
        Sanctum::actingAs($user);

        $transfer = $this->postJson('/api/transfers', $this->payload($from, $to, [
            'amount' => 100,
            'status' => 'completed',
        ]))->assertCreated()->json();
        $this->assertSame(900.0, (float) $from->refresh()->balance);
        $this->assertSame(600.0, (float) $to->refresh()->balance);

        $this->putJson('/api/transfers/'.$transfer['id'], $this->payload($from, $to, [
            'amount' => 40,
            'status' => 'pending',
        ]))->assertOk()->assertJsonPath('status', 'pending');
        $this->assertSame(1000.0, (float) $from->refresh()->balance);
        $this->assertSame(500.0, (float) $to->refresh()->balance);

        $this->putJson('/api/transfers/'.$transfer['id'], $this->payload($from, $other, [
            'amount' => 75,
            'status' => 'completed',
        ]))->assertOk();
        $this->assertSame(925.0, (float) $from->refresh()->balance);
        $this->assertSame(500.0, (float) $to->refresh()->balance);
        $this->assertSame(275.0, (float) $other->refresh()->balance);
    }

    public function test_deleting_a_completed_transfer_reverses_balances(): void
    {
        [$user, $from, $to] = $this->transferUser();
        Sanctum::actingAs($user);

        $completed = $this->postJson('/api/transfers', $this->payload($from, $to, [
            'amount' => 120,
            'status' => 'completed',
        ]))->assertCreated()->json();
        $pending = $this->postJson('/api/transfers', $this->payload($from, $to, [
            'amount' => 50,
            'status' => 'pending',
        ]))->assertCreated()->json();

        $this->deleteJson('/api/transfers/'.$completed['id'])->assertNoContent();
        $this->assertDatabaseMissing('account_transfers', ['id' => $completed['id']]);
        $this->assertSame(1000.0, (float) $from->refresh()->balance);
        $this->assertSame(500.0, (float) $to->refresh()->balance);

        $this->deleteJson('/api/transfers/'.$pending['id'])->assertNoContent();
        $this->assertSame(1000.0, (float) $from->refresh()->balance);
        $this->assertSame(500.0, (float) $to->refresh()->balance);
    }

    public function test_inactive_same_account_and_cross_user_accounts_are_rejected(): void
    {
        [$user, $from, $to] = $this->transferUser();
        $inactive = $this->createAccount($user, ['name' => 'Closed', 'is_active' => false]);
        [$otherUser, $otherFrom, $otherTo] = $this->transferUser();
        Sanctum::actingAs($user);

        $this->postJson('/api/transfers', $this->payload($from, $from, ['amount' => 10]))
            ->assertUnprocessable()
            ->assertJsonValidationErrors('toAccountId');

        $this->postJson('/api/transfers', $this->payload($from, $inactive, ['amount' => 10]))
            ->assertUnprocessable()
            ->assertJsonValidationErrors('toAccountId');

        $this->postJson('/api/transfers', $this->payload($inactive, $to, ['amount' => 10]))
            ->assertUnprocessable()
            ->assertJsonValidationErrors('fromAccountId');

        $this->postJson('/api/transfers', $this->payload($from, $otherTo, ['amount' => 10]))
            ->assertUnprocessable()
            ->assertJsonValidationErrors('toAccountId');

        $this->postJson('/api/transfers', $this->payload($otherFrom, $to, ['amount' => 10]))
            ->assertUnprocessable()
            ->assertJsonValidationErrors('fromAccountId');

        $this->postJson('/api/transfers', $this->payload($from, $to, ['amount' => 0]))
            ->assertUnprocessable()
            ->assertJsonValidationErrors('amount');

        $this->assertSame(1000.0, (float) $from->refresh()->balance);
        $this->assertSame(500.0, (float) $to->refresh()->balance);
        $this->assertSame(1000.0, (float) $otherFrom->refresh()->balance);
        $this->assertSame(500.0, (float) $otherTo->refresh()->balance);
        $this->assertSame(0, $otherUser->transfers()->count());
    }

    public function test_transfers_are_isolated_between_users(): void
    {
        [$owner, $from, $to] = $this->transferUser();
        Sanctum::actingAs($owner);
        $transfer = $this->postJson('/api/transfers', $this->payload($from, $to, [
            'amount' => 25,
            'status' => 'completed',
        ]))->assertCreated()->json();

        $stranger = User::factory()->create();
        Sanctum::actingAs($stranger);

        $this->getJson('/api/transfers')->assertOk()->assertJsonCount(0);
        $this->putJson('/api/transfers/'.$transfer['id'], $this->payload($from, $to, [
            'amount' => 1,
            'status' => 'completed',
        ]))->assertNotFound();
        $this->deleteJson('/api/transfers/'.$transfer['id'])->assertNotFound();

        $this->assertSame(975.0, (float) $from->refresh()->balance);
        $this->assertSame(525.0, (float) $to->refresh()->balance);
        $this->assertDatabaseHas('account_transfers', ['id' => $transfer['id'], 'user_id' => $owner->id]);
    }

    /**
     * @return array{0: User, 1: Account, 2: Account}
     */
    private function transferUser(): array
    {
        $user = User::factory()->create();
        $user->preferences()->create(['currency' => 'USD']);

        return [
            $user,
            $this->createAccount($user, ['name' => 'Checking', 'balance' => 1000]),
            $this->createAccount($user, ['name' => 'Savings', 'type' => 'savings', 'balance' => 500]),
        ];
    }

    private function createAccount(User $user, array $overrides = []): Account
    {
        return $user->accounts()->create([
            ...[
                'name' => 'Checking',
                'type' => 'checking',
                'balance' => 1000,
                'institution' => 'Bank',
                'color' => '#000000',
                'is_active' => true,
            ],
            ...$overrides,
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function payload(Account $from, Account $to, array $overrides = []): array
    {
        return [
            ...[
                'fromAccountId' => $from->id,
                'toAccountId' => $to->id,
                'amount' => 50,
                'date' => now()->toDateString(),
                'description' => '',
                'status' => 'completed',
            ],
            ...$overrides,
        ];
    }
}
