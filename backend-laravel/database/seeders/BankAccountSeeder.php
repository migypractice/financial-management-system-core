<?php

namespace Database\Seeders;

use App\Models\BankAccount;
use App\Models\ChartOfAccount;
use Illuminate\Database\Seeder;

class BankAccountSeeder extends Seeder
{
    public function run(): void
    {
        $cashCoa = ChartOfAccount::where('code', '1010-CASH')->first();

        $banks = [
            [
                'account_name'        => 'BDO Corporate Operating',
                'bank_name'           => 'Banco De Oro (BDO)',
                'account_number'      => '1092-8821-4401',
                'account_type'        => 'Operating',
                'beginning_balance'   => 2500000.00,
                'current_balance'     => 2500000.00,
                'currency'            => 'PHP',
                'chart_of_account_id' => $cashCoa?->id,
            ],
            [
                'account_name'        => 'BPI Trade & Supplier AP',
                'bank_name'           => 'Bank of the Philippine Islands (BPI)',
                'account_number'      => '2201-9921-1402',
                'account_type'        => 'Disbursement',
                'beginning_balance'   => 1500000.00,
                'current_balance'     => 1500000.00,
                'currency'            => 'PHP',
                'chart_of_account_id' => $cashCoa?->id,
            ],
            [
                'account_name'        => 'UnionBank E-Commerce Inflow',
                'bank_name'           => 'UnionBank of the Philippines',
                'account_number'      => '1042-3312-8899',
                'account_type'        => 'Receivables',
                'beginning_balance'   => 750000.00,
                'current_balance'     => 750000.00,
                'currency'            => 'PHP',
                'chart_of_account_id' => $cashCoa?->id,
            ],
            [
                'account_name'        => 'Metrobank Emergency Reserve',
                'bank_name'           => 'Metropolitan Bank & Trust Co.',
                'account_number'      => '0041-8891-2230',
                'account_type'        => 'Reserve',
                'beginning_balance'   => 250000.00,
                'current_balance'     => 250000.00,
                'currency'            => 'PHP',
                'chart_of_account_id' => $cashCoa?->id,
            ],
        ];

        foreach ($banks as $b) {
            BankAccount::firstOrCreate(['account_number' => $b['account_number']], $b);
        }
    }
}
