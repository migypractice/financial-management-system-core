<?php

namespace Tests\Feature;

use App\Models\ArInvoice;
use App\Models\BankAccount;
use App\Models\ChartOfAccount;
use App\Models\Collection;
use App\Models\Customer;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Tests\TestCase;

class AccountsReceivableSliceTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected User $manager;
    protected User $staff;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
        Storage::fake('public');

        $this->admin = User::where('email', 'admin@hw.com')->firstOrFail();
        $this->manager = User::where('email', 'manager@hw.com')->firstOrFail();
        $this->staff = User::where('email', 'staff@hw.com')->firstOrFail();
    }

    private function createSampleInvoice(float $amount = 85000.00): ArInvoice
    {
        $customer = Customer::firstOrFail();
        $account = ChartOfAccount::where('code', '4000-REV')->firstOrFail();

        return ArInvoice::create([
            'invoice_number'      => 'INV-' . strtoupper(Str::random(6)),
            'customer_id'         => $customer->id,
            'chart_of_account_id' => $account->id,
            'invoice_date'        => now()->toDateString(),
            'due_date'            => now()->addDays(30)->toDateString(),
            'total_amount'        => $amount,
            'paid_amount'         => 0,
            'balance'             => $amount,
            'status'              => 'UNPAID',
            'description'         => 'Sample sales invoice for cement and steel bars',
            'created_by'          => $this->staff->id,
        ]);
    }

    public function test_can_list_customers(): void
    {
        $response = $this->actingAs($this->staff)
            ->getJson('/api/v1/customers');

        $response->assertOk()
            ->assertJsonPath('success', true);

        $this->assertGreaterThan(0, count($response->json('data')));
    }

    public function test_can_create_customer(): void
    {
        $payload = [
            'customer_code'      => 'CUST-NEW-99',
            'name'               => 'Apex Builders Corporation',
            'company_name'       => 'Apex Construction & Development Corp.',
            'email'              => 'apex@build.ph',
            'phone'              => '+63 917 000 1122',
            'address'            => '123 Pioneer St, Mandaluyong City',
            'credit_limit'       => 1000000.00,
            'payment_terms_days' => 30,
        ];

        $response = $this->actingAs($this->manager)
            ->postJson('/api/v1/customers', $payload);

        $response->assertCreated()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.customer_code', 'CUST-NEW-99');

        $this->assertDatabaseHas('customers', ['customer_code' => 'CUST-NEW-99']);
    }

    public function test_can_create_ar_invoice_with_balanced_journal_entry(): void
    {
        $customer = Customer::firstOrFail();
        $revAccount = ChartOfAccount::where('code', '4000-REV')->firstOrFail();

        $payload = [
            'customer_id'         => $customer->id,
            'invoice_number'      => 'INV-TEST-2026-01',
            'invoice_date'        => now()->toDateString(),
            'due_date'            => now()->addDays(30)->toDateString(),
            'total_amount'        => 75000.00,
            'chart_of_account_id' => $revAccount->id,
            'description'         => 'Sale of 150 bags Holcim Cement & Steel Bars',
        ];

        $response = $this->actingAs($this->staff)
            ->postJson('/api/v1/ar-invoices', $payload);

        $response->assertCreated()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.invoice_number', 'INV-TEST-2026-01');

        $this->assertEquals(75000.00, (float) $response->json('data.balance'));

        // Verify AR Invoice in database
        $invoice = ArInvoice::where('invoice_number', 'INV-TEST-2026-01')->firstOrFail();
        $this->assertEquals('UNPAID', $invoice->status);
        $this->assertNotNull($invoice->journal_entry_id);

        // Verify balanced double-entry lines in GL: Debit AR, Credit Revenue
        $entry = $invoice->journalEntry;
        $this->assertEquals('POSTED', $entry->status);

        $lines = $entry->lines;
        $totalDebit = $lines->sum('debit');
        $totalCredit = $lines->sum('credit');

        $this->assertEquals(75000.00, (float) $totalDebit);
        $this->assertEquals(75000.00, (float) $totalCredit);
        $this->assertEquals((float) $totalDebit, (float) $totalCredit, 'Debits and Credits must balance!');
    }

    public function test_collection_increments_bank_and_posts_balanced_gl(): void
    {
        $bank = BankAccount::where('bank_name', 'like', '%BDO%')->firstOrFail();
        $initialBankBalance = (float) $bank->current_balance;

        $invoice = $this->createSampleInvoice(85000.00);
        $collectAmount = 35000.00;

        $fakeReceipt = UploadedFile::fake()->create('official_receipt_0991.pdf', 250, 'application/pdf');

        $response = $this->actingAs($this->manager)
            ->post("/api/v1/ar-invoices/{$invoice->id}/collect", [
                'amount'           => $collectAmount,
                'bank_account_id'  => $bank->id,
                'payment_method'   => 'BANK_TRANSFER',
                'reference_number' => 'BDO-DEP-449911',
                'attachment'       => $fakeReceipt,
            ], ['Accept' => 'application/json']);

        $response->assertCreated()
            ->assertJsonPath('success', true);

        // 1. Verify Bank Balance increased
        $bank->refresh();
        $this->assertEquals($initialBankBalance + $collectAmount, (float) $bank->current_balance);

        // 2. Verify Invoice Balance decreased and status is PARTIAL
        $invoice->refresh();
        $this->assertEquals(85000.00 - $collectAmount, (float) $invoice->balance);
        $this->assertEquals('PARTIAL', $invoice->status);

        // 3. Verify Collection record
        $collectionId = $response->json('data.id');
        $collection = Collection::with('attachments')->findOrFail($collectionId);
        $this->assertEquals($collectAmount, (float) $collection->amount);
        $this->assertCount(1, $collection->attachments);

        // 4. Verify balanced GL lines: Debit 1010-CASH, Credit 1110-AR
        $txn = \App\Models\Transaction::where('external_reference_id', $collection->collection_number)->firstOrFail();
        $entry = $txn->journalEntry;
        $this->assertNotNull($entry);

        $lines = $entry->lines;
        $totalDebit = $lines->sum('debit');
        $totalCredit = $lines->sum('credit');

        $this->assertEquals($collectAmount, (float) $totalDebit);
        $this->assertEquals($collectAmount, (float) $totalCredit);
        $this->assertEquals((float) $totalDebit, (float) $totalCredit, 'Collection GL Debits must equal Credits!');
    }

    public function test_collection_cannot_exceed_invoice_balance(): void
    {
        $bank = BankAccount::firstOrFail();
        $invoice = $this->createSampleInvoice(10000.00);

        $response = $this->actingAs($this->manager)
            ->postJson("/api/v1/ar-invoices/{$invoice->id}/collect", [
                'amount'          => 15000.00, // Exceeds 10,000 balance!
                'bank_account_id' => $bank->id,
                'payment_method'  => 'CASH',
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['amount']);
    }

    public function test_cannot_collect_on_already_paid_invoice(): void
    {
        $bank = BankAccount::firstOrFail();
        $invoice = $this->createSampleInvoice(10000.00);
        $invoice->update(['balance' => 0, 'paid_amount' => 10000.00, 'status' => 'PAID']);

        $response = $this->actingAs($this->manager)
            ->postJson("/api/v1/ar-invoices/{$invoice->id}/collect", [
                'amount'          => 1000.00,
                'bank_account_id' => $bank->id,
                'payment_method'  => 'CASH',
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['amount']);
    }
}
