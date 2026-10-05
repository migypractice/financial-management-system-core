<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Real Bank Accounts table to eliminate hardcoded balances.
     */
    public function up(): void
    {
        Schema::create('bank_accounts', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('account_name', 100);
            $table->string('bank_name', 100);
            $table->string('account_number', 50);
            $table->string('account_type', 50); // Operating, AP/Payroll, E-Commerce, Reserve
            $table->decimal('beginning_balance', 15, 2)->default(0);
            $table->decimal('current_balance', 15, 2)->default(0);
            $table->string('currency', 3)->default('PHP');
            $table->uuid('chart_of_account_id')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->foreign('chart_of_account_id')->references('id')->on('chart_of_accounts')->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bank_accounts');
    }
};
