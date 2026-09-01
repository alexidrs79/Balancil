<?php

namespace App\Services;

use App\Models\EmailChangeRequest;
use App\Models\User;
use App\Notifications\ConfirmEmailChange;
use App\Notifications\EmailChangeRequested;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class EmailChangeService
{
    public function request(User $user, string $newEmail, string $currentPassword): EmailChangeRequest
    {
        if (! Hash::check($currentPassword, $user->password)) {
            throw ValidationException::withMessages([
                'currentPassword' => ['The current password is incorrect.'],
            ]);
        }

        $token = Str::random(64);
        $change = DB::transaction(function () use ($user, $newEmail, $token) {
            $user->emailChangeRequest()->delete();

            return $user->emailChangeRequest()->create([
                'new_email' => $newEmail,
                'token_hash' => hash('sha256', $token),
                'expires_at' => now()->addHour(),
            ]);
        });

        Notification::route('mail', $newEmail)->notify(new ConfirmEmailChange($token));
        $user->notify(new EmailChangeRequested($newEmail));

        return $change;
    }

    public function pending(User $user): ?EmailChangeRequest
    {
        return $user->emailChangeRequest()
            ->whereNull('confirmed_at')
            ->where('expires_at', '>', now())
            ->first();
    }

    public function cancel(User $user): void
    {
        $user->emailChangeRequest()->whereNull('confirmed_at')->delete();
    }

    public function confirm(string $token): User
    {
        return DB::transaction(function () use ($token) {
            $change = EmailChangeRequest::query()
                ->where('token_hash', hash('sha256', $token))
                ->lockForUpdate()
                ->first();

            if (! $change || $change->confirmed_at || $change->expires_at->isPast()) {
                throw ValidationException::withMessages([
                    'token' => ['This email confirmation link is invalid or expired.'],
                ]);
            }

            $user = User::query()->whereKey($change->user_id)->lockForUpdate()->first();
            if (! $user || User::query()->where('email', $change->new_email)->where('id', '!=', $user->id)->exists()) {
                throw ValidationException::withMessages([
                    'token' => ['This email confirmation link is invalid or expired.'],
                ]);
            }

            $user->forceFill([
                'email' => $change->new_email,
                'email_verified_at' => now(),
            ])->save();
            $user->tokens()->delete();
            $change->update(['confirmed_at' => now()]);

            return $user;
        });
    }
}
