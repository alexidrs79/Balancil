<?php

use App\Models\Account;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Until now the opening balance was derived as `balance - activity`, which made it
     * impossible to tell a correct balance from a drifted one: the two moved together.
     * Recording it independently gives `ledger:reconcile` something to check against.
     */
    public function up(): void
    {
        Schema::table('accounts', function (Blueprint $table) {
            $table->decimal('opening_balance', 14, 2)->default(0)->after('balance');
        });

        // Existing balances are taken as correct, so this backfill starts every
        // account reconciled rather than reporting false drift on day one.
        Account::query()
            ->withoutGlobalScope('owned')
            ->withLedgerActivity()
            ->each(function (Account $account) {
                $account->newQuery()->withoutGlobalScope('owned')->whereKey($account->id)->update([
                    'opening_balance' => round((float) $account->balance - $account->net_activity, 2),
                ]);
            });
    }

    public function down(): void
    {
        Schema::table('accounts', function (Blueprint $table) {
            $table->dropColumn('opening_balance');
        });
    }
};
