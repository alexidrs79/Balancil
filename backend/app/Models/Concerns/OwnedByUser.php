<?php

namespace App\Models\Concerns;

trait OwnedByUser
{
    protected static function bootOwnedByUser(): void
    {
        static::addGlobalScope('owned', function ($query) {
            if (auth()->check()) {
                $query->where($query->qualifyColumn('user_id'), auth()->id());
            }
        });
    }
}
