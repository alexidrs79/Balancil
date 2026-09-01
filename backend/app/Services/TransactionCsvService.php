<?php

namespace App\Services;

use App\Models\Account;
use App\Models\Category;
use App\Models\Transaction;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\StreamedResponse;

class TransactionCsvService
{
    public const MAX_ROWS = 2000;

    /** The export header, and the columns an import understands. */
    public const COLUMNS = ['date', 'merchant', 'description', 'category', 'account', 'type', 'status', 'amount'];

    private const REQUIRED = ['date', 'merchant', 'account', 'category', 'type', 'amount'];

    public function __construct(private readonly TransactionService $transactions) {}

    /**
     * Streams rather than building the file in memory, so a long ledger does not
     * scale the response with the number of rows.
     */
    public function export(User $user, array $filters): StreamedResponse
    {
        $query = $this->transactions->filtered($user, $filters)->with(['category', 'account']);
        $filename = 'balancil-transactions-'.CarbonImmutable::now()->format('Y-m-d').'.csv';

        return response()->streamDownload(function () use ($query) {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, self::COLUMNS);
            $query->chunk(500, function ($rows) use ($handle) {
                foreach ($rows as $row) {
                    fputcsv($handle, [
                        $row->date->toDateString(),
                        $row->merchant,
                        $row->description,
                        $row->category?->name ?? '',
                        $row->account?->name ?? '',
                        $row->type,
                        $row->status,
                        number_format((float) $row->amount, 2, '.', ''),
                    ]);
                }
            });
            fclose($handle);
        }, $filename, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Cache-Control' => 'no-store',
        ]);
    }

    /**
     * Reads a file into checked rows. Nothing is written here, so the same call backs
     * both the preview and the commit and the two can never disagree.
     *
     * @return array{rows: array<int, array<string, mixed>>, valid: int, invalid: int}
     */
    public function review(User $user, UploadedFile $file): array
    {
        $accounts = $user->accounts()->where('is_active', true)->get()
            ->keyBy(fn (Account $account) => mb_strtolower($account->name));
        $categories = $user->categories()->get()
            ->groupBy(fn (Category $category) => mb_strtolower($category->name));

        $rows = [];
        $valid = 0;
        foreach ($this->readRows($file) as $line => $raw) {
            $row = $this->checkRow($raw, $accounts, $categories);
            $row['line'] = $line;
            $valid += $row['errors'] === [] ? 1 : 0;
            $rows[] = $row;
        }

        return ['rows' => $rows, 'valid' => $valid, 'invalid' => count($rows) - $valid];
    }

    /**
     * All or nothing: a ledger half-imported is worse than one not imported, and the
     * caller has already seen every problem in the preview. Rows the ledger already
     * holds are skipped, so re-importing a file cannot double a balance.
     *
     * @param  array{rows: array<int, array<string, mixed>>}  $review
     * @return array{imported: int, skipped: int}
     */
    public function commit(User $user, array $review, bool $skipDuplicates = true): array
    {
        return DB::transaction(function () use ($user, $review, $skipDuplicates): array {
            $imported = 0;
            $skipped = 0;
            foreach ($review['rows'] as $row) {
                if ($skipDuplicates && ($row['duplicate'] ?? false)) {
                    $skipped++;

                    continue;
                }
                $this->transactions->create($user, [
                    'merchant' => $row['merchant'],
                    'description' => $row['description'],
                    'amount' => $row['amount'],
                    'type' => $row['type'],
                    'status' => $row['status'],
                    'accountId' => $row['accountId'],
                    'categoryId' => $row['categoryId'],
                    'date' => $row['date'],
                ]);
                $imported++;
            }

            return ['imported' => $imported, 'skipped' => $skipped];
        });
    }

    /**
     * @return array<int, array<string, string>>
     */
    private function readRows(UploadedFile $file): array
    {
        $handle = fopen($file->getRealPath(), 'r');
        $header = fgetcsv($handle);
        if ($header === false || $header === null) {
            fclose($handle);

            return [];
        }
        // Tolerate a UTF-8 BOM from Excel, plus stray case and spacing in headings.
        $header[0] = preg_replace('/^\xEF\xBB\xBF/', '', (string) $header[0]);
        $header = array_map(fn ($name) => mb_strtolower(trim((string) $name)), $header);

        $rows = [];
        $line = 1;
        while (($values = fgetcsv($handle)) !== false && count($rows) < self::MAX_ROWS) {
            $line++;
            if ($values === [null] || $values === [] || implode('', array_map('strval', $values)) === '') {
                continue;
            }
            $rows[$line] = array_combine(
                $header,
                array_pad(array_slice($values, 0, count($header)), count($header), '')
            );
        }
        fclose($handle);

        return $rows;
    }

    /**
     * @param  array<string, string>  $raw
     * @return array<string, mixed>
     */
    private function checkRow(array $raw, $accounts, $categories): array
    {
        $value = fn (string $key) => trim((string) ($raw[$key] ?? ''));
        $errors = [];

        foreach (self::REQUIRED as $column) {
            if ($value($column) === '') {
                $errors[] = "Missing {$column}.";
            }
        }

        $type = mb_strtolower($value('type'));
        if ($type !== '' && ! in_array($type, ['income', 'expense'], true)) {
            $errors[] = 'Type must be income or expense.';
        }

        $status = mb_strtolower($value('status')) ?: 'completed';
        if (! in_array($status, ['completed', 'pending', 'failed'], true)) {
            $errors[] = 'Status must be completed, pending, or failed.';
        }

        $date = null;
        if ($value('date') !== '') {
            try {
                $date = CarbonImmutable::parse($value('date'))->toDateString();
            } catch (\Throwable) {
                $errors[] = 'Date could not be read. Use YYYY-MM-DD.';
            }
        }

        $amount = str_replace([',', ' '], '', $value('amount'));
        if ($amount !== '' && (! is_numeric($amount) || (float) $amount <= 0)) {
            $errors[] = 'Amount must be a number greater than zero.';
        }

        $account = $accounts->get(mb_strtolower($value('account')));
        if ($value('account') !== '' && ! $account) {
            $errors[] = 'No active account with that name.';
        }

        // A category name can exist for both an income and an expense, so the type
        // picks between them rather than the name alone.
        $category = ($categories->get(mb_strtolower($value('category'))) ?? collect())
            ->first(fn (Category $candidate) => $candidate->type === $type);
        if ($value('category') !== '' && ! $category) {
            $errors[] = $type === '' || $errors !== []
                ? 'No category with that name.'
                : "No {$type} category with that name.";
        }

        return [
            'date' => $date,
            'merchant' => $value('merchant'),
            'description' => $value('description'),
            'amount' => $amount === '' ? null : round((float) $amount, 2),
            'type' => $type ?: null,
            'status' => $status,
            'account' => $value('account'),
            'accountId' => $account?->id,
            'category' => $value('category'),
            'categoryId' => $category?->id,
            'errors' => $errors,
        ];
    }

    /** Rows the ledger already holds, so a re-imported file does not double up. */
    public function markDuplicates(User $user, array $review): array
    {
        $review['rows'] = array_map(function (array $row) use ($user) {
            $row['duplicate'] = $row['errors'] === [] && Transaction::query()
                ->where('user_id', $user->id)
                ->where('account_id', $row['accountId'])
                // Dates carry a zero time component in storage, so compare by day.
                ->whereDate('date', $row['date'])
                ->where('merchant', $row['merchant'])
                ->where('amount', $row['amount'])
                ->exists();

            return $row;
        }, $review['rows']);

        return $review;
    }
}
