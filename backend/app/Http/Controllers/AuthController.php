<?php

namespace App\Http\Controllers;

use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    private static ?string $dummyPasswordHash = null;

    public function register(RegisterRequest $request)
    {
        $user = User::create($request->validated());
        $this->initializeUser($user);

        return response()->json($this->session($request, $user, false), 201);
    }

    public function login(LoginRequest $request)
    {
        $user = User::where('email', $request->string('email'))->first();
        $passwordHash = $user?->password
            ?? (self::$dummyPasswordHash ??= Hash::make('not-a-user-password'));
        $validPassword = Hash::check($request->string('password'), $passwordHash);
        if (! $user || ! $validPassword) {
            throw ValidationException::withMessages(['email' => ['The provided credentials are incorrect.']]);
        }

        return $this->session($request, $user, $request->boolean('remember'));
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->noContent();
    }

    public function me(Request $request): UserResource
    {
        return new UserResource($request->user()->load('preferences'));
    }

    private function session(Request $request, User $user, bool $remember): array
    {
        $expiresAt = now()->addHours($remember ? 24 * 30 : 12);
        $newToken = $user->createToken('balancil', ['*'], $expiresAt);
        $newToken->accessToken->forceFill([
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ])->save();

        return ['token' => $newToken->plainTextToken, 'user' => new UserResource($user->load('preferences')), 'expiresAt' => $expiresAt->toISOString()];
    }

    private function initializeUser(User $user): void
    {
        $user->preferences()->create();
        foreach ([
            ['Salary', 'income', '#16a34a', 'briefcase'],
            ['Other income', 'income', '#0d9488', 'circle'],
            ['Housing', 'expense', '#7c3aed', 'home'],
            ['Food', 'expense', '#ea580c', 'utensils'],
            ['Transport', 'expense', '#2563eb', 'car'],
            ['Utilities', 'expense', '#dc2626', 'zap'],
            ['Entertainment', 'expense', '#db2777', 'ticket'],
            ['Shopping', 'expense', '#9333ea', 'bag'],
            ['Health', 'expense', '#059669', 'heart'],
            ['Other', 'expense', '#64748b', 'circle'],
        ] as [$name, $type, $color, $icon]) {
            $user->categories()->create(compact('name', 'type', 'color', 'icon'));
        }
    }
}
