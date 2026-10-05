<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Accounts Receivable workflow tables:
     * 1. ar_invoices (Money to collect from customers)
     * 2. collections (Payment received from customers, Cash In)
     */
    public function up(): void
    {
        Schema::create('ar_invoices', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('invoice_number', 50)->unique();
            $table->uuid('customer_id');
            $table->uuid('chart_of_account_id')->nullable(); // Revenue account
            $table->date('invoice_date');
            $table->date('due_date');
            $table->decimal('total_amount', 15, 2);
            $table->decimal('paid_amount', 15, 2)->default(0);
            $table->decimal('balance', 15, 2);
            $table->text('description');
            $table->enum('status', ['UNPAID', 'PARTIAL', 'PAID', 'OVERDUE'])->default('UNPAID');
            $table->uuid('created_by')->nullable();
            $table->timestamps();

            $table->foreign('customer_id')->references('id')->on('customers')->onDelete('restrict');
            $table->foreign('chart_of_account_id')->references('id')->on('chart_of_accounts')->onDelete('set null');
            $table->foreign('created_by')->references('id')->on('users')->onDelete('set null');
            $table->index(['status', 'due_date']);
        });

        Schema::create('collections', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('collection_number', 50)->unique();
            $table->uuid('ar_invoice_id');
            $table->uuid('bank_account_id');
            $table->decimal('amount', 15, 2);
            $table->date('collection_date');
            $table->string('payment_method', 50)->default('BANK_TRANSFER'); // CASH, CHECK, BANK_TRANSFER, GCASH
            $table->string('reference_number', 100)->nullable();
            $table->uuid('collected_by');
            $table->uuid('journal_entry_id')->nullable();
            $table->timestamps();

            $table->foreign('ar_invoice_id')->references('id')->on('ar_invoices')->onDelete('restrict');
            $table->foreign('bank_account_id')->references('id')->on('bank_accounts')->onDelete('restrict');
            $table->foreign('collected_by')->references('id')->on('users')->onDelete('restrict');
            $table->foreign('journal_entry_id')->references('id')->on('journal_entries')->onDelete('set null');
            $table->index('collection_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('collections');
        Schema::dropIfExists('ar_invoices');
    }
};
