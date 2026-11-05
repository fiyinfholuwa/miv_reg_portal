'use client';

import { toast } from '../../lib/toast';
import { FormEvent, ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import AttendingCardStudio from '../attending/AttendingCardStudio';
import {
  AccountUser,
  ApiError,
  EventRegistration,
  MivEvent,
  apiRequest,
  clearSession,
  fetchAccount,
  fetchEvent,
  needsAttendanceStep,
  readSession,
  registerForEvent,
  saveSession,
} from '../../lib/events';

/**
 * One registration flow for every MIV event.
 *
 * Open it from anywhere with:
 *   window.dispatchEvent(new CustomEvent('open-registration-modal', { detail: { event: 'imlc' } }))
 *   detail.mode = 'login' opens the email-only sign-in instead of the new-account form.
 * Links to "#register" open it too (no event preselected).
 */
type Step = 'loading' | 'register' | 'login' | 'otp' | 'profile' | 'attendance' | 'already' | 'done';
type OpenDetail = { event?: string; mode?: 'login' | 'register'; returnTo?: string; closeTo?: string };
type AuthResponse = { status: 'authenticated' | 'otp_required'; token?: string; profile_required?: boolean; user?: AccountUser; email?: string };

const PENDING_EVENT_KEY = 'miv-pending-event';
const DEVICE = 'miv-hub-web';
const ROLES = ['Delegate', 'Minister', 'Leader', 'International delegate', 'Guest'];

export default function RegistrationModal({ defaultEvent }: { defaultEvent?: string } = {}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>('loading');
  const [flow, setFlow] = useState<'register' | 'login'>('register');
  const [event, setEvent] = useState<MivEvent | null>(null);
  const [user, setUser] = useState<AccountUser | null>(null);
  const [registration, setRegistration] = useState<EventRegistration | null>(null);
  const [returnTo, setReturnTo] = useState('/dashboard');
  const [closeTo, setCloseTo] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [role, setRole] = useState('Delegate');
  const [church, setChurch] = useState('');
  const [stateCountry, setStateCountry] = useState('');
  const [mode, setMode] = useState('');
  const [days, setDays] = useState<string[]>([]);
  const [accommodation, setAccommodation] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const returnToRef = useRef('/dashboard');

  const resetAttendance = (nextEvent: MivEvent | null) => {
    setMode(nextEvent?.attendance_options[0] ?? '');
    setDays(nextEvent?.day_options ?? []);
    setAccommodation(false);
  };

  /** Decide what an authenticated person sees next for the selected event. */
  const continueWithEvent = useCallback(async (account: AccountUser, selected: MivEvent | null) => {
    if (!account.registration_completed) {
      setName((current) => current || (account.name === 'Pending delegate' ? '' : account.name));
      setPhone((current) => current || account.phone || '');
      setRole(account.role || 'Delegate');
      setChurch(account.church || '');
      setStateCountry(account.state_country || '');
      setStep('profile');
      return;
    }
    if (!selected) {
      finish(returnToRef.current);
      return;
    }
    if (account.registered_events.includes(selected.slug)) {
      setStep('already');
      return;
    }
    if (needsAttendanceStep(selected)) {
      setStep('attendance');
      return;
    }
    const result = await registerForEvent(selected.slug, { attendance_mode: selected.attendance_options[0] ?? null });
    setRegistration(result.registration);
    setStep('done');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const start = useCallback(async (detail: OpenDetail) => {
    setOpen(true);
    setStep('loading');
    setOtp('');
    setRegistration(null);
    setReturnTo(detail.returnTo || '/dashboard');
    returnToRef.current = detail.returnTo || '/dashboard';
    setCloseTo(detail.closeTo ?? null);
    setFlow(detail.mode === 'login' ? 'login' : 'register');

    let selected: MivEvent | null = null;
    try {
      if (detail.event) selected = await fetchEvent(detail.event);
    } catch {
      toast.error('We could not load that event. You can still sign in and choose it from your dashboard.');
    }
    setEvent(selected);
    resetAttendance(selected);

    if (readSession()) {
      try {
        const account = await fetchAccount();
        setUser(account);
        await continueWithEvent(account, selected);
        return;
      } catch (sessionError) {
        if (sessionError instanceof ApiError && sessionError.status === 401) clearSession();
        else if (sessionError instanceof ApiError) toast.error(sessionError.message);
      }
    }
    setStep(detail.mode === 'login' ? 'login' : 'register');
  }, [continueWithEvent]);

  useEffect(() => {
    const openFromLink = (clickEvent: MouseEvent) => {
      const target = clickEvent.target;
      if (!(target instanceof Element) || !target.closest('a[href="#register"]')) return;
      clickEvent.preventDefault();
      void start({ event: defaultEvent });
    };
    const openFromEvent = (customEvent: Event) => {
      const detail = customEvent instanceof CustomEvent && customEvent.detail && typeof customEvent.detail === 'object' ? customEvent.detail as OpenDetail : {};
      void start(detail);
    };
    document.addEventListener('click', openFromLink);
    window.addEventListener('open-registration-modal', openFromEvent);
    if (window.location.hash === '#register') void start({ event: defaultEvent });
    return () => {
      document.removeEventListener('click', openFromLink);
      window.removeEventListener('open-registration-modal', openFromEvent);
    };
  }, [start, defaultEvent]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    const onKey = (keyEvent: KeyboardEvent) => { if (keyEvent.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    dialogRef.current?.focus();
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function close() {
    setOpen(false);
    if (closeTo) router.push(closeTo);
  }

  function finish(path: string) {
    try { window.localStorage.removeItem(PENDING_EVENT_KEY); } catch { /* storage unavailable */ }
    setOpen(false);
    router.push(path);
  }

  const rememberPendingEvent = () => {
    try {
      if (event) window.localStorage.setItem(PENDING_EVENT_KEY, event.slug);
      else window.localStorage.removeItem(PENDING_EVENT_KEY);
    } catch { /* storage unavailable */ }
  };

  const handleAuthResponse = async (data: AuthResponse) => {
    if (data.status === 'otp_required') {
      rememberPendingEvent();
      setOtp('');
      setStep('otp');
      return;
    }
    if (!data.token || !data.user) throw new ApiError('Sign-in did not complete. Please try again.', 500);
    saveSession(data.token);
    setUser(data.user);
    await continueWithEvent(data.user, event);
  };

  const sendRegister = () => apiRequest<AuthResponse>('/auth/register', { body: { name, email, phone, device_name: DEVICE } });
  const sendLogin = () => apiRequest<AuthResponse>('/auth/login', { body: { email, device_name: DEVICE } });

  const submit = async (formEvent: FormEvent<HTMLFormElement>) => {
    formEvent.preventDefault();
    setSubmitting(true);
    try {
      if (step === 'register') {
        await handleAuthResponse(await sendRegister());
      } else if (step === 'login') {
        await handleAuthResponse(await sendLogin());
      } else if (step === 'otp') {
        if (!/^\d{6}$/.test(otp)) throw new ApiError('Enter the 6-digit code sent to your email.', 422);
        await handleAuthResponse(await apiRequest<AuthResponse>('/auth/verify-otp', { body: { email, otp, device_name: DEVICE } }));
      } else if (step === 'profile') {
        const data = await apiRequest<{ user: AccountUser }>('/auth/profile', { method: 'PUT', auth: true, body: { name, phone, role, church, state_country: stateCountry } });
        setUser(data.user);
        await continueWithEvent(data.user, event);
      } else if (step === 'attendance' && event) {
        if (event.day_options.length > 0 && days.length === 0) throw new ApiError('Choose at least one day you can attend.', 422);
        const result = await registerForEvent(event.slug, { attendance_mode: mode || null, attendance_days: event.day_options.length ? days : undefined, needs_accommodation: accommodation });
        setRegistration(result.registration);
        setUser((current) => current ? { ...current, registered_events: [...current.registered_events, event.slug] } : current);
        setStep('done');
      } else if (step === 'done' || step === 'already') {
        finish(event ? `/dashboard/events/${event.slug}${step === 'done' ? '?welcome=1' : ''}` : returnTo);
      }
    } catch (submitError) {
      toast.error(submitError instanceof Error ? submitError.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const resendCode = async () => {
    setSubmitting(true);
    try {
      await (flow === 'login' ? sendLogin() : sendRegister());
      setOtp('');
      toast.success('A new code is on its way to your email.');
    } catch (resendError) {
      toast.error(resendError instanceof Error ? resendError.message : 'We could not resend the code.');
    } finally {
      setSubmitting(false);
    }
  };

  const switchTo = (next: 'register' | 'login') => {
    setFlow(next);
    setStep(next);
  };

  const goBack = () => {
    if (step === 'otp') setStep(flow);
    else close();
  };

  if (!open) return null;

  const steps = stepList(flow, event);
  const stepIndex = Math.max(0, steps.findIndex((item) => item.keys.includes(step)));
  const titles: Record<Step, string> = {
    loading: 'One moment…',
    register: 'Create your account',
    login: 'Welcome back',
    otp: 'Check your email',
    profile: 'A little about you',
    attendance: 'How will you attend?',
    already: "You're already registered",
    done: "You're in! Share the news",
  };
  const submitLabel: Record<Step, string> = {
    loading: 'Please wait…',
    register: 'Send my code',
    login: 'Log in',
    otp: 'Verify code',
    profile: event ? 'Continue' : 'Save and go to dashboard',
    attendance: 'Complete registration',
    already: 'Open my event',
    done: 'Go to my event',
  };

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-[#001428]/70 p-3 backdrop-blur-sm sm:p-6 lg:p-10" onMouseDown={(mouseEvent) => { if (mouseEvent.target === mouseEvent.currentTarget) close(); }}>
      <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="registration-title" className="mx-auto flex max-w-5xl overflow-hidden rounded-[28px] bg-[#faf6ec] text-[#0c0d10] shadow-[0_26px_60px_rgba(0,20,40,.35)] outline-none" style={{ fontFamily: "'Barlow', var(--font-inter), system-ui, sans-serif" }}>
        <aside className="hidden w-[230px] shrink-0 flex-col bg-[#001428] p-6 text-[#faf6ec] md:flex">
          <div className="flex items-center gap-3">
            <img src="/images/miv-logo.png" alt="" className="h-10 w-10 object-contain" />
            <span className="text-sm font-bold leading-tight">The Men of<br />Issachar Vision</span>
          </div>
          {event && (
            <div className="mt-8 overflow-hidden rounded-2xl bg-white/10">
              {event.image && <img src={event.image} alt="" className="h-24 w-full object-cover" />}
              <div className="p-3">
                <p className="text-[11px] font-semibold text-[#bcd6ec]">{event.date_label}</p>
                <p className="mt-1 text-sm font-bold leading-snug">{event.title}</p>
              </div>
            </div>
          )}
          <ol className="mt-8 grid gap-5">
            {steps.map((item, index) => (
              <li key={item.label} className="flex items-center gap-3">
                <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-bold ${index < stepIndex || step === 'done' ? 'bg-[#2f7d4f] text-white' : index === stepIndex ? 'bg-[#faf6ec] text-[#001428]' : 'border-2 border-[#8db9dd]/50 text-[#8db9dd]'}`}>
                  {index < stepIndex || step === 'done' ? '✓' : index + 1}
                </span>
                <span className={`text-sm font-semibold ${index === stepIndex ? 'text-white' : 'text-[#8db9dd]'}`}>{item.label}</span>
              </li>
            ))}
          </ol>
          <p className="mt-auto pt-8 text-xs leading-5 text-[#8db9dd]">Registration is free. One account works for every MIV event.</p>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-start justify-between gap-4 px-6 pt-6 sm:px-9 sm:pt-9">
            <div>
              <p className="text-sm font-semibold text-[#a82e26]">{event ? event.short_name : 'MIV events'}{step !== 'loading' && step !== 'done' && step !== 'already' ? ` · Step ${stepIndex + 1} of ${steps.length}` : ''}</p>
              <h2 id="registration-title" className="mt-2 text-[clamp(2rem,4.5vw,2.75rem)] font-semibold leading-[1.05] tracking-[-0.02em] text-[#0c0d10]">{titles[step]}</h2>
            </div>
            <button type="button" onClick={close} className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[#c9ced6] text-xl text-[#4d5460] transition hover:bg-[#001428] hover:text-white" aria-label="Close registration">×</button>
          </div>

          <form onSubmit={submit} className="flex flex-1 flex-col px-6 pb-6 pt-6 sm:px-9 sm:pb-9" noValidate={step === 'loading'}>
            <div className="flex-1">
              {step === 'loading' && <p className="text-[#4d5460]">Getting things ready…</p>}

              {step === 'register' && (
                <div className="grid max-w-xl gap-5">
                  <p className="text-[#4d5460]">{event ? <>Register for <strong className="text-[#0c0d10]">{event.title}</strong>. </> : null}We’ll email you a 6-digit code to confirm it’s you.</p>
                  <Field label="Full name"><input autoFocus required autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder="Adebayo Ogunleye" /></Field>
                  <Field label="Email address"><input required type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} placeholder="you@example.com" /></Field>
                  <Field label="Phone / WhatsApp"><input required type="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} placeholder="+234 803 456 7821" /></Field>
                  <SwitchPrompt text="Already have an account?" action="Log in with your email" onClick={() => switchTo('login')} />
                </div>
              )}

              {step === 'login' && (
                <div className="grid max-w-xl gap-5">
                  <p className="text-[#4d5460]">Enter the email you registered with{event ? <> and we’ll add <strong className="text-[#0c0d10]">{event.short_name}</strong> to your events</> : null}. No password needed.</p>
                  <Field label="Email address"><input autoFocus required type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} placeholder="you@example.com" /></Field>
                  <SwitchPrompt text="New here?" action="Create an account" onClick={() => switchTo('register')} />
                </div>
              )}

              {step === 'otp' && (
                <div className="max-w-xl">
                  <p className="text-[#4d5460]">Enter the 6-digit code we sent to <strong className="text-[#0c0d10]">{email}</strong>. You can also tap the link in the email.</p>
                  <Field label="Verification code" className="mt-6"><input autoFocus required inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} className={`${inputClass} text-2xl tracking-[0.45em]`} placeholder="000000" /></Field>
                  <button type="button" onClick={() => void resendCode()} disabled={submitting} className="mt-4 text-sm font-bold text-[#1460a1] disabled:opacity-60">Resend code</button>
                </div>
              )}

              {step === 'profile' && (
                <div className="grid max-w-2xl gap-5 sm:grid-cols-2">
                  <p className="text-[#4d5460] sm:col-span-2">Your email is verified. Finish your profile once and it’s reused for every MIV event.</p>
                  <Field label="Full name" className="sm:col-span-2"><input autoFocus required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} /></Field>
                  <Field label="Phone / WhatsApp"><input required type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} /></Field>
                  <Field label="I am attending as"><select value={role} onChange={(e) => setRole(e.target.value)} className={inputClass}>{ROLES.map((item) => <option key={item}>{item}</option>)}</select></Field>
                  <Field label="Church / ministry (optional)"><input value={church} onChange={(e) => setChurch(e.target.value)} className={inputClass} placeholder="Christ Life Assembly" /></Field>
                  <Field label="State / country (optional)"><input value={stateCountry} onChange={(e) => setStateCountry(e.target.value)} className={inputClass} placeholder="Oyo, Nigeria" /></Field>
                </div>
              )}

              {step === 'attendance' && event && (
                <div className="max-w-2xl">
                  {event.attendance_options.length > 1 && (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {event.attendance_options.map((option) => (
                        <button key={option} type="button" aria-pressed={mode === option} onClick={() => setMode(option)} className={`rounded-2xl border-2 p-4 text-left transition ${mode === option ? 'border-[#1460a1] bg-[#dceaf5]' : 'border-[#e4e7ec] bg-white'}`}>
                          <strong className="block">{option}</strong>
                          <span className="mt-1 block text-sm text-[#4d5460]">{/online/i.test(option) ? 'Join the livestream from anywhere.' : 'Be there in person.'}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {event.day_options.length > 0 && (
                    <>
                      <p className="mt-7 text-sm font-semibold text-[#22262e]">Days you can come</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {event.day_options.map((day) => (
                          <button key={day} type="button" aria-pressed={days.includes(day)} onClick={() => setDays((current) => current.includes(day) ? current.filter((item) => item !== day) : [...current, day])} className={`rounded-full px-4 py-2.5 text-sm font-bold ${days.includes(day) ? 'bg-[#1460a1] text-white' : 'border-2 border-[#c9ced6] bg-white text-[#4d5460]'}`}>{day}</button>
                        ))}
                      </div>
                    </>
                  )}
                  {event.offers_accommodation && !/online/i.test(mode) && (
                    <button type="button" aria-pressed={accommodation} onClick={() => setAccommodation(!accommodation)} className="mt-7 flex w-full items-center justify-between gap-4 rounded-2xl border-2 border-[#e4e7ec] bg-white p-4 text-left">
                      <span><strong className="block">I need accommodation</strong><small className="mt-1 block text-[#4d5460]">We’ll share vetted lodging near the venue.</small></span>
                      <span className={`h-7 w-12 shrink-0 rounded-full p-1 transition ${accommodation ? 'bg-[#1460a1]' : 'bg-[#c9ced6]'}`}><span className={`block h-5 w-5 rounded-full bg-white transition ${accommodation ? 'translate-x-5' : ''}`} /></span>
                    </button>
                  )}
                </div>
              )}

              {step === 'already' && event && (
                <p className="max-w-xl text-[#4d5460]">You’re already registered for <strong className="text-[#0c0d10]">{event.title}</strong>. Your ticket, programme and attending card are in your dashboard.</p>
              )}

              {step === 'done' && event && (
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#001428] px-5 py-4 text-[#faf6ec]">
                    <p className="text-sm text-[#bcd6ec]">Welcome{user ? `, ${user.name.split(' ')[0]}` : ''}! Your ticket for <strong className="text-white">{event.short_name}</strong></p>
                    {registration && <p className="text-xl font-bold tracking-wide">{registration.ticket_code}</p>}
                  </div>
                  <p className="mb-4 mt-5 text-[#4d5460]">Add your photo to your <strong className="text-[#0c0d10]">I will be attending</strong> card and invite others. You can also do this later from your dashboard.</p>
                  <AttendingCardStudio compact event={event} name={user?.name ?? name} church={user?.church ?? church} hasSavedPhoto={user?.has_photo ?? false} onPhotoSaved={() => setUser((current) => current ? { ...current, has_photo: true } : current)} />
                </div>
              )}

            </div>

            <div className="mt-8 flex items-center justify-between gap-4 border-t border-[#e4e7ec] pt-5">
              {step === 'done' || step === 'already' ? <span /> : <button type="button" onClick={goBack} className="px-1 py-3 text-sm font-bold text-[#0c4c8a]">{step === 'otp' ? 'Back' : 'Cancel'}</button>}
              <button type="submit" disabled={submitting || step === 'loading'} className="rounded-full bg-[#a82e26] px-7 py-3.5 text-[15px] font-bold text-white transition hover:bg-[#8c1f1c] disabled:cursor-wait disabled:opacity-60">
                {submitting ? 'Please wait…' : submitLabel[step]}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}

const inputClass = 'mt-2 w-full rounded-xl border-[1.5px] border-[#c9ced6] bg-white px-4 py-3 text-base text-[#0c0d10] outline-none transition focus:border-[#1460a1] focus:ring-2 focus:ring-[#1460a1]/25';

function Field({ label, className = '', children }: { label: string; className?: string; children: ReactNode }) {
  return <label className={`block text-sm font-semibold text-[#22262e] ${className}`}>{label}{children}</label>;
}

function SwitchPrompt({ text, action, onClick }: { text: string; action: string; onClick: () => void }) {
  return <p className="rounded-xl bg-[#f4eddc] px-4 py-3 text-sm text-[#4d5460]">{text} <button type="button" onClick={onClick} className="font-bold text-[#a82e26] underline-offset-2 hover:underline">{action} →</button></p>;
}

function stepList(flow: 'register' | 'login', event: MivEvent | null) {
  const eventStep = event ? [{ label: needsAttendanceStep(event) ? 'Attendance' : 'Confirm', keys: ['attendance', 'already'] as Step[] }, { label: 'Your card', keys: ['done'] as Step[] }] : [];
  if (flow === 'login') {
    return [{ label: 'Your email', keys: ['loading', 'login', 'otp'] as Step[] }, ...eventStep];
  }
  return [
    { label: 'Your details', keys: ['loading', 'register'] as Step[] },
    { label: 'Verify email', keys: ['otp'] as Step[] },
    { label: 'About you', keys: ['profile'] as Step[] },
    ...eventStep,
  ];
}
