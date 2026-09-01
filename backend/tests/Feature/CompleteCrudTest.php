<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\Category;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CompleteCrudTest extends TestCase
{
    use RefreshDatabase;

    public function test_account_metadata_can_be_updated_but_transaction_balance_cannot_be_overwritten(): void
    {
        [$user, $account, $category] = $this->financeUser();
        $this->createTransaction($user, $account, $category);
        Sanctum::actingAs($user);

        $payload = $this->accountPayload($account, [
            'name' => 'Primary checking',
            'institution' => 'New Bank',
        ]);
        unset($payload['balance']);

        $this->putJson('/api/accounts/'.$account->id, $payload)
            ->assertOk()
            ->assertJsonPath('name', 'Primary checking')
            ->assertJsonPath('institution', 'New Bank');

        $this->putJson('/api/accounts/'.$account->id, [
            ...$payload,
            'balance' => 9999,
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('balance')
            ->assertJsonPath(
                'errors.balance.0',
                'The balance cannot be changed after transactions have been recorded.'
            );

        $this->assertSame(975.0, (float) $account->refresh()->balance);
    }

    public function test_account_delete_is_blocked_when_used_and_allowed_when_unused(): void
    {
        [$user, $account, $category] = $this->financeUser();
        $this->createTransaction($user, $account, $category);
        $unused = $this->createAccount($user, ['name' => 'Unused']);
        Sanctum::actingAs($user);

        $this->deleteJson('/api/accounts/'.$account->id)
            ->assertConflict()
            ->assertJsonPath('message', 'Accounts with transactions cannot be deleted.');

        $this->deleteJson('/api/accounts/'.$unused->id)->assertNoContent();
        $this->assertDatabaseMissing('accounts', ['id' => $unused->id]);
    }

    public function test_accounts_report_the_opening_balance_behind_the_current_one(): void
    {
        [$user, $account, $category] = $this->financeUser();
        $savings = $this->createAccount($user, ['name' => 'Savings', 'balance' => 100]);
        $income = $this->createCategory($user, ['name' => 'Salary', 'type' => 'income']);
        $this->createTransaction($user, $account, $category, [
            'amount' => 700,
            'type' => 'expense',
        ]);
        $this->createTransaction($user, $savings, $income, [
            'merchant' => 'Devotel',
            'amount' => 1000,
            'type' => 'income',
        ]);
        Sanctum::actingAs($user);

        $accounts = collect($this->getJson('/api/accounts')->assertOk()->json())
            ->keyBy('name');

        $this->assertSame(300.0, (float) $accounts['Checking']['balance']);
        $this->assertSame(1000.0, (float) $accounts['Checking']['openingBalance']);
        $this->assertSame(-700.0, (float) $accounts['Checking']['netActivity']);

        $this->assertSame(1100.0, (float) $accounts['Savings']['balance']);
        $this->assertSame(100.0, (float) $accounts['Savings']['openingBalance']);
        $this->assertSame(1000.0, (float) $accounts['Savings']['netActivity']);
    }

    public function test_pending_transactions_and_transfers_are_excluded_from_reported_activity(): void
    {
        [$user, $account, $category] = $this->financeUser();
        $destination = $this->createAccount($user, ['name' => 'Savings', 'balance' => 0]);
        $this->createTransaction($user, $account, $category, [
            'amount' => 500,
            'status' => 'pending',
        ]);
        $user->transfers()->create([
            'from_account_id' => $account->id,
            'to_account_id' => $destination->id,
            'amount' => 250,
            'date' => '2026-09-01',
            'description' => 'Move savings',
            'status' => 'completed',
        ]);
        $account->decrement('balance', 250);
        $destination->increment('balance', 250);
        Sanctum::actingAs($user);

        $accounts = collect($this->getJson('/api/accounts')->assertOk()->json())
            ->keyBy('name');

        $this->assertSame(-250.0, (float) $accounts['Checking']['netActivity']);
        $this->assertSame(1000.0, (float) $accounts['Checking']['openingBalance']);
        $this->assertSame(250.0, (float) $accounts['Savings']['netActivity']);
        $this->assertSame(0.0, (float) $accounts['Savings']['openingBalance']);
    }

    public function test_recurring_schedule_references_block_account_and_category_deletion(): void
    {
        [$user, $account, $category] = $this->financeUser();
        $user->recurringTransactions()->create([
            'account_id' => $account->id,
            'category_id' => $category->id,
            'merchant' => 'Rent',
            'description' => 'Monthly rent',
            'amount' => 500,
            'type' => 'expense',
            'frequency' => 'monthly',
            'interval' => 1,
            'start_date' => '2026-09-01',
            'next_due_date' => '2026-09-01',
            'is_active' => true,
        ]);
        Sanctum::actingAs($user);

        $this->putJson('/api/categories/'.$category->id, [
            'name' => $category->name,
            'type' => 'income',
            'color' => $category->color,
            'icon' => $category->icon,
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('type');
        $this->deleteJson('/api/accounts/'.$account->id)
            ->assertConflict()
            ->assertJsonPath(
                'message',
                'Accounts used by recurring schedules cannot be deleted.'
            );
        $this->deleteJson('/api/categories/'.$category->id)
            ->assertConflict()
            ->assertJsonPath(
                'message',
                'Categories used by recurring schedules cannot be deleted.'
            );
    }

    public function test_new_transactions_reject_inactive_accounts(): void
    {
        [$user, $account, $category] = $this->financeUser();
        $account->update(['is_active' => false]);
        Sanctum::actingAs($user);

        $this->postJson('/api/transactions', [
            'merchant' => 'Market',
            'description' => 'Groceries',
            'amount' => 25,
            'type' => 'expense',
            'categoryId' => $category->id,
            'accountId' => $account->id,
            'date' => '2026-09-01',
            'status' => 'completed',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('accountId');

        $this->assertDatabaseCount('transactions', 0);
        $this->assertSame(1000.0, (float) $account->refresh()->balance);
    }

    public function test_category_crud_is_user_scoped_and_has_clear_uniqueness_validation(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $category = $this->postJson('/api/categories', [
            'name' => 'Freelance',
            'type' => 'income',
            'color' => '#112233',
            'icon' => 'briefcase',
        ])->assertCreated()
            ->assertJsonPath('name', 'Freelance')
            ->json();

        $this->getJson('/api/categories')
            ->assertOk()
            ->assertJsonCount(1);

        $this->putJson('/api/categories/'.$category['id'], [
            'name' => 'Consulting',
            'type' => 'expense',
            'color' => '#445566',
            'icon' => 'building',
        ])->assertOk()
            ->assertJsonPath('name', 'Consulting')
            ->assertJsonPath('type', 'expense');

        $this->postJson('/api/categories', [
            'name' => 'Consulting',
            'type' => 'expense',
            'color' => '#000000',
            'icon' => 'circle',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('name')
            ->assertJsonPath('errors.name.0', 'A category with this name and type already exists.');

        $other = User::factory()->create();
        Sanctum::actingAs($other);
        $this->putJson('/api/categories/'.$category['id'], [
            'name' => 'Taken',
            'type' => 'income',
            'color' => '#000000',
            'icon' => 'circle',
        ])->assertNotFound();
        $this->deleteJson('/api/categories/'.$category['id'])->assertNotFound();

        Sanctum::actingAs($user);
        $this->deleteJson('/api/categories/'.$category['id'])->assertNoContent();
    }

    public function test_categories_in_use_cannot_change_type_or_be_deleted(): void
    {
        [$user, $account, $transactionCategory] = $this->financeUser();
        $this->createTransaction($user, $account, $transactionCategory);
        $budgetCategory = $this->createCategory($user, ['name' => 'Housing']);
        $user->budgets()->create([
            'category_id' => $budgetCategory->id,
            'limit' => 1200,
            'period' => 'monthly',
        ]);
        Sanctum::actingAs($user);

        $this->putJson('/api/categories/'.$transactionCategory->id, [
            'name' => $transactionCategory->name,
            'type' => 'income',
            'color' => $transactionCategory->color,
            'icon' => $transactionCategory->icon,
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('type')
            ->assertJsonPath(
                'errors.type.0',
                'The category type cannot be changed while the category is in use.'
            );

        $this->deleteJson('/api/categories/'.$transactionCategory->id)
            ->assertConflict()
            ->assertJsonPath('message', 'Categories used by transactions or budgets cannot be deleted.');
        $this->deleteJson('/api/categories/'.$budgetCategory->id)
            ->assertConflict()
            ->assertJsonPath('message', 'Categories used by transactions or budgets cannot be deleted.');
    }

    public function test_budget_and_goal_update_routes_validate_frontend_edit_payloads(): void
    {
        [$user, $account, $category] = $this->financeUser();
        $secondCategory = $this->createCategory($user, ['name' => 'Travel']);
        $budget = $user->budgets()->create([
            'category_id' => $category->id,
            'limit' => 500,
            'period' => 'monthly',
        ]);
        $user->budgets()->create([
            'category_id' => $secondCategory->id,
            'limit' => 300,
            'period' => 'monthly',
        ]);
        $goal = $user->goals()->create([
            'name' => 'Emergency fund',
            'target' => 5000,
            'saved' => 500,
            'deadline' => now()->addYear()->toDateString(),
            'color' => '#123456',
        ]);
        Sanctum::actingAs($user);

        $this->putJson('/api/budgets/'.$budget->id, [
            'categoryId' => $category->id,
            'limit' => 750,
            'period' => 'yearly',
        ])->assertOk()
            ->assertJsonPath('limit', 750)
            ->assertJsonPath('period', 'yearly');

        $this->putJson('/api/budgets/'.$budget->id, [
            'categoryId' => $secondCategory->id,
            'limit' => 750,
            'period' => 'monthly',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('categoryId')
            ->assertJsonPath(
                'errors.categoryId.0',
                'A budget already exists for this category and period.'
            );

        $this->putJson('/api/goals/'.$goal->id, [
            'name' => 'Larger emergency fund',
            'target' => 7500,
            'saved' => 1250,
            'deadline' => now()->addMonths(18)->toDateString(),
            'color' => '#654321',
        ])->assertOk()
            ->assertJsonPath('name', 'Larger emergency fund')
            ->assertJsonPath('target', 7500)
            ->assertJsonPath('saved', 500);
    }

    private function financeUser(): array
    {
        $user = User::factory()->create();

        return [
            $user,
            $this->createAccount($user),
            $this->createCategory($user),
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
            ],
            ...$overrides,
        ]);
    }

    private function createCategory(User $user, array $overrides = []): Category
    {
        return $user->categories()->create([
            ...[
                'name' => 'Food',
                'type' => 'expense',
                'color' => '#000000',
                'icon' => 'food',
            ],
            ...$overrides,
        ]);
    }

    private function createTransaction(
        User $user,
        Account $account,
        Category $category,
        array $overrides = []
    ): void {
        $transaction = $user->transactions()->create([
            ...[
                'account_id' => $account->id,
                'category_id' => $category->id,
                'merchant' => 'Market',
                'description' => 'Groceries',
                'amount' => 25,
                'type' => 'expense',
                'date' => now()->toDateString(),
                'status' => 'completed',
            ],
            ...$overrides,
        ]);

        if ($transaction->status === 'completed') {
            $account->increment(
                'balance',
                (float) $transaction->amount * ($transaction->type === 'income' ? 1 : -1)
            );
        }
    }

    private function accountPayload(Account $account, array $overrides = []): array
    {
        return [
            ...[
                'name' => $account->name,
                'type' => $account->type,
                'balance' => (float) $account->balance,
                'institution' => $account->institution,
                'color' => $account->color,
                'isActive' => (bool) ($account->is_active ?? true),
            ],
            ...$overrides,
        ];
    }
}
