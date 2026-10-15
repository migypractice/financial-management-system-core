<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ap_bills', function (Blueprint $table) {
            if (!Schema::hasColumn('ap_bills', 'ai_audit_badge')) {
                $table->string('ai_audit_badge', 50)->nullable()->after('status');
            }
        });
    }

    public function down(): void
    {
        Schema::table('ap_bills', function (Blueprint $table) {
            $table->dropColumn('ai_audit_badge');
        });
    }
};
