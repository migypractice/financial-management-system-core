<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Supplier extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'supplier_code',
        'name',
        'company_name',
        'email',
        'phone',
        'address',
        'payment_terms_days',
        'bank_info',
        'is_active',
    ];

    protected $casts = [
        'payment_terms_days' => 'integer',
        'bank_info'          => 'array',
        'is_active'          => 'boolean',
    ];

    public function bills()
    {
        return $this->hasMany(ApBill::class, 'supplier_id');
    }
}
