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
                'username' => 'admin01',
                'email' => 'admin@hw.com',
                'password' => \Illuminate\Support\Facades\Hash::make('Admin@2026'),
                'role_id' => $superAdminRole->id,
                'department' => 'Executive',
            ]);
        }

        if ($financeManagerRole && !\App\Models\User::where('email', 'manager@hw.com')->exists()) {
            \App\Models\User::create([
                'name' => 'Finance Manager',
                'username' => 'manager01',
                'email' => 'manager@hw.com',
                'password' => \Illuminate\Support\Facades\Hash::make('Manager@2026'),
                'role_id' => $financeManagerRole->id,
                'department' => 'Finance',
            ]);
        }

        if ($departmentViewerRole && !\App\Models\User::where('email', 'staff@hw.com')->exists()) {
            \App\Models\User::create([
                'name' => 'HR Staff',
                'username' => 'staff01',
                'email' => 'staff@hw.com',
                'password' => \Illuminate\Support\Facades\Hash::make('Staff@2026'),
                'role_id' => $departmentViewerRole->id,
                'department' => 'HR',
            ]);
        }

        // Demo User 1 with 2FA / OTP: ferrerasmigy@gmail.com
        if ($superAdminRole && !\App\Models\User::where('email', 'ferrerasmigy@gmail.com')->exists()) {
            \App\Models\User::create([
                'name' => 'Migy Ferreras',
                'username' => 'ferrerasmigy',
                'email' => 'ferrerasmigy@gmail.com',
                'password' => \Illuminate\Support\Facades\Hash::make('Admintesting123'),
                'role_id' => $superAdminRole->id,
                'department' => 'Executive',
            ]);
        }

        // Demo User 2 with 2FA / OTP: rexsemerebot@gmail.com
        if ($financeManagerRole && !\App\Models\User::where('email', 'rexsemerebot@gmail.com')->exists()) {
            \App\Models\User::create([
                'name' => 'Rex Semerebot',
                'username' => 'rexsemerebot',
                'email' => 'rexsemerebot@gmail.com',
                'password' => \Illuminate\Support\Facades\Hash::make('Admintesting123'),
                'role_id' => $financeManagerRole->id,
                'department' => 'Finance',
            ]);
        }

        // System integration user — used as created_by for M2M ingestion (Maker-Checker).
        // Deliberately NOT super_admin: this account is only ever used for attribution
        // (never logged into), and must carry zero approval/checker privileges so it
        // can never act as its own checker. See the system_integration role migration.
        $systemIntegrationRole = \App\Models\Role::where('slug', 'system_integration')->first();

        if ($systemIntegrationRole && !\App\Models\User::where('email', 'system@hw.com')->exists()) {
            \App\Models\User::create([
                'name' => 'System Integration',
                'username' => 'system01',
                'email' => 'system@hw.com',
                'password' => \Illuminate\Support\Facades\Hash::make(\Illuminate\Support\Str::random(32)),
                'role_id' => $systemIntegrationRole->id,
                'department' => 'System',
            ]);
        }

        // Master Data & Accounting Core Seeders
        $this->call([
            ChartOfAccountsSeeder::class,
            BankAccountSeeder::class,
            CustomerAndSupplierSeeder::class,
            OpeningBalanceSeeder::class,
            AccountsPayableSeeder::class,
            AccountsReceivableSeeder::class,
            TransactionSeeder::class,
        ]);
    }
}
