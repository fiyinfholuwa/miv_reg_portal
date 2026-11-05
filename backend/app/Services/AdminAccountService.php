<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * The signed-in admin's own account, plus the list of admin accounts.
 */
class AdminAccountService
{
    /**
     * @return array<string, mixed>
     */
    public function profile(User $admin): array
    {
        return [
            'id' => $admin->id,
            'name' => $admin->name,
            'email' => $admin->email,
            'phone' => $admin->phone,
            'sessions' => $admin->tokens()->count(),
            'created_at' => $admin->created_at?->toIso8601String(),
        ];
    }

    /**
     * @param  array{name: string, email: string, phone?: string|null}  $attributes
     * @return array<string, mixed>
     */
    public function updateProfile(User $admin, array $attributes): array
    {
        $admin->update(['name' => trim($attributes['name']), 'email' => Str::lower(trim($attributes['email'])), 'phone' => $attributes['phone'] ?? null]);

        return ['message' => 'Profile saved.', 'admin' => $this->profile($admin->fresh())];
    }

    /**
     * Changing the password signs out every other session.
     *
     * @return array{message: string}
     */
    public function updatePassword(User $admin, string $password): array
    {
        $admin->update(['password' => Hash::make($password)]);
        $this->signOutOthers($admin);

        return ['message' => 'Password changed. Other sessions were signed out.'];
    }

    /**
     * @return array{message: string, signed_out: int}
     */
    public function signOutOthers(User $admin): array
    {
        $current = $admin->currentAccessToken()?->id;
        $count = $admin->tokens()->when($current, fn ($query) => $query->whereKeyNot($current))->delete();

        return ['message' => $count === 1 ? 'Signed out 1 other session.' : "Signed out {$count} other sessions.", 'signed_out' => $count];
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function admins(): array
    {
        return User::where('is_admin', true)->orderBy('name')->get()->map(fn (User $user): array => [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'created_at' => $user->created_at?->toIso8601String(),
        ])->all();
    }

    /**
     * @param  array{name: string, email: string, password: string}  $attributes
     * @return array<string, mixed>
     */
    public function createAdmin(array $attributes): array
    {
        $user = User::create([
            'name' => trim($attributes['name']),
            'email' => Str::lower(trim($attributes['email'])),
            'password' => Hash::make($attributes['password']),
        ]);
        $user->forceFill(['is_admin' => true, 'email_verified_at' => now(), 'role' => 'Admin', 'approval_status' => 'approved'])->save();

        return ['message' => "{$user->name} can now sign in to admin.", 'admin' => ['id' => $user->id, 'name' => $user->name, 'email' => $user->email, 'created_at' => $user->created_at?->toIso8601String()]];
    }

    /**
     * @return array{message: string}
     */
    public function removeAdmin(User $current, User $admin): array
    {
        if ($current->is($admin)) {
            throw ValidationException::withMessages(['admin' => ['You cannot remove your own admin access.']]);
        }
        if (! $admin->is_admin) {
            throw ValidationException::withMessages(['admin' => ['That account is not an admin.']]);
        }
        if (User::where('is_admin', true)->count() <= 1) {
            throw ValidationException::withMessages(['admin' => ['There must be at least one admin.']]);
        }

        $admin->tokens()->delete();
        $admin->forceFill(['is_admin' => false])->save();

        return ['message' => "{$admin->name} no longer has admin access."];
    }
}
