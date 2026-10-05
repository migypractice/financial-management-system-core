<?php

namespace Database\Seeders;

use App\Models\Budget;
use App\Models\ChartOfAccount;
use App\Models\JournalEntry;
use App\Models\JournalEntryLine;
use App\Models\Subsystem;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class OpeningBalanceSeeder extends Seeder
{
    public function run(): void
    {
        $cashCoa   = ChartOfAccount::where('code', '1010-CASH')->first();
        $equityCoa = ChartOfAccount::where('code', '3010-EQUITY')->first();
        $adminUser = User::where('email', 'admin@hw.com')->first();
        $glModule  = Subsystem::where('slug', 'general-ledger')->first();

        if (!$cashCoa || !$equityCoa || !$adminUser || !$glModule) {
            return;
        }

        // 1. Create Opening Capital Transaction + Journal Entry
        $capitalAmount = 5000000.00; // ₱5,000,000 initial owner equity

        $existingCapitalTxn = Transaction::where('transaction_code', 'TXN-INIT-EQUITY-001')->first();
        if (!$existingCapitalTxn) {
            $txn = Transaction::create([
                'id'                    => (string) Str::uuid(),
                'transaction_code'      => 'TXN-INIT-EQUITY-001',
                'subsystem_id'          => $glModule->id,
                'source_module'         => 'EQUITY_INJECTION',
                'external_reference_id' => 'INIT-CAPITAL-2026',
                'type'                  => 'INCOME',
                'amount'                => $capitalAmount,
                'tax_amount'            => 0,
                'fee_amount'            => 0,
                'net_amount'            => $capitalAmount,
                'currency'              => 'PHP',
                'description'           => "Owner's Initial Capital Contribution (Cash Injection)",
                'status'                => 'posted',
                'ai_confidence_score'   => 1.0000,
                'ai_suggested_gl_code'  => '3010-EQUITY',
                'ai_suggested_gl_name'  => "Owner's Capital",
                'ai_anomaly_flag'       => false,
                'created_by'            => $adminUser->id,
                'approved_by'           => $adminUser->id,
                'approved_at'           => now(),
                'posted_at'             => now(),
            ]);

            $je = JournalEntry::firstOrCreate(
                ['transaction_id' => $txn->id],
                [
                    'id'           => (string) Str::uuid(),
                    'entry_number' => 'JE-OPEN-2026-0001',
                    'entry_date'   => now()->startOfMonth()->toDateString(),
                    'status'       => 'POSTED',
                ]
            );

            // Balanced Double Entry Lines: Debit Cash, Credit Equity
            JournalEntryLine::create([
                'id'                  => (string) Str::uuid(),
                'journal_entry_id'    => $je->id,
                'chart_of_account_id' => $cashCoa->id,
                'debit'               => $capitalAmount,
                'credit'              => 0.00,
                'description'         => 'Initial cash capital deposited across corporate bank accounts',
            ]);

            JournalEntryLine::create([
                'id'                  => (string) Str::uuid(),
                'journal_entry_id'    => $je->id,
                'chart_of_account_id' => $equityCoa->id,
                'debit'               => 0.00,
                'credit'              => $capitalAmount,
                'description'         => "Initial Owner's Equity Capital investment",
            ]);
        }

        // 2. Seed Real Departmental Budgets (FY 2026)
        $coaSalary    = ChartOfAccount::where('code', '5100-EXP-SALARY')->first()?->id;
        $coaInv       = ChartOfAccount::where('code', '1200-INV')->first()?->id;
        $coaLogistics = ChartOfAccount::where('code', '5400-EXP-LOGISTICS')->first()?->id;
        $coaUtil      = ChartOfAccount::where('code', '5200-EXP-UTIL')->first()?->id;
        $coaSupplies  = ChartOfAccount::where('code', '5500-EXP-SUPPLIES')->first()?->id;

        $budgets = [
            [
                'department'          => 'Human Resources (HRMS)',
                'category'            => 'Payroll & Compensation',
                'allocated_amount'    => 12000000.00,
                'chart_of_account_id' => $coaSalary,
                'notes'               => 'Annual budget for salaries, benefits, and staff overtime.',
            ],
            [
                'department'          => 'Supply Chain & Procurement',
                'category'            => 'Merchandise Inventory Stocks',
                'allocated_amount'    => 25000000.00,
                'chart_of_account_id' => $coaInv,
                'notes'               => 'Purchases of hardware stock (cement, steel, tools, paints).',
            ],
            [
                'department'          => 'Fleet & Logistics',
                'category'            => 'Transportation & Maintenance',
                'allocated_amount'    => 5000000.00,
                'chart_of_account_id' => $coaLogistics,
                'notes'               => 'Diesel fuel, truck maintenance, delivery equipment.',
            ],
            [
                'department'          => 'Facilities & Operations',
                'category'            => 'Rent & Commercial Utilities',
                'allocated_amount'    => 8000000.00,
                'chart_of_account_id' => $coaUtil,
                'notes'               => 'Warehouse leases, Meralco power, water, internet.',
            ],
            [
                'department'          => 'IT & Infrastructure',
                'category'            => 'Software & Network Hardware',
                'allocated_amount'    => 3500000.00,
                'chart_of_account_id' => $coaSupplies,
                'notes'               => 'Cloud servers, POS hardware, network infrastructure.',
            ],
            [
                'department'          => 'E-Commerce Marketing',
                'category'            => 'Digital Ads & Promotion',
                'allocated_amount'    => 6000000.00,
                'chart_of_account_id' => $coaSupplies,
                'notes'               => 'Customer acquisition, social media ads, promos.',
            ],
        ];

        foreach ($budgets as $b) {
            Budget::updateOrCreate(
                [
                    'department' => $b['department'],
                    'category'   => $b['category'],
                    'period'     => 'FY2026',
                ],
                array_merge($b, [
                    'fiscal_year' => '2026',
                    'created_by'  => $adminUser->id,
                ])
            );
        }
    }
}
