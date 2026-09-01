<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Preference extends Model
{
    use HasUuids;

    protected $fillable = ['currency', 'locale', 'timezone', 'week_start'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
