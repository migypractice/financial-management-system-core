<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Adds a dedicated, privilege-free role for machine/system attribution.
 *
 * M2M-ingested transactions are stamped with created_by referencing a system
 * account (system@hw.com). That account was previously seeded with the
 * super_admin role, which meant the account attributed as "maker" on every
 * M2M transaction was also structurally capable of acting as "checker" —
 * defeating Maker-Checker separation if it were ever authenticated as. This
 * role carries no dashboard, approval, or reporting permissions anywhere in
 * RoleMiddleware/TransactionPolicy, since it is never added to an allow-list.
 *
 * Also re-points any already-seeded system@hw.com user (from a prior local
 * or staging seed run) onto the new role, so existing environments are
 * self-healing on the next `php artisan migrate` without a reseed.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (!DB::table('roles')->where('slug', 'system_integration')->exists()) {
            DB::table('roles')->insert([
                'id'          => (string) Str::uuid(),
                'name'        => 'System Integration',
                'slug'        => 'system_integration',
                'description' => 'Non-interactive attribution account for machine-to-machine transaction ingestion. Holds no dashboard, approval, or reporting permissions.',
                'created_at'  => now(),
                'updated_at'  => now(),
            ]);
        }

        $roleId = DB::table('roles')->where('slug', 'system_integration')->value('id');

        if ($roleId) {
            DB::table('users')
                ->where('email', 'system@hw.com')
                ->update(['role_id' => $roleId, 'updated_at' => now()]);
        }
    }

    public function down(): void
    {
        DB::table('roles')->where('slug', 'system_integration')->delete();
    }
};
