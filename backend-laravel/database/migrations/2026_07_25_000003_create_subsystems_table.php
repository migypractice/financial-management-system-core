<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('subsystems', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->string('slug')->unique(); // 'general-ledger', 'accounts-payable', etc.
            $table->timestamps();
        });

        // Seed 9 Core Owned Financial Subsystems
        $modules = [
            ['name' => 'General Ledger (GL)', 'slug' => 'general-ledger'],
            ['name' => 'Accounts Payable (AP)', 'slug' => 'accounts-payable'],
            ['name' => 'Accounts Receivable (AR)', 'slug' => 'accounts-receivable'],
            ['name' => 'Disbursement Management', 'slug' => 'disbursement-management'],
            ['name' => 'Collection Management', 'slug' => 'collection-management'],
            ['name' => 'Budget Management', 'slug' => 'budget-management'],
            ['name' => 'Cash Management', 'slug' => 'cash-management'],
            ['name' => 'Tax Management', 'slug' => 'tax-management'],
            ['name' => 'Financial Reporting', 'slug' => 'financial-reporting'],
        ];

        foreach ($modules as $mod) {
            DB::table('subsystems')->insert([
                'id' => (string) Str::uuid(),
                'name' => $mod['name'],
                'slug' => $mod['slug'],
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('subsystems');
    }
};
