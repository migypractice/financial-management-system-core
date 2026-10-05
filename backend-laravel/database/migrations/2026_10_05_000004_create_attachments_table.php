<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Polymorphic file attachments table for supporting documents:
     * - Supplier Invoice, Official Receipt, Billing Statement, Payment Proof,
     *   Deposit Slip, Delivery Receipt, Payroll Register.
     */
    public function up(): void
    {
        Schema::create('attachments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('attachable_type', 100); // App\Models\ApBill, App\Models\PaymentRequest, etc.
            $table->uuid('attachable_id');
            $table->string('file_name');
            $table->string('file_path');
            $table->string('mime_type', 100);
            $table->unsignedBigInteger('file_size');
            $table->string('document_type', 50)->default('SUPPORTING_DOCUMENT');
            $table->uuid('uploaded_by')->nullable();
            $table->timestamps();

            $table->foreign('uploaded_by')->references('id')->on('users')->onDelete('set null');
            $table->index(['attachable_type', 'attachable_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('attachments');
    }
};
