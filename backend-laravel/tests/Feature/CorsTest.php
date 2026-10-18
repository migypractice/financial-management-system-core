<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CorsTest extends TestCase
{
    use RefreshDatabase;
    public function test_cors_preflight_on_hrms_batch_endpoint(): void
    {
        $response = $this->call('OPTIONS', '/api/integrations/hr4/payroll', [], [], [], [
            'HTTP_ORIGIN'                         => 'https://group9-payroll.vercel.app',
            'HTTP_ACCESS_CONTROL_REQUEST_METHOD'  => 'POST',
            'HTTP_ACCESS_CONTROL_REQUEST_HEADERS' => 'X-API-KEY, Content-Type, Authorization, Idempotency-Key',
        ]);

        $this->assertTrue(in_array($response->getStatusCode(), [200, 204]));
        $response->assertHeader('Access-Control-Allow-Origin', '*');
    }

    public function test_cors_preflight_on_inbound_revenue_endpoint(): void
    {
        $response = $this->call('OPTIONS', '/api/v1/integration/inbound-revenue', [], [], [], [
            'HTTP_ORIGIN'                         => 'https://group3-esfa.render.com',
            'HTTP_ACCESS_CONTROL_REQUEST_METHOD'  => 'POST',
            'HTTP_ACCESS_CONTROL_REQUEST_HEADERS' => 'X-API-KEY, Content-Type',
        ]);

        $this->assertTrue(in_array($response->getStatusCode(), [200, 204]));
        $response->assertHeader('Access-Control-Allow-Origin', '*');
    }

    public function test_cors_header_present_on_actual_request_from_external_origin(): void
    {
        $response = $this->getJson('/api/integrations/financial-summary', [
            'X-API-KEY' => 'test-integration-api-key',
            'Origin'    => 'https://group10-finance.vercel.app',
        ]);

        $response->assertStatus(200);
        $response->assertHeader('Access-Control-Allow-Origin', '*');
    }
}
