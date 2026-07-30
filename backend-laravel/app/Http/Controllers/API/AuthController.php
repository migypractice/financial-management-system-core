<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        $user = User::with('role')->where('email', $request->email)->first();

        if (! $user || ! Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        // Return token and user data with permissions mapped
        return response()->json([
            'token' => $user->createToken('react-dashboard')->plainTextToken,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'department' => $user->department,
                'role' => $user->role->slug ?? 'guest',
                'permissions' => $this->getPermissionsForRole($user->role->slug ?? ''),
            ]
        ]);
    }

    public function me(Request $request)
    {
        $user = $request->user()->load('role');
        return response()->json([
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'department' => $user->department,
                'role' => $user->role->slug ?? 'guest',
                'permissions' => $this->getPermissionsForRole($user->role->slug ?? ''),
            ]
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
