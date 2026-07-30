<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Create the journal_entries table.
     *
     * A journal entry is created when a human approves a transaction via the
     * Maker-Checker workflow. Each entry represents a double-entry accounting
     * record posted to the General Ledger. This table is written to exclusively
     * by FinancialService::postTransactionToGeneralLedger().
     */
    public function up(): void
    {
        Schema::create('journal_entries', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('transaction_id');
            $table->string('entry_number')->unique();
            $table->date('entry_date');
            $table->enum('status', ['DRAFT', 'POSTED', 'REVERSED'])->default('DRAFT');
            $table->timestamps();

            $table->foreign('transaction_id')->references('id')->on('transactions')->onDelete('cascade');
            $table->index(['transaction_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('journal_entries');
    }
};
