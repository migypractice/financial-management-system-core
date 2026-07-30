<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Enforce strict ledger immutability using a PostgreSQL trigger.
     * 
     * Financial regulations require that once a journal entry is posted, 
     * it cannot be altered or deleted. Any corrections must be made via 
     * a reversing journal entry. This trigger enforces this at the DB level.
     */
    public function up(): void
    {
        // 1. Create the PL/pgSQL function
        DB::unprepared("
            CREATE OR REPLACE FUNCTION check_journal_entry_immutability()
            RETURNS TRIGGER AS $$
            BEGIN
                IF (TG_OP = 'DELETE' AND OLD.status = 'POSTED') THEN
                    RAISE EXCEPTION 'Journal entries are immutable once posted. Deletion is forbidden.';
                END IF;

                IF (TG_OP = 'UPDATE' AND OLD.status = 'POSTED') THEN
                    RAISE EXCEPTION 'Journal entries are immutable once posted. Updates are forbidden. Please create a reversing entry instead.';
                END IF;

                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
        ");

        // 2. Attach the trigger to the journal_entries table
        DB::unprepared("
            CREATE TRIGGER trg_enforce_journal_immutability
            BEFORE UPDATE OR DELETE ON journal_entries
            FOR EACH ROW
            EXECUTE FUNCTION check_journal_entry_immutability();
        ");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::unprepared("DROP TRIGGER IF EXISTS trg_enforce_journal_immutability ON journal_entries;");
        DB::unprepared("DROP FUNCTION IF EXISTS check_journal_entry_immutability();");
    }
};
