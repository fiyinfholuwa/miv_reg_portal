<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\AdminPasswordRequest;
use App\Http\Requests\AdminPermissionsRequest;
use App\Http\Requests\AdminProfileRequest;
use App\Http\Requests\AdminUserRequest;
use App\Http\Requests\BulkReviewRequest;
use App\Http\Requests\MealRedemptionRequest;
use App\Http\Requests\PaystackSettingsRequest;
use App\Http\Requests\PushSettingsRequest;
use App\Http\Requests\TeamMembersRequest;
use App\Http\Requests\TeamRequest;
use App\Models\Event;
use App\Models\EventRegistration;
use App\Models\Team;
use App\Models\User;
use App\Services\AdminAccountService;
use App\Services\AdminService;
use App\Services\CheckInService;
use App\Services\PaystackSettingsService;
use App\Services\Push\PushSettingsService;
use App\Services\RegistrantService;
use App\Services\RegistrationService;
use App\Services\ShopOrderService;
use App\Services\TeamService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Admin people and event-day operations: registrants, teams, check-in,
 * store collection and the admin's own account.
 */
class AdminOperationsController extends Controller
{
    public function __construct(
        private readonly AdminService $adminService,
        private readonly RegistrantService $registrantService,
        private readonly TeamService $teamService,
        private readonly CheckInService $checkInService,
        private readonly AdminAccountService $accountService,
        private readonly PaystackSettingsService $paystackSettings,
    ) {}

    public function registrants(Request $request): JsonResponse
    {
        $this->adminService->ensureAdmin($request->user(), ['people', 'accommodation']);

        $filters = $request->only(['search', 'status', 'verified', 'event', 'role', 'accommodation', 'from', 'to', 'per_page']);
        // Accommodation-only admins see just the people who asked for a room.
        if (! $request->user()->hasAdminPermission('people')) {
            $filters['accommodation'] = true;
        }

        return response()->json($this->registrantService->paginate($filters));
    }

    public function reviewRegistrants(BulkReviewRequest $request): JsonResponse
    {
        $this->adminService->ensureAdmin($request->user(), 'people');
        $count = $this->registrantService->review($request->validated('ids'), $request->validated('status'));

        return response()->json(['message' => $count === 1 ? '1 registrant updated.' : "{$count} registrants updated.", 'updated' => $count]);
    }

    public function resendVerification(Request $request, User $registrant, RegistrationService $registration): JsonResponse
    {
        $this->adminService->ensureAdmin($request->user(), 'people');
        abort_if($registrant->is_admin, 422, 'Admin accounts are not registrants.');

        return response()->json($registration->resendVerification($registrant));
    }

    public function teams(Request $request): JsonResponse
    {
        $this->adminService->ensureAdmin($request->user(), 'people');

        return response()->json(['teams' => $this->teamService->teams($request->string('event')->toString() ?: null)]);
    }

    public function createTeam(TeamRequest $request): JsonResponse
    {
        $this->adminService->ensureAdmin($request->user(), 'people');

        return response()->json($this->teamService->create($request->validated()), 201);
    }

    public function updateTeam(TeamRequest $request, Team $team): JsonResponse
    {
        $this->adminService->ensureAdmin($request->user(), 'people');

        return response()->json($this->teamService->update($team, $request->validated()));
    }

    public function deleteTeam(Request $request, Team $team): JsonResponse
    {
        $this->adminService->ensureAdmin($request->user(), 'people');

        return response()->json($this->teamService->delete($team));
    }

    public function teamMembers(Request $request, Team $team): JsonResponse
    {
        $this->adminService->ensureAdmin($request->user(), 'people');

        return response()->json($this->teamService->members($team));
    }

    public function addTeamMembers(TeamMembersRequest $request, Team $team): JsonResponse
    {
        $this->adminService->ensureAdmin($request->user(), 'people');

        return response()->json($this->teamService->addMembers($team, $request->validated('registration_ids')));
    }

    public function removeTeamMember(Request $request, Team $team, EventRegistration $registration): JsonResponse
    {
        $this->adminService->ensureAdmin($request->user(), 'people');

        return response()->json($this->teamService->removeMember($team, $registration));
    }

    public function checkInLookup(Request $request): JsonResponse
    {
        $this->adminService->ensureAdmin($request->user(), ['check_in', 'meals']);
        $request->validate(['code' => ['required', 'string', 'max:60'], 'event' => ['nullable', 'string']]);

        return response()->json($this->checkInService->lookup($request->string('code')->toString(), $request->string('event')->toString() ?: null));
    }

    public function checkInStats(Request $request, Event $event): JsonResponse
    {
        $this->adminService->ensureAdmin($request->user(), ['check_in', 'meals']);

        return response()->json($this->checkInService->stats($event));
    }

    public function checkIn(Request $request, EventRegistration $registration): JsonResponse
    {
        $this->adminService->ensureAdmin($request->user(), 'check_in');

        return response()->json($this->checkInService->checkIn($request->user(), $registration));
    }

    public function undoCheckIn(Request $request, EventRegistration $registration): JsonResponse
    {
        $this->adminService->ensureAdmin($request->user(), 'check_in');

        return response()->json($this->checkInService->undoCheckIn($registration));
    }

    public function serveMeal(MealRedemptionRequest $request, EventRegistration $registration): JsonResponse
    {
        $this->adminService->ensureAdmin($request->user(), 'meals');

        return response()->json($this->checkInService->serveMeal($request->user(), $registration, $request->validated('meal')));
    }

    public function collectOrder(Request $request, ShopOrderService $orders): JsonResponse
    {
        $this->adminService->ensureAdmin($request->user(), ['merch', 'finance']);
        $request->validate(['pickup_code' => ['required', 'string', 'max:60']]);

        return response()->json($orders->collect($request->user(), $request->string('pickup_code')->toString()));
    }

    public function account(Request $request): JsonResponse
    {
        $this->adminService->ensureAdmin($request->user());

        $admin = $request->user();

        return response()->json(['admin' => $this->accountService->profile($admin), 'admins' => $admin->isSuperAdmin() ? $this->accountService->admins() : []]);
    }

    public function updateAccount(AdminProfileRequest $request): JsonResponse
    {
        $this->adminService->ensureAdmin($request->user());

        return response()->json($this->accountService->updateProfile($request->user(), $request->validated()));
    }

    public function paystackSettings(Request $request): JsonResponse
    {
        $this->adminService->ensureAdmin($request->user(), 'finance');

        return response()->json(['settings' => $this->paystackSettings->settings()]);
    }

    public function updatePaystackSettings(PaystackSettingsRequest $request): JsonResponse
    {
        $this->adminService->ensureAdmin($request->user(), 'finance');

        return response()->json($this->paystackSettings->save($request->validated()));
    }

    public function pushSettings(Request $request, PushSettingsService $pushSettings): JsonResponse
    {
        $this->adminService->ensureSuperAdmin($request->user());

        return response()->json(['settings' => $pushSettings->settings()]);
    }

    public function updatePushSettings(PushSettingsRequest $request, PushSettingsService $pushSettings): JsonResponse
    {
        $this->adminService->ensureSuperAdmin($request->user());

        return response()->json($pushSettings->save($request->validated()));
    }

    public function updatePassword(AdminPasswordRequest $request): JsonResponse
    {
        $this->adminService->ensureAdmin($request->user());

        return response()->json($this->accountService->updatePassword($request->user(), $request->validated('password')));
    }

    public function signOutOthers(Request $request): JsonResponse
    {
        $this->adminService->ensureAdmin($request->user());

        return response()->json($this->accountService->signOutOthers($request->user()));
    }

    public function createAdmin(AdminUserRequest $request): JsonResponse
    {
        $this->adminService->ensureSuperAdmin($request->user());

        return response()->json($this->accountService->createAdmin($request->validated()), 201);
    }

    public function updateAdmin(AdminPermissionsRequest $request, User $admin): JsonResponse
    {
        $this->adminService->ensureSuperAdmin($request->user());

        return response()->json($this->accountService->updatePermissions($request->user(), $admin, $request->validated('permissions')));
    }

    public function removeAdmin(Request $request, User $admin): JsonResponse
    {
        $this->adminService->ensureSuperAdmin($request->user());

        return response()->json($this->accountService->removeAdmin($request->user(), $admin));
    }
}
