<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('ap_bills') && !Schema::hasColumn('ap_bills', 'journal_entry_id')) {
            Schema::table('ap_bills', function (Blueprint $table) {
                $table->uuid('journal_entry_id')->nullable()->after('created_by');
                $table->foreign('journal_entry_id')->references('id')->on('journal_entries')->onDelete('set null');
            });
        }

        if (Schema::hasTable('ar_invoices') && !Schema::hasColumn('ar_invoices', 'journal_entry_id')) {
            Schema::table('ar_invoices', function (Blueprint $table) {
                $table->uuid('journal_entry_id')->nullable()->after('created_by');
                $table->foreign('journal_entry_id')->references('id')->on('journal_entries')->onDelete('set null');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('ap_bills') && Schema::hasColumn('ap_bills', 'journal_entry_id')) {
            Schema::table('ap_bills', function (Blueprint $table) {
                $table->dropForeign(['journal_entry_id']);
                $table->dropColumn('journal_entry_id');
            });
        }

        if (Schema::hasTable('ar_invoices') && Schema::hasColumn('ar_invoices', 'journal_entry_id')) {
            Schema::table('ar_invoices', function (Blueprint $table) {
                $table->dropForeign(['journal_entry_id']);
                $table->dropColumn('journal_entry_id');
            });
        }
    }
};
