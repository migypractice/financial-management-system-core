<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('ai_logs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('transaction_id');
            $table->decimal('anomaly_score', 5, 2); // Score between 0.00 and 100.00 or 0.00 and 1.00
            $table->string('ai_decision'); // e.g., 'FLAGGED_HIGH_RISK', 'PASSED_AUTOMATED_CHECK'
            $table->text('flag_reason')->nullable();
            $table->timestamps();

            // Foreign Key Constraint referencing transactions.id
            $table->foreign('transaction_id')->references('id')->on('transactions')->onDelete('cascade');
            $table->index(['transaction_id', 'ai_decision']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ai_logs');
    }
};
