<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BankAccount extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'bank_accounts';

    protected $fillable = [
        'account_name',
        'bank_name',
        'account_number',
        'account_type',
        'beginning_balance',
        'current_balance',
        'currency',
        'chart_of_account_id',
        'is_active',
    ];

    protected $casts = [
        'beginning_balance' => 'decimal:2',
        'current_balance'   => 'decimal:2',
        'is_active'         => 'boolean',
    ];

    public function chartOfAccount()
    {
        return $this->belongsTo(ChartOfAccount::class, 'chart_of_account_id');
    }

    public function collections()
    {
        return $this->hasMany(Collection::class, 'bank_account_id');
    }

    public function disbursements()
    {
        return $this->hasMany(Disbursement::class, 'bank_account_id');
    }
}
