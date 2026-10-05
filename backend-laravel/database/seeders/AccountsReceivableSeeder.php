<?php

namespace Database\Seeders;

use App\Models\ArInvoice;
use App\Models\Attachment;
use App\Models\BankAccount;
use App\Models\ChartOfAccount;
use App\Models\Collection;
use App\Models\Customer;
use App\Models\JournalEntry;
use App\Models\JournalEntryLine;
use App\Models\Subsystem;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class AccountsReceivableSeeder extends Seeder
{
    public function run(): void
    {
        $staff = User::where('email', 'staff@hw.com')->first() ?? User::first();
        $manager = User::where('email', 'manager@hw.com')->first() ?? User::first();
        $glModule = Subsystem::where('slug', 'accounts-receivable')->first()
                 ?? Subsystem::where('slug', 'general-ledger')->first();

        $arAccount = ChartOfAccount::where('code', '1020-AR')->first();
        $revAccount = ChartOfAccount::where('code', '4000-REV')->first();
        $cashAccount = ChartOfAccount::where('code', '1010-CASH')->first();

        $cust1 = Customer::where('customer_code', 'CUST-001')->first();
        $cust2 = Customer::where('customer_code', 'CUST-002')->first();
        $cust3 = Customer::where('customer_code', 'CUST-003')->first();
        $bdo = BankAccount::where('bank_name', 'like', '%BDO%')->first();

        if (!$cust1 || !$cust2 || !$cust3 || !$arAccount || !$revAccount) {
            return;
        }

        // Ensure directories exist
        Storage::disk('public')->makeDirectory('attachments/invoices');
        Storage::disk('public')->makeDirectory('attachments/collections');

        $samplePdfContent = "%PDF-1.4\n% Sample AR Sales Invoice / Official Receipt\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000010 00000 n \n0000000060 00000 n \n0000000117 00000 n \ntrailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n185\n%%EOF";
        Storage::disk('public')->put('attachments/invoices/sales_inv_sample.pdf', $samplePdfContent);
        Storage::disk('public')->put('attachments/collections/official_receipt_sample.pdf', $samplePdfContent);

        // --- INVOICE 1: BuildCraft Commercial Co. (₱285,000, UNPAID, Current) ---
        if (!ArInvoice::where('invoice_number', 'INV-BC-2026-001')->exists()) {
            $txn1 = Transaction::create([
                'id'                    => (string) Str::uuid(),
                'transaction_code'      => 'TXN-INV-' . now()->format('Ymd') . '-' . strtoupper(Str::random(6)),
                'subsystem_id'          => $glModule?->id ?? (string) Str::uuid(),
                'source_module'         => 'ACCOUNTS_RECEIVABLE',
                'category_type'         => 'HARDWARE_SALES',
                'external_reference_id' => 'INV-BC-2026-001',
                'type'                  => 'INCOME',
                'amount'                => 285000.00,
                'net_amount'            => 285000.00,
                'currency'              => 'PHP',
                'description'           => 'Commercial Hardware Sales - Structural Steel & Fasteners to BuildCraft',
                'status'                => 'posted',
                'ai_confidence_score'   => 0.9920,
                'ai_suggested_gl_code'  => '4000-REV',
                'ai_suggested_gl_name'  => 'Sales Revenue — Hardware & E-Commerce',
                'ai_anomaly_flag'       => false,
                'created_by'            => $staff->id,
                'approved_by'           => $manager->id,
                'approved_at'           => now()->subDays(6),
                'posted_at'             => now()->subDays(6),
            ]);

            $entryNumber1 = 'JE-' . now()->format('Ym') . '-AR' . strtoupper(Str::random(4));
            $je1 = JournalEntry::create([
                'id'             => (string) Str::uuid(),
                'transaction_id' => $txn1->id,
                'entry_number'   => $entryNumber1,
                'entry_date'     => now()->subDays(6)->toDateString(),
                'status'         => 'POSTED',
            ]);

            JournalEntryLine::create([
                'journal_entry_id'    => $je1->id,
                'chart_of_account_id' => $arAccount->id,
                'debit'               => 285000.00,
                'credit'              => 0.00,
                'description'         => 'Invoice #INV-BC-2026-001 - BuildCraft Commercial',
            ]);

            JournalEntryLine::create([
                'journal_entry_id'    => $je1->id,
                'chart_of_account_id' => $revAccount->id,
                'debit'               => 0.00,
                'credit'              => 285000.00,
                'description'         => 'Invoice #INV-BC-2026-001 - Hardware Sales Revenue',
            ]);

            $inv1 = ArInvoice::create([
                'invoice_number'      => 'INV-BC-2026-001',
                'customer_id'         => $cust1->id,
                'chart_of_account_id' => $revAccount->id,
                'invoice_date'        => now()->subDays(6)->toDateString(),
                'due_date'            => now()->addDays(24)->toDateString(),
                'total_amount'        => 285000.00,
                'paid_amount'         => 0.00,
                'balance'             => 285000.00,
                'description'         => 'Commercial Hardware Sales - Structural Steel & Fasteners',
                'status'              => 'UNPAID',
                'created_by'          => $staff->id,
                'journal_entry_id'    => $je1->id,
            ]);

            $inv1->attachments()->create([
                'file_name'     => 'buildcraft_sales_invoice_001.pdf',
                'file_path'     => 'attachments/invoices/sales_inv_sample.pdf',
                'mime_type'     => 'application/pdf',
                'file_size'     => 1024,
                'document_type' => 'SALES_ORDER',
                'uploaded_by'   => $staff->id,
            ]);
        }

        // --- INVOICE 2: San Juan Construction (₱120,000, ₱50,000 collected, ₱70,000 balance) ---
        if (!ArInvoice::where('invoice_number', 'INV-SJ-2026-002')->exists()) {
            $txn2 = Transaction::create([
                'id'                    => (string) Str::uuid(),
                'transaction_code'      => 'TXN-INV-' . now()->format('Ymd') . '-' . strtoupper(Str::random(6)),
                'subsystem_id'          => $glModule?->id ?? (string) Str::uuid(),
                'source_module'         => 'ACCOUNTS_RECEIVABLE',
                'category_type'         => 'HARDWARE_SALES',
                'external_reference_id' => 'INV-SJ-2026-002',
                'type'                  => 'INCOME',
                'amount'                => 120000.00,
                'net_amount'            => 120000.00,
                'currency'              => 'PHP',
                'description'           => 'Sale of 300 Bags Portland Cement and Deformed Bars',
                'status'                => 'posted',
                'ai_confidence_score'   => 0.9940,
                'ai_suggested_gl_code'  => '4000-REV',
                'ai_suggested_gl_name'  => 'Sales Revenue — Hardware & E-Commerce',
                'ai_anomaly_flag'       => false,
                'created_by'            => $staff->id,
                'approved_by'           => $manager->id,
                'approved_at'           => now()->subDays(12),
                'posted_at'             => now()->subDays(12),
            ]);

            $entryNumber2 = 'JE-' . now()->format('Ym') . '-AR' . strtoupper(Str::random(4));
            $je2 = JournalEntry::create([
                'id'             => (string) Str::uuid(),
                'transaction_id' => $txn2->id,
                'entry_number'   => $entryNumber2,
                'entry_date'     => now()->subDays(12)->toDateString(),
                'status'         => 'POSTED',
            ]);

            JournalEntryLine::create([
                'journal_entry_id'    => $je2->id,
                'chart_of_account_id' => $arAccount->id,
                'debit'               => 120000.00,
                'credit'              => 0.00,
                'description'         => 'Invoice #INV-SJ-2026-002 - San Juan Construction',
            ]);

            JournalEntryLine::create([
                'journal_entry_id'    => $je2->id,
                'chart_of_account_id' => $revAccount->id,
                'debit'               => 0.00,
                'credit'              => 120000.00,
                'description'         => 'Invoice #INV-SJ-2026-002 - Sales Revenue',
            ]);

            $inv2 = ArInvoice::create([
                'invoice_number'      => 'INV-SJ-2026-002',
                'customer_id'         => $cust2->id,
                'chart_of_account_id' => $revAccount->id,
                'invoice_date'        => now()->subDays(12)->toDateString(),
                'due_date'            => now()->addDays(3)->toDateString(),
                'total_amount'        => 120000.00,
                'paid_amount'         => 50000.00,
                'balance'             => 70000.00,
                'description'         => 'Sale of 300 Bags Portland Cement and Deformed Bars',
                'status'              => 'PARTIAL',
                'created_by'          => $staff->id,
                'journal_entry_id'    => $je2->id,
            ]);

            // Partial Collection of ₱50,000 deposited to BDO
            $colTxn = Transaction::create([
                'id'                    => (string) Str::uuid(),
                'transaction_code'      => 'TXN-COL-' . now()->format('Ymd') . '-' . strtoupper(Str::random(6)),
                'subsystem_id'          => $glModule?->id ?? (string) Str::uuid(),
                'source_module'         => 'COLLECTIONS',
                'category_type'         => 'PAYMENT_COLLECTION',
                'external_reference_id' => 'CR-' . now()->format('Ym') . '-0001',
                'type'                  => 'INCOME',
                'amount'                => 50000.00,
                'net_amount'            => 50000.00,
                'currency'              => 'PHP',
                'description'           => 'Bank Deposit collection from San Juan Construction for Invoice #INV-SJ-2026-002',
                'status'                => 'posted',
                'ai_confidence_score'   => 0.9950,
                'ai_suggested_gl_code'  => '1010-CASH',
                'ai_suggested_gl_name'  => 'Cash and Cash Equivalents',
                'ai_anomaly_flag'       => false,
                'created_by'            => $staff->id,
                'approved_by'           => $manager->id,
                'approved_at'           => now()->subDays(3),
                'posted_at'             => now()->subDays(3),
            ]);

            $entryNumberCol = 'JE-' . now()->format('Ym') . '-CR' . strtoupper(Str::random(4));
            $jeCol = JournalEntry::create([
                'id'             => (string) Str::uuid(),
                'transaction_id' => $colTxn->id,
                'entry_number'   => $entryNumberCol,
                'entry_date'     => now()->subDays(3)->toDateString(),
                'status'         => 'POSTED',
            ]);

            JournalEntryLine::create([
                'journal_entry_id'    => $jeCol->id,
                'chart_of_account_id' => $cashAccount->id,
                'debit'               => 50000.00,
                'credit'              => 0.00,
                'description'         => 'Collection #CR-' . now()->format('Ym') . '-0001 - BDO Cash Inflow',
            ]);

            JournalEntryLine::create([
                'journal_entry_id'    => $jeCol->id,
                'chart_of_account_id' => $arAccount->id,
                'debit'               => 0.00,
                'credit'              => 50000.00,
                'description'         => 'Collection #CR-' . now()->format('Ym') . '-0001 - San Juan AR settlement',
            ]);

            $col1 = Collection::create([
                'collection_number' => 'CR-' . now()->format('Ym') . '-0001',
                'ar_invoice_id'     => $inv2->id,
                'bank_account_id'   => $bdo->id,
                'amount'            => 50000.00,
                'collection_date'   => now()->subDays(3)->toDateString(),
                'payment_method'    => 'BANK_TRANSFER',
                'reference_number'  => 'BDO-DEP-883311',
                'collected_by'      => $staff->id,
            ]);

            $col1->attachments()->create([
                'file_name'     => 'official_receipt_or7712.pdf',
                'file_path'     => 'attachments/collections/official_receipt_sample.pdf',
                'mime_type'     => 'application/pdf',
                'file_size'     => 1024,
                'document_type' => 'OFFICIAL_RECEIPT',
                'uploaded_by'   => $staff->id,
            ]);

            if ($bdo) {
                $bdo->increment('current_balance', 50000.00);
            }
        }

        // --- INVOICE 3: Metro Builders Hardware (₱65,000, UNPAID, 15 days OVERDUE) ---
        if (!ArInvoice::where('invoice_number', 'INV-MB-2026-003')->exists()) {
            $txn3 = Transaction::create([
                'id'                    => (string) Str::uuid(),
                'transaction_code'      => 'TXN-INV-' . now()->format('Ymd') . '-' . strtoupper(Str::random(6)),
                'subsystem_id'          => $glModule?->id ?? (string) Str::uuid(),
                'source_module'         => 'ACCOUNTS_RECEIVABLE',
                'category_type'         => 'HARDWARE_SALES',
                'external_reference_id' => 'INV-MB-2026-003',
                'type'                  => 'INCOME',
                'amount'                => 65000.00,
                'net_amount'            => 65000.00,
                'currency'              => 'PHP',
                'description'           => 'Heavy Duty Drills, Impact Wrenches, and Electrical Conduit Pipes',
                'status'                => 'posted',
                'ai_confidence_score'   => 0.9910,
                'ai_suggested_gl_code'  => '4000-REV',
                'ai_suggested_gl_name'  => 'Sales Revenue — Hardware & E-Commerce',
                'ai_anomaly_flag'       => false,
                'created_by'            => $staff->id,
                'approved_by'           => $manager->id,
                'approved_at'           => now()->subDays(45),
                'posted_at'             => now()->subDays(45),
            ]);

            $entryNumber3 = 'JE-' . now()->format('Ym') . '-AR' . strtoupper(Str::random(4));
            $je3 = JournalEntry::create([
                'id'             => (string) Str::uuid(),
                'transaction_id' => $txn3->id,
                'entry_number'   => $entryNumber3,
                'entry_date'     => now()->subDays(45)->toDateString(),
                'status'         => 'POSTED',
            ]);

            JournalEntryLine::create([
                'journal_entry_id'    => $je3->id,
                'chart_of_account_id' => $arAccount->id,
                'debit'               => 65000.00,
                'credit'              => 0.00,
                'description'         => 'Invoice #INV-MB-2026-003 - Metro Builders Hardware',
            ]);

            JournalEntryLine::create([
                'journal_entry_id'    => $je3->id,
                'chart_of_account_id' => $revAccount->id,
                'debit'               => 0.00,
                'credit'              => 65000.00,
                'description'         => 'Invoice #INV-MB-2026-003 - Sales Revenue',
            ]);

            $inv3 = ArInvoice::create([
                'invoice_number'      => 'INV-MB-2026-003',
                'customer_id'         => $cust3->id,
                'chart_of_account_id' => $revAccount->id,
                'invoice_date'        => now()->subDays(45)->toDateString(),
                'due_date'            => now()->subDays(15)->toDateString(), // 15 days past due!
                'total_amount'        => 65000.00,
                'paid_amount'         => 0.00,
                'balance'             => 65000.00,
                'description'         => 'Heavy Duty Drills, Impact Wrenches, and Electrical Conduit Pipes',
                'status'              => 'OVERDUE',
                'created_by'          => $staff->id,
                'journal_entry_id'    => $je3->id,
            ]);

            $inv3->attachments()->create([
                'file_name'     => 'metro_builders_sales_order_99.pdf',
                'file_path'     => 'attachments/invoices/sales_inv_sample.pdf',
                'mime_type'     => 'application/pdf',
                'file_size'     => 1024,
                'document_type' => 'SALES_ORDER',
                'uploaded_by'   => $staff->id,
            ]);
        }
    }
}
