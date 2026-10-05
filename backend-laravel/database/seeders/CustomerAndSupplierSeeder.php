<?php

namespace Database\Seeders;

use App\Models\Customer;
use App\Models\Supplier;
use Illuminate\Database\Seeder;

class CustomerAndSupplierSeeder extends Seeder
{
    public function run(): void
    {
        $customers = [
            [
                'customer_code'      => 'CUST-001',
                'name'               => 'BuildCraft Commercial Co.',
                'company_name'       => 'BuildCraft Supplies & Contractors Corp.',
                'email'              => 'procurement@buildcraft.ph',
                'phone'              => '+63 917 882 1044',
                'address'            => 'Km 23 Ortigas Ave Extension, Pasig City',
                'credit_limit'       => 500000.00,
                'payment_terms_days' => 30,
            ],
            [
                'customer_code'      => 'CUST-002',
                'name'               => 'San Juan Construction Inc.',
                'company_name'       => 'San Juan Builders & Engineering',
                'email'              => 'billing@sanjuanbuilders.com',
                'phone'              => '+63 920 441 9922',
                'address'            => '108 N. Domingo St, San Juan City',
                'credit_limit'       => 350000.00,
                'payment_terms_days' => 15,
            ],
            [
                'customer_code'      => 'CUST-003',
                'name'               => 'Metro Builders Hardware',
                'company_name'       => 'Metro Hardware Retail Wholesale',
                'email'              => 'orders@metrohardware.ph',
                'phone'              => '+63 918 332 5500',
                'address'            => '45 Quirino Highway, Novaliches, Quezon City',
                'credit_limit'       => 200000.00,
                'payment_terms_days' => 30,
            ],
            [
                'customer_code'      => 'CUST-004',
                'name'               => 'Mang Juan Home Repairs',
                'company_name'       => 'Mang Juan Handyman Services',
                'email'              => 'mangjuan@gmail.com',
                'phone'              => '+63 922 110 3388',
                'address'            => 'Block 12 Lot 4, Commonwealth Ave, QC',
                'credit_limit'       => 50000.00,
                'payment_terms_days' => 7,
            ],
        ];

        foreach ($customers as $c) {
            Customer::firstOrCreate(['customer_code' => $c['customer_code']], $c);
        }

        $suppliers = [
            [
                'supplier_code'      => 'SUPP-001',
                'name'               => 'Holcim Philippines Inc.',
                'company_name'       => 'Holcim Cement & Aggregates Corp.',
                'email'              => 'orders@holcim.com.ph',
                'phone'              => '+63 2 8858 0000',
                'address'            => 'Venice Corporate Center, McKinley Hill, Taguig City',
                'payment_terms_days' => 30,
                'bank_info'          => ['bank' => 'BDO', 'account_number' => '0012-9900-3341', 'account_name' => 'Holcim Philippines Inc.'],
            ],
            [
                'supplier_code'      => 'SUPP-002',
                'name'               => 'Puyat Steel Corporation',
                'company_name'       => 'Puyat Steel Manufacturing Corp.',
                'email'              => 'sales@puyatsteel.ph',
                'phone'              => '+63 2 8893 5521',
                'address'            => 'EDSA cor Pioneer St, Mandaluyong City',
                'payment_terms_days' => 30,
                'bank_info'          => ['bank' => 'BPI', 'account_number' => '1140-5520-8800', 'account_name' => 'Puyat Steel Corp.'],
            ],
            [
                'supplier_code'      => 'SUPP-003',
                'name'               => 'Pacific Paint (Boysen) Phils.',
                'company_name'       => 'Pacific Paint (Boysen) Philippines, Inc.',
                'email'              => 'inquiries@boysen.com.ph',
                'phone'              => '+63 2 8364 3505',
                'address'            => '292 D. Tuazon St, Quezon City',
                'payment_terms_days' => 15,
                'bank_info'          => ['bank' => 'Metrobank', 'account_number' => '0071-4433-2210', 'account_name' => 'Pacific Paint Phils Inc.'],
            ],
            [
                'supplier_code'      => 'SUPP-004',
                'name'               => 'Stanley Black & Decker Phils.',
                'company_name'       => 'Stanley Tools & Industrial Hardware Ltd.',
                'email'              => 'support.ph@sbdinc.com',
                'phone'              => '+63 2 8771 9900',
                'address'            => 'Alabang-Zapote Road, Muntinlupa City',
                'payment_terms_days' => 30,
                'bank_info'          => ['bank' => 'UnionBank', 'account_number' => '1022-8811-0044', 'account_name' => 'Stanley Black & Decker Phils.'],
            ],
            [
                'supplier_code'      => 'SUPP-005',
                'name'               => 'Meralco Commercial Power',
                'company_name'       => 'Manila Electric Company',
                'email'              => 'commercial@meralco.com.ph',
                'phone'              => '+63 2 16211',
                'address'            => 'Ortigas Ave, Pasig City',
                'payment_terms_days' => 10,
                'bank_info'          => ['bank' => 'BDO', 'account_number' => '0099-1122-3344', 'account_name' => 'Meralco'],
            ],
        ];

        foreach ($suppliers as $s) {
            Supplier::firstOrCreate(['supplier_code' => $s['supplier_code']], $s);
        }
    }
}
