<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\Category;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class TransactionCsvTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    private Account $account;

    private Category $expense;

    private Category $income;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create();
        Sanctum::actingAs($this->user);
        $this->account = $this->user->accounts()->create([
            'name' => 'Checking', 'type' => 'checking', 'balance' => 1000,
            'institution' => 'Bank', 'color' => '#111111',
        ]);
        $this->expense = $this->user->categories()->create([
            'name' => 'Food', 'type' => 'expense', 'color' => '#f00', 'icon' => 'food',
        ]);
        $this->income = $this->user->categories()->create([
            'name' => 'Salary', 'type' => 'income', 'color' => '#0f0', 'icon' => 'money',
        ]);
    }

    public function test_export_returns_the_filtered_ledger_as_a_csv_file(): void
    {
        $this->addTransaction('Market', 25);
        $this->addTransaction('Employer', 500, 'income');

        $response = $this->get('/api/transactions/export?type=expense');
        $response->assertOk()
            ->assertHeader('content-type', 'text/csv; charset=UTF-8')
            ->assertHeader('content-disposition',
                'attachment; filename=balancil-transactions-'.now()->format('Y-m-d').'.csv');

        $csv = $response->streamedContent();
        $this->assertStringContainsString('date,merchant,description,category,account,type,status,amount', $csv);
        $this->assertStringContainsString('Market', $csv);
        // The export honours the same filters as the list it came from.
        $this->assertStringNotContainsString('Employer', $csv);
    }

    public function test_a_preview_reports_problems_without_writing_anything(): void
    {
        $response = $this->postJson('/api/transactions/import', [
            'preview' => true,
            'file' => $this->csv([
                ['2026-05-04', 'Market', 'Groceries', 'Food', 'Checking', 'expense', 'completed', '25.00'],
                ['not-a-date', 'Broken', '', 'Food', 'Checking', 'expense', 'completed', '10'],
                ['2026-05-06', 'Bad amount', '', 'Food', 'Checking', 'expense', 'completed', '-5'],
                ['2026-05-07', 'Unknown account', '', 'Food', 'Nowhere', 'expense', 'completed', '10'],
                ['2026-05-08', 'Wrong category type', '', 'Salary', 'Checking', 'expense', 'completed', '10'],
            ]),
        ])->assertOk();

        $response->assertJsonPath('valid', 1)->assertJsonPath('invalid', 4);
        $rows = $response->json('rows');
        $this->assertSame([], $rows[0]['errors']);
        $this->assertStringContainsString('Date could not be read', $rows[1]['errors'][0]);
        $this->assertStringContainsString('greater than zero', $rows[2]['errors'][0]);
        $this->assertStringContainsString('No active account', $rows[3]['errors'][0]);
        $this->assertStringContainsString('No expense category', $rows[4]['errors'][0]);

        $this->assertSame(0, $this->user->transactions()->count());
    }

    public function test_an_import_with_any_bad_row_saves_nothing(): void
    {
        $this->postJson('/api/transactions/import', [
            'file' => $this->csv([
                ['2026-05-04', 'Good', '', 'Food', 'Checking', 'expense', 'completed', '25'],
                ['2026-05-05', 'Bad', '', 'Missing', 'Checking', 'expense', 'completed', '25'],
            ]),
        ])->assertStatus(422)->assertJsonPath('message', '1 row(s) could not be imported. Nothing was saved.');

        $this->assertSame(0, $this->user->transactions()->count());
        $this->assertEqualsWithDelta(1000.0, (float) $this->account->refresh()->balance, 0.001);
    }

    public function test_a_clean_import_writes_rows_and_moves_the_balance(): void
    {
        $this->postJson('/api/transactions/import', [
            'file' => $this->csv([
                ['2026-05-04', 'Market', 'Groceries', 'Food', 'Checking', 'expense', 'completed', '25.50'],
                ['2026-05-05', 'Employer', 'Pay', 'Salary', 'Checking', 'income', 'completed', '500'],
                // A pending row is recorded but must not move the balance.
                ['2026-05-06', 'Later', '', 'Food', 'Checking', 'expense', 'pending', '99'],
            ]),
        ])->assertOk()->assertJsonPath('imported', 3)->assertJsonPath('skipped', 0);

        $this->assertSame(3, $this->user->transactions()->count());
        $this->assertEqualsWithDelta(1474.50, (float) $this->account->refresh()->balance, 0.001);
    }

    public function test_reimporting_the_same_file_does_not_double_the_ledger(): void
    {
        $rows = [['2026-05-04', 'Market', 'Groceries', 'Food', 'Checking', 'expense', 'completed', '25']];

        $this->postJson('/api/transactions/import', ['file' => $this->csv($rows)])
            ->assertOk()->assertJsonPath('imported', 1);
        $this->postJson('/api/transactions/import', ['file' => $this->csv($rows)])
            ->assertOk()->assertJsonPath('imported', 0)->assertJsonPath('skipped', 1);

        $this->assertSame(1, $this->user->transactions()->count());
        $this->assertEqualsWithDelta(975.0, (float) $this->account->refresh()->balance, 0.001);
    }

    public function test_a_file_exported_from_the_app_imports_back_into_it(): void
    {
        $this->addTransaction('Market', 25);
        $this->addTransaction('Employer', 500, 'income');
        $exported = $this->get('/api/transactions/export')->assertOk()->streamedContent();

        // Same ledger, so every row is a duplicate and nothing is written twice.
        $roundTrip = $this->postJson('/api/transactions/import', [
            'file' => UploadedFile::fake()->createWithContent('ledger.csv', $exported),
        ])->assertOk();

        $roundTrip->assertJsonPath('imported', 0)->assertJsonPath('skipped', 2);
        $this->assertSame(2, $this->user->transactions()->count());
    }

    public function test_headers_survive_excel_quirks_and_untidy_values(): void
    {
        $body = "\xEF\xBB\xBF".'Date, Merchant ,DESCRIPTION,Category,Account,Type,Status,Amount'."\n"
            .'2026-05-04, Market ,Groceries,food,checking,EXPENSE,,"1,250.75"'."\n";

        $this->postJson('/api/transactions/import', [
            'file' => UploadedFile::fake()->createWithContent('excel.csv', $body),
        ])->assertOk()->assertJsonPath('imported', 1);

        $saved = $this->user->transactions()->firstOrFail();
        $this->assertSame('Market', $saved->merchant);
        // Thousands separator read, status defaulted, names matched case-insensitively.
        $this->assertEqualsWithDelta(1250.75, (float) $saved->amount, 0.001);
        $this->assertSame('completed', $saved->status);
    }

    public function test_another_users_accounts_and_categories_are_not_reachable_by_name(): void
    {
        $stranger = User::factory()->create();
        $stranger->accounts()->withoutGlobalScope('owned')->create([
            'name' => 'Vault', 'type' => 'savings', 'balance' => 0,
            'institution' => 'Bank', 'color' => '#111111', 'user_id' => $stranger->id,
        ]);

        $this->postJson('/api/transactions/import', [
            'preview' => true,
            'file' => $this->csv([
                ['2026-05-04', 'Market', '', 'Food', 'Vault', 'expense', 'completed', '25'],
            ]),
        ])->assertOk()
            ->assertJsonPath('invalid', 1)
            ->assertJsonPath('rows.0.errors.0', 'No active account with that name.');
    }

    public function test_the_upload_is_size_and_type_checked(): void
    {
        $this->postJson('/api/transactions/import', [
            'file' => UploadedFile::fake()->create('ledger.pdf', 10),
        ])->assertUnprocessable()->assertJsonValidationErrors('file');

        $this->postJson('/api/transactions/import', [
            'file' => UploadedFile::fake()->create('huge.csv', 6000),
        ])->assertUnprocessable()->assertJsonValidationErrors('file');
    }

    /**
     * @param  array<int, array<int, string>>  $rows
     */
    private function csv(array $rows): UploadedFile
    {
        $body = implode(',', ['date', 'merchant', 'description', 'category', 'account', 'type', 'status', 'amount'])."\n";
        foreach ($rows as $row) {
            $body .= implode(',', array_map(fn ($cell) => '"'.str_replace('"', '""', $cell).'"', $row))."\n";
        }

        return UploadedFile::fake()->createWithContent('ledger.csv', $body);
    }

    private function addTransaction(string $merchant, float $amount, string $type = 'expense'): void
    {
        $this->postJson('/api/transactions', [
            'merchant' => $merchant, 'description' => 'Line item', 'amount' => $amount,
            'type' => $type, 'status' => 'completed', 'accountId' => $this->account->id,
            'categoryId' => $type === 'income' ? $this->income->id : $this->expense->id,
            'date' => '2026-05-04',
        ])->assertCreated();
    }
}
