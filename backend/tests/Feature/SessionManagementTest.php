<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\PersonalAccessToken;
use Tests\TestCase;

class SessionManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_login_and_registration_record_session_metadata(): void
    {
        $registered = $this->withHeader('User-Agent', 'Register Browser')
            ->postJson('/api/register', [
                'name' => 'Jamie Doe',
                'email' => 'jamie@example.com',
                'password' => 'password1234',
                'password_confirmation' => 'password1234',
            ])->assertCreated();

        $registrationToken = PersonalAccessToken::findToken($registered['token']);
        $this->assertSame('127.0.0.1', $registrationToken->ip_address);
        $this->assertSame('Register Browser', $registrationToken->user_agent);

        $loggedIn = $this->withHeader('User-Agent', 'Login Browser')
            ->postJson('/api/login', [
                'email' => 'jamie@example.com',
                'password' => 'password1234',
            ])->assertOk();

        $loginToken = PersonalAccessToken::findToken($loggedIn['token']);
        $this->assertSame('127.0.0.1', $loginToken->ip_address);
        $this->assertSame('Login Browser', $loginToken->user_agent);
    }

    public function test_sessions_can_be_listed_and_other_sessions_deleted(): void
    {
        $user = User::factory()->create(['password' => 'password123']);
        $first = $this->postJson('/api/login', [
            'email' => $user->email,
            'password' => 'password123',
        ])['token'];
        $second = $this->postJson('/api/login', [
            'email' => $user->email,
            'password' => 'password123',
            'remember' => true,
        ])['token'];
        $current = PersonalAccessToken::findToken($second);

        $this->withToken($second)->getJson('/api/sessions')
            ->assertOk()
            ->assertJsonCount(2)
            ->assertJsonFragment([
                'id' => $current->id,
                'name' => 'balancil',
                'isCurrent' => true,
            ])
            ->assertJsonStructure([
                '*' => [
                    'id',
                    'name',
                    'ipAddress',
                    'userAgent',
                    'lastUsedAt',
                    'createdAt',
                    'expiresAt',
                    'isCurrent',
                ],
            ]);

        $this->withToken($second)->deleteJson('/api/sessions/others')->assertNoContent();
        $this->assertDatabaseCount('personal_access_tokens', 1);
        $this->assertDatabaseHas('personal_access_tokens', ['id' => $current->id]);
        $this->assertNull(PersonalAccessToken::findToken($first));
    }

    public function test_a_user_can_delete_the_current_session_but_not_another_users_session(): void
    {
        $user = User::factory()->create(['password' => 'password123']);
        $token = $this->postJson('/api/login', [
            'email' => $user->email,
            'password' => 'password123',
        ])['token'];
        $current = PersonalAccessToken::findToken($token);

        $other = User::factory()->create()->createToken('other')->accessToken;
        $this->withToken($token)->deleteJson('/api/sessions/'.$other->id)->assertNotFound();
        $this->assertDatabaseHas('personal_access_tokens', ['id' => $other->id]);

        $this->withToken($token)->deleteJson('/api/sessions/'.$current->id)->assertNoContent();
        $this->assertDatabaseMissing('personal_access_tokens', ['id' => $current->id]);
    }
}
