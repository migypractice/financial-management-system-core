<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class Subsystem extends Model
{
    use HasUuids;

    protected $fillable = [
        'name',
        'slug',
    ];

    public function transactions()
    {
        return $this->hasMany(Transaction::class);
    }
}
