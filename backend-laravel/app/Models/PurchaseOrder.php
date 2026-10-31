<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PurchaseOrder extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'financial_reference',
        'source_system',
        'message_id',
        'external_reference_id',
        'idempotency_key',
        'category_type',
        'currency',
        'total_amount',
        'supplier_id',
        'supplier_code',
        'supplier_name',
        'receipt_status',
        'processing_status',
        'payload_hash',
        'raw_payload',
        'metadata',
        'received_at',
    ];

    protected $casts = [
        'total_amount' => 'decimal:2',
        'raw_payload'  => 'array',
        'metadata'     => 'array',
        'received_at'  => 'datetime',
    ];

    public function items()
    {
        return $this->hasMany(PurchaseOrderLine::class, 'purchase_order_id');
    }

    public function lines()
    {
        return $this->hasMany(PurchaseOrderLine::class, 'purchase_order_id');
    }

    public function supplier()
    {
        return $this->belongsTo(Supplier::class, 'supplier_id');
    }
}

