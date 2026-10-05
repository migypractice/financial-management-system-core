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
        'fiscal_year',
        'period',
        'allocated_amount',
        'chart_of_account_id',
        'notes',
        'created_by',
    ];

    protected $casts = [
        'allocated_amount' => 'decimal:2',
    ];

    public function chartOfAccount()
    {
        return $this->belongsTo(ChartOfAccount::class, 'chart_of_account_id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
