<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PaymentRequest extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'request_number',
        'ap_bill_id',
        'payee_name',
        'amount',
        'purpose',
        'requested_by',
        'status',
        'approved_by',
        'approved_at',
        'rejection_reason',
        'ai_confidence_score',
        'ai_anomaly_flag',
        'ai_anomaly_reason',
        'transaction_id',
    ];

    protected $casts = [
        'amount'              => 'decimal:2',
        'ai_confidence_score' => 'decimal:4',
        'ai_anomaly_flag'     => 'boolean',
        'approved_at'         => 'datetime',
    ];

    public function bill()
    {
        return $this->belongsTo(ApBill::class, 'ap_bill_id');
    }

    public function requester()
    {
        return $this->belongsTo(User::class, 'requested_by');
    }

    public function approver()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function transaction()
    {
        return $this->belongsTo(Transaction::class, 'transaction_id');
    }

    public function disbursement()
    {
        return $this->hasOne(Disbursement::class, 'payment_request_id');
    }

    public function attachments()
    {
        return $this->morphMany(Attachment::class, 'attachable');
    }
}
