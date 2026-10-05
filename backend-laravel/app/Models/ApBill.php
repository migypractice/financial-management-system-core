<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ApBill extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'bill_number',
        'supplier_id',
        'chart_of_account_id',
        'bill_date',
        'due_date',
        'total_amount',
        'paid_amount',
        'balance',
        'category_type',
        'description',
        'status',
        'created_by',
        'journal_entry_id',
    ];

    protected $casts = [
        'total_amount' => 'decimal:2',
        'paid_amount'  => 'decimal:2',
        'balance'      => 'decimal:2',
        'bill_date'    => 'date',
        'due_date'     => 'date',
    ];

    public function supplier()
    {
        return $this->belongsTo(Supplier::class, 'supplier_id');
    }

    public function chartOfAccount()
    {
        return $this->belongsTo(ChartOfAccount::class, 'chart_of_account_id');
    }

    public function journalEntry()
    {
        return $this->belongsTo(JournalEntry::class, 'journal_entry_id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function paymentRequests()
    {
        return $this->hasMany(PaymentRequest::class, 'ap_bill_id');
    }

    public function attachments()
    {
        return $this->morphMany(Attachment::class, 'attachable');
    }
}
