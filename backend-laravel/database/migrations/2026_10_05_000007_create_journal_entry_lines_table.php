<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Balanced double-entry journal lines (debit & credit per account).
     * Enforces PostgreSQL-level immutability once the parent entry is POSTED.
     */
    public function up(): void
    {
        Schema::create('journal_entry_lines', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('journal_entry_id');
            $table->uuid('chart_of_account_id');
            $table->decimal('debit', 15, 2)->default(0);
            $table->decimal('credit', 15, 2)->default(0);
            $table->string('description')->nullable();
            $table->timestamps();

            $table->foreign('journal_entry_id')->references('id')->on('journal_entries')->onDelete('cascade');
            $table->foreign('chart_of_account_id')->references('id')->on('chart_of_accounts')->onDelete('restrict');
            $table->index(['journal_entry_id', 'chart_of_account_id']);
        });

        if (DB::connection()->getDriverName() === 'pgsql') {
            DB::unprepared("
                CREATE OR REPLACE FUNCTION check_journal_entry_line_immutability()
                RETURNS TRIGGER AS $$
                DECLARE
                    parent_status VARCHAR;
                BEGIN
                    SELECT status INTO parent_status FROM journal_entries WHERE id = COALESCE(OLD.journal_entry_id, NEW.journal_entry_id);
                    IF (parent_status = 'POSTED') THEN
                        RAISE EXCEPTION 'Journal entry lines are immutable once the parent journal entry is POSTED.';
                    END IF;
                    RETURN NEW;
                END;
                $$ LANGUAGE plpgsql;

                CREATE TRIGGER trg_enforce_journal_line_immutability
                BEFORE UPDATE OR DELETE ON journal_entry_lines
                FOR EACH ROW
                EXECUTE FUNCTION check_journal_entry_line_immutability();
            ");
        }
    }

    public function down(): void
    {
        if (DB::connection()->getDriverName() === 'pgsql') {
            DB::unprepared("DROP TRIGGER IF EXISTS trg_enforce_journal_line_immutability ON journal_entry_lines;");
            DB::unprepared("DROP FUNCTION IF EXISTS check_journal_entry_line_immutability();");
        }

        Schema::dropIfExists('journal_entry_lines');
    }
};
