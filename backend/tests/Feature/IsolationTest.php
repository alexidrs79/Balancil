<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\Category;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class IsolationTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_user_cannot_read_or_mutate_another_users_records(): void
    {
        $owner = User::factory()->create();
        $owner->preferences()->create(['currency' => 'USD']);
        $account = $owner->accounts()->create([
            'name' => 'Checking', 'type' => 'checking', 'balance' => 400,
            'institution' => 'Bank', 'color' => '#111111',
        ]);
        $category = $owner->categories()->create([
            'name' => 'Food', 'type' => 'expense', 'color' => '#f00', 'icon' => 'food',
        ]);
        $transaction = $owner->transactions()->create([
            'account_id' => $account->id, 'category_id' => $category->id,
            'merchant' => 'Market', 'description' => 'Groceries', 'amount' => 20,
            'type' => 'expense', 'date' => now()->toDateString(), 'status' => 'completed',
        ]);
        $budget = $owner->budgets()->create([
            'category_id' => $category->id, 'limit' => 200, 'period' => 'monthly',
        ]);
        $goal = $owner->goals()->create([
            'name' => 'Reserve', 'target' => 1000, 'saved' => 100,
            'deadline' => now()->addYear()->toDateString(), 'color' => '#16a34a',
        ]);

        $stranger = User::factory()->create();
        $stranger->preferences()->create(['currency' => 'USD']);
        Sanctum::actingAs($stranger);

        $this->getJson('/api/accounts')->assertOk()->assertJsonCount(0);
        $this->getJson('/api/transactions')->assertOk()->assertJsonCount(0, 'data');
        $this->getJson('/api/budgets')->assertOk()->assertJsonCount(0);
        $this->getJson('/api/goals')->assertOk()->assertJsonCount(0);

        $this->putJson('/api/accounts/'.$account->id, [
            'name' => 'Taken', 'type' => 'checking', 'institution' => 'X', 'color' => '#000000',
        ])->assertNotFound();
        $this->deleteJson('/api/accounts/'.$account->id)->assertNotFound();
        $this->putJson('/api/transactions/'.$transaction->id, [
            'merchant' => 'Taken', 'description' => 'Nope', 'amount' => 1,
            'type' => 'expense', 'status' => 'completed',
            'categoryId' => $category->id, 'accountId' => $account->id,
            'date' => now()->toDateString(),
        ])->assertNotFound();
        $this->deleteJson('/api/transactions/'.$transaction->id)->assertNotFound();
        $this->putJson('/api/budgets/'.$budget->id, [
            'categoryId' => $category->id, 'limit' => 1, 'period' => 'monthly',
        ])->assertNotFound();
        $this->deleteJson('/api/budgets/'.$budget->id)->assertNotFound();
        $this->putJson('/api/goals/'.$goal->id, [
            'name' => 'Taken', 'target' => 10, 'saved' => 1,
            'deadline' => now()->addMonth()->toDateString(), 'color' => '#000000',
        ])->assertNotFound();
        $this->deleteJson('/api/goals/'.$goal->id)->assertNotFound();
    }

    /**
     * The owner scope is fail-closed: with no authenticated user a query returns
     * nothing rather than every user's rows. Console and queue code that legitimately
     * spans users must say so with withoutGlobalScope('owned').
     */
    public function test_owned_models_return_nothing_when_no_user_is_authenticated(): void
    {
        $alice = User::factory()->create();
        $bob = User::factory()->create();
        foreach ([$alice, $bob] as $user) {
            $user->accounts()->create([
                'name' => 'Checking', 'type' => 'checking', 'balance' => 100,
                'institution' => 'Bank', 'color' => '#111111',
            ]);
            $user->categories()->create([
                'name' => 'Food', 'type' => 'expense', 'color' => '#f00', 'icon' => 'food',
            ]);
        }

        // No Sanctum::actingAs here, standing in for a job or console command.
        $this->assertSame(0, Account::count());
        $this->assertSame(0, Category::count());

        // Opting out explicitly is the only way to reach across users.
        $this->assertSame(2, Account::withoutGlobalScope('owned')->count());
        $this->assertSame(2, Category::withoutGlobalScope('owned')->count());

        // And an authenticated caller still sees only their own rows.
        Sanctum::actingAs($alice);
        $this->assertSame(1, Account::count());
        $this->assertSame(1, Category::count());
    }
}
