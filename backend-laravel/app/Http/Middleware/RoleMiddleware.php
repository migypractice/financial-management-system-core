<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RoleMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next, ...$roles): Response
    {
        if (! $request->user() || ! $request->user()->role) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $userRole = $request->user()->role->slug;

        if (! in_array($userRole, $roles)) {
            return response()->json([
                'success' => false,
                'message' => 'Access Denied: You do not have permission to perform this action.'
            ], 403);
        }

        return $next($request);
    }
}
