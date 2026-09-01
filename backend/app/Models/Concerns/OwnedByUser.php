<?php

namespace App\Models\Concerns;

trait OwnedByUser
{
    protected static function bootOwnedByUser(): void
    {
        static::addGlobalScope('owned', function ($query) {
            if (auth()->check()) {
                $query->where($query->qualifyColumn('user_id'), auth()->id());

                return;
            }

            // Without an authenticated user the safe answer is "nothing", not
            // "everything". Console and queue code that legitimately spans users
            // opts out explicitly with ->withoutGlobalScope('owned').
            $query->whereRaw('1 = 0');
        });
    }
}
