<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\GoalContributionService;
use App\Services\TransactionService;
use App\Services\TransferService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class LedgerMathTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    public function test_fixture_ledger_totals_match_hand_computed_values(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-09-01 12:00:00', 'UTC'));

        $ledger = $this->seedLedger();
        Sanctum::actingAs($ledger['user']);

        $checking = $ledger['checking']->refresh();
        $savings = $ledger['savings']->refresh();
        $credit = $ledger['credit']->refresh();

        // Opening 10_000 + 5_200 − 1_650 − 146.30 − 40 (July) − 10 (week) − 500 transfer + 100.
        $this->assertEqualsWithDelta(12953.70, (float) $checking->balance, 0.001);
        $this->assertEqualsWithDelta(2500.00, (float) $savings->balance, 0.001);
        $this->assertEqualsWithDelta(-400.00, (float) $credit->balance, 0.001);

        $total = (float) $checking->balance + (float) $savings->balance + (float) $credit->balance;
        $this->assertEqualsWithDelta(15053.70, $total, 0.001);

        $dashboard = $this->getJson('/api/dashboard')->assertOk()->json();
        $this->assertEqualsWithDelta(100.0, $dashboard['summary']['income'], 0.001);
        $this->assertEqualsWithDelta(0.0, $dashboard['summary']['expenses'], 0.001);
        $this->assertEqualsWithDelta(100.0, $dashboard['summary']['savings'], 0.001);
        $this->assertSame([], $dashboard['categorySpending']);

        $byPeriod = collect($dashboard['monthlyTrend'])->keyBy('period');
        $this->assertEqualsWithDelta(0.0, $byPeriod['2026-04']['income'], 0.001);
        $this->assertEqualsWithDelta(40.0, $byPeriod['2026-07']['expenses'], 0.001);
        $this->assertEqualsWithDelta(5200.0, $byPeriod['2026-08']['income'], 0.001);
        $this->assertEqualsWithDelta(1806.3, $byPeriod['2026-08']['expenses'], 0.001);
        $this->assertEqualsWithDelta(3393.7, $byPeriod['2026-08']['savings'], 0.001);
        $this->assertEqualsWithDelta(100.0, $byPeriod['2026-09']['income'], 0.001);
        $this->assertEqualsWithDelta(0.0, $byPeriod['2026-09']['expenses'], 0.001);

        $analytics = $this->getJson('/api/analytics?months=6')->assertOk()->json();
        $this->assertSame('2026-04-01', $analytics['range']['from']);
        $this->assertSame('2026-09-30', $analytics['range']['to']);
        $this->assertEqualsWithDelta(5300.0, $analytics['summary']['income'], 0.001);
        $this->assertEqualsWithDelta(1846.3, $analytics['summary']['expenses'], 0.001);
        $this->assertEqualsWithDelta(3453.7, $analytics['summary']['savings'], 0.001);
        $this->assertSame(65.2, $analytics['savingsRate']);

        $august = $this->getJson('/api/analytics?from=2026-08-01&to=2026-08-31')->assertOk()->json();
        $this->assertCount(1, $august['monthlyTrend']);
        $this->assertEqualsWithDelta(5200.0, $august['summary']['income'], 0.001);
        $this->assertEqualsWithDelta(1806.3, $august['summary']['expenses'], 0.001);

        $budgets = collect($this->getJson('/api/budgets')->assertOk()->json())->keyBy('period');
        $this->assertEqualsWithDelta(0.0, $budgets['monthly']['spent'], 0.001);
        $this->assertEqualsWithDelta(10.0, $budgets['weekly']['spent'], 0.001);
        $this->assertEqualsWithDelta(196.3, $budgets['yearly']['spent'], 0.001);

        $goal = $this->getJson('/api/goals')->assertOk()->json()[0];
        $this->assertEqualsWithDelta(250.0, $goal['saved'], 0.001);
        $contributions = $this->getJson('/api/goals/'.$goal['id'].'/contributions')->assertOk()->json();
        $this->assertEqualsWithDelta(250.0, collect($contributions)->sum('amount'), 0.001);
        $this->assertEqualsWithDelta(15053.70, $total, 0.001);
    }

    public function test_pending_failed_and_transfers_stay_out_of_income_and_spend(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-09-01 12:00:00', 'UTC'));
        $ledger = $this->seedLedger();
        Sanctum::actingAs($ledger['user']);

        $this->getJson('/api/dashboard')
            ->assertOk()
            ->assertJsonPath('summary.expenses', 0);

        $this->getJson('/api/analytics?from=2026-08-01&to=2026-08-31')
            ->assertOk()
            ->assertJsonPath('summary.income', 5200)
            ->assertJsonPath('summary.expenses', 1806.3);
    }

    public function test_updating_a_transaction_date_and_account_rebuilds_balances(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-09-01 12:00:00', 'UTC'));
        $ledger = $this->seedLedger();
        Sanctum::actingAs($ledger['user']);

        $this->putJson('/api/transactions/'.$ledger['julyFood']['id'], [
            'merchant' => 'Market',
            'description' => 'Groceries',
            'amount' => 40,
            'type' => 'expense',
            'categoryId' => $ledger['food']->id,
            'accountId' => $ledger['savings']->id,
            'date' => '2026-09-02',
            'status' => 'completed',
        ])->assertOk();

        $this->assertEqualsWithDelta(12993.70, (float) $ledger['checking']->refresh()->balance, 0.001);
        $this->assertEqualsWithDelta(2460.00, (float) $ledger['savings']->refresh()->balance, 0.001);

        $dashboard = $this->getJson('/api/dashboard')->assertOk()->json();
        $this->assertEqualsWithDelta(40.0, $dashboard['summary']['expenses'], 0.001);
        $byPeriod = collect($dashboard['monthlyTrend'])->keyBy('period');
        $this->assertEqualsWithDelta(0.0, $byPeriod['2026-07']['expenses'], 0.001);
        $this->assertEqualsWithDelta(40.0, $byPeriod['2026-09']['expenses'], 0.001);
    }

    public function test_current_month_uses_the_users_timezone(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-09-01 01:00:00', 'UTC'));
        $user = User::factory()->create();
        Sanctum::actingAs($user);
        $user->preferences()->create([
            'currency' => 'USD',
            'locale' => 'en-US',
            'timezone' => 'America/Los_Angeles',
            'week_start' => 'sun',
        ]);
        $account = $user->accounts()->create([
            'name' => 'Checking', 'type' => 'checking', 'balance' => 0,
            'institution' => 'Bank', 'color' => '#123d34',
        ]);
        $income = $user->categories()->create([
            'name' => 'Salary', 'type' => 'income', 'color' => '#0f0', 'icon' => 'money',
        ]);
        $transactions = app(TransactionService::class);
        foreach ([['2026-08-31', 80], ['2026-09-01', 90]] as [$date, $amount]) {
            $transactions->create($user, [
                'merchant' => 'Work', 'description' => '', 'amount' => $amount,
                'type' => 'income', 'categoryId' => $income->id, 'accountId' => $account->id,
                'date' => $date, 'status' => 'completed',
            ]);
        }

        $this->getJson('/api/dashboard')
            ->assertOk()
            ->assertJsonPath('summary.income', 80);
        $this->getJson('/api/analytics?months=1')
            ->assertOk()
            ->assertJsonPath('range.from', '2026-08-01')
            ->assertJsonPath('range.to', '2026-08-31')
            ->assertJsonPath('summary.income', 80);
    }

    public function test_weekly_budget_respects_the_users_week_start(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-09-02 12:00:00', 'UTC'));
        $user = User::factory()->create();
        Sanctum::actingAs($user);
        $user->preferences()->create([
            'currency' => 'USD',
            'locale' => 'en-US',
            'timezone' => 'UTC',
            'week_start' => 'sun',
        ]);
        $account = $user->accounts()->create([
            'name' => 'Checking', 'type' => 'checking', 'balance' => 100,
            'institution' => 'Bank', 'color' => '#123d34',
        ]);
        $food = $user->categories()->create([
            'name' => 'Food', 'type' => 'expense', 'color' => '#f00', 'icon' => 'food',
        ]);
        $user->budgets()->create(['category_id' => $food->id, 'limit' => 100, 'period' => 'weekly']);
        $transactions = app(TransactionService::class);
        foreach ([['2026-08-29', 11], ['2026-08-30', 13]] as [$date, $amount]) {
            $transactions->create($user, [
                'merchant' => 'Market', 'description' => '', 'amount' => $amount,
                'type' => 'expense', 'categoryId' => $food->id, 'accountId' => $account->id,
                'date' => $date, 'status' => 'completed',
            ]);
        }

        $this->getJson('/api/budgets')
            ->assertOk()
            ->assertJsonPath('0.spent', 13);
    }

    /**
     * @return array<string, mixed>
     */
    private function seedLedger(): array
    {
        $user = User::factory()->create();
        // The fixtures below run through the finance services as this user.
        Sanctum::actingAs($user);
        $checking = $user->accounts()->create([
            'name' => 'Checking', 'type' => 'checking', 'balance' => 10000,
            'institution' => 'Bank', 'color' => '#123d34',
        ]);
        $savings = $user->accounts()->create([
            'name' => 'Savings', 'type' => 'savings', 'balance' => 2000,
            'institution' => 'Bank', 'color' => '#123d34',
        ]);
        $credit = $user->accounts()->create([
            'name' => 'Card', 'type' => 'credit', 'balance' => -400,
            'institution' => 'Bank', 'color' => '#123d34',
        ]);
        $salary = $user->categories()->create(['name' => 'Salary', 'type' => 'income', 'color' => '#0f0', 'icon' => 'money']);
        $rent = $user->categories()->create(['name' => 'Housing', 'type' => 'expense', 'color' => '#f00', 'icon' => 'home']);
        $food = $user->categories()->create(['name' => 'Food', 'type' => 'expense', 'color' => '#f00', 'icon' => 'food']);

        $transactions = app(TransactionService::class);
        $transfers = app(TransferService::class);
        $contributions = app(GoalContributionService::class);

        $transactions->create($user, [
            'merchant' => 'Acme', 'description' => 'Salary', 'amount' => 5200,
            'type' => 'income', 'categoryId' => $salary->id, 'accountId' => $checking->id,
            'date' => '2026-08-21', 'status' => 'completed',
        ]);
        $transactions->create($user, [
            'merchant' => 'Landlord', 'description' => 'Rent', 'amount' => 1650,
            'type' => 'expense', 'categoryId' => $rent->id, 'accountId' => $checking->id,
            'date' => '2026-08-29', 'status' => 'completed',
        ]);
        $transactions->create($user, [
            'merchant' => 'Market', 'description' => 'Groceries', 'amount' => 146.30,
            'type' => 'expense', 'categoryId' => $food->id, 'accountId' => $checking->id,
            'date' => '2026-08-27', 'status' => 'completed',
        ]);
        $julyFood = $transactions->create($user, [
            'merchant' => 'Market', 'description' => 'Groceries', 'amount' => 40,
            'type' => 'expense', 'categoryId' => $food->id, 'accountId' => $checking->id,
            'date' => '2026-07-02', 'status' => 'completed',
        ]);
        $transactions->create($user, [
            'merchant' => 'Market', 'description' => 'Pending shop', 'amount' => 80,
            'type' => 'expense', 'categoryId' => $food->id, 'accountId' => $checking->id,
            'date' => '2026-09-10', 'status' => 'pending',
        ]);
        $transactions->create($user, [
            'merchant' => 'Market', 'description' => 'Failed shop', 'amount' => 20,
            'type' => 'expense', 'categoryId' => $food->id, 'accountId' => $checking->id,
            'date' => '2026-09-01', 'status' => 'failed',
        ]);
        $transactions->create($user, [
            'merchant' => 'Acme', 'description' => 'Later salary', 'amount' => 100,
            'type' => 'income', 'categoryId' => $salary->id, 'accountId' => $checking->id,
            'date' => '2026-09-15', 'status' => 'completed',
        ]);
        $transactions->create($user, [
            'merchant' => 'Market', 'description' => 'Week groceries', 'amount' => 10,
            'type' => 'expense', 'categoryId' => $food->id, 'accountId' => $checking->id,
            'date' => '2026-08-31', 'status' => 'completed',
        ]);

        $transfers->create($user, [
            'fromAccountId' => $checking->id,
            'toAccountId' => $savings->id,
            'amount' => 500,
            'date' => '2026-08-25',
            'description' => 'Sweep',
            'status' => 'completed',
        ]);

        $user->budgets()->create(['category_id' => $food->id, 'limit' => 500, 'period' => 'monthly']);
        $user->budgets()->create(['category_id' => $food->id, 'limit' => 80, 'period' => 'weekly']);
        $user->budgets()->create(['category_id' => $food->id, 'limit' => 4000, 'period' => 'yearly']);

        $goal = $user->goals()->create([
            'name' => 'Buffer', 'target' => 1000, 'saved' => 0,
            'deadline' => '2026-12-01', 'color' => '#123d34',
        ]);
        $contributions->create($user, $goal, ['amount' => 200, 'date' => '2026-08-01']);
        $contributions->create($user, $goal, ['amount' => 50, 'date' => '2026-08-20']);

        return compact('user', 'checking', 'savings', 'credit', 'food', 'julyFood');
    }
}
