<?php

namespace Tests\Feature;

use App\Models\Budget;
use App\Models\ChartOfAccount;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BudgetControllerTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected User $manager;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);

        $this->admin = User::where('email', 'admin@hw.com')->firstOrFail();
        $this->manager = User::where('email', 'manager@hw.com')->firstOrFail();
    }

    public function test_can_list_budgets_with_utilization(): void
    {
        $response = $this->actingAs($this->manager)
            ->getJson('/api/v1/budgets?fiscal_year=2026');

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonStructure([
                'data',
                'summary' => [
                    'total_allocated',
                    'total_spent',
                    'total_remaining',
                    'avg_utilization',
                    'budget_count',
                ]
            ]);

        $this->assertGreaterThan(0, count($response->json('data')));
    }

    public function test_can_create_budget(): void
    {
        $coa = ChartOfAccount::first();

        $payload = [
            'department'          => 'Marketing & Sales',
            'category'            => 'Online Advertising & Promo',
            'fiscal_year'         => 2026,
            'period'              => 'ANNUAL',
            'allocated_amount'    => 180000.00,
            'chart_of_account_id' => $coa?->id,
            'notes'               => 'Digital campaign for E-Commerce hardware shop',
        ];

        $response = $this->actingAs($this->manager)
            ->postJson('/api/v1/budgets', $payload);

        $response->assertCreated()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.department', 'Marketing & Sales');

        $this->assertDatabaseHas('budgets', [
            'department'  => 'Marketing & Sales',
            'fiscal_year' => 2026,
        ]);
    }
}
