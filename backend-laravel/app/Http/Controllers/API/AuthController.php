<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\SecurityRules;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * Sign in with email OR username.
     *
     * Accepts `login` (email or username). `email` is still accepted for
     * backward compatibility with older clients.
     */
    public function login(Request $request)
    {
        $request->merge([
            'login' => $request->input('login', $request->input('email')),
        ]);

        $request->validate([
            'login'    => 'required|string|max:255',
            'password' => 'required|string',
        ]);

        $login = Str::lower(trim($request->input('login')));
        $throttleKey = 'login:' . $login . '|' . $request->ip();

        // Lock out after too many failed attempts.
        if (RateLimiter::tooManyAttempts($throttleKey, SecurityRules::MAX_LOGIN_ATTEMPTS)) {
            $seconds = RateLimiter::availableIn($throttleKey);

            return response()->json([
                'message'       => "Too many failed login attempts. Please try again in {$seconds} seconds.",
                'locked'        => true,
                'retry_after'   => $seconds,
            ], 429);
        }

        $field = filter_var($login, FILTER_VALIDATE_EMAIL) ? 'email' : 'username';

        $user = User::with('role')
            ->whereRaw("LOWER({$field}) = ?", [$login])
            ->first();

        if (! $user || ! Hash::check($request->password, $user->password)) {
            RateLimiter::hit($throttleKey, SecurityRules::LOCKOUT_SECONDS);
            $remaining = RateLimiter::remaining($throttleKey, SecurityRules::MAX_LOGIN_ATTEMPTS);

            throw ValidationException::withMessages([
                'login' => [
                    $remaining > 0
                        ? "Invalid credentials. {$remaining} attempt(s) left before temporary lockout."
                        : 'Invalid credentials. Account temporarily locked.',
                ],
            ]);
        }

        if (! $user->is_active) {
            throw ValidationException::withMessages([
                'login' => ['This account is deactivated. Contact your administrator.'],
            ]);
        }

        RateLimiter::clear($throttleKey);

        $expiresIn = (int) config('sanctum.expiration');

        return response()->json([
            'token'      => $user->createToken('react-dashboard')->plainTextToken,
            'expires_in' => $expiresIn, // minutes
            'user'       => $this->userPayload($user),
        ]);
    }

    public function me(Request $request)
    {
        $user = $request->user()->load('role');

        return response()->json([
            'user' => $this->userPayload($user),
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'success' => true,
            'message' => 'Logged out successfully'
        ]);
    }

    /**
     * Change own password. Enforces the strong password policy and signs out
     * every other session (other tokens are revoked).
     */
    public function changePassword(Request $request)
    {
        $request->validate([
            'current_password' => 'required|string',
            'password'         => ['required', 'confirmed', 'different:current_password', SecurityRules::password()],
        ]);

        $user = $request->user();

        if (! Hash::check($request->current_password, $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['Current password is incorrect.'],
            ]);
        }

        $user->forceFill([
            'password'            => $request->password,
            'password_changed_at' => now(),
        ])->save();

        $current = $user->currentAccessToken();
        $user->tokens()
            ->when($current && isset($current->id), fn ($q) => $q->where('id', '!=', $current->id))
            ->delete();

        return response()->json([
            'success' => true,
            'message' => 'Password updated. Other sessions have been signed out.',
        ]);
    }

    private function userPayload(User $user): array
    {
        return [
            'id'          => $user->id,
            'name'        => $user->name,
            'username'    => $user->username,
            'email'       => $user->email,
            'department'  => $user->department,
            'role'        => $user->role->slug ?? 'guest',
            'permissions' => $this->getPermissionsForRole($user->role->slug ?? ''),
        ];
    }

    private function getPermissionsForRole(string $roleSlug): array
    {
        return match ($roleSlug) {
            'super_admin' => ['approve_transaction', 'reject_transaction', 'view_reports', 'manage_users', 'view_transactions'],
            'finance_manager' => ['approve_transaction', 'reject_transaction', 'view_reports', 'view_transactions'],
            'department_viewer' => ['view_transactions'],
            default => [],
        };
    }
}
