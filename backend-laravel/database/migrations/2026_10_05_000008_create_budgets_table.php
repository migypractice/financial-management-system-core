<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Database-driven Budgets table:
     * Stores planned allocation per category and period.
     * Actual spending is dynamically computed from real posted disbursements.
     */
    public function up(): void
    {
        Schema::create('budgets', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('department', 100);
            $table->string('category', 100);
            $table->string('fiscal_year', 10)->default('2026');
            $table->string('period', 20)->default('FY2026'); // FY2026, 2026-Q1, 2026-10
            $table->decimal('allocated_amount', 15, 2);
            $table->uuid('chart_of_account_id')->nullable();
            $table->text('notes')->nullable();
            $table->uuid('created_by')->nullable();
            $table->timestamps();

            $table->foreign('chart_of_account_id')->references('id')->on('chart_of_accounts')->onDelete('set null');
            $table->foreign('created_by')->references('id')->on('users')->onDelete('set null');
            $table->unique(['department', 'category', 'period']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('budgets');
    }
};
