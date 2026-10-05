<?php

namespace Database\Seeders;

use App\Models\ApBill;
use App\Models\Attachment;
use App\Models\BankAccount;
use App\Models\ChartOfAccount;
use App\Models\Disbursement;
use App\Models\JournalEntry;
use App\Models\JournalEntryLine;
use App\Models\PaymentRequest;
use App\Models\Subsystem;
use App\Models\Supplier;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class AccountsPayableSeeder extends Seeder
{
    public function run(): void
    {
        $staff = User::where('email', 'staff@hw.com')->first() ?? User::first();
        $manager = User::where('email', 'manager@hw.com')->first() ?? User::first();
        $glModule = Subsystem::where('slug', 'accounts-payable')->first()
                 ?? Subsystem::where('slug', 'general-ledger')->first();

        $apAccount = ChartOfAccount::where('code', '2010-AP')->first();
        $invAccount = ChartOfAccount::where('code', '1200-INV')->first();
        $utilAccount = ChartOfAccount::where('code', '6020-UTIL')->first();
        $cashAccount = ChartOfAccount::where('code', '1010-CASH')->first();

        $holcim = Supplier::where('supplier_code', 'SUPP-001')->first();
        $boysen = Supplier::where('supplier_code', 'SUPP-003')->first();
        $meralco = Supplier::where('supplier_code', 'SUPP-005')->first();
        $bdo = BankAccount::where('bank_name', 'like', '%BDO%')->first();

        if (!$holcim || !$boysen || !$meralco || !$apAccount || !$invAccount) {
            return;
        }

        // Ensure attachments directories exist
        Storage::disk('public')->makeDirectory('attachments/bills');
        Storage::disk('public')->makeDirectory('attachments/requests');

        // Create sample placeholder invoice file
        $sampleInvoiceContent = "%PDF-1.4\n% Sample Holcim Supplier Invoice #INV-2026-0891\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000010 00000 n \n0000000060 00000 n \n0000000117 00000 n \ntrailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n185\n%%EOF";
        Storage::disk('public')->put('attachments/bills/holcim_sample_invoice.pdf', $sampleInvoiceContent);
        Storage::disk('public')->put('attachments/bills/meralco_bill_sample.pdf', $sampleInvoiceContent);
        Storage::disk('public')->put('attachments/requests/pr_voucher_sample.pdf', $sampleInvoiceContent);

        // --- BILL 1: Holcim Philippines (₱145,000, UNPAID, Current) ---
        if (!ApBill::where('bill_number', 'BILL-HOLCIM-2026-01')->exists()) {
            $txnCode = 'TXN-BILL-' . now()->format('Ymd') . '-' . strtoupper(Str::random(6));
            $txn1 = Transaction::create([
                'id'                    => (string) Str::uuid(),
                'transaction_code'      => $txnCode,
                'subsystem_id'          => $glModule?->id ?? (string) Str::uuid(),
                'source_module'         => 'ACCOUNTS_PAYABLE',
                'category_type'         => 'INVENTORY_PURCHASE',
                'external_reference_id' => 'BILL-HOLCIM-2026-01',
                'type'                  => 'EXPENSE',
                'amount'                => 145000.00,
                'net_amount'            => 145000.00,
                'currency'              => 'PHP',
                'description'           => 'Purchase of 350 bags Holcim Excel Portland Cement',
                'status'                => 'posted',
                'ai_confidence_score'   => 0.9850,
                'ai_suggested_gl_code'  => '1200-INV',
                'ai_suggested_gl_name'  => 'Merchandise Inventory',
                'ai_anomaly_flag'       => false,
                'created_by'            => $staff->id,
                'approved_by'           => $manager->id,
                'approved_at'           => now()->subDays(5),
                'posted_at'             => now()->subDays(5),
            ]);

            $entryNumber1 = 'JE-' . now()->format('Ym') . '-AP' . strtoupper(Str::random(4));
            $je1 = JournalEntry::create([
                'id'             => (string) Str::uuid(),
                'transaction_id' => $txn1->id,
                'entry_number'   => $entryNumber1,
                'entry_date'     => now()->subDays(5)->toDateString(),
                'status'         => 'POSTED',
            ]);

            JournalEntryLine::create([
                'journal_entry_id'    => $je1->id,
                'chart_of_account_id' => $invAccount->id,
                'debit'               => 145000.00,
                'credit'              => 0.00,
                'description'         => 'Bill #BILL-HOLCIM-2026-01 - Portland Cement Inventory',
            ]);

            JournalEntryLine::create([
                'journal_entry_id'    => $je1->id,
                'chart_of_account_id' => $apAccount->id,
                'debit'               => 0.00,
                'credit'              => 145000.00,
                'description'         => 'Bill #BILL-HOLCIM-2026-01 - Holcim Philippines',
            ]);

            $bill1 = ApBill::create([
                'bill_number'         => 'BILL-HOLCIM-2026-01',
                'supplier_id'         => $holcim->id,
                'chart_of_account_id' => $invAccount->id,
                'bill_date'           => now()->subDays(5)->toDateString(),
                'due_date'            => now()->addDays(25)->toDateString(),
                'total_amount'        => 145000.00,
                'paid_amount'         => 0.00,
                'balance'             => 145000.00,
                'category_type'       => 'INVENTORY_PURCHASE',
                'description'         => 'Purchase of 350 bags Holcim Excel Portland Cement',
                'status'              => 'UNPAID',
                'created_by'          => $staff->id,
                'journal_entry_id'    => $je1->id,
            ]);

            $bill1->attachments()->create([
                'file_name'     => 'holcim_sales_invoice_0891.pdf',
                'file_path'     => 'attachments/bills/holcim_sample_invoice.pdf',
                'mime_type'     => 'application/pdf',
                'file_size'     => 1024,
                'document_type' => 'SUPPLIER_INVOICE',
                'uploaded_by'   => $staff->id,
            ]);
        }

        // --- BILL 2: Boysen Paint (₱68,500 total, ₱30,000 paid via approved PR, ₱38,500 balance) ---
        if (!ApBill::where('bill_number', 'BILL-BOYSEN-2026-02')->exists()) {
            $txn2 = Transaction::create([
                'id'                    => (string) Str::uuid(),
                'transaction_code'      => 'TXN-BILL-' . now()->format('Ymd') . '-' . strtoupper(Str::random(6)),
                'subsystem_id'          => $glModule?->id ?? (string) Str::uuid(),
                'source_module'         => 'ACCOUNTS_PAYABLE',
                'category_type'         => 'INVENTORY_PURCHASE',
                'external_reference_id' => 'BILL-BOYSEN-2026-02',
                'type'                  => 'EXPENSE',
                'amount'                => 68500.00,
                'net_amount'            => 68500.00,
                'currency'              => 'PHP',
                'description'           => 'Purchase of Permacoat Latex Paint & Primers',
                'status'                => 'posted',
                'ai_confidence_score'   => 0.9900,
                'ai_suggested_gl_code'  => '1200-INV',
                'ai_suggested_gl_name'  => 'Merchandise Inventory',
                'ai_anomaly_flag'       => false,
                'created_by'            => $staff->id,
                'approved_by'           => $manager->id,
                'approved_at'           => now()->subDays(10),
                'posted_at'             => now()->subDays(10),
            ]);

            $entryNumber2 = 'JE-' . now()->format('Ym') . '-AP' . strtoupper(Str::random(4));
            $je2 = JournalEntry::create([
                'id'             => (string) Str::uuid(),
                'transaction_id' => $txn2->id,
                'entry_number'   => $entryNumber2,
                'entry_date'     => now()->subDays(10)->toDateString(),
                'status'         => 'POSTED',
            ]);

            JournalEntryLine::create([
                'journal_entry_id'    => $je2->id,
                'chart_of_account_id' => $invAccount->id,
                'debit'               => 68500.00,
                'credit'              => 0.00,
                'description'         => 'Bill #BILL-BOYSEN-2026-02 - Latex Paint Inventory',
            ]);

            JournalEntryLine::create([
                'journal_entry_id'    => $je2->id,
                'chart_of_account_id' => $apAccount->id,
                'debit'               => 0.00,
                'credit'              => 68500.00,
                'description'         => 'Bill #BILL-BOYSEN-2026-02 - Pacific Paint Boysen',
            ]);

            $bill2 = ApBill::create([
                'bill_number'         => 'BILL-BOYSEN-2026-02',
                'supplier_id'         => $boysen->id,
                'chart_of_account_id' => $invAccount->id,
                'bill_date'           => now()->subDays(10)->toDateString(),
                'due_date'            => now()->addDays(5)->toDateString(),
                'total_amount'        => 68500.00,
                'paid_amount'         => 30000.00,
                'balance'             => 38500.00,
                'category_type'       => 'INVENTORY_PURCHASE',
                'description'         => 'Purchase of Permacoat Latex Paint & Primers',
                'status'              => 'PARTIAL',
                'created_by'          => $staff->id,
                'journal_entry_id'    => $je2->id,
            ]);

            // Partial Payment Request (Already Disbursed)
            $pr1 = PaymentRequest::create([
                'request_number'      => 'PR-' . now()->format('Ym') . '-0001',
                'ap_bill_id'          => $bill2->id,
                'payee_name'          => $boysen->name,
                'amount'              => 30000.00,
                'purpose'             => '50% downpayment for boysen paint batch delivery',
                'requested_by'        => $staff->id,
                'status'              => 'DISBURSED',
                'approved_by'         => $manager->id,
                'approved_at'         => now()->subDays(2),
                'ai_confidence_score' => 0.9650,
                'ai_anomaly_flag'     => false,
            ]);

            $pr1->attachments()->create([
                'file_name'     => 'boysen_billing_statement_payout.pdf',
                'file_path'     => 'attachments/requests/pr_voucher_sample.pdf',
                'mime_type'     => 'application/pdf',
                'file_size'     => 1024,
                'document_type' => 'BILLING_STATEMENT',
                'uploaded_by'   => $staff->id,
            ]);

            // Disbursement record
            $dbTxn = Transaction::create([
                'id'                    => (string) Str::uuid(),
                'transaction_code'      => 'TXN-DISB-' . now()->format('Ymd') . '-' . strtoupper(Str::random(6)),
                'subsystem_id'          => $glModule?->id ?? (string) Str::uuid(),
                'source_module'         => 'DISBURSEMENT',
                'category_type'         => 'INVENTORY_PURCHASE',
                'external_reference_id' => 'DISB-' . now()->format('Ym') . '-0001',
                'type'                  => 'EXPENSE',
                'amount'                => 30000.00,
                'net_amount'            => 30000.00,
                'currency'              => 'PHP',
                'description'           => 'Disbursement to Pacific Paint Boysen via Bank Transfer',
                'status'                => 'posted',
                'ai_confidence_score'   => 0.9900,
                'ai_suggested_gl_code'  => '2010-AP',
                'ai_suggested_gl_name'  => 'Accounts Payable',
                'ai_anomaly_flag'       => false,
                'created_by'            => $manager->id,
                'approved_by'           => $manager->id,
                'approved_at'           => now()->subDays(2),
                'posted_at'             => now()->subDays(2),
            ]);

            $entryNumberDisb = 'JE-' . now()->format('Ym') . '-DS' . strtoupper(Str::random(4));
            $jeDisb = JournalEntry::create([
                'id'             => (string) Str::uuid(),
                'transaction_id' => $dbTxn->id,
                'entry_number'   => $entryNumberDisb,
                'entry_date'     => now()->subDays(2)->toDateString(),
                'status'         => 'POSTED',
            ]);

            JournalEntryLine::create([
                'journal_entry_id'    => $jeDisb->id,
                'chart_of_account_id' => $apAccount->id,
                'debit'               => 30000.00,
                'credit'              => 0.00,
                'description'         => 'Disbursement #DISB-' . now()->format('Ym') . '-0001 - Liability decrease',
            ]);

            JournalEntryLine::create([
                'journal_entry_id'    => $jeDisb->id,
                'chart_of_account_id' => $cashAccount->id,
                'debit'               => 0.00,
                'credit'              => 30000.00,
                'description'         => 'Disbursement #DISB-' . now()->format('Ym') . '-0001 - Cash at Bank decrease',
            ]);

            Disbursement::create([
                'disbursement_number' => 'DISB-' . now()->format('Ym') . '-0001',
                'payment_request_id'  => $pr1->id,
                'bank_account_id'     => $bdo->id,
                'amount'              => 30000.00,
                'disbursement_date'   => now()->subDays(2)->toDateString(),
                'payment_method'      => 'BANK_TRANSFER',
                'reference_number'    => 'BDO-TRF-009988',
                'disbursed_by'        => $manager->id,
                'journal_entry_id'    => $jeDisb->id,
            ]);

            // Decrement bank account cash
            if ($bdo) {
                $bdo->decrement('current_balance', 30000.00);
            }
        }

        // --- BILL 3: Meralco Commercial Power (₱42,300, UNPAID, 12 days OVERDUE) ---
        if (!ApBill::where('bill_number', 'BILL-MERALCO-2026-09')->exists()) {
            $txn3 = Transaction::create([
                'id'                    => (string) Str::uuid(),
                'transaction_code'      => 'TXN-BILL-' . now()->format('Ymd') . '-' . strtoupper(Str::random(6)),
                'subsystem_id'          => $glModule?->id ?? (string) Str::uuid(),
                'source_module'         => 'ACCOUNTS_PAYABLE',
                'category_type'         => 'UTILITIES_BILL',
                'external_reference_id' => 'BILL-MERALCO-2026-09',
                'type'                  => 'EXPENSE',
                'amount'                => 42300.00,
                'net_amount'            => 42300.00,
                'currency'              => 'PHP',
                'description'           => 'Warehouse and Storefront Electricity Billing for Sept 2026',
                'status'                => 'posted',
                'ai_confidence_score'   => 0.9950,
                'ai_suggested_gl_code'  => '6020-UTIL',
                'ai_suggested_gl_name'  => 'Utilities Expense',
                'ai_anomaly_flag'       => false,
                'created_by'            => $staff->id,
                'approved_by'           => $manager->id,
                'approved_at'           => now()->subDays(25),
                'posted_at'             => now()->subDays(25),
            ]);

            $entryNumber3 = 'JE-' . now()->format('Ym') . '-AP' . strtoupper(Str::random(4));
            $je3 = JournalEntry::create([
                'id'             => (string) Str::uuid(),
                'transaction_id' => $txn3->id,
                'entry_number'   => $entryNumber3,
                'entry_date'     => now()->subDays(25)->toDateString(),
                'status'         => 'POSTED',
            ]);

            JournalEntryLine::create([
                'journal_entry_id'    => $je3->id,
                'chart_of_account_id' => $utilAccount?->id ?? $invAccount->id,
                'debit'               => 42300.00,
                'credit'              => 0.00,
                'description'         => 'Bill #BILL-MERALCO-2026-09 - Storefront Electricity',
            ]);

            JournalEntryLine::create([
                'journal_entry_id'    => $je3->id,
                'chart_of_account_id' => $apAccount->id,
                'debit'               => 0.00,
                'credit'              => 42300.00,
                'description'         => 'Bill #BILL-MERALCO-2026-09 - Meralco Commercial Power',
            ]);

            $bill3 = ApBill::create([
                'bill_number'         => 'BILL-MERALCO-2026-09',
                'supplier_id'         => $meralco->id,
                'chart_of_account_id' => $utilAccount?->id ?? $invAccount->id,
                'bill_date'           => now()->subDays(25)->toDateString(),
                'due_date'            => now()->subDays(12)->toDateString(), // 12 days past due!
                'total_amount'        => 42300.00,
                'paid_amount'         => 0.00,
                'balance'             => 42300.00,
                'category_type'       => 'UTILITIES_BILL',
                'description'         => 'Warehouse and Storefront Electricity Billing for Sept 2026',
                'status'              => 'OVERDUE',
                'created_by'          => $staff->id,
                'journal_entry_id'    => $je3->id,
            ]);

            $bill3->attachments()->create([
                'file_name'     => 'meralco_commercial_billing_stmt.pdf',
                'file_path'     => 'attachments/bills/meralco_bill_sample.pdf',
                'mime_type'     => 'application/pdf',
                'file_size'     => 1024,
                'document_type' => 'BILLING_STATEMENT',
                'uploaded_by'   => $staff->id,
            ]);

            // Pending Approval Payment Request for Meralco bill
            $pr2 = PaymentRequest::create([
                'request_number'      => 'PR-' . now()->format('Ym') . '-0002',
                'ap_bill_id'          => $bill3->id,
                'payee_name'          => $meralco->name,
                'amount'              => 42300.00,
                'purpose'             => 'Urgent settlement of overdue power bill to prevent disconnection',
                'requested_by'        => $staff->id,
                'status'              => 'PENDING_APPROVAL',
                'ai_confidence_score' => 0.9800,
                'ai_anomaly_flag'     => false,
            ]);

            $pr2->attachments()->create([
                'file_name'     => 'meralco_notice_of_disconnection.pdf',
                'file_path'     => 'attachments/requests/pr_voucher_sample.pdf',
                'mime_type'     => 'application/pdf',
                'file_size'     => 1024,
                'document_type' => 'BILLING_STATEMENT',
                'uploaded_by'   => $staff->id,
            ]);
        }
    }
}
