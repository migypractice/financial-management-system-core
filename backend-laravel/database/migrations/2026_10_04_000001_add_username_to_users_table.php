<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Add a username so users can sign in with either their email or a
     * "name with number" username (e.g. carlos01), per panel requirement.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('username', 30)->nullable()->unique()->after('name');
            $table->timestamp('password_changed_at')->nullable()->after('password');
        });

        // Backfill usernames for the seeded demo accounts.
        $defaults = [
            'admin@hw.com'   => 'admin01',
            'manager@hw.com' => 'manager01',
            'staff@hw.com'   => 'staff01',
            'system@hw.com'  => 'system01',
        ];

        foreach ($defaults as $email => $username) {
            DB::table('users')->where('email', $email)->update(['username' => $username]);
        }
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique(['username']);
            $table->dropColumn(['username', 'password_changed_at']);
        });
    }
};
