<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ApiKeyMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        $expectedKey = config('services.integration_api_key', 'hw-integration-secret-2026');

        // 1. Accept from X-API-KEY header (standard M2M)
        $providedKey = $request->header('X-API-KEY');

        // 2. Accept from Authorization: Bearer <key>
        if (!$providedKey) {
            $authHeader = $request->header('Authorization');
            if ($authHeader && preg_match('/^Bearer\s+(.*?)$/i', $authHeader, $matches)) {
                $providedKey = trim($matches[1]);
            }
        }

        // 3. Accept from query parameter fallback (?api_key= or ?key=)
        if (!$providedKey) {
            $providedKey = $request->query('api_key') ?? $request->query('key');
        }

        if (!$providedKey || $providedKey !== $expectedKey) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Unauthorized. Invalid or missing API key.',
            ], 401);
        }

        return $next($request);
    }
}
