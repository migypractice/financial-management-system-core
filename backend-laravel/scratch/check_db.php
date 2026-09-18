<?php
// Quick DB state check script - run via: php artisan tinker scratch/check_db.php

// 1. Users
echo "=== DEMO ACCOUNTS ===\n";
$users = \App\Models\User::with('role')->get();
foreach ($users as $u) {
    echo $u->name . ' | ' . $u->email . ' | ' . ($u->role ? $u->role->slug : 'NO-ROLE') . ' | ' . $u->department . "\n";
}

// 2. Roles
echo "\n=== ROLES ===\n";
$roles = \App\Models\Role::all();
foreach ($roles as $r) {
    echo $r->slug . ' | ' . $r->name . "\n";
}

// 3. Subsystems
echo "\n=== SUBSYSTEMS ===\n";
$subsystems = \Illuminate\Support\Facades\DB::table('subsystems')->get();
foreach ($subsystems as $s) {
    echo $s->slug . ' | ' . $s->name . "\n";
}

// 4. Table counts
echo "\n=== TABLE COUNTS ===\n";
echo "transactions: " . \App\Models\Transaction::count() . "\n";
echo "journal_entries: " . \App\Models\JournalEntry::count() . "\n";
echo "ai_logs: " . \Illuminate\Support\Facades\DB::table('ai_logs')->count() . "\n";
echo "journal_entry_sequences: " . \Illuminate\Support\Facades\DB::table('journal_entry_sequences')->count() . "\n";

// 5. Check constraints
echo "\n=== KEY CONSTRAINTS (PostgreSQL) ===\n";
$constraints = \Illuminate\Support\Facades\DB::select("
    SELECT tc.constraint_name, tc.table_name, tc.constraint_type
    FROM information_schema.table_constraints tc
    WHERE tc.table_schema = 'public'
    AND tc.constraint_type IN ('UNIQUE', 'PRIMARY KEY', 'FOREIGN KEY')
    AND tc.table_name IN ('transactions', 'journal_entries', 'journal_entry_sequences', 'ai_logs')
    ORDER BY tc.table_name, tc.constraint_type
");
foreach ($constraints as $c) {
    echo $c->table_name . ' | ' . $c->constraint_type . ' | ' . $c->constraint_name . "\n";
}

// 6. Check immutability trigger
echo "\n=== IMMUTABILITY TRIGGER ===\n";
$triggers = \Illuminate\Support\Facades\DB::select("
    SELECT trigger_name, event_manipulation, event_object_table, action_timing
    FROM information_schema.triggers
    WHERE event_object_table = 'journal_entries'
");
if (empty($triggers)) {
    echo "WARNING: No triggers found on journal_entries!\n";
} else {
    foreach ($triggers as $t) {
        echo $t->trigger_name . ' | ' . $t->action_timing . ' ' . $t->event_manipulation . ' ON ' . $t->event_object_table . "\n";
    }
}

// 7. Transaction status distribution
echo "\n=== TRANSACTION STATUS DISTRIBUTION ===\n";
$statuses = \Illuminate\Support\Facades\DB::table('transactions')
    ->selectRaw('status, count(*) as cnt')
    ->groupBy('status')
    ->get();
foreach ($statuses as $s) {
    echo $s->status . ': ' . $s->cnt . "\n";
}
