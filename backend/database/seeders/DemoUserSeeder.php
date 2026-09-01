<?php

namespace Database\Seeders;

use App\Models\User;
use App\Services\TransactionService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DemoUserSeeder extends Seeder
{
    public function run(): void
    {
        if (! app()->environment('local')) {
            $this->command?->warn('DemoUserSeeder runs only in the local environment.');

            return;
        }

        $user = User::updateOrCreate(
            ['email' => 'alex@balancil.app'],
            ['name' => 'Alex Morgan', 'password' => Hash::make('balancil123')]
        );
        if ($user->preferences()->doesntExist()) {
            $user->preferences()->create(['currency' => 'USD']);
        }
        if ($user->categories()->doesntExist()) {
            foreach ([
                ['Salary', 'income', '#16a34a', 'briefcase'],
                ['Food', 'expense', '#ea580c', 'utensils'],
                ['Housing', 'expense', '#7c3aed', 'home'],
                ['Transport', 'expense', '#2563eb', 'car'],
            ] as [$name, $type, $color, $icon]) {
                $user->categories()->create(compact('name', 'type', 'color', 'icon'));
            }
        }
        if ($user->accounts()->exists()) {
            return;
        }

        $checking = $user->accounts()->create([
            'name' => 'Everyday Checking', 'type' => 'checking', 'balance' => 3000,
            'institution' => 'Harbor Trust', 'color' => '#2563eb',
        ]);
        $user->accounts()->create([
            'name' => 'Rainy Day', 'type' => 'savings', 'balance' => 8000,
            'institution' => 'Harbor Trust', 'color' => '#16a34a',
        ]);
        $service = app(TransactionService::class);
        foreach ([
            ['Paycheck', 'Monthly salary', 5200, 'income', 'Salary', $checking, now()->subDays(10)],
            ['Grocery Market', 'Weekly groceries', 146.30, 'expense', 'Food', $checking, now()->subDays(4)],
            ['Apartment Rent', 'Monthly rent', 1650, 'expense', 'Housing', $checking, now()->subDays(2)],
        ] as [$merchant, $description, $amount, $type, $category, $account, $date]) {
            $service->create($user, [
                'merchant' => $merchant, 'description' => $description, 'amount' => $amount,
                'type' => $type, 'categoryId' => $user->categories()->where('name', $category)->value('id'),
                'accountId' => $account->id, 'date' => $date->toDateString(), 'status' => 'completed',
            ]);
        }
        $user->budgets()->create([
            'category_id' => $user->categories()->where('name', 'Food')->value('id'),
            'limit' => 600, 'period' => 'monthly',
        ]);
        $user->goals()->create([
            'name' => 'Emergency fund', 'target' => 15000, 'saved' => 8000,
            'deadline' => now()->addYear(), 'color' => '#16a34a',
        ]);
    }
}
