<?php

namespace Tests\Feature;

use App\Models\ApBill;
use App\Models\BankAccount;
use App\Models\ChartOfAccount;
use App\Models\PaymentRequest;
use App\Models\Supplier;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Tests\TestCase;

class AccountsPayableSliceTest extends TestCase
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

    private function createSampleBill(float $amount = 50000.00): ApBill
    {
        $supplier = Supplier::firstOrFail();
        $account = ChartOfAccount::where('code', '1200-INV')->firstOrFail();

        return ApBill::create([
            'bill_number'         => 'BILL-' . strtoupper(Str::random(6)),
            'supplier_id'         => $supplier->id,
            'chart_of_account_id' => $account->id,
            'bill_date'           => now()->toDateString(),
            'due_date'            => now()->addDays(30)->toDateString(),
            'total_amount'        => $amount,
            'paid_amount'         => 0,
            'balance'             => $amount,
            'status'              => 'UNPAID',
            'category_type'       => 'INVENTORY_PURCHASE',
            'description'         => 'Sample supplier bill for materials',
            'created_by'          => $this->staff->id,
        ]);
    }

    public function test_can_list_suppliers(): void
    {
        $response = $this->actingAs($this->staff)
            ->getJson('/api/v1/suppliers');

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonStructure(['data', 'success']);

        $this->assertGreaterThan(0, count($response->json('data')));
    }

    public function test_can_create_ap_bill_with_balanced_journal_entry(): void
    {
        $supplier = Supplier::firstOrFail();
        $inventoryAccount = ChartOfAccount::where('code', '1200-INV')->firstOrFail();

        $payload = [
            'supplier_id'         => $supplier->id,
            'bill_number'         => 'BILL-TEST-999',
            'bill_date'           => now()->toDateString(),
            'due_date'            => now()->addDays(30)->toDateString(),
            'total_amount'        => 45000.00,
            'category_type'       => 'INVENTORY_PURCHASE',
            'chart_of_account_id' => $inventoryAccount->id,
            'description'         => 'Purchase of 100 bags of Portland Cement',
        ];

        $response = $this->actingAs($this->staff)
            ->postJson('/api/v1/ap-bills', $payload);

        $response->assertCreated()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.bill_number', 'BILL-TEST-999');

        $this->assertEquals(45000.00, (float) $response->json('data.balance'));

        // Verify AP Bill in database
        $this->assertDatabaseHas('ap_bills', [
            'bill_number'  => 'BILL-TEST-999',
            'status'       => 'UNPAID',
            'total_amount' => 45000.00,
        ]);

        // Verify balanced double-entry lines in GL
        $bill = ApBill::where('bill_number', 'BILL-TEST-999')->firstOrFail();
        $this->assertNotNull($bill->journal_entry_id);

        $entry = $bill->journalEntry;
        $this->assertEquals('POSTED', $entry->status);

        $lines = $entry->lines;
        $totalDebit = $lines->sum('debit');
        $totalCredit = $lines->sum('credit');

        $this->assertEquals(45000.00, (float) $totalDebit);
        $this->assertEquals(45000.00, (float) $totalCredit);
        $this->assertEquals($totalDebit, $totalCredit, 'Debits and Credits must balance!');
    }

    public function test_payment_request_strictly_fails_without_attachment(): void
    {
        $bill = $this->createSampleBill();

        $response = $this->actingAs($this->staff)
            ->postJson('/api/v1/payment-requests', [
                'ap_bill_id' => $bill->id,
                'payee_name' => 'Holcim Philippines',
                'amount'     => 15000.00,
                'purpose'    => 'Partial payment for cement delivery',
                // No attachment provided!
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['attachment']);
    }

    public function test_payment_request_succeeds_with_mandatory_attachment(): void
    {
        $bill = $this->createSampleBill();
        $fakeFile = UploadedFile::fake()->create('supplier_invoice.pdf', 300, 'application/pdf');

        $response = $this->actingAs($this->staff)
            ->post('/api/v1/payment-requests', [
                'ap_bill_id' => $bill->id,
                'payee_name' => 'Holcim Philippines',
                'amount'     => 10000.00,
                'purpose'    => 'Payment for supplier invoice #INV-441',
                'attachment' => $fakeFile,
            ], ['Accept' => 'application/json']);

        $response->assertCreated()
            ->assertJsonPath('success', true);

        $prId = $response->json('data.id');
        $pr = PaymentRequest::with('attachments')->findOrFail($prId);

        $this->assertEquals('PENDING_APPROVAL', $pr->status);
        $this->assertCount(1, $pr->attachments);
        $this->assertEquals('supplier_invoice.pdf', $pr->attachments->first()->file_name);
    }

    public function test_maker_cannot_approve_their_own_payment_request(): void
    {
        $bill = $this->createSampleBill();
        $fakeFile = UploadedFile::fake()->create('invoice.pdf', 200, 'application/pdf');

        // Staff creates payment request
        $createRes = $this->actingAs($this->staff)
            ->post('/api/v1/payment-requests', [
                'ap_bill_id' => $bill->id,
                'payee_name' => 'Holcim Philippines',
                'amount'     => 5000.00,
                'purpose'    => 'Cement order partial payment',
                'attachment' => $fakeFile,
            ], ['Accept' => 'application/json']);

        $prId = $createRes->json('data.id');

        // Staff tries to approve their own request -> 403 Maker-Checker violation
        $approveRes = $this->actingAs($this->staff)
            ->postJson("/api/v1/payment-requests/{$prId}/approve");

        $approveRes->assertStatus(403);
    }

    public function test_finance_manager_can_approve_payment_request(): void
    {
        $bill = $this->createSampleBill();
        $fakeFile = UploadedFile::fake()->create('invoice.pdf', 200, 'application/pdf');

        $createRes = $this->actingAs($this->staff)
            ->post('/api/v1/payment-requests', [
                'ap_bill_id' => $bill->id,
                'payee_name' => 'Holcim Philippines',
                'amount'     => 5000.00,
                'purpose'    => 'Cement order partial payment',
                'attachment' => $fakeFile,
            ], ['Accept' => 'application/json']);

        $prId = $createRes->json('data.id');

        // Finance Manager approves
        $approveRes = $this->actingAs($this->manager)
            ->postJson("/api/v1/payment-requests/{$prId}/approve");

        $approveRes->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.status', 'APPROVED');
    }

    public function test_cannot_disburse_unapproved_payment_request(): void
    {
        $bill = $this->createSampleBill();
        $fakeFile = UploadedFile::fake()->create('invoice.pdf', 200, 'application/pdf');

        $createRes = $this->actingAs($this->staff)
            ->post('/api/v1/payment-requests', [
                'ap_bill_id' => $bill->id,
                'payee_name' => 'Holcim Philippines',
                'amount'     => 5000.00,
                'purpose'    => 'Cement order partial payment',
                'attachment' => $fakeFile,
            ], ['Accept' => 'application/json']);

        $prId = $createRes->json('data.id');
        $bank = BankAccount::firstOrFail();

        // Disburse directly while still PENDING_APPROVAL -> 422
        $disburseRes = $this->actingAs($this->manager)
            ->postJson("/api/v1/payment-requests/{$prId}/disburse", [
                'bank_account_id' => $bank->id,
                'payment_method'  => 'BANK_TRANSFER',
            ]);

        $disburseRes->assertStatus(422);
    }

    public function test_disbursement_decrements_bank_and_posts_balanced_gl(): void
    {
        $bank = BankAccount::where('bank_name', 'like', '%BDO%')->firstOrFail();
        $initialBankBalance = (float) $bank->current_balance;

        $bill = $this->createSampleBill(50000.00);
        $initialBillBalance = (float) $bill->balance;
        $disburseAmount = 5000.00;

        $fakeFile = UploadedFile::fake()->create('invoice.pdf', 200, 'application/pdf');

        // 1. Staff creates PR
        $createRes = $this->actingAs($this->staff)
            ->post('/api/v1/payment-requests', [
                'ap_bill_id' => $bill->id,
                'payee_name' => $bill->supplier->name,
                'amount'     => $disburseAmount,
                'purpose'    => 'Partial bill payment',
                'attachment' => $fakeFile,
            ], ['Accept' => 'application/json']);

        $prId = $createRes->json('data.id');

        // 2. Manager approves PR
        $this->actingAs($this->manager)
            ->postJson("/api/v1/payment-requests/{$prId}/approve")
            ->assertOk();

        // 3. Manager executes disbursement
        $disburseRes = $this->actingAs($this->manager)
            ->postJson("/api/v1/payment-requests/{$prId}/disburse", [
                'bank_account_id'  => $bank->id,
                'payment_method'   => 'BANK_TRANSFER',
                'reference_number' => 'BDO-TRF-889911',
            ]);

        $disburseRes->assertCreated()
            ->assertJsonPath('success', true);

        // 4. Verify Bank Balance decreased
        $bank->refresh();
        $this->assertEquals($initialBankBalance - $disburseAmount, (float) $bank->current_balance);

        // 5. Verify AP Bill Balance decreased
        $bill->refresh();
        $this->assertEquals($initialBillBalance - $disburseAmount, (float) $bill->balance);

        // 6. Verify Payment Request status is DISBURSED
        $pr = PaymentRequest::findOrFail($prId);
        $this->assertEquals('DISBURSED', $pr->status);

        // 7. Verify Balanced GL lines (Debit 2010-AP, Credit 1010-CASH)
        $disbursementId = $disburseRes->json('data.id');
        $disbursement = \App\Models\Disbursement::with('journalEntry.lines')->findOrFail($disbursementId);
        $entry = $disbursement->journalEntry;

        $this->assertNotNull($entry);
        $lines = $entry->lines;
        $totalDebit = $lines->sum('debit');
        $totalCredit = $lines->sum('credit');

        $this->assertEquals($disburseAmount, (float) $totalDebit);
        $this->assertEquals($disburseAmount, (float) $totalCredit);
        $this->assertEquals((float) $totalDebit, (float) $totalCredit, 'Disbursement GL Debits must equal Credits!');
    }
}
