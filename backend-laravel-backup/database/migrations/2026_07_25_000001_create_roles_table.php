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
        Schema::create('roles', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name')->unique();
            $table->string('slug')->unique(); // 'super_admin', 'finance_manager', 'department_viewer'
            $table->text('description')->nullable();
            $table->timestamps();
        });

        // Seed Default RBAC Roles
        DB::table('roles')->insert([
            [
                'id' => (string) Str::uuid(),
                'name' => 'Super Admin',
                'slug' => 'super_admin',
                'description' => 'Full access to financial settings, security configurations, and final payout approvals.',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'id' => (string) Str::uuid(),
                'name' => 'Finance Manager',
                'slug' => 'finance_manager',
                'description' => 'Can view reports, manage budgets, and review/approve AI-flagged transactions.',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'id' => (string) Str::uuid(),
                'name' => 'Department Viewer',
                'slug' => 'department_viewer',
                'description' => 'Read-only access strictly restricted to their department budget and disbursement status.',
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('roles');
    }
};
