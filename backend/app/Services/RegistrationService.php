<?php

namespace App\Services;

use App\Mail\RegistrationOtpMail;
use App\Models\RegistrationOtp;
use App\Models\User;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class RegistrationService
{
    public function __construct(private readonly EmailService $emailService) {}

    public function start(string $email, ?string $deviceName = null): array
    {
        $email = Str::lower(trim($email));
        $user = User::where('email', $email)->first();

        if ($user?->email_verified_at !== null) {
            return $this->authenticatedResponse($user, $deviceName);
        }

        $user ??= User::create([
            'name' => 'Pending delegate',
            'email' => $email,
            'password' => Str::random(64),
            'approval_status' => 'pending',
        ]);

        return $this->sendOtp($user);
    }

    /**
     * Returning users sign in with their email alone. An account that never
     * finished verifying gets a fresh code instead.
     */
    public function login(string $email, ?string $deviceName = null): array
    {
        $user = User::where('email', Str::lower(trim($email)))->where('is_admin', false)->first();

        if (! $user) {
            throw ValidationException::withMessages([
                'email' => ['We could not find an account with this email. Register to create one.'],
            ]);
        }

        if ($user->email_verified_at !== null) {
            return $this->authenticatedResponse($user, $deviceName);
        }

        return $this->sendOtp($user);
    }

    /**
     * New accounts give their name, email and phone, then verify the email by OTP.
     * Calling this again for an unverified email updates the details and resends the code.
     *
     * @param  array{name: string, email: string, phone: string}  $attributes
     */
    public function register(array $attributes): array
    {
        $email = Str::lower(trim($attributes['email']));
        $user = User::where('email', $email)->first();

        if ($user?->email_verified_at !== null) {
            throw ValidationException::withMessages([
                'email' => ['An account already exists for this email. Log in with your email instead.'],
            ]);
        }

        $details = ['name' => trim($attributes['name']), 'phone' => trim($attributes['phone'])];

        if ($user) {
            $user->forceFill($details)->save();
        } else {
            $user = User::create([
                ...$details,
                'email' => $email,
                'password' => Str::random(64),
                'approval_status' => 'pending',
            ]);
        }

        return $this->sendOtp($user);
    }

    /**
     * Admin-triggered resend of the verification email (code + link).
     * Subject to the same per-address email limit as self-service requests.
     *
     * @return array<string, mixed>
     */
    public function resendVerification(User $user): array
    {
        if ($user->email_verified_at !== null) {
            throw ValidationException::withMessages(['email' => ["{$user->email} is already verified."]]);
        }

        return [...$this->sendOtp($user), 'message' => "Verification email sent to {$user->email}."];
    }

    private function sendOtp(User $user): array
    {
        $email = $user->email;

        // Check the email limit before replacing the user's current code.
        $this->emailService->ensureCanEmail($email);

        RegistrationOtp::where('user_id', $user->id)
            ->whereNull('verified_at')
            ->delete();

        $otp = (string) random_int(100000, 999999);
        $linkToken = Str::random(64);
        $expiresAt = now()->addMinutes((int) config('services.registration_otp_expiry', 10));

        $registrationOtp = RegistrationOtp::create([
            'user_id' => $user->id,
            'email' => $email,
            'code_hash' => Hash::make($otp),
            'link_token_hash' => hash('sha256', $linkToken),
            'expires_at' => $expiresAt,
        ]);

        $this->emailService->sendMailable(new RegistrationOtpMail(
            otp: $otp,
            verificationUrl: rtrim((string) config('services.frontend_url'), '/').'/register/verify?token='.$linkToken,
            expiresAt: $expiresAt,
        ), $email, 'registration-otp-'.$user->id.'-'.$registrationOtp->id);

        return [
            'status' => 'otp_required',
            'email' => $email,
            'expires_at' => $expiresAt->toIso8601String(),
        ];
    }

    public function verifyOtp(string $email, string $otp, ?string $deviceName = null): array
    {
        $registrationOtp = RegistrationOtp::query()
            ->where('email', Str::lower(trim($email)))
            ->whereNull('verified_at')
            ->latest()
            ->first();

        if (! $registrationOtp || $registrationOtp->expires_at->isPast() || $registrationOtp->attempts >= 5 || ! Hash::check($otp, $registrationOtp->code_hash)) {
            if ($registrationOtp && $registrationOtp->attempts < 5) {
                $registrationOtp->increment('attempts');
            }

            throw ValidationException::withMessages([
                'otp' => ['That code is invalid or has expired. Request a new code and try again.'],
            ]);
        }

        return $this->completeVerification($registrationOtp, $deviceName);
    }

    public function verifyLink(string $token, ?string $deviceName = null): array
    {
        $registrationOtp = RegistrationOtp::query()
            ->where('link_token_hash', hash('sha256', $token))
            ->whereNull('verified_at')
            ->first();

        if (! $registrationOtp || $registrationOtp->expires_at->isPast()) {
            throw ValidationException::withMessages([
                'token' => ['That verification link is invalid or has expired.'],
            ]);
        }

        return $this->completeVerification($registrationOtp, $deviceName);
    }

    public function completeProfile(User $user, array $attributes): array
    {
        // Attendance and tickets now live on each event registration; the legacy
        // Jan Conf form may still send attendance, which the caller handles.
        $user->forceFill([
            ...Arr::only($attributes, ['name', 'phone', 'role', 'church', 'state_country']),
            'registration_completed_at' => $user->registration_completed_at ?? now(),
        ])->save();

        return $this->userPayload($user->fresh());
    }

    public function revokeCurrentToken(User $user): void
    {
        $user->currentAccessToken()?->delete();
    }

    private function completeVerification(RegistrationOtp $registrationOtp, ?string $deviceName): array
    {
        $registrationOtp->forceFill(['verified_at' => now()])->save();
        $user = $registrationOtp->user;
        $user->forceFill(['email_verified_at' => $user->email_verified_at ?? now()])->save();

        return $this->authenticatedResponse($user->fresh(), $deviceName);
    }

    private function authenticatedResponse(User $user, ?string $deviceName): array
    {
        $token = $user->createToken(
            $deviceName ?: 'jan-conf-web',
            ['*'],
            now()->addYears((int) config('services.registration_token_years', 5)),
        );

        return [
            'status' => 'authenticated',
            'token' => $token->plainTextToken,
            'token_type' => 'Bearer',
            'profile_required' => ! $user->hasCompletedRegistration(),
            'user' => $this->userPayload($user),
        ];
    }

    public function userPayload(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'phone' => $user->phone,
            'role' => $user->role,
            'church' => $user->church,
            'state_country' => $user->state_country,
            'attendance_mode' => $user->attendance_mode,
            'attendance_days' => $user->attendance_days,
            'needs_accommodation' => $user->needs_accommodation,
            'email_verified' => $user->email_verified_at !== null,
            'registration_completed' => $user->hasCompletedRegistration(),
            'approval_status' => $user->approval_status,
            'ticket_code' => $user->ticket_code,
            'is_admin' => $user->is_admin,
            'has_photo' => $user->photo_path !== null,
            'registered_events' => $user->eventRegistrations()
                ->join('events', 'events.id', '=', 'event_registrations.event_id')
                ->pluck('events.slug')
                ->all(),
        ];
    }
}
