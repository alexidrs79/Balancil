<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class FinanceCrudTest extends TestCase
{
    use RefreshDatabase;

    public function test_finance_crud_and_completed_balance_adjustments(): void
    {
        [$user, $account, $expense] = $this->financeUser();
        Sanctum::actingAs($user);

        $this->getJson('/api/accounts')->assertOk()->assertJsonCount(1);
        $transaction = $this->postJson('/api/transactions', [
            'merchant' => 'Market', 'description' => 'Groceries', 'amount' => 25.50,
            'type' => 'expense', 'categoryId' => $expense->id, 'accountId' => $account->id,
            'date' => now()->toDateString(), 'status' => 'completed',
        ])->assertCreated()->json();
        $this->assertSame(974.50, (float) $account->refresh()->balance);

        $this->putJson('/api/transactions/'.$transaction['id'], [
            'merchant' => 'Market', 'description' => 'Groceries', 'amount' => 30,
            'type' => 'expense', 'categoryId' => $expense->id, 'accountId' => $account->id,
            'date' => now()->toDateString(), 'status' => 'pending',
        ])->assertOk();
        $this->assertSame(1000.0, (float) $account->refresh()->balance);
        $this->getJson('/api/analytics')
            ->assertOk()
            ->assertJsonPath('summary.expenses', 0);

        $this->deleteJson('/api/transactions/'.$transaction['id'])->assertNoContent();
        $budget = $this->postJson('/api/budgets', [
            'categoryId' => $expense->id, 'limit' => 500, 'period' => 'monthly',
        ])->assertCreated()->json();
        $this->assertSame(0, $budget['spent']);
        $this->deleteJson('/api/budgets/'.$budget['id'])->assertNoContent();

        $goal = $this->postJson('/api/goals', [
            'name' => 'Trip', 'target' => 2000, 'saved' => 100, 'deadline' => now()->addMonth()->toDateString(),
            'color' => '#123456',
        ])->assertCreated()->json();
        $this->deleteJson('/api/goals/'.$goal['id'])->assertNoContent();
    }

    public function test_category_type_validation_and_cross_user_binding_return_404(): void
    {
        [$owner, $account, $expense] = $this->financeUser();
        [$other] = $this->financeUser();
        Sanctum::actingAs($other);

        $this->putJson('/api/accounts/'.$account->id, [
            'name' => 'Hack', 'type' => 'cash', 'balance' => 0,
            'institution' => 'X', 'color' => '#000000',
        ])->assertNotFound();

        Sanctum::actingAs($owner);
        $this->postJson('/api/transactions', [
            'merchant' => 'Mismatch', 'amount' => 10, 'type' => 'income',
            'categoryId' => $expense->id, 'accountId' => $account->id,
            'date' => now()->toDateString(), 'status' => 'completed',
        ])->assertUnprocessable()->assertJsonValidationErrors('categoryId');
    }

    private function financeUser(): array
    {
        $user = User::factory()->create();
        $account = $user->accounts()->create([
            'name' => 'Checking', 'type' => 'checking', 'balance' => 1000,
            'institution' => 'Bank', 'color' => '#000000',
        ]);
        $expense = $user->categories()->create([
            'name' => 'Food', 'type' => 'expense', 'color' => '#000000', 'icon' => 'food',
        ]);

        return [$user, $account, $expense];
    }
}
