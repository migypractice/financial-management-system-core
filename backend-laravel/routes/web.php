<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return response()->json([
        'system'  => 'Group 10 — Financial Management System (Transaction Core)',
        'status'  => 'healthy',
        'cluster' => 'Archon Nell Incorporated Enterprise Cluster',
        'api_doc' => '/docs/INTEGRATION-FINANCE.md',
    ]);
});

// Fallback redirect for partners who hit /integrations/... without the /api prefix.
// 307 Temporary Redirect guarantees the HTTP method (POST/GET) and JSON body are preserved.
Route::any('/integrations/{any}', function (string $any) {
    return redirect('/api/integrations/' . $any, 307);
})->where('any', '.*');
