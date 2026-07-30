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
        // Get role UUIDs
        $superAdminRole = \App\Models\Role::where('slug', 'super_admin')->first();
        $financeManagerRole = \App\Models\Role::where('slug', 'finance_manager')->first();
        $departmentViewerRole = \App\Models\Role::where('slug', 'department_viewer')->first();

        // Create Users
        if ($superAdminRole && !\App\Models\User::where('email', 'admin@hw.com')->exists()) {
            \App\Models\User::create([
                'name' => 'System Admin',
                'email' => 'admin@hw.com',
                'password' => \Illuminate\Support\Facades\Hash::make('password123'),
                'role_id' => $superAdminRole->id,
                'department' => 'Executive',
            ]);
        }

        if ($financeManagerRole && !\App\Models\User::where('email', 'manager@hw.com')->exists()) {
            \App\Models\User::create([
                'name' => 'Finance Manager',
                'email' => 'manager@hw.com',
                'password' => \Illuminate\Support\Facades\Hash::make('password123'),
                'role_id' => $financeManagerRole->id,
                'department' => 'Finance',
            ]);
        }

        if ($departmentViewerRole && !\App\Models\User::where('email', 'staff@hw.com')->exists()) {
            \App\Models\User::create([
                'name' => 'HR Staff',
                'email' => 'staff@hw.com',
                'password' => \Illuminate\Support\Facades\Hash::make('password123'),
                'role_id' => $departmentViewerRole->id,
                'department' => 'HR',
            ]);
        }

        // Transactions (25+ realistic hardware-store records)
        $this->call([
            TransactionSeeder::class,
        ]);
    }
}
