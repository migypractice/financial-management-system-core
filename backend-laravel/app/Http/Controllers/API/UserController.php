<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Role;
use App\Models\User;
use App\Support\SecurityRules;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Super Admin user management. All credential rules come from SecurityRules
 * so account creation enforces the same policy as password changes.
 */
class UserController extends Controller
{
    public function index()
    {
        $users = User::with('role')
            ->whereHas('role', fn ($q) => $q->where('slug', '!=', 'system_integration'))
            ->orderBy('name')
            ->get()
            ->map(fn (User $u) => [
                'id'         => $u->id,
                'name'       => $u->name,
                'username'   => $u->username,
                'email'      => $u->email,
                'department' => $u->department,
                'role'       => $u->role->slug ?? null,
                'role_name'  => $u->role->name ?? null,
                'is_active'  => (bool) $u->is_active,
                'created_at' => $u->created_at?->toIso8601String(),
            ]);

        return response()->json(['data' => $users]);
    }

    public function roles()
    {
        return response()->json([
            'data' => Role::where('slug', '!=', 'system_integration')
                ->orderBy('name')
                ->get(['id', 'name', 'slug']),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'       => 'required|string|max:100',
            'username'   => array_merge(['required', 'unique:users,username'], SecurityRules::username()),
            'email'      => 'required|email|max:255|unique:users,email',
            'password'   => ['required', 'confirmed', SecurityRules::password()],
            'role'       => ['required', Rule::exists('roles', 'slug')->where(fn ($q) => $q->where('slug', '!=', 'system_integration'))],
            'department' => 'nullable|string|max:100',
        ], [
            'username.regex' => SecurityRules::USERNAME_MESSAGE,
        ]);

        $role = Role::where('slug', $validated['role'])->firstOrFail();

        $user = User::create([
            'name'       => $validated['name'],
            'username'   => strtolower($validated['username']),
            'email'      => strtolower($validated['email']),
            'password'   => $validated['password'],
            'role_id'    => $role->id,
            'department' => $validated['department'] ?? null,
            'is_active'  => true,
        ]);

        return response()->json([
            'success' => true,
            'message' => "User {$user->username} created.",
            'data'    => ['id' => $user->id],
        ], 201);
    }

    public function toggleActive(Request $request, User $user)
    {
        if ($user->id === $request->user()->id) {
            return response()->json(['message' => 'You cannot deactivate your own account.'], 422);
        }

        $user->is_active = ! $user->is_active;
        $user->save();

        if (! $user->is_active) {
            $user->tokens()->delete();
        }

        return response()->json([
            'success'   => true,
            'is_active' => $user->is_active,
        ]);
    }
}
