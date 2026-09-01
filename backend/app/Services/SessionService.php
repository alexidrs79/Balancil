<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Database\Eloquent\Collection;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class SessionService
{
    public function all(User $user): Collection
    {
        return $user->tokens()->latest()->get();
    }

    public function delete(User $user, int $tokenId): void
    {
        $token = $user->tokens()->whereKey($tokenId)->first();

        if (! $token) {
            throw new NotFoundHttpException;
        }

        $token->delete();
    }

    public function deleteOthers(User $user, ?int $currentTokenId): void
    {
        $query = $user->tokens();

        if ($currentTokenId !== null) {
            $query->where('id', '!=', $currentTokenId);
        }

        $query->delete();
    }
}
