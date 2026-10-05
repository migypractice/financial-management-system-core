<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Disbursement extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'disbursement_number',
        'payment_request_id',
        'bank_account_id',
        'amount',
        'disbursement_date',
        'payment_method',
        'reference_number',
        'disbursed_by',
        'journal_entry_id',
    ];

    protected $casts = [
        'amount'            => 'decimal:2',
        'disbursement_date' => 'date',
    ];

    public function paymentRequest()
    {
        return $this->belongsTo(PaymentRequest::class, 'payment_request_id');
    }

    public function bankAccount()
    {
        return $this->belongsTo(BankAccount::class, 'bank_account_id');
    }

    public function disburser()
    {
        return $this->belongsTo(User::class, 'disbursed_by');
    }

    public function journalEntry()
    {
        return $this->belongsTo(JournalEntry::class, 'journal_entry_id');
    }

    public function attachments()
    {
        return $this->morphMany(Attachment::class, 'attachable');
    }
}
