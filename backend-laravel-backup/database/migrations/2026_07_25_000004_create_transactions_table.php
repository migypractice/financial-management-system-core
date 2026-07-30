<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Create the transactions table.
     *
     * This is the central financial record for every inbound/outbound money movement
     * processed through the Transaction Core. Each row represents a single transaction
     * received from an external module, evaluated by the AI engine, and awaiting
     * human approval via the Maker-Checker workflow.
     */
    public function up(): void
    {
        Schema::create('transactions', function (Blueprint $table) {
            // Primary key
            $table->uuid('id')->primary();
            $table->string('transaction_code')->unique();
            $table->string('idempotency_key')->unique()->nullable();

            // Relationship to internal subsystem
            $table->uuid('subsystem_id');

            // External module origin
            $table->string('source_module');           // HRMS, FLEET, SUPPLY_CHAIN, FACILITIES_LEGAL, ECOMMERCE_CORE
            $table->string('external_reference_id');   // PO number, payroll batch ID, order ID, etc.

            // Financial data — strict DECIMAL(15,2) for currency precision
            $table->enum('type', ['INCOME', 'EXPENSE']);
            $table->decimal('amount', 15, 2);
            $table->decimal('tax_amount', 15, 2)->default(0);
            $table->decimal('fee_amount', 15, 2)->default(0);
            $table->decimal('net_amount', 15, 2)->default(0);
            $table->string('currency', 3)->default('PHP');

            // Description and flexible metadata
            $table->text('description');
            $table->json('metadata')->nullable();

            // Maker-Checker workflow status
            $table->enum('status', [
                'pending_approval',
                'ai_flagged',
                'approved',
                'rejected',
                'posted',
                'disbursed',
            ])->default('pending_approval');

            // AI evaluation results (set by AIService)
            $table->decimal('ai_confidence_score', 5, 4)->nullable();
            $table->string('ai_suggested_gl_code')->nullable();
            $table->string('ai_suggested_gl_name')->nullable();
            $table->boolean('ai_anomaly_flag')->default(false);
            $table->text('ai_anomaly_reason')->nullable();

            // Human approval tracking (set by FinancialService)
            $table->uuid('approved_by')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->timestamp('posted_at')->nullable();

            $table->timestamps();

            // Foreign keys
            $table->foreign('subsystem_id')->references('id')->on('subsystems')->onDelete('cascade');
            $table->foreign('approved_by')->references('id')->on('users')->onDelete('set null');

            // Indexes for common query patterns
            $table->index(['source_module', 'status']);
            $table->index(['subsystem_id', 'type']);
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('transactions');
    }
};
