<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\User;
use App\Services\TransactionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class LedgerReconcileTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_healthy_ledger_reports_no_drift(): void
    {
        $this->seedAccountWithActivity();

        $this->artisan('ledger:reconcile')
            ->expectsOutputToContain('All account balances match their ledgers.')
            ->assertSuccessful();
    }

    public function test_drift_is_reported_and_fails_until_it_is_fixed(): void
    {
        ['account' => $account] = $this->seedAccountWithActivity();
        $this->corrupt($account, 75.00);

        // A bare run is a check: it reports and fails, but changes nothing.
        $this->artisan('ledger:reconcile')->assertFailed();
        $this->assertEqualsWithDelta(
            975.00,
            (float) $this->reread($account)->balance,
            0.001,
        );

        $this->artisan('ledger:reconcile --fix')
            ->expectsOutputToContain('Rewrote 1 account balance(s) from the ledger.')
            ->assertSuccessful();

        $this->assertEqualsWithDelta(900.00, (float) $this->reread($account)->balance, 0.001);
        $this->artisan('ledger:reconcile')->assertSuccessful();
    }

    public function test_reconciliation_spans_every_user(): void
    {
        ['account' => $first] = $this->seedAccountWithActivity();
        ['account' => $second] = $this->seedAccountWithActivity();
        $this->corrupt($second, -20.00);

        // The command runs unauthenticated, so it must opt out of the owner scope
        // to see anyone's accounts at all.
        $this->artisan('ledger:reconcile --fix')->assertSuccessful();

        $this->assertEqualsWithDelta(900.00, (float) $this->reread($first)->balance, 0.001);
        $this->assertEqualsWithDelta(900.00, (float) $this->reread($second)->balance, 0.001);
    }

    public function test_the_opening_balance_is_recorded_independently_of_the_current_one(): void
    {
        ['account' => $account] = $this->seedAccountWithActivity();

        $stored = $this->reread($account);
        // The opening figure stays put while activity moves the balance, which is what
        // makes drift detectable at all.
        $this->assertEqualsWithDelta(1000.00, (float) $stored->opening_balance, 0.001);
        $this->assertEqualsWithDelta(900.00, (float) $stored->balance, 0.001);
    }

    public function test_ledger_activity_sums_are_visible_to_unauthenticated_callers(): void
    {
        ['account' => $account] = $this->seedAccountWithActivity();

        // Reproduces a real break: the owner scope is fail-closed, so without the
        // subqueries opting out these sums came back empty for console code and
        // ledger:reconcile would have "corrected" every balance to its opening figure.
        auth()->forgetGuards();
        $this->assertFalse(auth()->check(), 'The scope only fails closed when nobody is authenticated.');

        $loaded = Account::query()
            ->withoutGlobalScope('owned')
            ->withLedgerActivity()
            ->findOrFail($account->id);

        $this->assertEqualsWithDelta(-100.00, $loaded->net_activity, 0.001);
        $this->assertEqualsWithDelta(900.00, $loaded->expected_balance, 0.001);
    }

    /**
     * An account opened at 1000 with a single completed 100 expense, so the ledger
     * says the balance must be 900.
     *
     * @return array{user: User, account: Account}
     */
    private function seedAccountWithActivity(): array
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);
        $account = $user->accounts()->create([
            'name' => 'Checking', 'type' => 'checking', 'balance' => 1000,
            'institution' => 'Bank', 'color' => '#111111',
        ]);
        $category = $user->categories()->create([
            'name' => 'Food', 'type' => 'expense', 'color' => '#f00', 'icon' => 'food',
        ]);
        app(TransactionService::class)->create($user, [
            'merchant' => 'Market', 'description' => 'Groceries', 'amount' => 100,
            'type' => 'expense', 'categoryId' => $category->id, 'accountId' => $account->id,
            'date' => now()->toDateString(), 'status' => 'completed',
        ]);

        return ['user' => $user, 'account' => $account];
    }

    /** Nudge a stored balance the way a crash mid-write or a manual edit would. */
    private function corrupt(Account $account, float $by): void
    {
        Account::query()->withoutGlobalScope('owned')
            ->whereKey($account->id)
            ->update(['balance' => $this->reread($account)->balance + $by]);
    }

    private function reread(Account $account): Account
    {
        return Account::query()->withoutGlobalScope('owned')->findOrFail($account->id);
    }
}
