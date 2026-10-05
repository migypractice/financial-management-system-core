<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Accounts Payable workflow tables:
     * 1. ap_bills (Obligations owed to suppliers)
     * 2. payment_requests (Formal voucher request with mandatory attachment)
     * 3. disbursements (Actual cash release)
     */
    public function up(): void
    {
        Schema::create('ap_bills', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('bill_number', 50)->unique();
            $table->uuid('supplier_id');
            $table->uuid('chart_of_account_id')->nullable(); // Expense / Inventory account
            $table->date('bill_date');
            $table->date('due_date');
            $table->decimal('total_amount', 15, 2);
            $table->decimal('paid_amount', 15, 2)->default(0);
            $table->decimal('balance', 15, 2);
            $table->string('category_type', 100)->default('SUPPLIER_INVOICE');
            $table->text('description');
            $table->enum('status', ['UNPAID', 'PARTIAL', 'PAID', 'OVERDUE'])->default('UNPAID');
            $table->uuid('created_by')->nullable();
            $table->timestamps();

            $table->foreign('supplier_id')->references('id')->on('suppliers')->onDelete('restrict');
            $table->foreign('chart_of_account_id')->references('id')->on('chart_of_accounts')->onDelete('set null');
            $table->foreign('created_by')->references('id')->on('users')->onDelete('set null');
            $table->index(['status', 'due_date']);
        });

        Schema::create('payment_requests', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('request_number', 50)->unique();
            $table->uuid('ap_bill_id')->nullable();
            $table->string('payee_name', 150);
            $table->decimal('amount', 15, 2);
            $table->text('purpose');
            $table->uuid('requested_by');
            $table->enum('status', ['PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'DISBURSED'])->default('PENDING_APPROVAL');
            $table->uuid('approved_by')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->text('rejection_reason')->nullable();
            $table->decimal('ai_confidence_score', 5, 4)->nullable();
            $table->boolean('ai_anomaly_flag')->default(false);
            $table->text('ai_anomaly_reason')->nullable();
            $table->uuid('transaction_id')->nullable();
            $table->timestamps();

            $table->foreign('ap_bill_id')->references('id')->on('ap_bills')->onDelete('set null');
            $table->foreign('requested_by')->references('id')->on('users')->onDelete('restrict');
            $table->foreign('approved_by')->references('id')->on('users')->onDelete('set null');
            $table->foreign('transaction_id')->references('id')->on('transactions')->onDelete('set null');
            $table->index(['status', 'created_at']);
        });

        Schema::create('disbursements', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('disbursement_number', 50)->unique();
            $table->uuid('payment_request_id');
            $table->uuid('bank_account_id');
            $table->decimal('amount', 15, 2);
            $table->date('disbursement_date');
            $table->string('payment_method', 50)->default('BANK_TRANSFER'); // CHECK, BANK_TRANSFER, ONLINE, CASH
            $table->string('reference_number', 100)->nullable();
            $table->uuid('disbursed_by');
            $table->uuid('journal_entry_id')->nullable();
            $table->timestamps();

            $table->foreign('payment_request_id')->references('id')->on('payment_requests')->onDelete('restrict');
            $table->foreign('bank_account_id')->references('id')->on('bank_accounts')->onDelete('restrict');
            $table->foreign('disbursed_by')->references('id')->on('users')->onDelete('restrict');
            $table->foreign('journal_entry_id')->references('id')->on('journal_entries')->onDelete('set null');
            $table->index('disbursement_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('disbursements');
        Schema::dropIfExists('payment_requests');
        Schema::dropIfExists('ap_bills');
    }
};
