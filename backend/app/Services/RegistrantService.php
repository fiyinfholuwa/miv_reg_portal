<?php

namespace App\Services;

use App\Models\EventRegistration;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Carbon;

/**
 * Admin list of delegates: server-side search, filters and pagination, with
 * each person's event registrations, team and check-in status.
 */
class RegistrantService
{
    /**
     * @param  array{search?: string|null, status?: string|null, verified?: string|null, event?: string|null, role?: string|null, from?: string|null, to?: string|null, per_page?: int|string|null}  $filters
     * @return array{data: list<array<string, mixed>>, meta: array<string, int>, counts: array<string, int>}
     */
    public function paginate(array $filters): array
    {
        $perPage = min(100, max(5, (int) ($filters['per_page'] ?? 15)));
        $page = $this->query($filters)
            ->with(['eventRegistrations.event:id,slug,short_name', 'eventRegistrations.team:id,name,code'])
            ->latest()
            ->paginate($perPage);

        return [
            'data' => $page->getCollection()->map(fn (User $user): array => $this->payload($user))->all(),
            'meta' => ['page' => $page->currentPage(), 'last_page' => $page->lastPage(), 'per_page' => $page->perPage(), 'total' => $page->total()],
            'counts' => $this->counts($filters),
        ];
    }

    /**
     * @param  list<int>  $ids
     */
    public function review(array $ids, string $status): int
    {
        return User::query()->where('is_admin', false)->whereIn('id', $ids)->update(['approval_status' => $status]);
    }

    /**
     * Status counts for the current filters (ignoring the status filter itself),
     * so the filter chips can show how many are in each state.
     *
     * @param  array<string, mixed>  $filters
     * @return array<string, int>
     */
    private function counts(array $filters): array
    {
        $counts = $this->query([...$filters, 'status' => null])
            ->selectRaw('approval_status, count(*) as total')
            ->groupBy('approval_status')
            ->pluck('total', 'approval_status')
            ->map(fn ($total): int => (int) $total)
            ->all();

        $verified = $this->query([...$filters, 'status' => null, 'verified' => null])
            ->selectRaw('email_verified_at is not null as is_verified, count(*) as total')
            ->groupBy('is_verified')
            ->pluck('total', 'is_verified');

        return ['all' => array_sum($counts), ...$counts, 'verified' => (int) ($verified[1] ?? 0), 'unverified' => (int) ($verified[0] ?? 0)];
    }

    /**
     * @param  array<string, mixed>  $filters
     */
    private function query(array $filters): Builder
    {
        return User::query()
            ->where('is_admin', false)
            ->when($filters['search'] ?? null, function (Builder $query, string $search): void {
                $like = '%'.trim($search).'%';
                $query->where(fn (Builder $match) => $match
                    ->where('name', 'like', $like)
                    ->orWhere('email', 'like', $like)
                    ->orWhere('phone', 'like', $like)
                    ->orWhere('church', 'like', $like)
                    ->orWhereHas('eventRegistrations', fn (Builder $registration) => $registration->where('ticket_code', 'like', $like)));
            })
            ->when($filters['status'] ?? null, fn (Builder $query, string $status) => $query->where('approval_status', $status))
            ->when($filters['verified'] ?? null, fn (Builder $query, string $verified) => $verified === 'yes' ? $query->whereNotNull('email_verified_at') : $query->whereNull('email_verified_at'))
            ->when($filters['role'] ?? null, fn (Builder $query, string $role) => $query->where('role', $role))
            ->when($filters['event'] ?? null, fn (Builder $query, string $slug) => $query->whereHas('eventRegistrations.event', fn (Builder $event) => $event->where('slug', $slug)))
            ->when($filters['from'] ?? null, fn (Builder $query, string $from) => $query->where('created_at', '>=', Carbon::parse($from, 'Africa/Lagos')->startOfDay()->utc()))
            ->when($filters['to'] ?? null, fn (Builder $query, string $to) => $query->where('created_at', '<=', Carbon::parse($to, 'Africa/Lagos')->endOfDay()->utc()));
    }

    /**
     * @return array<string, mixed>
     */
    private function payload(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'phone' => $user->phone,
            'role' => $user->role,
            'church' => $user->church,
            'state_country' => $user->state_country,
            'approval_status' => $user->approval_status,
            'verified' => $user->email_verified_at !== null,
            'verified_at' => $user->email_verified_at?->toIso8601String(),
            'created_at' => $user->created_at?->toIso8601String(),
            'events' => $user->eventRegistrations->map(fn (EventRegistration $registration): array => [
                'registration_id' => $registration->id,
                'slug' => $registration->event?->slug,
                'short_name' => $registration->event?->short_name,
                'ticket_code' => $registration->ticket_code,
                'attendance_mode' => $registration->attendance_mode,
                'team' => $registration->team?->name,
                'checked_in_at' => $registration->checked_in_at?->toIso8601String(),
            ])->values()->all(),
        ];
    }
}
