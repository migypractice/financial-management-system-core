<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Budget extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'department',
        'category',
        'purpose',
        'fiscal_year',
        'period',
        'period_type',
        'allocated_amount',
        'attachment_verified',
        'chart_of_account_id',
        'notes',
        'adjustment_reason',
        'created_by',
    ];

    protected $casts = [
        'allocated_amount'    => 'decimal:2',
        'attachment_verified' => 'boolean',
    ];

    public function chartOfAccount()
    {
        return $this->belongsTo(ChartOfAccount::class, 'chart_of_account_id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function allocations()
    {
        return $this->hasMany(BudgetAllocation::class, 'budget_id');
    }

    public function attachments()
    {
        return $this->morphMany(Attachment::class, 'attachable');
    }
}
