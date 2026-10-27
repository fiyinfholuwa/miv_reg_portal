<?php

namespace App\Services;

use App\Models\Broadcast;
use App\Models\Testimonial;
use App\Models\User;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class AdminService
{
    public function login(string $email, string $password, ?string $deviceName = null): array
    {
        $user = User::where('email', Str::lower(trim($email)))->where('is_admin', true)->first();

        if (! $user || ! Hash::check($password, $user->password)) {
            throw new AuthorizationException('The admin credentials are invalid.');
        }

        $token = $user->createToken($deviceName ?: 'jan-conf-admin', ['admin'], now()->addYears(1));

        return [
            'token' => $token->plainTextToken,
            'token_type' => 'Bearer',
            'admin' => ['id' => $user->id, 'name' => $user->name, 'email' => $user->email],
        ];
    }

    public function overview(User $admin): array
    {
        $this->ensureAdmin($admin);
        $registered = User::whereNotNull('email_verified_at');
        $daily = [];

        for ($index = 13; $index >= 0; $index--) {
            $date = now()->subDays($index);
            $daily[] = [
                'label' => $date->format('j'),
                'value' => User::whereNotNull('email_verified_at')->whereDate('created_at', $date)->count(),
            ];
        }

        return [
            'registered' => $registered->count(),
            'onsite' => (clone $registered)->where('attendance_mode', 'Onsite in Ibadan')->count(),
            'online' => (clone $registered)->where('attendance_mode', 'Online')->count(),
            'awaiting_approval' => User::where('approval_status', 'pending')->whereNotNull('registration_completed_at')->count(),
            'daily' => $daily,
            'capacity' => [
                ['label' => 'Delegates', 'value' => User::where('role', 'Delegate')->count()],
                ['label' => 'Ministers', 'value' => User::where('role', 'Minister')->count()],
                ['label' => 'International', 'value' => User::where('role', 'International delegate')->count()],
            ],
        ];
    }

    public function registrants(User $admin, ?string $status = null): array
    {
        $this->ensureAdmin($admin);
        $query = User::query()->where('is_admin', false)->latest();
        if ($status) $query->where('approval_status', $status);

        return $query->limit(100)->get()->map(fn (User $user): array => [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role,
            'attendance_mode' => $user->attendance_mode,
            'approval_status' => $user->approval_status,
            'ticket_code' => $user->ticket_code,
            'created_at' => $user->created_at?->toIso8601String(),
        ])->all();
    }

    public function reviewRegistrant(User $admin, User $registrant, string $status): array
    {
        $this->ensureAdmin($admin);
        abort_if($registrant->is_admin, 422, 'Admin accounts cannot be reviewed as registrants.');
        $registrant->update(['approval_status' => $status]);

        return ['message' => 'Registrant updated.', 'registrant' => $registrant->fresh()];
    }

    public function testimonials(User $admin): array
    {
        $this->ensureAdmin($admin);

        return Testimonial::with('user:id,name,email')->latest()->limit(100)->get()->map(fn (Testimonial $item): array => [
            'id' => $item->id,
            'name' => $item->show_name ? ($item->user?->name ?: 'A delegate') : 'A delegate',
            'email' => $item->user?->email,
            'content' => $item->content,
            'topic' => $item->topic,
            'status' => $item->status,
            'created_at' => $item->created_at?->toIso8601String(),
        ])->all();
    }

    public function reviewTestimonial(User $admin, Testimonial $testimonial, string $status): array
    {
        $this->ensureAdmin($admin);
        $testimonial->update([
            'status' => $status === 'approved' ? 'published' : $status,
            'published_at' => in_array($status, ['approved', 'published'], true) ? now() : null,
        ]);

        return ['message' => 'Testimony reviewed.'];
    }

    public function broadcasts(User $admin): array
    {
        $this->ensureAdmin($admin);

        return Broadcast::latest()->limit(100)->get()->map(fn (Broadcast $broadcast): array => [
            'id' => $broadcast->id,
            'title' => $broadcast->title,
            'body' => $broadcast->body,
            'scheduled_at' => $broadcast->scheduled_at?->toIso8601String(),
            'status' => $broadcast->status,
        ])->all();
    }

    public function createBroadcast(User $admin, array $attributes): array
    {
        $this->ensureAdmin($admin);
        $broadcast = Broadcast::create([...$attributes, 'created_by' => $admin->id]);

        return ['id' => $broadcast->id, 'message' => 'Broadcast saved.'];
    }

    public function ensureAdmin(User $user): void
    {
        if (! $user->is_admin || ! $user->currentAccessToken()?->can('admin')) {
            throw new AuthorizationException('Admin access is required.');
        }
    }
}
