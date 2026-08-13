<?php

namespace App\Http\Controllers\API\Dashboard;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class AuditLogController extends Controller
{
    /**
     * Fetch the AI evaluation audit trail (ai_logs joined with their transaction).
     */
    public function index(Request $request): JsonResponse
    {
        $query = DB::table('ai_logs')
            ->join('transactions', 'transactions.id', '=', 'ai_logs.transaction_id')
            ->select([
                'ai_logs.id',
                'ai_logs.transaction_id',
                'ai_logs.anomaly_score',
                'ai_logs.ai_decision',
                'ai_logs.flag_reason',
                'ai_logs.created_at',
                'transactions.transaction_code',
                'transactions.source_module',
                'transactions.type',
                'transactions.amount',
                'transactions.status as transaction_status',
                'transactions.description',
            ]);

        if ($decision = $request->query('decision')) {
            $query->where('ai_logs.ai_decision', $decision);
        }

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('transactions.transaction_code', 'like', "%{$search}%")
                  ->orWhere('transactions.description', 'like', "%{$search}%")
                  ->orWhere('transactions.source_module', 'like', "%{$search}%");
            });
        }

        $logs = $query->orderByDesc('ai_logs.created_at')
            ->limit(200)
            ->get();

        return response()->json([
            'success' => true,
            'message' => 'Audit trail retrieved successfully.',
            'data'    => $logs,
            'summary' => [
                'total_logs'   => $logs->count(),
                'flagged'      => $logs->where('ai_decision', 'FLAGGED')->count(),
                'passed'       => $logs->where('ai_decision', 'PASSED')->count(),
            ],
        ]);
    }
}
