<?php

namespace App\Policies;

use App\Models\Transaction;
use App\Models\User;

class TransactionPolicy
{
    /**
     * Only Super Admins and Finance Managers may act as Checker, and never
     * on a transaction they themselves submitted (Maker-Checker separation).
     */
    public function approve(User $user, Transaction $transaction): bool
    {
        return $this->canReview($user, $transaction);
    }

    public function reject(User $user, Transaction $transaction): bool
    {
        return $this->canReview($user, $transaction);
    }

    private function canReview(User $user, Transaction $transaction): bool
    {
        if (!in_array($user->role?->slug, ['super_admin', 'finance_manager'], true)) {
            return false;
        }

        if ($transaction->created_by && $transaction->created_by === $user->id) {
            return false;
        }

        return true;
    }
}
