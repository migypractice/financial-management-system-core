<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BudgetAllocation extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'budget_id',
        'department',
        'category',
        'fiscal_year',
        'period',
        'allocated_amount',
        'action_type',
        'notes',
        'allocated_by',
    ];

    protected $casts = [
        'allocated_amount' => 'decimal:2',
    ];

    public function budget()
    {
        return $this->belongsTo(Budget::class, 'budget_id');
    }

    public function allocator()
    {
        return $this->belongsTo(User::class, 'allocated_by');
    }
}
