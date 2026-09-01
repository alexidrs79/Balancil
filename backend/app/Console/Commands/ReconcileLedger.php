<?php

namespace App\Console\Commands;

use App\Models\Account;
use Illuminate\Console\Command;

class ReconcileLedger extends Command
{
    protected $signature = 'ledger:reconcile {--fix : Rewrite drifted balances from the ledger}';

    protected $description = 'Check every account balance against the transactions and transfers behind it';

    /** Half a cent: below this the difference cannot show up in a formatted balance. */
    private const TOLERANCE = 0.005;

    public function handle(): int
    {
        $drifted = [];

        Account::query()
            ->withoutGlobalScope('owned')
            ->withLedgerActivity()
            ->orderBy('id')
            ->each(function (Account $account) use (&$drifted): void {
                $difference = round((float) $account->balance - $account->expected_balance, 2);
                if (abs($difference) < self::TOLERANCE) {
                    return;
                }
                $drifted[] = [$account, $difference];
            });

        if ($drifted === []) {
            $this->info('All account balances match their ledgers.');

            return self::SUCCESS;
        }

        $this->table(
            ['Account', 'User', 'Stored', 'Expected', 'Difference'],
            array_map(fn (array $row) => [
                $row[0]->name,
                $row[0]->user_id,
                number_format((float) $row[0]->balance, 2),
                number_format($row[0]->expected_balance, 2),
                number_format($row[1], 2),
            ], $drifted),
        );

        if (! $this->option('fix')) {
            $this->warn(count($drifted).' account(s) drifted. Re-run with --fix to rewrite them from the ledger.');

            return self::FAILURE;
        }

        foreach ($drifted as [$account, $difference]) {
            Account::query()
                ->withoutGlobalScope('owned')
                ->whereKey($account->id)
                ->update(['balance' => $account->expected_balance]);
        }

        $this->info('Rewrote '.count($drifted).' account balance(s) from the ledger.');

        return self::SUCCESS;
    }
}
