<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\ShopProduct;
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

        $products = [
            ['name' => 'Revival hoodie', 'price' => 20000, 'image' => '/images/merch/revival-hoodie.jpg', 'tag' => 'Limited set', 'sort_order' => 1],
            ['name' => 'Revival polo', 'price' => 13000, 'image' => '/images/merch/revival-polo-navy.jpg', 'tag' => 'Official merch', 'sort_order' => 2],
            ['name' => 'Revival baseball shirt', 'price' => 16000, 'image' => '/images/merch/revival-baseball.jpg', 'tag' => 'Faith collection', 'sort_order' => 3],
            ['name' => 'Revival T-shirt', 'price' => 13000, 'image' => '/images/merch/revival-tee.jpg', 'tag' => 'New', 'sort_order' => 4],
        ];

        foreach ($products as $product) {
            ShopProduct::updateOrCreate(['name' => $product['name']], [...$product, 'active' => true]);
        }
    }
}
