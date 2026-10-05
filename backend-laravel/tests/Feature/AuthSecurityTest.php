<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Tests\TestCase;

class AuthSecurityTest extends TestCase
{
    use RefreshDatabase;

    private function makeUser(string $roleSlug = 'super_admin', array $overrides = []): User
    {
        $role = Role::where('slug', $roleSlug)->firstOrFail();

        return User::create(array_merge([
            'name'     => 'Tester',
            'username' => 'tester' . random_int(10, 99),
            'email'    => Str::lower(Str::random(8)) . '@test.hw.com',
            'password' => 'Secret@123',
            'role_id'  => $role->id,
        ], $overrides));
    }

    protected function setUp(): void
    {
        parent::setUp();
        RateLimiter::clear('login:carlos01|127.0.0.1');
    }

    public function test_login_with_username(): void
    {
        $this->makeUser('super_admin', ['username' => 'carlos01']);

        $this->postJson('/api/v1/auth/login', ['login' => 'carlos01', 'password' => 'Secret@123'])
            ->assertOk()
            ->assertJsonPath('user.username', 'carlos01')
            ->assertJsonStructure(['token', 'expires_in']);
    }

    public function test_login_with_email(): void
    {
        $this->makeUser('super_admin', ['email' => 'carlos@hw.com']);

        $this->postJson('/api/v1/auth/login', ['login' => 'carlos@hw.com', 'password' => 'Secret@123'])
            ->assertOk();
    }

    public function test_legacy_email_field_still_works(): void
    {
        $this->makeUser('super_admin', ['email' => 'legacy@hw.com']);

        $this->postJson('/api/v1/auth/login', ['email' => 'legacy@hw.com', 'password' => 'Secret@123'])
            ->assertOk();
    }

    public function test_account_locks_after_five_failed_attempts(): void
    {
        $this->makeUser('super_admin', ['username' => 'carlos01']);

        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/v1/auth/login', ['login' => 'carlos01', 'password' => 'wrong'])
                ->assertStatus(422);
        }

        $this->postJson('/api/v1/auth/login', ['login' => 'carlos01', 'password' => 'Secret@123'])
            ->assertStatus(429)
            ->assertJsonPath('locked', true);
    }

    public function test_inactive_user_cannot_login(): void
    {
        $this->makeUser('super_admin', ['username' => 'inactive01', 'is_active' => false]);

        $this->postJson('/api/v1/auth/login', ['login' => 'inactive01', 'password' => 'Secret@123'])
            ->assertStatus(422);
    }

    public function test_change_password_rejects_weak_password(): void
    {
        $user = $this->makeUser();

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/auth/change-password', [
                'current_password'      => 'Secret@123',
                'password'              => 'password123',
                'password_confirmation' => 'password123',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('password');
    }

    public function test_change_password_accepts_strong_password(): void
    {
        $user = $this->makeUser();

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/auth/change-password', [
                'current_password'      => 'Secret@123',
                'password'              => 'N3w$trongPass',
                'password_confirmation' => 'N3w$trongPass',
            ])
            ->assertOk();

        $this->assertTrue(\Hash::check('N3w$trongPass', $user->fresh()->password));
    }

    public function test_admin_cannot_create_user_with_invalid_username_or_weak_password(): void
    {
        $admin = $this->makeUser('super_admin');

        $this->actingAs($admin, 'sanctum')
            ->postJson('/api/v1/users', [
                'name'                  => 'New User',
                'username'              => 'carlos',          // no number
                'email'                 => 'new@hw.com',
                'password'              => 'weakpass',
                'password_confirmation' => 'weakpass',
                'role'                  => 'finance_manager',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['username', 'password']);
    }

    public function test_admin_can_create_user_with_valid_credentials(): void
    {
        $admin = $this->makeUser('super_admin');

        $this->actingAs($admin, 'sanctum')
            ->postJson('/api/v1/users', [
                'name'                  => 'Juan Dela Cruz',
                'username'              => 'juan01',
                'email'                 => 'juan@hw.com',
                'password'              => 'Juan@2026!',
                'password_confirmation' => 'Juan@2026!',
                'role'                  => 'finance_manager',
            ])
            ->assertCreated();

        $this->assertDatabaseHas('users', ['username' => 'juan01']);
    }

    public function test_non_admin_cannot_manage_users(): void
    {
        $manager = $this->makeUser('finance_manager');

        $this->actingAs($manager, 'sanctum')
            ->getJson('/api/v1/users')
            ->assertStatus(403);
    }
}
