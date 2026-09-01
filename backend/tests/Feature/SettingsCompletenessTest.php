<?php

namespace Tests\Feature;

use App\Models\EmailChangeRequest;
use App\Models\User;
use App\Notifications\ConfirmEmailChange;
use App\Notifications\EmailChangeRequested;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SettingsCompletenessTest extends TestCase
{
    use RefreshDatabase;

    public function test_locale_preferences_are_exposed_updated_and_validated(): void
    {
        $user = User::factory()->create();
        $user->preferences()->create();
        Sanctum::actingAs($user);

        $this->getJson('/api/settings')->assertOk()
            ->assertJsonPath('user.currency', 'USD')
            ->assertJsonPath('user.locale', 'en-US')
            ->assertJsonPath('user.timezone', 'UTC')
            ->assertJsonPath('user.weekStart', 'mon');

        $this->putJson('/api/settings/preferences', [
            'locale' => 'fr-FR',
            'timezone' => 'Europe/Paris',
            'weekStart' => 'sun',
        ])->assertOk()
            ->assertJsonPath('user.locale', 'fr-FR')
            ->assertJsonPath('user.timezone', 'Europe/Paris')
            ->assertJsonPath('user.weekStart', 'sun')
            ->assertJsonPath('user.currency', 'USD');

        $this->putJson('/api/settings/preferences', [
            'locale' => 'not-a-locale',
            'timezone' => 'Mars/Olympus',
            'weekStart' => 'fri',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['locale', 'timezone', 'weekStart']);
    }

    public function test_profile_updates_name_without_mutating_email(): void
    {
        $user = User::factory()->create(['email' => 'old@example.com']);
        $user->preferences()->create();
        Sanctum::actingAs($user);

        $this->putJson('/api/settings/profile', [
            'name' => 'Updated Name',
            'email' => 'ignored@example.com',
        ])->assertOk()
            ->assertJsonPath('user.name', 'Updated Name')
            ->assertJsonPath('user.email', 'old@example.com');

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'email' => 'old@example.com',
        ]);
    }

    public function test_email_change_request_requires_password_and_notifies_both_addresses(): void
    {
        Notification::fake();
        $user = User::factory()->create([
            'email' => 'old@example.com',
            'password' => 'password123',
        ]);
        Sanctum::actingAs($user);

        $this->postJson('/api/settings/email-change', [
            'email' => 'new@example.com',
            'currentPassword' => 'wrong',
        ])->assertUnprocessable()->assertJsonValidationErrors('currentPassword');

        $response = $this->postJson('/api/settings/email-change', [
            'email' => 'NEW@example.com',
            'currentPassword' => 'password123',
        ])->assertCreated()
            ->assertJsonPath('emailChange.email', 'new@example.com')
            ->assertJsonStructure(['emailChange' => ['id', 'email', 'expiresAt', 'createdAt']]);

        $token = $this->confirmationTokenFor('new@example.com');
        $this->assertNotSame($token, EmailChangeRequest::findOrFail($response['emailChange']['id'])->token_hash);
        $this->assertDatabaseHas('users', ['id' => $user->id, 'email' => 'old@example.com']);
        Notification::assertSentTo($user, EmailChangeRequested::class);

        $this->getJson('/api/settings/email-change')->assertOk()
            ->assertJsonPath('emailChange.email', 'new@example.com');
    }

    public function test_email_change_stays_inactive_until_successful_confirmation(): void
    {
        Notification::fake();
        $user = User::factory()->create([
            'email' => 'old@example.com',
            'password' => 'password123',
        ]);
        Sanctum::actingAs($user);
        $this->postJson('/api/settings/email-change', [
            'email' => 'new@example.com',
            'currentPassword' => 'password123',
        ])->assertCreated();
        $token = $this->confirmationTokenFor('new@example.com');
        $user->createToken('existing-session');

        $this->assertDatabaseHas('users', ['id' => $user->id, 'email' => 'old@example.com']);
        $this->postJson('/api/email-change/confirm', ['token' => $token])
            ->assertOk()
            ->assertJsonPath('message', 'Email address changed successfully.');
        $this->assertDatabaseHas('users', ['id' => $user->id, 'email' => 'new@example.com']);
        $this->assertDatabaseHas('email_change_requests', [
            'user_id' => $user->id,
            'new_email' => 'new@example.com',
        ]);
        $this->assertNotNull($user->emailChangeRequest()->first()->confirmed_at);
        $this->assertCount(0, $user->tokens()->get());
    }

    public function test_expired_and_duplicate_email_changes_are_rejected(): void
    {
        Notification::fake();
        $other = User::factory()->create(['email' => 'taken@example.com']);
        $user = User::factory()->create(['password' => 'password123']);
        Sanctum::actingAs($user);

        $this->postJson('/api/settings/email-change', [
            'email' => $other->email,
            'currentPassword' => 'password123',
        ])->assertUnprocessable()->assertJsonValidationErrors('email');

        $this->postJson('/api/settings/email-change', [
            'email' => 'available@example.com',
            'currentPassword' => 'password123',
        ])->assertCreated();
        $token = $this->confirmationTokenFor('available@example.com');

        $this->travel(61)->minutes();
        $this->postJson('/api/email-change/confirm', ['token' => $token])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('token');
        $this->assertDatabaseHas('users', ['id' => $user->id, 'email' => $user->email]);
    }

    public function test_pending_email_changes_and_cancellation_are_isolated_by_user(): void
    {
        Notification::fake();
        $owner = User::factory()->create(['password' => 'password123']);
        $stranger = User::factory()->create();

        Sanctum::actingAs($owner);
        $this->postJson('/api/settings/email-change', [
            'email' => 'owner-new@example.com',
            'currentPassword' => 'password123',
        ])->assertCreated();

        Sanctum::actingAs($stranger);
        $this->getJson('/api/settings/email-change')->assertOk()->assertJsonPath('emailChange', null);
        $this->deleteJson('/api/settings/email-change')->assertNoContent();
        $this->assertDatabaseHas('email_change_requests', [
            'user_id' => $owner->id,
            'new_email' => 'owner-new@example.com',
        ]);

        Sanctum::actingAs($owner);
        $this->deleteJson('/api/settings/email-change')->assertNoContent();
        $this->assertDatabaseMissing('email_change_requests', ['user_id' => $owner->id]);
    }

    private function confirmationTokenFor(string $email): string
    {
        $token = null;
        Notification::assertSentOnDemand(
            ConfirmEmailChange::class,
            function (ConfirmEmailChange $notification, array $channels, object $notifiable) use ($email, &$token) {
                if (($notifiable->routes['mail'] ?? null) !== $email) {
                    return false;
                }

                $token = $notification->token;

                return true;
            },
        );

        return $token;
    }
}
