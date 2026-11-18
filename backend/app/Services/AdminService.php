<?php

namespace App\Services;

use App\Mail\BroadcastMail;
use App\Models\Broadcast;
use App\Models\Event;
use App\Models\EventRegistration;
use App\Models\PartnerInquiry;
use App\Models\ShopProduct;
use App\Models\Testimonial;
use App\Models\User;
use App\Services\Push\PushService;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class AdminService
{
    public function __construct(private readonly EmailService $emailService) {}

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
            'admin' => ['id' => $user->id, 'name' => $user->name, 'email' => $user->email, 'permissions' => $user->admin_permissions],
        ];
    }

    /**
     * Dashboard numbers, across all events or for one event.
     *
     * @return array<string, mixed>
     */
    public function overview(User $admin, ?Event $event = null): array
    {
        $this->ensureAdmin($admin);

        return $event ? $this->eventOverview($event) : $this->siteOverview();
    }

    /**
     * @return array<string, mixed>
     */
    private function siteOverview(): array
    {
        $registered = User::where('is_admin', false)->whereNotNull('email_verified_at');
        $daily = [];

        for ($index = 13; $index >= 0; $index--) {
            $date = now()->subDays($index);
            $daily[] = [
                'label' => $date->format('j'),
                'value' => (clone $registered)->whereDate('created_at', $date)->count(),
            ];
        }

        return [
            'event' => null,
            'registered' => $registered->count(),
            'onsite' => EventRegistration::where(fn ($query) => $query->whereNull('attendance_mode')->orWhere('attendance_mode', 'not like', '%online%'))->count(),
            'online' => EventRegistration::where('attendance_mode', 'like', '%online%')->count(),
            'checked_in' => EventRegistration::whereNotNull('checked_in_at')->count(),
            'accommodation' => EventRegistration::where('needs_accommodation', true)->count(),
            'daily' => $daily,
            'capacity' => $this->roleCounts(User::where('is_admin', false)),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function eventOverview(Event $event): array
    {
        $registrations = EventRegistration::where('event_id', $event->id);
        $daily = [];

        for ($index = 13; $index >= 0; $index--) {
            $date = now()->subDays($index);
            $daily[] = [
                'label' => $date->format('j'),
                'value' => (clone $registrations)->whereDate('created_at', $date)->count(),
            ];
        }

        return [
            'event' => ['slug' => $event->slug, 'short_name' => $event->short_name],
            'registered' => (clone $registrations)->count(),
            'onsite' => (clone $registrations)->where(fn ($query) => $query->whereNull('attendance_mode')->orWhere('attendance_mode', 'not like', '%online%'))->count(),
            'online' => (clone $registrations)->where('attendance_mode', 'like', '%online%')->count(),
            'checked_in' => (clone $registrations)->whereNotNull('checked_in_at')->count(),
            'accommodation' => (clone $registrations)->where('needs_accommodation', true)->count(),
            'daily' => $daily,
            'capacity' => $this->roleCounts(User::whereHas('eventRegistrations', fn ($query) => $query->where('event_id', $event->id))),
        ];
    }

    /**
     * @param  Builder<User>  $users
     * @return list<array{label: string, value: int}>
     */
    private function roleCounts(Builder $users): array
    {
        return [
            ['label' => 'Delegates', 'value' => (clone $users)->where('role', 'Delegate')->count()],
            ['label' => 'Ministers', 'value' => (clone $users)->where('role', 'Minister')->count()],
            ['label' => 'International', 'value' => (clone $users)->where('role', 'International delegate')->count()],
        ];
    }

    public function registrants(User $admin, ?string $status = null): array
    {
        $this->ensureAdmin($admin, 'people');
        $query = User::query()->where('is_admin', false)->latest();
        if ($status) {
            $query->where('approval_status', $status);
        }

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
        $this->ensureAdmin($admin, 'people');
        abort_if($registrant->is_admin, 422, 'Admin accounts cannot be reviewed as registrants.');
        $registrant->update(['approval_status' => $status]);

        return ['message' => 'Registrant updated.', 'registrant' => $registrant->fresh()];
    }

    public function testimonials(User $admin): array
    {
        $this->ensureAdmin($admin, 'media');

        return Testimonial::with(['user:id,name,email', 'event:id,slug,short_name'])->latest()->limit(1000)->get()->map(fn (Testimonial $item): array => [
            'id' => $item->id,
            'name' => $item->show_name ? ($item->user?->name ?: 'A delegate') : 'A delegate',
            'email' => $item->user?->email,
            'content' => $item->content,
            'topic' => $item->topic,
            'event' => $item->event?->short_name,
            'event_slug' => $item->event?->slug,
            'show_name' => $item->show_name,
            'published_at' => $item->published_at?->toIso8601String(),
            'status' => $item->status,
            'created_at' => $item->created_at?->toIso8601String(),
        ])->all();
    }

    public function reviewTestimonial(User $admin, Testimonial $testimonial, string $status): array
    {
        $this->ensureAdmin($admin, 'media');
        $testimonial->update([
            'status' => $status === 'approved' ? 'published' : $status,
            'published_at' => in_array($status, ['approved', 'published'], true) ? now() : null,
        ]);
        $this->notifyTestimonyReviewed($testimonial->fresh(['user', 'event']));

        return ['message' => 'Testimony reviewed.'];
    }

    private function notifyTestimonyReviewed(Testimonial $testimonial): void
    {
        $published = $testimonial->status === 'published';
        if (! $published && $testimonial->status !== 'rejected') {
            return;
        }

        app(NotificationService::class)->notify(
            $testimonial->user,
            'testimony',
            $published ? 'Your testimony was published' : 'Your testimony was not published',
            $published ? 'Thank you for sharing. Others can now read what God did.' : 'The media team reviewed your testimony and did not publish it this time.',
            $testimonial->event ? '/dashboard/events/'.$testimonial->event->slug.'/testimonials' : '/dashboard',
        );
    }

    public function broadcasts(User $admin): array
    {
        $this->ensureAdmin($admin, 'media');

        return Broadcast::latest()->limit(500)->get()->map(fn (Broadcast $broadcast): array => [
            'id' => $broadcast->id,
            'title' => $broadcast->title,
            'body' => $broadcast->body,
            'scheduled_at' => $broadcast->scheduled_at?->toIso8601String(),
            'status' => $broadcast->status,
            'created_at' => $broadcast->created_at?->toIso8601String(),
        ])->all();
    }

    public function createBroadcast(User $admin, array $attributes): array
    {
        $this->ensureAdmin($admin, 'media');
        $shouldSend = ($attributes['status'] ?? 'draft') === 'sent';
        $broadcast = Broadcast::create([
            ...$attributes,
            'status' => $shouldSend ? 'sending' : ($attributes['status'] ?? 'draft'),
            'created_by' => $admin->id,
        ]);

        $recipients = 0;

        if ($shouldSend) {
            try {
                $emails = User::query()
                    ->where('is_admin', false)
                    ->whereNotNull('email_verified_at')
                    ->whereNotNull('registration_completed_at')
                    ->pluck('email')
                    ->filter()
                    ->unique()
                    ->values();

                foreach ($emails as $email) {
                    $this->emailService->sendMailable(
                        new BroadcastMail($broadcast->title, $broadcast->body),
                        $email,
                        'broadcast-'.$broadcast->id.'-'.sha1($email),
                        rateLimited: false,
                    );
                    $recipients++;
                }

                $broadcast->update(['status' => 'sent']);
                app(PushService::class)->broadcast($broadcast);
            } catch (\Throwable $exception) {
                $broadcast->update(['status' => 'failed']);

                throw $exception;
            }
        }

        return [
            'id' => $broadcast->id,
            'message' => 'Broadcast saved.',
            'status' => $broadcast->status,
            'recipients' => $recipients,
        ];
    }

    public function deleteBroadcast(User $admin, Broadcast $broadcast): array
    {
        $this->ensureAdmin($admin, 'media');
        $broadcast->delete();

        return ['message' => 'Broadcast deleted.'];
    }

    public function shopProducts(User $admin): array
    {
        $this->ensureAdmin($admin, 'merch');

        return ShopProduct::query()->with('event:id,slug,short_name')->orderBy('sort_order')->latest('id')->get()->all();
    }

    public function createShopProduct(User $admin, array $attributes): array
    {
        $this->ensureAdmin($admin, 'merch');
        $product = ShopProduct::create($attributes);

        return ['message' => 'Shop product created.', 'product' => $product->load('event:id,slug,short_name')];
    }

    public function updateShopProduct(User $admin, ShopProduct $product, array $attributes): array
    {
        $this->ensureAdmin($admin, 'merch');
        $product->update($attributes);

        return ['message' => 'Shop product updated.', 'product' => $product->fresh('event:id,slug,short_name')];
    }

    public function deleteShopProduct(User $admin, ShopProduct $product): array
    {
        $this->ensureAdmin($admin, 'merch');
        $product->delete();

        return ['message' => 'Shop product deleted.'];
    }

    public function partnerInquiries(User $admin): array
    {
        $this->ensureAdmin($admin, 'media');

        return PartnerInquiry::query()->latest()->limit(1000)->get()->all();
    }

    public function reviewPartnerInquiry(User $admin, PartnerInquiry $inquiry, string $status): array
    {
        $this->ensureAdmin($admin, 'media');
        $inquiry->update(['status' => $status]);

        return ['message' => 'Partner enquiry updated.', 'inquiry' => $inquiry->fresh()];
    }

    /**
     * Tag each order with the events its products belong to, for filtering.
     *
     * @param  list<array<string, mixed>>  $orders
     * @return list<array<string, mixed>>
     */
    public function withOrderEvents(array $orders): array
    {
        $productEvents = ShopProduct::query()->whereNotNull('event_id')->with('event:id,slug,short_name')->get()
            ->mapWithKeys(fn (ShopProduct $product): array => [$product->name => ['slug' => $product->event?->slug, 'short_name' => $product->event?->short_name]]);

        return array_map(function (array $order) use ($productEvents): array {
            $events = collect($order['items'])->map(fn (array $item) => $productEvents[$item['name']] ?? null)->filter()->unique('slug')->values()->all();

            return [...$order, 'events' => $events];
        }, $orders);
    }

    /**
     * @param  string|list<string>|null  $permission  Area needed (any one of a list); null for any admin.
     */
    public function ensureAdmin(User $user, string|array|null $permission = null): void
    {
        if (! $user->is_admin || ! $user->currentAccessToken()?->can('admin')) {
            throw new AuthorizationException('Admin access is required.');
        }
        if ($permission !== null && ! $user->hasAdminPermission($permission)) {
            throw new AuthorizationException('You do not have access to this area.');
        }
    }

    public function ensureSuperAdmin(User $user): void
    {
        $this->ensureAdmin($user);
        if (! $user->isSuperAdmin()) {
            throw new AuthorizationException('Only full-access admins can manage admin accounts.');
        }
    }
}
