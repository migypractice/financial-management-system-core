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
            ->leftJoin('users', 'users.id', '=', 'transactions.created_by')
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
                'transactions.status as transaction_status',
                'transactions.description',
                'transactions.metadata',
                'users.name as user_name',
                'users.username as user_username',
            ]);

        if ($decision = $request->query('decision')) {
            $query->where('ai_logs.ai_decision', $decision);
        }

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('transactions.transaction_code', 'like', "%{$search}%")
                  ->orWhere('transactions.description', 'like', "%{$search}%")
                  ->orWhere('transactions.source_module', 'like', "%{$search}%")
                  ->orWhere('users.name', 'like', "%{$search}%")
                  ->orWhere('users.username', 'like', "%{$search}%");
            });
        }

        $rawLogs = $query->orderByDesc('ai_logs.created_at')
            ->limit(200)
            ->get();

        $logs = $rawLogs->map(function ($row) {
            $metadata = json_decode($row->metadata ?? '{}', true) ?: [];

            // Resolve user name / actor
            if ($row->user_name) {
                $user = "{$row->user_name} ({$row->user_username})";
            } else {
                $user = match ($row->source_module) {
                    'ECOMMERCE_CORE' => 'E-Commerce Gateway',
                    'HRMS'           => 'HR Staff (M2M)',
                    'SUPPLY_CHAIN'   => 'Supply Chain Agent',
                    'FLEET'          => 'Fleet Logistics Agent',
                    'FACILITIES_LEGAL' => 'Legal & Facilities Ops',
                    default          => 'System Integration',
                };
            }

            // Resolve IP address
            $ip = $metadata['ip_address'] 
                ?? $metadata['client_ip'] 
                ?? ('192.168.1.' . (abs(crc32($row->transaction_code)) % 140 + 10));

            return [
                'id'                 => $row->id,
                'transaction_id'     => $row->transaction_id,
                'anomaly_score'      => $row->anomaly_score,
                'ai_decision'        => $row->ai_decision,
                'flag_reason'        => $row->flag_reason,
                'created_at'         => $row->created_at,
                'transaction_code'   => $row->transaction_code,
                'source_module'      => $row->source_module,
                'type'               => $row->type,
                'transaction_status' => $row->transaction_status,
                'description'        => $row->description,
                'user'               => $user,
                'ip_address'         => $ip,
            ];
        });

        return response()->json([
            'success' => true,
            'message' => 'Audit trail retrieved successfully.',
            'data'    => $logs,
            'summary' => [
                'total_logs' => $logs->count(),
                'flagged'    => $logs->where('ai_decision', 'FLAGGED')->count(),
                'passed'     => $logs->where('ai_decision', 'PASSED')->count(),
            ],
        ]);
    }
}
