<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Phase 1: SmartChain Approved Purchase Order Intake & Tracking Tables.
     * Stores incoming approved procurement POs with stable Financial references,
     * immutable payload snapshots, supplier mapping, and multiple line items.
     */
    public function up(): void
    {
        // 1. purchase_order_sequences table for concurrency-safe sequential financial references
        Schema::create('purchase_order_sequences', function (Blueprint $table) {
            $table->string('prefix', 30)->primary();
            $table->unsignedInteger('last_sequence')->default(0);
            $table->timestamps();
        });

        // 2. purchase_orders table
        Schema::create('purchase_orders', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('financial_reference', 50)->unique();
            $table->string('source_system', 50)->default('SMARTCHAIN');
            $table->string('message_id', 255)->unique();
            $table->string('external_reference_id', 100);
            $table->string('idempotency_key', 255)->nullable()->index();
            $table->string('category_type', 100)->default('INVENTORY_PURCHASE');
            $table->string('currency', 3)->default('PHP');
            $table->decimal('total_amount', 15, 2);

            $table->uuid('supplier_id')->nullable();
            $table->string('supplier_code', 100)->nullable();
            $table->string('supplier_name', 255);

            $table->string('receipt_status', 50)->default('RECEIVED');
            $table->string('processing_status', 50)->default('PENDING_REVIEW');

            $table->string('payload_hash', 64)->index();
            $table->json('raw_payload');
            $table->json('metadata')->nullable();

            $table->timestamp('received_at')->useCurrent();
            $table->timestamps();

            $table->foreign('supplier_id')->references('id')->on('suppliers')->onDelete('set null');
            $table->unique(['source_system', 'external_reference_id'], 'po_source_external_unique');
            $table->index(['source_system', 'receipt_status']);
            $table->index('processing_status');
        });

        // 3. purchase_order_lines table for itemized PO lines
        Schema::create('purchase_order_lines', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('purchase_order_id');
            $table->string('source_po_line_id', 100)->nullable();
            $table->string('product_id', 100);
            $table->string('product_name', 255);
            $table->decimal('quantity', 15, 4);
            $table->string('unit', 20);
            $table->decimal('unit_price', 15, 2);
            $table->decimal('line_total', 15, 2);
            $table->timestamps();

            $table->foreign('purchase_order_id')->references('id')->on('purchase_orders')->onDelete('cascade');
            $table->index('purchase_order_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('purchase_order_lines');
        Schema::dropIfExists('purchase_orders');
        Schema::dropIfExists('purchase_order_sequences');
    }
};

