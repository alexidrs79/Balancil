<?php

namespace App\Models;

use App\Models\Concerns\OwnedByUser;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Account extends Model
{
    use HasUuids, OwnedByUser;

    protected $fillable = [
        'name', 'type', 'balance', 'institution', 'color', 'is_active',
    ];

    protected function casts(): array
    {
        return ['balance' => 'decimal:2', 'is_active' => 'boolean'];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(Transaction::class);
    }

    public function recurringTransactions(): HasMany
    {
        return $this->hasMany(RecurringTransaction::class);
    }

    public function outgoingTransfers(): HasMany
    {
        return $this->hasMany(AccountTransfer::class, 'from_account_id');
    }

    public function incomingTransfers(): HasMany
    {
        return $this->hasMany(AccountTransfer::class, 'to_account_id');
    }

    /**
     * Load the completed movements behind the stored balance so a row can show
     * where its current figure came from.
     */
    public function scopeWithLedgerActivity(Builder $query): Builder
    {
        return $query
            ->withSum(['transactions as completed_income_sum' => fn (Builder $sums) => $sums
                ->where('status', 'completed')->where('type', 'income')], 'amount')
            ->withSum(['transactions as completed_expense_sum' => fn (Builder $sums) => $sums
                ->where('status', 'completed')->where('type', 'expense')], 'amount')
            ->withSum(['incomingTransfers as completed_transfer_in_sum' => fn (Builder $sums) => $sums
                ->where('status', 'completed')], 'amount')
            ->withSum(['outgoingTransfers as completed_transfer_out_sum' => fn (Builder $sums) => $sums
                ->where('status', 'completed')], 'amount');
    }

    /** Net effect of every completed transaction and transfer on this account. */
    protected function netActivity(): Attribute
    {
        return Attribute::get(fn (): float => round(
            (float) ($this->completed_income_sum ?? 0)
            - (float) ($this->completed_expense_sum ?? 0)
            + (float) ($this->completed_transfer_in_sum ?? 0)
            - (float) ($this->completed_transfer_out_sum ?? 0),
            2
        ));
    }

    /** The balance entered when the account was created, before any activity. */
    protected function openingBalance(): Attribute
    {
        return Attribute::get(fn (): float => round((float) $this->balance - $this->net_activity, 2));
    }
}
