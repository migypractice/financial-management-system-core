<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

use Illuminate\Database\Eloquent\Concerns\HasUuids;

class Transaction extends Model
{
    use HasUuids;

    protected $guarded = [];

    protected $casts = [
        'metadata'            => 'array',
        'amount'              => 'decimal:2',
        'tax_amount'          => 'decimal:2',
        'fee_amount'          => 'decimal:2',
        'net_amount'          => 'decimal:2',
        'ai_confidence_score' => 'decimal:4',
        'ai_anomaly_flag'     => 'boolean',
        'approved_at'         => 'datetime',
        'posted_at'           => 'datetime',
    ];

    public function journalEntry()
    {
        return $this->hasOne(JournalEntry::class);
    }
}
