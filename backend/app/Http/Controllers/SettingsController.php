<?php

namespace App\Http\Controllers;

use App\Http\Requests\UpdatePreferencesRequest;
use App\Http\Resources\UserResource;
use App\Services\ProfileImageService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;

class SettingsController extends Controller
{
    public function __construct(private readonly ProfileImageService $profileImages) {}

    public function show(Request $request): array
    {
        return $this->payload($request->user()->load('preferences'));
    }

    public function profile(Request $request): array
    {
        $user = $request->user();
        $data = $request->validate([
            'name' => ['required', 'string', 'max:100'],
        ]);
        $user->update(['name' => $data['name']]);

        return $this->payload($user->refresh()->load('preferences'));
    }

    public function preferences(UpdatePreferencesRequest $request): array
    {
        $data = $request->validated();
        $updates = [];

        foreach (['locale', 'timezone'] as $key) {
            if (array_key_exists($key, $data)) {
                $updates[$key] = $data[$key];
            }
        }
        if (array_key_exists('currency', $data)) {
            $updates['currency'] = strtoupper($data['currency']);
        }
        if (array_key_exists('weekStart', $data)) {
            $updates['week_start'] = $data['weekStart'];
        }

        $request->user()->preferences()->updateOrCreate([], $updates);

        return $this->payload($request->user()->load('preferences'));
    }

    public function password(Request $request): array
    {
        $data = $request->validate([
            'currentPassword' => ['required', 'string'],
            'password' => ['required', Password::min(12), 'confirmed'],
        ]);
        if (! Hash::check($data['currentPassword'], $request->user()->password)) {
            throw ValidationException::withMessages(['currentPassword' => ['The current password is incorrect.']]);
        }
        $user = $request->user();
        $currentTokenId = $user->currentAccessToken()?->getKey();
        $user->update(['password' => $data['password']]);
        $otherTokens = $user->tokens();
        if ($currentTokenId !== null) {
            $otherTokens->where('id', '!=', $currentTokenId);
        }
        $otherTokens->delete();

        return ['message' => 'Password changed successfully.'];
    }

    public function destroy(Request $request)
    {
        $request->validate([
            'password' => ['required', 'string'],
        ]);
        $user = $request->user();
        if (! Hash::check($request->string('password'), $user->password)) {
            throw ValidationException::withMessages(['password' => ['The password is incorrect.']]);
        }

        DB::transaction(function () use ($user) {
            $user->tokens()->delete();
            $user->recurringDueDrafts()->delete();
            $user->recurringTransactions()->delete();
            $user->transfers()->delete();
            $user->goalContributions()->delete();
            $user->transactions()->delete();
            $user->budgets()->delete();
            $user->goals()->delete();
            $user->accounts()->delete();
            $user->categories()->delete();
            $user->emailChangeRequest()->delete();
            $user->preferences()->delete();
            $user->delete();
        });
        $this->profileImages->deleteStored($user);

        return response()->noContent();
    }

    private function payload($user): array
    {
        return [
            'user' => new UserResource($user),
        ];
    }
}
