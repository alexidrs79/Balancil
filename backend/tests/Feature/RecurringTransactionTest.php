<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\Category;
use App\Models\RecurringTransaction;
use App\Models\User;
use App\Services\RecurringTransactionService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class RecurringTransactionTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    public function test_template_crud_uses_defaults_and_safe_cascades(): void
    {
        [$user, $account, $category] = $this->financeUser();
        Sanctum::actingAs($user);

        $template = $this->postJson('/api/recurring-transactions', $this->payload($account, $category))
            ->assertCreated()
            ->assertJsonPath('interval', 1)
            ->assertJsonPath('nextDueDate', '2026-08-31')
            ->assertJsonPath('isActive', true)
            ->json();

        $this->getJson('/api/recurring-transactions')->assertOk()->assertJsonCount(1);
        $this->getJson('/api/recurring-transactions/'.$template['id'])
            ->assertOk()
            ->assertJsonPath('merchant', 'Rent');

        $updated = $this->payload($account, $category, [
            'merchant' => 'Apartment rent',
            'frequency' => 'biweekly',
            'interval' => 2,
            'nextDueDate' => '2026-09-14',
        ]);
        $this->putJson('/api/recurring-transactions/'.$template['id'], $updated)
            ->assertOk()
            ->assertJsonPath('merchant', 'Apartment rent')
            ->assertJsonPath('frequency', 'biweekly')
            ->assertJsonPath('interval', 2);

        $this->artisan('recurring:generate-drafts', ['--through' => '2026-09-14'])->assertSuccessful();
        $this->assertDatabaseCount('recurring_due_drafts', 1);
        $this->deleteJson('/api/recurring-transactions/'.$template['id'])->assertNoContent();
        $this->assertDatabaseMissing('recurring_transactions', ['id' => $template['id']]);
        $this->assertDatabaseCount('recurring_due_drafts', 0);
    }

    public function test_template_validation_requires_owned_active_account_matching_category_and_valid_dates(): void
    {
        [$user, $account, $expense] = $this->financeUser();
        $inactive = $this->account($user, ['name' => 'Closed', 'is_active' => false]);
        $income = $this->category($user, ['name' => 'Salary', 'type' => 'income']);
        [$other, $otherAccount, $otherCategory] = $this->financeUser();
        Sanctum::actingAs($user);

        $this->postJson('/api/recurring-transactions', $this->payload($inactive, $expense))
            ->assertUnprocessable()->assertJsonValidationErrors('accountId');
        $this->postJson('/api/recurring-transactions', $this->payload($account, $income))
            ->assertUnprocessable()->assertJsonValidationErrors('categoryId');
        $this->postJson('/api/recurring-transactions', $this->payload($otherAccount, $expense))
            ->assertUnprocessable()->assertJsonValidationErrors('accountId');
        $this->postJson('/api/recurring-transactions', $this->payload($account, $otherCategory))
            ->assertUnprocessable()->assertJsonValidationErrors('categoryId');
        $this->postJson('/api/recurring-transactions', $this->payload($account, $expense, [
            'interval' => 0,
            'nextDueDate' => '2026-08-30',
            'endDate' => '2026-08-29',
        ]))->assertUnprocessable()
            ->assertJsonValidationErrors(['interval', 'nextDueDate', 'endDate']);

        $this->assertSame(0, $other->recurringTransactions()->count());
    }

    public function test_automatic_generation_uses_each_users_local_date(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-09-01 01:00:00', 'UTC'));
        [$westUser, $westAccount, $westCategory] = $this->financeUser();
        [$eastUser, $eastAccount, $eastCategory] = $this->financeUser();
        $westUser->preferences()->create([
            'currency' => 'USD', 'locale' => 'en-US',
            'timezone' => 'America/Los_Angeles', 'week_start' => 'sun',
        ]);
        $eastUser->preferences()->create([
            'currency' => 'USD', 'locale' => 'en-US',
            'timezone' => 'Asia/Tehran', 'week_start' => 'mon',
        ]);
        $service = app(RecurringTransactionService::class);
        $service->create($westUser, $this->payload($westAccount, $westCategory, [
            'startDate' => '2026-09-01',
        ]));
        $service->create($eastUser, $this->payload($eastAccount, $eastCategory, [
            'startDate' => '2026-09-01',
        ]));

        $this->artisan('recurring:generate-drafts')->assertSuccessful();

        $this->assertSame(0, $westUser->recurringDueDrafts()->withoutGlobalScope('owned')->count());
        $this->assertSame(1, $eastUser->recurringDueDrafts()->withoutGlobalScope('owned')->count());
    }

    public function test_generation_catches_up_month_end_without_duplicates(): void
    {
        [$user, $account, $category] = $this->financeUser();
        Sanctum::actingAs($user);
        $template = $this->postJson('/api/recurring-transactions', $this->payload($account, $category, [
            'startDate' => '2024-01-31',
            'nextDueDate' => '2024-01-31',
            'frequency' => 'monthly',
        ]))->assertCreated()->json();

        $this->artisan('recurring:generate-drafts', ['--through' => '2024-03-31'])
            ->expectsOutput('Generated 3 recurring due draft(s).')
            ->assertSuccessful();
        $this->assertDatabaseCount('recurring_due_drafts', 3);
        $this->assertSame(
            ['2024-01-31', '2024-02-29', '2024-03-31'],
            $user->recurringDueDrafts()->oldest('due_date')->get()
                ->map(fn ($draft) => $draft->due_date->toDateString())->all()
        );
        $this->assertSame('2024-04-30', RecurringTransaction::find($template['id'])->next_due_date->toDateString());

        $this->artisan('recurring:generate-drafts', ['--through' => '2024-03-31'])
            ->expectsOutput('Generated 0 recurring due draft(s).')
            ->assertSuccessful();
        $this->assertDatabaseCount('recurring_due_drafts', 3);
    }

    public function test_generation_caps_each_template_catch_up_batch(): void
    {
        [$user, $account, $category] = $this->financeUser();
        Sanctum::actingAs($user);
        $this->postJson('/api/recurring-transactions', $this->payload($account, $category, [
            'startDate' => '2000-01-03',
            'nextDueDate' => '2000-01-03',
            'frequency' => 'weekly',
        ]))->assertCreated();

        $this->artisan('recurring:generate-drafts', ['--through' => '2026-08-31'])
            ->expectsOutput('Generated '.RecurringTransactionService::MAX_DRAFTS_PER_TEMPLATE.' recurring due draft(s).')
            ->assertSuccessful();

        $this->assertDatabaseCount(
            'recurring_due_drafts',
            RecurringTransactionService::MAX_DRAFTS_PER_TEMPLATE,
        );
    }

    public function test_yearly_leap_day_recurrence_returns_to_leap_day(): void
    {
        [$user, $account, $category] = $this->financeUser();
        Sanctum::actingAs($user);
        $this->postJson('/api/recurring-transactions', $this->payload($account, $category, [
            'startDate' => '2024-02-29',
            'nextDueDate' => '2024-02-29',
            'frequency' => 'yearly',
        ]))->assertCreated();

        $this->artisan('recurring:generate-drafts', ['--through' => '2028-02-29'])->assertSuccessful();
        $dates = $user->recurringDueDrafts()->oldest('due_date')->pluck('due_date')
            ->map(fn ($date) => Carbon::parse($date)->toDateString())->all();

        $this->assertSame([
            '2024-02-29', '2025-02-28', '2026-02-28', '2027-02-28', '2028-02-29',
        ], $dates);
    }

    public function test_inactive_future_and_ended_templates_do_not_over_generate(): void
    {
        [$user, $account, $category] = $this->financeUser();
        Sanctum::actingAs($user);
        $this->postJson('/api/recurring-transactions', $this->payload($account, $category, [
            'startDate' => '2026-01-01', 'nextDueDate' => '2026-01-01', 'isActive' => false,
        ]))->assertCreated();
        $this->postJson('/api/recurring-transactions', $this->payload($account, $category, [
            'merchant' => 'Future', 'startDate' => '2027-01-01', 'nextDueDate' => '2027-01-01',
        ]))->assertCreated();
        $ended = $this->postJson('/api/recurring-transactions', $this->payload($account, $category, [
            'merchant' => 'Limited', 'startDate' => '2026-01-31', 'nextDueDate' => '2026-01-31',
            'endDate' => '2026-02-28',
        ]))->assertCreated()->json();

        $this->artisan('recurring:generate-drafts', ['--through' => '2026-12-31'])->assertSuccessful();
        $this->assertDatabaseCount('recurring_due_drafts', 2);
        $this->assertFalse(RecurringTransaction::find($ended['id'])->is_active);
    }

    public function test_posting_is_atomic_idempotent_and_changes_completed_balance_once(): void
    {
        [$user, $account, $category] = $this->financeUser();
        Sanctum::actingAs($user);
        $this->postJson('/api/recurring-transactions', $this->payload($account, $category, [
            'amount' => 25,
        ]))->assertCreated();
        $this->artisan('recurring:generate-drafts', ['--through' => '2026-08-31'])->assertSuccessful();
        $draft = $user->recurringDueDrafts()->firstOrFail();

        $response = $this->postJson('/api/recurring-drafts/'.$draft->id.'/post', [
            'merchant' => 'Reviewed rent',
            'amount' => 30,
        ])->assertOk()
            ->assertJsonPath('status', 'posted')
            ->assertJsonPath('payload.amount', 25)
            ->json();

        $this->assertSame(70.0, (float) $account->refresh()->balance);
        $this->assertDatabaseHas('transactions', [
            'id' => $response['transactionId'],
            'merchant' => 'Reviewed rent',
            'amount' => 30,
            'status' => 'completed',
            'type' => 'expense',
        ]);

        $this->postJson('/api/recurring-drafts/'.$draft->id.'/post', ['amount' => 99])
            ->assertOk()
            ->assertJsonPath('transactionId', $response['transactionId']);
        $this->assertSame(70.0, (float) $account->refresh()->balance);
        $this->assertDatabaseCount('transactions', 1);
    }

    public function test_editing_template_refreshes_pending_draft_payload(): void
    {
        [$user, $account, $category] = $this->financeUser();
        Sanctum::actingAs($user);
        $template = $this->postJson(
            '/api/recurring-transactions',
            $this->payload($account, $category, ['amount' => 100])
        )->assertCreated()->json();
        $this->artisan('recurring:generate-drafts', ['--through' => '2026-08-31'])
            ->assertSuccessful();
        $draft = $user->recurringDueDrafts()->firstOrFail();

        $this->putJson(
            '/api/recurring-transactions/'.$template['id'],
            $this->payload($account, $category, ['amount' => 200])
        )->assertOk();

        $this->assertSame(200.0, (float) $draft->refresh()->payload['amount']);
        $this->postJson('/api/recurring-drafts/'.$draft->id.'/post')
            ->assertOk()
            ->assertJsonPath('payload.amount', 200);
        $this->assertSame(-100.0, (float) $account->refresh()->balance);
    }

    public function test_post_overrides_must_keep_owned_active_references_and_category_type_coupling(): void
    {
        [$user, $account, $category] = $this->financeUser();
        $inactive = $this->account($user, ['name' => 'Closed', 'is_active' => false]);
        $income = $this->category($user, ['name' => 'Salary', 'type' => 'income']);
        Sanctum::actingAs($user);
        $this->postJson('/api/recurring-transactions', $this->payload($account, $category))->assertCreated();
        $this->artisan('recurring:generate-drafts', ['--through' => '2026-08-31'])->assertSuccessful();
        $draft = $user->recurringDueDrafts()->firstOrFail();

        $this->postJson('/api/recurring-drafts/'.$draft->id.'/post', ['accountId' => $inactive->id])
            ->assertUnprocessable()->assertJsonValidationErrors('accountId');
        $this->postJson('/api/recurring-drafts/'.$draft->id.'/post', ['categoryId' => $income->id])
            ->assertUnprocessable()->assertJsonValidationErrors('categoryId');
        $this->postJson('/api/recurring-drafts/'.$draft->id.'/post', [
            'categoryId' => $income->id, 'type' => 'income',
        ])->assertOk();
        $this->assertSame(200.0, (float) $account->refresh()->balance);
    }

    public function test_skipping_is_idempotent_and_history_excludes_pending(): void
    {
        [$user, $account, $category] = $this->financeUser();
        Sanctum::actingAs($user);
        $this->postJson('/api/recurring-transactions', $this->payload($account, $category))->assertCreated();
        $this->artisan('recurring:generate-drafts', ['--through' => '2026-08-31'])->assertSuccessful();
        $draft = $user->recurringDueDrafts()->firstOrFail();

        $this->getJson('/api/recurring-drafts/pending')->assertOk()->assertJsonCount(1);
        $this->getJson('/api/recurring-drafts/history')->assertOk()->assertJsonCount(0);
        $this->postJson('/api/recurring-drafts/'.$draft->id.'/skip')
            ->assertOk()->assertJsonPath('status', 'skipped');
        $this->postJson('/api/recurring-drafts/'.$draft->id.'/skip')
            ->assertOk()->assertJsonPath('status', 'skipped');
        $this->postJson('/api/recurring-drafts/'.$draft->id.'/post')->assertConflict();
        $this->getJson('/api/recurring-drafts/pending')->assertOk()->assertJsonCount(0);
        $this->getJson('/api/recurring-drafts/history')->assertOk()->assertJsonCount(1);
        $this->assertSame(100.0, (float) $account->refresh()->balance);
    }

    public function test_templates_and_drafts_are_isolated_between_users(): void
    {
        [$owner, $account, $category] = $this->financeUser();
        Sanctum::actingAs($owner);
        $template = $this->postJson('/api/recurring-transactions', $this->payload($account, $category))
            ->assertCreated()->json();
        $this->artisan('recurring:generate-drafts', ['--through' => '2026-08-31'])->assertSuccessful();
        $draft = $owner->recurringDueDrafts()->firstOrFail();

        [$stranger, $strangerAccount, $strangerCategory] = $this->financeUser();
        Sanctum::actingAs($stranger);
        $this->getJson('/api/recurring-transactions')->assertOk()->assertJsonCount(0);
        $this->getJson('/api/recurring-drafts/pending')->assertOk()->assertJsonCount(0);
        $this->getJson('/api/recurring-transactions/'.$template['id'])->assertNotFound();
        $this->putJson(
            '/api/recurring-transactions/'.$template['id'],
            $this->payload($strangerAccount, $strangerCategory)
        )->assertNotFound();
        $this->deleteJson('/api/recurring-transactions/'.$template['id'])->assertNotFound();
        $this->postJson('/api/recurring-drafts/'.$draft->id.'/post')->assertNotFound();
        $this->postJson('/api/recurring-drafts/'.$draft->id.'/skip')->assertNotFound();
    }

    /**
     * @return array{User, Account, Category}
     */
    private function financeUser(): array
    {
        $user = User::factory()->create();

        return [$user, $this->account($user), $this->category($user)];
    }

    private function account(User $user, array $overrides = []): Account
    {
        return $user->accounts()->create([
            ...[
                'name' => 'Checking', 'type' => 'checking', 'balance' => 100,
                'institution' => 'Bank', 'color' => '#000000', 'is_active' => true,
            ],
            ...$overrides,
        ]);
    }

    private function category(User $user, array $overrides = []): Category
    {
        return $user->categories()->create([
            ...['name' => 'Housing', 'type' => 'expense', 'color' => '#000000', 'icon' => 'home'],
            ...$overrides,
        ]);
    }

    private function payload(Account $account, Category $category, array $overrides = []): array
    {
        return [
            ...[
                'accountId' => $account->id,
                'categoryId' => $category->id,
                'merchant' => 'Rent',
                'description' => 'Monthly rent',
                'amount' => 100,
                'type' => 'expense',
                'frequency' => 'monthly',
                'startDate' => '2026-08-31',
            ],
            ...$overrides,
        ];
    }
}
