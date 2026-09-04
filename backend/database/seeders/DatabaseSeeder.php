<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     *
     * Model events stay enabled here. Muting them skips Account::creating, which is
     * what keeps opening_balance in step with balance, and seeded accounts then read
     * as drifted under ledger:reconcile.
     */
    public function run(): void
    {
        if (app()->environment('local')) {
            $this->call(DemoUserSeeder::class);
        }
    }
}
