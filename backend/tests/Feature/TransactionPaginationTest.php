<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\Category;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class TransactionPaginationTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    private Account $account;

    private Category $income;

    private Category $expense;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create();
        Sanctum::actingAs($this->user);
        $this->account = $this->user->accounts()->create([
            'name' => 'Checking', 'type' => 'checking', 'balance' => 0,
            'institution' => 'Bank', 'color' => '#111111',
        ]);
        $this->income = $this->user->categories()->create([
            'name' => 'Salary', 'type' => 'income', 'color' => '#0f0', 'icon' => 'money',
        ]);
        $this->expense = $this->user->categories()->create([
            'name' => 'Food', 'type' => 'expense', 'color' => '#f00', 'icon' => 'food',
        ]);
    }

    public function test_the_ledger_is_paginated_and_never_repeats_or_skips_a_row(): void
    {
        // All on one date, so only the tiebreaker keeps paging stable.
        for ($i = 1; $i <= 30; $i++) {
            $this->transaction(['merchant' => "Row {$i}", 'amount' => 10]);
        }

        $seen = [];
        for ($page = 1; $page <= 3; $page++) {
            $body = $this->getJson("/api/transactions?page={$page}&perPage=10")->assertOk()->json();
            $this->assertCount(10, $body['data']);
            $this->assertSame(30, $body['meta']['total']);
            $seen = [...$seen, ...array_column($body['data'], 'id')];
        }

        $this->assertCount(30, array_unique($seen), 'Paging repeated or skipped a transaction.');
    }

    public function test_filters_narrow_the_ledger_and_are_case_insensitive(): void
    {
        $this->transaction(['merchant' => 'Corner Store', 'amount' => 25]);
        $this->transaction(['merchant' => 'Bakery', 'description' => 'Weekend BREAD', 'amount' => 8]);
        $this->transaction(['merchant' => 'Employer', 'amount' => 500, 'type' => 'income']);

        $this->getJson('/api/transactions?search=corner')
            ->assertOk()->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.merchant', 'Corner Store');

        // Search covers the description too.
        $this->getJson('/api/transactions?search=bread')
            ->assertOk()->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.merchant', 'Bakery');

        $this->getJson('/api/transactions?type=income')
            ->assertOk()->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.merchant', 'Employer');

        $this->getJson('/api/transactions?categoryId='.$this->expense->id)
            ->assertOk()->assertJsonCount(2, 'data');
    }

    public function test_the_summary_covers_the_whole_filtered_ledger_not_just_the_page(): void
    {
        for ($i = 0; $i < 12; $i++) {
            $this->transaction(['amount' => 10]);
        }
        $this->transaction(['amount' => 1000, 'type' => 'income']);
        // Pending rows are excluded from totals, matching the rest of the app.
        $this->transaction(['amount' => 999, 'status' => 'pending']);

        $body = $this->getJson('/api/transactions?perPage=5')->assertOk()->json();

        $this->assertCount(5, $body['data']);
        $this->assertSame(14, $body['meta']['total']);
        $this->assertSame(1000.0, (float) $body['summary']['income']);
        $this->assertSame(120.0, (float) $body['summary']['expenses']);
        $this->assertSame(880.0, (float) $body['summary']['savings']);
        $this->assertSame(13, $body['summary']['completedCount']);
        // The unfiltered ledger size, for the "showing X of Y" copy.
        $this->assertSame(14, $body['summary']['ledgerTotal']);
    }

    public function test_sorting_and_date_bounds_are_applied_by_the_api(): void
    {
        $this->transaction(['merchant' => 'Small', 'amount' => 5, 'date' => '2026-01-15']);
        $this->transaction(['merchant' => 'Large', 'amount' => 900, 'date' => '2026-02-15']);
        $this->transaction(['merchant' => 'Middle', 'amount' => 50, 'date' => '2026-03-15']);

        $this->getJson('/api/transactions?sort=highest')
            ->assertOk()->assertJsonPath('data.0.merchant', 'Large');
        $this->getJson('/api/transactions?sort=lowest')
            ->assertOk()->assertJsonPath('data.0.merchant', 'Small');
        $this->getJson('/api/transactions?sort=oldest')
            ->assertOk()->assertJsonPath('data.0.merchant', 'Small');
        $this->getJson('/api/transactions?sort=newest')
            ->assertOk()->assertJsonPath('data.0.merchant', 'Middle');

        $this->getJson('/api/transactions?dateFrom=2026-02-01&dateTo=2026-02-28')
            ->assertOk()->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.merchant', 'Large');
    }

    public function test_the_index_rejects_bad_paging_and_another_users_filters(): void
    {
        $stranger = User::factory()->create();
        $strangerCategory = $stranger->categories()->withoutGlobalScope('owned')->create([
            'name' => 'Theirs', 'type' => 'expense', 'color' => '#000', 'icon' => 'food',
        ]);

        $this->getJson('/api/transactions?perPage=5000')
            ->assertUnprocessable()->assertJsonValidationErrors('perPage');
        $this->getJson('/api/transactions?page=0')
            ->assertUnprocessable()->assertJsonValidationErrors('page');
        $this->getJson('/api/transactions?sort=sideways')
            ->assertUnprocessable()->assertJsonValidationErrors('sort');
        $this->getJson('/api/transactions?categoryId='.$strangerCategory->id)
            ->assertUnprocessable()->assertJsonValidationErrors('categoryId');
    }

    public function test_blank_query_strings_mean_no_filter(): void
    {
        $this->transaction(['amount' => 10]);

        // The frontend sends empty strings for untouched controls.
        $this->getJson('/api/transactions?search=&type=&status=&categoryId=&accountId=&dateFrom=&dateTo=&sort=')
            ->assertOk()->assertJsonCount(1, 'data');
    }

    public function test_accounts_report_their_latest_activity_without_the_full_ledger(): void
    {
        $this->transaction(['amount' => 10, 'date' => '2026-04-02']);
        $this->transaction(['amount' => 20, 'date' => '2026-06-09']);
        $quiet = $this->user->accounts()->create([
            'name' => 'Unused', 'type' => 'savings', 'balance' => 0,
            'institution' => 'Bank', 'color' => '#111111',
        ]);

        // Resource wrapping is off globally, so plain collections come back bare.
        $accounts = collect($this->getJson('/api/accounts')->assertOk()->json())->keyBy('name');

        $this->assertSame('2026-06-09', substr((string) $accounts['Checking']['lastActivityAt'], 0, 10));
        $this->assertArrayNotHasKey('lastActivityAt', $accounts['Unused']);
        $this->assertSame($quiet->id, $accounts['Unused']['id']);
    }

    /**
     * @param  array<string, mixed>  $overrides
     */
    private function transaction(array $overrides = []): void
    {
        $type = $overrides['type'] ?? 'expense';
        $this->postJson('/api/transactions', [
            'merchant' => 'Merchant',
            'description' => 'Line item',
            'amount' => 10,
            'type' => $type,
            'status' => 'completed',
            'accountId' => $this->account->id,
            'categoryId' => $type === 'income' ? $this->income->id : $this->expense->id,
            'date' => now()->toDateString(),
            ...$overrides,
        ])->assertCreated();
    }
}
