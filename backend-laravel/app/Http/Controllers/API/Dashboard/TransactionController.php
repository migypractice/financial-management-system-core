<?php

namespace App\Http\Controllers\API\Dashboard;

use App\Http\Controllers\Controller;
use App\Models\Transaction;
use App\Services\FinancialService\FinancialService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TransactionController extends Controller
{
    public function __construct(
        private readonly FinancialService $financialService
    ) {}

    /**
     * Fetch transactions for the React Dashboard.
     */
    public function index(Request $request): JsonResponse
    {
        // For production, you might want to paginate and filter here.
        $status = $request->query('status'); // Optional filter

        $query = Transaction::query()->orderByDesc('created_at');

        if ($status && $status !== 'all') {
            $query->where('status', $status);
        }

        $paginated = $query->paginate(50);

        $flaggedCount = Transaction::where('status', 'ai_flagged')->count();
        $pendingCount = Transaction::where('status', 'pending_approval')->count();
        $allCount = Transaction::count();

        return response()->json([
            'success' => true,
            'message' => 'Transactions retrieved successfully.',
            'data'    => $paginated->items(),
            'meta'    => [
                'current_page' => $paginated->currentPage(),
                'last_page'    => $paginated->lastPage(),
                'total_items'  => $paginated->total(),
            ],
            'summary' => [
                'all_count'     => $allCount,
                'flagged_count' => $flaggedCount,
                'pending_count' => $pendingCount,
            ]
        ]);
    }

    /**
     * Approve a transaction via Maker-Checker workflow.
     */
    public function approve(Transaction $transaction, Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user) {
            abort(401, 'Unauthorized');
        }
        $this->authorize('approve', $transaction);
        $userId = $user->id;

        try {
            $result = $this->financialService->approveAndPost($transaction->id, $userId);

            return response()->json([
                'success' => true,
                'message' => 'Transaction approved successfully.',
                'data'    => $result,
            ]);
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Approval failed: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Unable to process transaction.',
            ], 400);
        }
    }

    /**
     * Reject a transaction via Maker-Checker workflow.
     */
    public function reject(Transaction $transaction, Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user) {
            abort(401, 'Unauthorized');
        }
        $this->authorize('reject', $transaction);
        $userId = $user->id;
        $reason = $request->input('reason');

        try {
            $result = $this->financialService->rejectTransaction($transaction->id, $userId, $reason);

            return response()->json([
                'success' => true,
                'message' => 'Transaction rejected successfully.',
                'data'    => $result,
            ]);
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Rejection failed: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Unable to process transaction.',
            ], 400);
        }
    }
}
