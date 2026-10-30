<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Enhances General Ledger, Subledgers (AP/AR Payment Modes), and Budget Management:
     * 1. Mode of Payment on AP Bills & AR Invoices
     * 2. Budget Cadence (Yearly, Monthly, Weekly), Purpose / Scope of Use, and Adjustment Tracking
     */
    public function up(): void
    {
        // 1. AP Bills - Add Payment Method
        if (Schema::hasTable('ap_bills') && !Schema::hasColumn('ap_bills', 'payment_method')) {
            Schema::table('ap_bills', function (Blueprint $table) {
                $table->string('payment_method', 50)->default('BANK_TRANSFER')->after('category_type');
            });
        }

        // 2. AR Invoices - Add Payment Method
        if (Schema::hasTable('ar_invoices') && !Schema::hasColumn('ar_invoices', 'payment_method')) {
            Schema::table('ar_invoices', function (Blueprint $table) {
                $table->string('payment_method', 50)->default('BANK_TRANSFER')->after('category_type');
            });
        }

        // 3. Budgets - Add Cadence (Yearly, Monthly, Weekly), Purpose, and Adjustment fields
        if (Schema::hasTable('budgets')) {
            Schema::table('budgets', function (Blueprint $table) {
                if (!Schema::hasColumn('budgets', 'period_type')) {
                    $table->string('period_type', 20)->default('MONTHLY')->after('period'); // YEARLY, MONTHLY, WEEKLY
                }
                if (!Schema::hasColumn('budgets', 'purpose')) {
                    $table->text('purpose')->nullable()->after('category');
                }
                if (!Schema::hasColumn('budgets', 'attachment_verified')) {
                    $table->boolean('attachment_verified')->default(true)->after('allocated_amount');
                }
                if (!Schema::hasColumn('budgets', 'adjustment_reason')) {
                    $table->text('adjustment_reason')->nullable()->after('notes');
                }
            });
        }

        // 4. Budget Allocations - Add Adjustment tracking
        if (Schema::hasTable('budget_allocations')) {
            Schema::table('budget_allocations', function (Blueprint $table) {
                if (!Schema::hasColumn('budget_allocations', 'period_type')) {
                    $table->string('period_type', 20)->default('MONTHLY')->after('period');
                }
                if (!Schema::hasColumn('budget_allocations', 'adjustment_reason')) {
                    $table->text('adjustment_reason')->nullable()->after('notes');
                }
                if (!Schema::hasColumn('budget_allocations', 'attachment_verified')) {
                    $table->boolean('attachment_verified')->default(true)->after('allocated_amount');
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('ap_bills') && Schema::hasColumn('ap_bills', 'payment_method')) {
            Schema::table('ap_bills', function (Blueprint $table) {
                $table->dropColumn('payment_method');
            });
        }

        if (Schema::hasTable('ar_invoices') && Schema::hasColumn('ar_invoices', 'payment_method')) {
            Schema::table('ar_invoices', function (Blueprint $table) {
                $table->dropColumn('payment_method');
            });
        }

        if (Schema::hasTable('budgets')) {
            Schema::table('budgets', function (Blueprint $table) {
                $table->dropColumn(['period_type', 'purpose', 'attachment_verified', 'adjustment_reason']);
            });
        }

        if (Schema::hasTable('budget_allocations')) {
            Schema::table('budget_allocations', function (Blueprint $table) {
                $table->dropColumn(['period_type', 'adjustment_reason', 'attachment_verified']);
            });
        }
    }
};
