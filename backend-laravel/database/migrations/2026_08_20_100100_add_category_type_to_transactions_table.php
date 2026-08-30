<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Persists the caller-supplied category_type so idempotency-key reuse can be
 * validated against it. Previously category_type was used transiently for AI
 * evaluation and GL mapping but never stored, so a repeated idempotency key
 * with a different category_type could not be detected as a payload mismatch.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->string('category_type', 100)->nullable()->after('source_module');
        });
    }

    public function down(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->dropColumn('category_type');
        });
    }
};
