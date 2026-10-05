<?php

namespace Database\Seeders;

use App\Models\ChartOfAccount;
use Illuminate\Database\Seeder;

class ChartOfAccountsSeeder extends Seeder
{
    public function run(): void
    {
        $accounts = [
            // ASSETS (Normal Balance: DEBIT)
            ['code' => '1010-CASH', 'name' => 'Cash and Cash Equivalents', 'type' => 'ASSET', 'normal_balance' => 'DEBIT', 'description' => 'Main cash on hand and in bank accounts.'],
            ['code' => '1020-AR', 'name' => 'Accounts Receivable — Trade', 'type' => 'ASSET', 'normal_balance' => 'DEBIT', 'description' => 'Money owed by customers for credit sales.'],
            ['code' => '1200-INV', 'name' => 'Merchandise Inventory', 'type' => 'ASSET', 'normal_balance' => 'DEBIT', 'description' => 'Hardware goods and materials held for resale.'],

            // LIABILITIES (Normal Balance: CREDIT)
            ['code' => '2010-AP', 'name' => 'Accounts Payable — Trade', 'type' => 'LIABILITY', 'normal_balance' => 'CREDIT', 'description' => 'Short-term obligations owed to suppliers.'],
            ['code' => '2020-TAX', 'name' => 'Value Added Tax Payable (VAT)', 'type' => 'LIABILITY', 'normal_balance' => 'CREDIT', 'description' => 'Output VAT collected less input VAT.'],

            // EQUITY (Normal Balance: CREDIT)
            ['code' => '3010-EQUITY', 'name' => "Owner's Capital", 'type' => 'EQUITY', 'normal_balance' => 'CREDIT', 'description' => 'Initial capital and owner investments.'],
            ['code' => '3020-RETAINED', 'name' => 'Retained Earnings', 'type' => 'EQUITY', 'normal_balance' => 'CREDIT', 'description' => 'Cumulative net income retained in business.'],

            // REVENUE (Normal Balance: CREDIT)
            ['code' => '4000-REV', 'name' => 'Sales Revenue — Hardware & E-Commerce', 'type' => 'REVENUE', 'normal_balance' => 'CREDIT', 'description' => 'Inflow from direct and online hardware sales.'],
            ['code' => '4100-REV-SERVICE', 'name' => 'Delivery & Installation Revenue', 'type' => 'REVENUE', 'normal_balance' => 'CREDIT', 'description' => 'Fee revenue from logistics and installation services.'],

            // EXPENSES (Normal Balance: DEBIT)
            ['code' => '5000-COGS', 'name' => 'Cost of Goods Sold (COGS)', 'type' => 'EXPENSE', 'normal_balance' => 'DEBIT', 'description' => 'Direct cost of hardware items sold.'],
            ['code' => '5100-EXP-SALARY', 'name' => 'Salaries and Wages Expense', 'type' => 'EXPENSE', 'normal_balance' => 'DEBIT', 'description' => 'Staff compensation and payroll disbursements.'],
            ['code' => '5200-EXP-UTIL', 'name' => 'Utilities Expense (Power, Water, Net)', 'type' => 'EXPENSE', 'normal_balance' => 'DEBIT', 'description' => 'Monthly electricity, water, and telecom bills.'],
            ['code' => '5300-EXP-RENT', 'name' => 'Rent and Facility Lease Expense', 'type' => 'EXPENSE', 'normal_balance' => 'DEBIT', 'description' => 'Warehouse and retail store commercial rent.'],
            ['code' => '5400-EXP-LOGISTICS', 'name' => 'Transportation & Freight Expense', 'type' => 'EXPENSE', 'normal_balance' => 'DEBIT', 'description' => 'Fuel, delivery truck maintenance, and freight.'],
            ['code' => '5500-EXP-SUPPLIES', 'name' => 'Store & Office Supplies Expense', 'type' => 'EXPENSE', 'normal_balance' => 'DEBIT', 'description' => 'Packaging materials, office stationery, supplies.'],
        ];

        foreach ($accounts as $acc) {
            ChartOfAccount::firstOrCreate(['code' => $acc['code']], $acc);
        }
    }
}
