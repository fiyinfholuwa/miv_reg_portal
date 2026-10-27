<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        User::updateOrCreate(
            ['email' => env('ADMIN_EMAIL', 'admin@janconf.test')],
            [
                'name' => 'Conference Administrator',
                'password' => Hash::make(env('ADMIN_PASSWORD', 'ChangeThisAdminPassword!')),
                'is_admin' => true,
                'email_verified_at' => now(),
                'role' => 'Admin',
                'approval_status' => 'approved',
            ],
        );

        User::updateOrCreate([
            'email' => 'test@example.com',
        ], [
            'name' => 'Test User',
            'password' => Hash::make('password'),
            'email_verified_at' => now(),
            'role' => 'Delegate',
            'approval_status' => 'approved',
        ]);
    }
}
