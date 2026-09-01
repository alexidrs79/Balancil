<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_registration_creates_defaults_but_no_finance_records(): void
    {
        $response = $this->postJson('/api/register', [
            'name' => 'Jamie Doe', 'email' => ' Jamie@Example.COM ',
            'password' => 'password1234', 'password_confirmation' => 'password1234',
        ]);

        $response->assertCreated()->assertJsonStructure(['token', 'expiresAt', 'user' => ['id', 'name', 'email', 'initials', 'currency']]);
        $user = User::where('email', 'jamie@example.com')->firstOrFail();
        $this->assertCount(10, $user->categories);
        $this->assertNotNull($user->preferences);
        $this->assertSame(0, $user->accounts()->count());
        $this->assertSame(0, $user->transactions()->count());
        $this->assertSame(0, $user->budgets()->count());
        $this->assertSame(0, $user->goals()->count());

        $this->withToken($response['token'])->getJson('/api/dashboard')
            ->assertOk()
            ->assertJsonCount(0, 'accounts')
            ->assertJsonCount(0, 'transactions')
            ->assertJsonCount(0, 'budgets')
            ->assertJsonCount(0, 'goals')
            ->assertJsonPath('summary.income', 0)
            ->assertJsonPath('summary.expenses', 0);
    }

    public function test_login_uses_twelve_hour_or_thirty_day_expiry(): void
    {
        $user = User::factory()->create(['password' => 'password123']);
        $short = $this->postJson('/api/login', ['email' => $user->email, 'password' => 'password123', 'remember' => false])->assertOk();
        $long = $this->postJson('/api/login', ['email' => $user->email, 'password' => 'password123', 'remember' => true])->assertOk();

        $this->assertEqualsWithDelta(now()->addHours(12)->timestamp, strtotime($short['expiresAt']), 5);
        $this->assertEqualsWithDelta(now()->addDays(30)->timestamp, strtotime($long['expiresAt']), 5);
    }

    public function test_untrusted_forwarded_ip_is_not_saved_as_the_session_ip(): void
    {
        $user = User::factory()->create(['password' => 'password123']);

        $this->withHeader('X-Forwarded-For', '203.0.113.42')
            ->postJson('/api/login', [
                'email' => $user->email,
                'password' => 'password123',
            ])
            ->assertOk();

        $this->assertNotSame('203.0.113.42', $user->tokens()->latest()->value('ip_address'));
    }

    public function test_me_and_logout_work(): void
    {
        $user = User::factory()->create();
        $user->preferences()->create();
        $token = $user->createToken('test')->plainTextToken;

        $this->withToken($token)->getJson('/api/me')->assertOk()->assertJsonPath('email', $user->email);
        $this->withToken($token)->postJson('/api/logout')->assertNoContent();
        app('auth')->forgetGuards();
        $this->withToken($token)->getJson('/api/me')->assertUnauthorized();
        $this->assertDatabaseCount('personal_access_tokens', 0);
    }

    public function test_password_change_revokes_other_sessions_but_keeps_the_current_one(): void
    {
        $user = User::factory()->create(['password' => 'old-password']);
        $currentToken = $user->createToken('current')->plainTextToken;
        $user->createToken('other');

        $this->withToken($currentToken)->putJson('/api/settings/password', [
            'currentPassword' => 'old-password',
            'password' => 'a-new-password',
            'password_confirmation' => 'a-new-password',
        ])->assertOk();

        $this->assertCount(1, $user->tokens()->get());
        $this->withToken($currentToken)->getJson('/api/me')->assertOk();
    }

    public function test_password_reset_sends_mail_and_replaces_the_password(): void
    {
        Notification::fake();
        $user = User::factory()->create(['password' => 'old-password']);

        $this->postJson('/api/forgot-password', ['email' => $user->email])
            ->assertOk()
            ->assertJsonPath('message', 'If that email is registered, a reset link is on its way.');
        $this->postJson('/api/forgot-password', ['email' => 'nobody@example.com'])
            ->assertOk();

        $token = null;
        Notification::assertSentTo($user, ResetPassword::class, function (ResetPassword $notification) use (&$token) {
            $token = $notification->token;

            return true;
        });

        $this->postJson('/api/reset-password', [
            'email' => $user->email,
            'token' => $token,
            'password' => 'new-password',
            'password_confirmation' => 'new-password',
        ])->assertOk();

        $this->postJson('/api/login', [
            'email' => $user->email,
            'password' => 'new-password',
        ])->assertOk();
    }

    public function test_account_deletion_requires_password_and_removes_owned_records(): void
    {
        Storage::fake('public');
        $user = User::factory()->create(['password' => 'secret-pass']);
        $imagePath = "profile-images/{$user->id}/avatar.png";
        Storage::disk('public')->put($imagePath, 'image bytes');
        $user->update(['profile_image_path' => $imagePath]);
        $user->preferences()->create(['currency' => 'USD']);
        $account = $user->accounts()->create([
            'name' => 'Checking', 'type' => 'checking', 'balance' => 10,
            'institution' => 'Bank', 'color' => '#111111',
        ]);
        $savings = $user->accounts()->create([
            'name' => 'Savings', 'type' => 'savings', 'balance' => 20,
            'institution' => 'Bank', 'color' => '#222222',
        ]);
        $category = $user->categories()->create([
            'name' => 'Housing', 'type' => 'expense', 'color' => '#333333', 'icon' => 'home',
        ]);
        $user->transfers()->create([
            'from_account_id' => $account->id,
            'to_account_id' => $savings->id,
            'amount' => 5,
            'date' => now()->toDateString(),
            'status' => 'completed',
        ]);
        $user->recurringTransactions()->create([
            'account_id' => $account->id,
            'category_id' => $category->id,
            'merchant' => 'Rent',
            'amount' => 5,
            'type' => 'expense',
            'frequency' => 'monthly',
            'start_date' => now()->toDateString(),
            'next_due_date' => now()->toDateString(),
        ]);
        $user->emailChangeRequest()->create([
            'new_email' => 'next@example.com',
            'token_hash' => hash('sha256', 'token'),
            'expires_at' => now()->addHour(),
        ]);
        Sanctum::actingAs($user);

        $this->deleteJson('/api/me', ['password' => 'wrong-password'])->assertUnprocessable();
        $this->deleteJson('/api/me', ['password' => 'secret-pass'])->assertNoContent();
        $this->assertDatabaseMissing('users', ['id' => $user->id]);
        $this->assertDatabaseMissing('accounts', ['id' => $account->id]);
        $this->assertDatabaseCount('account_transfers', 0);
        $this->assertDatabaseCount('recurring_transactions', 0);
        $this->assertDatabaseCount('email_change_requests', 0);
        Storage::disk('public')->assertMissing($imagePath);
    }

    public function test_api_responses_include_security_headers(): void
    {
        $this->getJson('/api/login')->assertStatus(405)
            ->assertHeader('X-Content-Type-Options', 'nosniff')
            ->assertHeader('X-Frame-Options', 'DENY');
    }
}
