<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Backs concurrency-safe journal entry numbering.
 *
 * Previously, FinancialService computed the next JE-YYYYMM-NNNN sequence by
 * reading MAX(entry_number) from journal_entries with no lock — two
 * transactions approved at the same instant, in the same month, before
 * either had a journal entry yet, could both compute the same number and
 * collide on the unique constraint. This table gives the sequence its own
 * row per period so it can be locked (SELECT ... FOR UPDATE) independently
 * of whether any journal_entries rows exist yet for that period.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('journal_entry_sequences', function (Blueprint $table) {
            $table->string('period', 6)->primary(); // YYYYMM
            $table->unsignedInteger('last_sequence')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('journal_entry_sequences');
    }
};
