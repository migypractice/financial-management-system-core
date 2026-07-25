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
        Schema::create('transactions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('subsystem_id');
            $table->string('source_module'); // HRMS, Fleet, Supply Chain, Facilities & Legal, E-Commerce Core
            $table->enum('type', ['INCOME', 'EXPENSE']);
            $table->decimal('amount', 15, 2); // Exact currency calculations
            $table->text('description');
            $table->enum('status', ['pending_approval', 'approved', 'rejected', 'ai_flagged'])->default('pending_approval');
            $table->uuid('approved_by')->nullable();
            $table->timestamps();

            // Foreign Key Constraints
            $table->foreign('subsystem_id')->references('id')->on('subsystems')->onDelete('cascade');
            $table->foreign('approved_by')->references('id')->on('users')->onDelete('set null');

            // Indexes for fast lookup
            $table->index(['subsystem_id', 'source_module', 'type', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('transactions');
    }
};
