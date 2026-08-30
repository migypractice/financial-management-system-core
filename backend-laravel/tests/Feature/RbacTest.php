<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

class RbacTest extends TestCase
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
        $subsystemId = DB::table('subsystems')->value('id');

        return Transaction::create(array_merge([
            'transaction_code'      => 'TXN-TEST-' . strtoupper(Str::random(6)),
            'subsystem_id'          => $subsystemId,
            'source_module'         => 'TEST',
            'external_reference_id' => 'REF-' . Str::random(6),
            'type'                  => 'EXPENSE',
            'amount'                => 1000,
            'net_amount'            => 1000,
            'currency'              => 'PHP',
            'description'           => 'Test transaction',
            'status'                => 'pending_approval',
            'ai_confidence_score'   => 0.9,
            'ai_anomaly_flag'       => false,
            'created_by'            => $this->makeUser('system_integration')->id,
        ], $overrides));
    }

    public function test_unauthenticated_request_is_rejected(): void
    {
        $this->getJson('/api/v1/dashboard/transactions')->assertStatus(401);
    }

    public function test_any_authenticated_role_can_view_the_transaction_list(): void
    {
        $viewer = $this->makeUser('department_viewer');

        $this->actingAs($viewer, 'sanctum')
            ->getJson('/api/v1/dashboard/transactions')
            ->assertStatus(200);
    }

    public function test_department_viewer_cannot_approve_transactions(): void
    {
        $viewer = $this->makeUser('department_viewer');
        $transaction = $this->makeTransaction();

        $this->actingAs($viewer, 'sanctum')
            ->postJson("/api/v1/dashboard/transactions/{$transaction->id}/approve")
            ->assertStatus(403);
    }

    public function test_finance_manager_can_approve_a_transaction_they_did_not_create(): void
    {
        $manager = $this->makeUser('finance_manager');
        $transaction = $this->makeTransaction();

        $this->actingAs($manager, 'sanctum')
            ->postJson("/api/v1/dashboard/transactions/{$transaction->id}/approve")
            ->assertStatus(200);

        $this->assertSame('posted', $transaction->fresh()->status);
    }

    public function test_finance_manager_cannot_approve_their_own_transaction(): void
    {
        $manager = $this->makeUser('finance_manager');
        $transaction = $this->makeTransaction(['created_by' => $manager->id]);

        $this->actingAs($manager, 'sanctum')
            ->postJson("/api/v1/dashboard/transactions/{$transaction->id}/approve")
            ->assertStatus(403);

        $this->assertSame('pending_approval', $transaction->fresh()->status);
    }

    public function test_finance_manager_cannot_reject_their_own_transaction(): void
    {
        $manager = $this->makeUser('finance_manager');
        $transaction = $this->makeTransaction(['created_by' => $manager->id]);

        $this->actingAs($manager, 'sanctum')
            ->postJson("/api/v1/dashboard/transactions/{$transaction->id}/reject")
            ->assertStatus(403);
    }

    public function test_super_admin_can_approve_a_transaction(): void
    {
        $admin = $this->makeUser('super_admin');
        $transaction = $this->makeTransaction();

        $this->actingAs($admin, 'sanctum')
            ->postJson("/api/v1/dashboard/transactions/{$transaction->id}/approve")
            ->assertStatus(200);
    }

    public function test_general_ledger_endpoint_is_blocked_for_department_viewer(): void
    {
        $viewer = $this->makeUser('department_viewer');

        $this->actingAs($viewer, 'sanctum')
            ->getJson('/api/v1/dashboard/gl')
            ->assertStatus(403);
    }

    public function test_audit_log_endpoint_requires_finance_manager_or_above(): void
    {
        $viewer = $this->makeUser('department_viewer');
        $manager = $this->makeUser('finance_manager');

        $this->actingAs($viewer, 'sanctum')
            ->getJson('/api/v1/dashboard/audit-logs')
            ->assertStatus(403);

        $this->actingAs($manager, 'sanctum')
            ->getJson('/api/v1/dashboard/audit-logs')
            ->assertStatus(200);
    }

    /**
     * Regression coverage for the audit finding that the M2M system-attribution
     * account (system@hw.com) was seeded with super_admin, which meant the
     * "maker" identity stamped on every M2M transaction could also act as
     * "checker". system_integration is now the account's role and carries no
     * entry in any route's role: allow-list — these three assertions prove
     * that holds for every gated route a checker identity would need.
     */
    public function test_system_integration_role_cannot_approve_or_reject_transactions(): void
    {
        $systemRoleUser = $this->makeUser('system_integration');
        $transaction = $this->makeTransaction();

        $this->actingAs($systemRoleUser, 'sanctum')
            ->postJson("/api/v1/dashboard/transactions/{$transaction->id}/approve")
            ->assertStatus(403);

        $this->actingAs($systemRoleUser, 'sanctum')
            ->postJson("/api/v1/dashboard/transactions/{$transaction->id}/reject")
            ->assertStatus(403);

        $this->assertSame('pending_approval', $transaction->fresh()->status);
    }

    public function test_system_integration_role_cannot_access_general_ledger_or_audit_logs(): void
    {
        $systemRoleUser = $this->makeUser('system_integration');

        $this->actingAs($systemRoleUser, 'sanctum')
            ->getJson('/api/v1/dashboard/gl')
            ->assertStatus(403);

        $this->actingAs($systemRoleUser, 'sanctum')
            ->getJson('/api/v1/dashboard/audit-logs')
            ->assertStatus(403);
    }
}
