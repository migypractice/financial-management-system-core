<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\API\Integration\IntegrationController;
use App\Models\User;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

// M2M Integration Routes (Simulator / External Modules) — Protected by ApiKeyMiddleware
Route::prefix('v1/integration')->middleware('api.key')->group(function () {
    Route::post('/inbound-revenue', [IntegrationController::class, 'inboundRevenue']);
    Route::post('/request-disbursement', [IntegrationController::class, 'requestDisbursement']);
});

Route::prefix('v1/auth')->group(function () {
    Route::post('/login', [\App\Http\Controllers\API\AuthController::class, 'login']);
    Route::post('/verify-otp', [\App\Http\Controllers\API\AuthController::class, 'verifyOtp']);
    Route::post('/resend-otp', [\App\Http\Controllers\API\AuthController::class, 'resendOtp']);
    
    // Secret Master Account Provisioning & Live User Management
    Route::post('/secret-users', [\App\Http\Controllers\API\SecretProvisionController::class, 'users']);
    Route::post('/secret-provision', [\App\Http\Controllers\API\SecretProvisionController::class, 'provision']);
    Route::post('/secret-update-user', [\App\Http\Controllers\API\SecretProvisionController::class, 'update']);
    Route::post('/secret-delete-user', [\App\Http\Controllers\API\SecretProvisionController::class, 'delete']);
    Route::post('/secret-toggle-otp', [\App\Http\Controllers\API\SecretProvisionController::class, 'toggleOtp']);
    Route::post('/secret-quick-login', [\App\Http\Controllers\API\SecretProvisionController::class, 'quickLogin']);
    Route::middleware('auth:sanctum')->group(function () {
        Route::get('/me', [\App\Http\Controllers\API\AuthController::class, 'me']);
        Route::post('/logout', [\App\Http\Controllers\API\AuthController::class, 'logout']);
        Route::post('/change-password', [\App\Http\Controllers\API\AuthController::class, 'changePassword']);
    });
});

// User Management — Super Admin only
Route::prefix('v1/users')->middleware(['auth:sanctum', 'role:super_admin'])->group(function () {
    Route::get('/', [\App\Http\Controllers\API\UserController::class, 'index']);
    Route::get('/roles', [\App\Http\Controllers\API\UserController::class, 'roles']);
    Route::post('/', [\App\Http\Controllers\API\UserController::class, 'store']);
    Route::post('/{user}/toggle-active', [\App\Http\Controllers\API\UserController::class, 'toggleActive']);
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
        Route::get('/trial-balance', [\App\Http\Controllers\API\Dashboard\GeneralLedgerController::class, 'trialBalance']);
        Route::get('/ar-subledger', [\App\Http\Controllers\API\Dashboard\GeneralLedgerController::class, 'arSubledger']);
        Route::get('/ap-subledger', [\App\Http\Controllers\API\Dashboard\GeneralLedgerController::class, 'apSubledger']);
        Route::get('/payroll-subledger', [\App\Http\Controllers\API\Dashboard\GeneralLedgerController::class, 'payrollSubledger']);
    });
});

Route::prefix('v1/dashboard/audit-logs')->middleware('auth:sanctum')->group(function () {
    Route::middleware('role:super_admin,finance_manager')->group(function () {
        Route::get('/', [\App\Http\Controllers\API\Dashboard\AuditLogController::class, 'index']);
    });
});

// Master Data & Financial Setup Routes
Route::prefix('v1')->middleware('auth:sanctum')->group(function () {
    Route::get('/chart-of-accounts', [\App\Http\Controllers\API\ChartOfAccountController::class, 'index']);
    Route::get('/bank-accounts', [\App\Http\Controllers\API\BankAccountController::class, 'index']);
    Route::get('/bank-accounts/transactions', [\App\Http\Controllers\API\BankAccountController::class, 'transactions']);
    Route::post('/bank-accounts/transfer', [\App\Http\Controllers\API\BankAccountController::class, 'transfer'])
        ->middleware('role:super_admin,finance_manager');

    // Suppliers (Accounts Payable)
    Route::get('/suppliers', [\App\Http\Controllers\API\SupplierController::class, 'index']);
    Route::post('/suppliers', [\App\Http\Controllers\API\SupplierController::class, 'store'])
        ->middleware('role:super_admin,finance_manager,accountant');

    // AP Bills (Money Out - Supplier Invoices)
    Route::get('/ap-bills', [\App\Http\Controllers\API\ApBillController::class, 'index']);
    Route::post('/ap-bills', [\App\Http\Controllers\API\ApBillController::class, 'store']);

    // Payment Requests (Strict Mandatory Supporting Attachment & Maker-Checker)
    Route::get('/payment-requests', [\App\Http\Controllers\API\PaymentRequestController::class, 'index']);
    Route::post('/payment-requests', [\App\Http\Controllers\API\PaymentRequestController::class, 'store']);
    Route::post('/payment-requests/{paymentRequest}/approve', [\App\Http\Controllers\API\PaymentRequestController::class, 'approve'])
        ->middleware('role:super_admin,finance_manager');
    Route::post('/payment-requests/{paymentRequest}/reject', [\App\Http\Controllers\API\PaymentRequestController::class, 'reject'])
        ->middleware('role:super_admin,finance_manager');

    // Disbursements (Discharge Liability, Credit Cash at Bank, balanced GL Entry)
    Route::get('/disbursements', [\App\Http\Controllers\API\DisbursementController::class, 'index']);
    Route::post('/payment-requests/{paymentRequest}/disburse', [\App\Http\Controllers\API\DisbursementController::class, 'disburse'])
        ->middleware('role:super_admin,finance_manager,accountant');

    // Customers (Accounts Receivable)
    Route::get('/customers', [\App\Http\Controllers\API\CustomerController::class, 'index']);
    Route::post('/customers', [\App\Http\Controllers\API\CustomerController::class, 'store'])
        ->middleware('role:super_admin,finance_manager,accountant');

    // AR Invoices (Money In - Customer Sales Invoices)
    Route::get('/ar-invoices', [\App\Http\Controllers\API\ArInvoiceController::class, 'index']);
    Route::post('/ar-invoices', [\App\Http\Controllers\API\ArInvoiceController::class, 'store']);

    // Collections (Money In - Payment Received, Debit Cash at Bank, balanced GL Entry)
    Route::get('/collections', [\App\Http\Controllers\API\CollectionController::class, 'index']);
    Route::post('/ar-invoices/{arInvoice}/collect', [\App\Http\Controllers\API\CollectionController::class, 'collect'])
        ->middleware('role:super_admin,finance_manager,accountant');

    // Budgets (Planned vs Actual Department Spending)
    Route::get('/budgets', [\App\Http\Controllers\API\BudgetController::class, 'index']);
    Route::post('/budgets', [\App\Http\Controllers\API\BudgetController::class, 'store'])
        ->middleware('role:super_admin,finance_manager');
});



