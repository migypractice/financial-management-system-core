<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     *
     * Run with: php artisan db:seed
     * Or fresh: php artisan migrate:fresh --seed
     */
    public function run(): void
    {
        // Transactions (25+ realistic hardware-store records)
        $this->call([
            TransactionSeeder::class,
        ]);
    }
}
