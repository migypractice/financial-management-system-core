<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Customer extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'customer_code',
        'name',
        'company_name',
        'email',
        'phone',
        'address',
        'credit_limit',
        'payment_terms_days',
        'is_active',
    ];

    protected $casts = [
        'credit_limit'       => 'decimal:2',
        'payment_terms_days' => 'integer',
        'is_active'          => 'boolean',
    ];

    public function invoices()
    {
        return $this->hasMany(ArInvoice::class, 'customer_id');
    }
}
