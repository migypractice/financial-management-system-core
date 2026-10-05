<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\ApBill;
use App\Models\Attachment;
use App\Models\PaymentRequest;
use App\Services\AIService\AIService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PaymentRequestController extends Controller
{
    public function __construct(
        protected AIService $aiService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $status = $request->query('status');

        $query = PaymentRequest::with(['bill.supplier', 'requester', 'approver', 'attachments', 'disbursement'])
            ->orderByDesc('created_at');

        if ($status && $status !== 'ALL') {
            $query->where('status', $status);
        }

        $requests = $query->get()->map(function (PaymentRequest $pr) {
            return [
                'id'                  => $pr->id,
                'request_number'      => $pr->request_number,
                'ap_bill_id'          => $pr->ap_bill_id,
                'bill_number'         => $pr->bill?->bill_number,
                'payee_name'          => $pr->payee_name,
                'amount'              => (float) $pr->amount,
                'purpose'             => $pr->purpose,
                'status'              => $pr->status,
                'requested_by_id'     => $pr->requested_by,
                'requester_name'      => $pr->requester?->name ?? 'Staff',
                'requester_dept'      => $pr->requester?->department ?? 'General',
                'approved_by_id'      => $pr->approved_by,
                'approver_name'       => $pr->approver?->name,
                'approved_at'         => $pr->approved_at?->toIso8601String(),
                'rejection_reason'    => $pr->rejection_reason,
                'ai_confidence_score' => (float) $pr->ai_confidence_score,
                'ai_anomaly_flag'     => (bool) $pr->ai_anomaly_flag,
                'ai_anomaly_reason'   => $pr->ai_anomaly_reason,
                'created_at'          => $pr->created_at->toIso8601String(),
                'attachments'         => $pr->attachments->map(fn ($a) => [
                    'id'            => $a->id,
                    'file_name'     => $a->file_name,
                    'file_url'      => asset('storage/' . $a->file_path),
                    'mime_type'     => $a->mime_type,
                    'file_size'     => $a->file_size,
                    'document_type' => $a->document_type,
                ]),
                'has_attachment'      => $pr->attachments->count() > 0,
            ];
        });

        return response()->json([
            'success' => true,
            'data'    => $requests,
            'summary' => [
                'total_requests' => $requests->count(),
                'pending_count'  => $requests->where('status', 'PENDING_APPROVAL')->count(),
                'approved_count' => $requests->where('status', 'APPROVED')->count(),
                'disbursed_count'=> $requests->where('status', 'DISBURSED')->count(),
                'flagged_count'  => $requests->where('ai_anomaly_flag', true)->count(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        // 1. Mandatory Attachment Check — Enforces panel internal control rule:
        // "BEFORE MONEY CAN BE RELEASED, THERE MUST BE A SUPPORTING ATTACHMENT."
        $validated = $request->validate([
            'ap_bill_id' => 'nullable|exists:ap_bills,id',
            'payee_name' => 'required|string|max:150',
            'amount'     => 'required|numeric|min:0.01',
            'purpose'    => 'required|string|max:1000',
            'attachment' => 'required|file|mimes:pdf,jpg,jpeg,png|max:5120', // Mandatory supporting doc!
        ], [
            'attachment.required' => 'Supporting document / attachment is strictly mandatory before submitting a payment request.',
            'attachment.mimes'    => 'Supporting document must be a PDF, JPG, or PNG file.',
            'attachment.max'      => 'Supporting document file size cannot exceed 5MB.',
        ]);

        $user = $request->user();

        // 2. Validate against AP Bill balance if linked
        if (!empty($validated['ap_bill_id'])) {
            $bill = ApBill::findOrFail($validated['ap_bill_id']);
            if ($bill->balance <= 0) {
                throw ValidationException::withMessages([
                    'ap_bill_id' => ["AP Bill #{$bill->bill_number} has already been fully paid."],
                ]);
            }
            if ($validated['amount'] > $bill->balance) {
                throw ValidationException::withMessages([
                    'amount' => ["Payment request amount (PHP " . number_format($validated['amount'], 2) . ") exceeds outstanding bill balance (PHP " . number_format($bill->balance, 2) . ")."],
                ]);
            }
        }

        // 3. AI Risk Evaluation (Rule-Based Expert System)
        $aiResult = $this->aiService->evaluateTransaction([
            'description'     => $validated['purpose'],
            'amount'          => $validated['amount'],
            'external_module' => 'ACCOUNTS_PAYABLE',
            'category_type'   => 'SUPPLIER_INVOICE',
        ]);

        return DB::transaction(function () use ($validated, $request, $user, $aiResult) {
            $count = DB::table('payment_requests')->count() + 1;
            $requestNumber = sprintf('PR-%s-%04d', now()->format('Ym'), $count);

            $paymentRequest = PaymentRequest::create([
                'request_number'      => $requestNumber,
                'ap_bill_id'          => $validated['ap_bill_id'] ?? null,
                'payee_name'          => trim($validated['payee_name']),
                'amount'              => (float) $validated['amount'],
                'purpose'             => trim($validated['purpose']),
                'requested_by'        => $user->id,
                'status'              => 'PENDING_APPROVAL',
                'ai_confidence_score' => $aiResult['ai_confidence_score'],
                'ai_anomaly_flag'     => $aiResult['ai_anomaly_flag'],
                'ai_anomaly_reason'   => $aiResult['ai_anomaly_reason'],
            ]);

            // Save the mandatory supporting file
            $file = $request->file('attachment');
            $path = $file->store('attachments/requests', 'public');

            $paymentRequest->attachments()->create([
                'file_name'     => $file->getClientOriginalName(),
                'file_path'     => $path,
                'mime_type'     => $file->getClientMimeType(),
                'file_size'     => $file->getSize(),
                'document_type' => 'BILLING_STATEMENT',
                'uploaded_by'   => $user->id,
            ]);

            return response()->json([
                'success' => true,
                'message' => "Payment Request #{$requestNumber} submitted with verified supporting attachment.",
                'data'    => $paymentRequest->load(['attachments', 'requester']),
            ], 201);
        });
    }

    public function approve(PaymentRequest $paymentRequest, Request $request): JsonResponse
    {
        $user = $request->user();

        // Maker-Checker Enforcement: A requester cannot approve their own payment request
        if ($paymentRequest->requested_by === $user->id) {
            return response()->json([
                'success' => false,
                'message' => 'Maker-Checker Violation: You cannot approve a payment request you created yourself.',
            ], 403);
        }

        if ($paymentRequest->status !== 'PENDING_APPROVAL') {
            return response()->json([
                'success' => false,
                'message' => "Payment request cannot be approved (current status: {$paymentRequest->status}).",
            ], 422);
        }

        // Verify that attachment exists before manager approval
        if ($paymentRequest->attachments()->count() === 0) {
            return response()->json([
                'success' => false,
                'message' => 'Internal Control Violation: Cannot approve payment request without verified supporting attachment.',
            ], 422);
        }

        $paymentRequest->update([
            'status'      => 'APPROVED',
            'approved_by' => $user->id,
            'approved_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => "Payment Request #{$paymentRequest->request_number} approved. Ready for disbursement release.",
            'data'    => $paymentRequest->fresh(['approver', 'attachments']),
        ]);
    }

    public function reject(PaymentRequest $paymentRequest, Request $request): JsonResponse
    {
        $user = $request->user();

        if ($paymentRequest->requested_by === $user->id) {
            return response()->json([
                'success' => false,
                'message' => 'Maker-Checker Violation: You cannot reject your own request.',
            ], 403);
        }

        $request->validate([
            'reason' => 'required|string|max:500',
        ]);

        $paymentRequest->update([
            'status'           => 'REJECTED',
            'approved_by'      => $user->id,
            'approved_at'      => now(),
            'rejection_reason' => $request->input('reason'),
        ]);

        return response()->json([
            'success' => true,
            'message' => "Payment Request #{$paymentRequest->request_number} has been rejected.",
            'data'    => $paymentRequest->fresh(['approver']),
        ]);
    }
}
