<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class DemoSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_the_seeded_demo_ledger_reconciles(): void
    {
        $this->seedDemoUser();
        $user = $this->actAsDemoUser();

        $this->assertSame(4, $user->categories()->count());
        $this->assertSame(2, $user->accounts()->count());
        $this->assertSame(3, $user->transactions()->count());

        // Reproduces two real breaks. Seeding with model events muted skipped
        // Account::creating, so opening_balance stayed at zero and every demo account
        // read as drifted; and seeding unauthenticated hit the fail-closed owner scope,
        // so the service could not resolve the categories it had just written.
        $this->artisan('ledger:reconcile')
            ->expectsOutputToContain('All account balances match their ledgers.')
            ->assertSuccessful();
    }

    public function test_seeding_twice_leaves_one_demo_ledger(): void
    {
        $this->seedDemoUser();
        $this->seedDemoUser();

        $user = $this->actAsDemoUser();

        $this->assertSame(1, User::where('email', 'alex@balancil.app')->count());
        $this->assertSame(4, $user->categories()->count());
        $this->assertSame(2, $user->accounts()->count());
        $this->assertSame(3, $user->transactions()->count());
        $this->artisan('ledger:reconcile')->assertSuccessful();
    }

    public function test_the_demo_user_is_never_seeded_outside_local(): void
    {
        $this->app->detectEnvironment(fn () => 'production');

        $this->artisan('db:seed --force')->assertSuccessful();

        $this->assertSame(0, User::where('email', 'alex@balancil.app')->count());
    }

    /** The seeder is deliberately local-only, so the environment has to say so. */
    private function seedDemoUser(): void
    {
        $this->app->detectEnvironment(fn () => 'local');
        $this->artisan('db:seed --force')->assertSuccessful();
    }

    /** Owned records are only readable as their owner, so every count below needs this. */
    private function actAsDemoUser(): User
    {
        $user = User::where('email', 'alex@balancil.app')->firstOrFail();
        Sanctum::actingAs($user);

        return $user;
    }
}
