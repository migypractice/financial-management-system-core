<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\API\Integration\IntegrationController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

// M2M Integration Routes (Simulator / External Modules)
Route::prefix('v1/integration')->group(function () {
    Route::post('/inbound-revenue', [IntegrationController::class, 'inboundRevenue']);
    Route::post('/request-disbursement', [IntegrationController::class, 'requestDisbursement']);
});

Route::prefix('v1/auth')->group(function () {
    Route::post('/login', [\App\Http\Controllers\API\AuthController::class, 'login']);
    Route::middleware('auth:sanctum')->group(function () {
        Route::get('/me', [\App\Http\Controllers\API\AuthController::class, 'me']);
        Route::post('/logout', [\App\Http\Controllers\API\AuthController::class, 'logout']);
    });
});

// Dashboard API Routes (React Frontend)
use App\Http\Controllers\API\Dashboard\TransactionController;

Route::prefix('v1/dashboard/transactions')->middleware('auth:sanctum')->group(function () {
    // All authenticated users can view transactions
    Route::get('/', [TransactionController::class, 'index']);
    
    // Only Managers and Admins can approve or reject
    Route::middleware('role:super_admin,finance_manager')->group(function () {
        Route::post('/{transaction}/approve', [TransactionController::class, 'approve']);
        Route::post('/{transaction}/reject', [TransactionController::class, 'reject']);
    });
});

Route::prefix('v1/dashboard/gl')->middleware('auth:sanctum')->group(function () {
    Route::middleware('role:super_admin,finance_manager,accountant')->group(function () {
        Route::get('/', [\App\Http\Controllers\API\Dashboard\GeneralLedgerController::class, 'index']);
    });
});
