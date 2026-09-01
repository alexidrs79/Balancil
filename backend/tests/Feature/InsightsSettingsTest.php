<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\TransactionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class InsightsSettingsTest extends TestCase
{
    use RefreshDatabase;

    public function test_dashboard_summary_covers_only_the_current_month(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);
        $account = $user->accounts()->create([
            'name' => 'Cash', 'type' => 'cash', 'balance' => 100,
            'institution' => 'Wallet', 'color' => '#111111',
        ]);
        $salary = $user->categories()->create(['name' => 'Salary', 'type' => 'income', 'color' => '#0f0', 'icon' => 'money']);
        $service = app(TransactionService::class);
        // Last day of the previous month, so the entry always lands one month back.
        $lastMonth = now()->startOfMonth()->subDay();
        $service->create($user, [
            'merchant' => 'Salary', 'amount' => 5000, 'type' => 'income',
            'categoryId' => $salary->id, 'accountId' => $account->id,
            'date' => $lastMonth->toDateString(), 'status' => 'completed',
        ]);

        $response = $this->getJson('/api/dashboard')->assertOk();

        // The hero cards say "this month", so last month's salary must not be counted.
        $response->assertJsonPath('summary.income', 0)
            ->assertJsonPath('summary.savings', 0);

        // The trend chart still has to show it in its own month.
        $trend = collect($response->json('monthlyTrend'))
            ->firstWhere('period', $lastMonth->format('Y-m'));
        $this->assertSame(5000.0, (float) $trend['income']);
    }

    public function test_dashboard_analytics_and_real_settings_use_owned_data(): void
    {
        $user = User::factory()->create(['password' => 'old-password']);
        Sanctum::actingAs($user);
        $user->preferences()->create(['currency' => 'USD']);
        $account = $user->accounts()->create([
            'name' => 'Cash', 'type' => 'cash', 'balance' => 100,
            'institution' => 'Wallet', 'color' => '#111111',
        ]);
        $income = $user->categories()->create(['name' => 'Salary', 'type' => 'income', 'color' => '#0f0', 'icon' => 'money']);
        $expense = $user->categories()->create(['name' => 'Food', 'type' => 'expense', 'color' => '#f00', 'icon' => 'food']);
        $service = app(TransactionService::class);
        foreach ([[$income, 'income', 1000], [$expense, 'expense', 250]] as [$category, $type, $amount]) {
            $service->create($user, [
                'merchant' => $category->name, 'amount' => $amount, 'type' => $type,
                'categoryId' => $category->id, 'accountId' => $account->id,
                'date' => now()->toDateString(), 'status' => 'completed',
            ]);
        }

        $this->getJson('/api/dashboard')->assertOk()
            ->assertJsonPath('summary.income', 1000)
            ->assertJsonPath('summary.expenses', 250)
            ->assertJsonPath('categorySpending.0.amount', 250);
        $this->getJson('/api/analytics?months=6')->assertOk()
            ->assertJsonPath('summary.savings', 750)
            ->assertJsonPath('savingsRate', 75)
            ->assertJsonPath('range.to', now()->endOfMonth()->toDateString())
            ->assertJsonCount(6, 'monthlyTrend');

        $pastDate = now()->subMonth()->toDateString();
        $service->create($user, [
            'merchant' => 'Past meal', 'amount' => 80, 'type' => 'expense',
            'categoryId' => $expense->id, 'accountId' => $account->id,
            'date' => $pastDate, 'status' => 'completed',
        ]);
        $this->getJson("/api/analytics?from={$pastDate}&to={$pastDate}")->assertOk()
            ->assertJsonPath('summary.income', 0)
            ->assertJsonPath('summary.expenses', 80)
            ->assertJsonPath('range.from', $pastDate)
            ->assertJsonPath('range.to', $pastDate)
            ->assertJsonCount(1, 'monthlyTrend');
        $tooEarly = now()->subMonths(25)->toDateString();
        $today = now()->toDateString();
        $this->getJson("/api/analytics?from={$tooEarly}&to={$today}")
            ->assertUnprocessable()
            ->assertJsonValidationErrors('to');
        $this->putJson('/api/settings/preferences', [
            'currency' => 'eur',
        ])->assertOk()->assertJsonPath('user.currency', 'EUR');
        $this->putJson('/api/settings/password', [
            'currentPassword' => 'old-password', 'password' => 'new-password',
            'password_confirmation' => 'new-password',
        ])->assertOk();
        $this->getJson('/api/notifications')->assertNotFound();
    }
}
