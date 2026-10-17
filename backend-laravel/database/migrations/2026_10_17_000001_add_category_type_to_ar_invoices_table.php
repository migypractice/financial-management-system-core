<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('ar_invoices') && !Schema::hasColumn('ar_invoices', 'category_type')) {
            Schema::table('ar_invoices', function (Blueprint $table) {
                $table->string('category_type', 100)->default('SALES_REVENUE')->after('description');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('ar_invoices') && Schema::hasColumn('ar_invoices', 'category_type')) {
            Schema::table('ar_invoices', function (Blueprint $table) {
                $table->dropColumn('category_type');
            });
        }
    }
};
