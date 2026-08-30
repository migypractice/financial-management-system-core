<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class TransactionControllerTest extends TestCase
{
    use RefreshDatabase;

    private function makeUser(string $roleSlug): User
    {
        $role = Role::where('slug', $roleSlug)->firstOrFail();

        return User::create([
            'name'     => ucfirst($roleSlug) . ' Tester',
            'email'    => Str::uuid() . '@test.hw.com',
            'password' => 'irrelevant',
            'role_id'  => $role->id,
        ]);
    }

    private function makeTransaction(array $overrides = []): Transaction
    {
        $systemUser = User::where('email', 'system@hw.com')->first();
        
        return Transaction::create(array_merge([
            'transaction_code'      => 'TXN-TEST-' . strtoupper(Str::random(6)),
            'subsystem_id'          => \Illuminate\Support\Facades\DB::table('subsystems')->value('id'),
            'source_module'         => 'TEST',
            'external_reference_id' => 'REF-' . Str::random(6),
            'type'                  => 'EXPENSE',
            'amount'                => 100,
            'net_amount'            => 100,
            'currency'              => 'PHP',
            'description'           => 'Test transaction',
            'status'                => 'pending_approval',
            'ai_confidence_score'   => 0.9,
            'ai_anomaly_flag'       => false,
            'created_by'            => $systemUser?->id,
        ], $overrides));
    }

    public function test_transactions_endpoint_paginates_results_and_returns_summary_counts(): void
    {
        // 55 pending, 5 flagged, 5 posted. Total 65.
        for ($i = 0; $i < 55; $i++) {
            $this->makeTransaction(['status' => 'pending_approval']);
        }
        for ($i = 0; $i < 5; $i++) {
            $this->makeTransaction(['status' => 'ai_flagged']);
        }
        for ($i = 0; $i < 5; $i++) {
            $this->makeTransaction(['status' => 'posted']);
        }

        $admin = $this->makeUser('super_admin');

        $response = $this->actingAs($admin, 'sanctum')->getJson('/api/v1/dashboard/transactions');

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'success',
            'message',
            'data',
            'meta' => [
                'current_page',
                'last_page',
                'total_items'
            ],
            'summary' => [
                'all_count',
                'flagged_count',
                'pending_count',
            ]
        ]);

        $json = $response->json();
        
        $this->assertCount(50, $json['data']);
        $this->assertEquals(65, $json['meta']['total_items']);
        $this->assertEquals(2, $json['meta']['last_page']);
        
        $this->assertEquals(65, $json['summary']['all_count']);
        $this->assertEquals(5, $json['summary']['flagged_count']);
        $this->assertEquals(55, $json['summary']['pending_count']);
    }

    public function test_transactions_endpoint_filters_by_status(): void
    {
        $this->makeTransaction(['status' => 'ai_flagged']);
        $this->makeTransaction(['status' => 'pending_approval']);

        $admin = $this->makeUser('super_admin');

        $response = $this->actingAs($admin, 'sanctum')->getJson('/api/v1/dashboard/transactions?status=ai_flagged');
        $json = $response->json();

        // Should only return the 1 flagged item
        $this->assertCount(1, $json['data']);
        $this->assertEquals('ai_flagged', $json['data'][0]['status']);
        
        // However, summary counts should remain global to support the frontend tabs
        $this->assertEquals(2, $json['summary']['all_count']);
        $this->assertEquals(1, $json['summary']['flagged_count']);
        $this->assertEquals(1, $json['summary']['pending_count']);
    }
}
