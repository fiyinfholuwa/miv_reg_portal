<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

#[Fillable([
    'name',
    'email',
    'password',
    'phone',
    'role',
    'church',
    'state_country',
    'photo_path',
    'attendance_mode',
    'attendance_days',
    'needs_accommodation',
    'registration_completed_at',
    'is_admin',
    'admin_permissions',
    'approval_status',
    'ticket_code',
])]
#[Hidden(['password', 'remember_token', 'photo_path'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'attendance_days' => 'array',
            'needs_accommodation' => 'boolean',
            'registration_completed_at' => 'datetime',
            'is_admin' => 'boolean',
            'admin_permissions' => 'array',
            'broadcasts_seen_at' => 'datetime',
        ];
    }

    /**
     * Admin areas this account may use. Null permissions mean full access.
     *
     * @param  string|list<string>  $permissions  Any one of these is enough.
     */
    public function hasAdminPermission(string|array $permissions): bool
    {
        if (! $this->is_admin) {
            return false;
        }
        if ($this->admin_permissions === null) {
            return true;
        }

        return array_intersect((array) $permissions, $this->admin_permissions) !== [];
    }

    public function isSuperAdmin(): bool
    {
        return $this->is_admin && $this->admin_permissions === null;
    }

    public function hasCompletedRegistration(): bool
    {
        return $this->registration_completed_at !== null;
    }

    public function testimonials(): HasMany
    {
        return $this->hasMany(Testimonial::class);
    }

    public function feedback(): HasMany
    {
        return $this->hasMany(Feedback::class);
    }

    public function shopOrders(): HasMany
    {
        return $this->hasMany(ShopOrder::class);
    }

    public function eventRegistrations(): HasMany
    {
        return $this->hasMany(EventRegistration::class);
    }

    public function pushSubscriptions(): HasMany
    {
        return $this->hasMany(PushSubscription::class);
    }

    public function shopCartItems(): HasMany
    {
        return $this->hasMany(ShopCartItem::class);
    }
}
