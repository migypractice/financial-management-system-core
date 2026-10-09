<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Creates budget_allocations table to track historical monthly grants and top-ups per department.
     */
    public function up(): void
    {
        Schema::create('budget_allocations', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('budget_id')->nullable();
            $table->string('department', 100);
            $table->string('category', 100);
            $table->string('fiscal_year', 10)->default('2026');
            $table->string('period', 20)->default('2026-10'); // e.g. 2026-10, 2026-09, FY2026
            $table->decimal('allocated_amount', 15, 2);
            $table->string('action_type', 50)->default('MONTHLY_GRANT'); // MONTHLY_GRANT, TOP_UP, REVISION
            $table->text('notes')->nullable();
            $table->uuid('allocated_by')->nullable();
            $table->timestamps();

            $table->foreign('budget_id')->references('id')->on('budgets')->onDelete('cascade');
            $table->foreign('allocated_by')->references('id')->on('users')->onDelete('set null');
            $table->index(['department', 'period']);
            $table->index(['fiscal_year', 'period']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('budget_allocations');
    }
};
