'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type Step = 'email' | 'otp' | 'about' | 'attendance';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:8000/api';

const stepDetails: { key: Step; label: string; detail: string }[] = [
  { key: 'email', label: 'Email', detail: 'Your sign-in' },
  { key: 'otp', label: 'Verify', detail: 'Code by email' },
  { key: 'about', label: 'About you', detail: 'Name and contact' },
  { key: 'attendance', label: 'Attendance', detail: 'Onsite or online' },
];

export default function RegistrationModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [church, setChurch] = useState('');
  const [stateCountry, setStateCountry] = useState('');
  const [role, setRole] = useState('Delegate');
  const [attendance, setAttendance] = useState<'Onsite in Ibadan' | 'Online'>('Onsite in Ibadan');
  const [days, setDays] = useState<string[]>(['Tue 19', 'Wed 20', 'Thu 21', 'Fri 22', 'Sat 23', 'Sun 24']);
  const [accommodation, setAccommodation] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const openFromLink = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const link = target.closest('a[href="#register"]');
      if (!link) return;
      event.preventDefault();
      setOpen(true);
    };
    const openFromForm = () => setOpen(true);
    document.addEventListener('click', openFromLink);
    window.addEventListener('open-registration-modal', openFromForm);
    return () => {
      document.removeEventListener('click', openFromLink);
      window.removeEventListener('open-registration-modal', openFromForm);
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const close = () => {
    setOpen(false);
    setError('');
  };

  const submitStep = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      if (step === 'email') {
        const response = await fetch(`${API_URL}/auth/start`, { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json' }, body: JSON.stringify({ email, device_name: 'jan-conf-web' }) });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message ?? 'We could not start registration.');
        if (data.status === 'authenticated') {
          window.localStorage.setItem('jan-conf-session', data.token);
          if (data.profile_required) {
            setStep('about');
          } else {
            router.push('/dashboard');
            close();
          }
        } else {
          setStep('otp');
        }
        return;
      }

      if (step === 'otp') {
        if (otp.length !== 6) {
          setError('Enter the 6-digit code sent to your email.');
          return;
        }
        const response = await fetch(`${API_URL}/auth/verify-otp`, { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json' }, body: JSON.stringify({ email, otp, device_name: 'jan-conf-web' }) });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message ?? data.errors?.otp?.[0] ?? 'That code could not be verified.');
        window.localStorage.setItem('jan-conf-session', data.token);
        setStep('about');
        return;
      }

      if (step === 'about') {
        setStep('attendance');
        return;
      }

      const token = window.localStorage.getItem('jan-conf-session');
      const response = await fetch(`${API_URL}/auth/profile`, { method: 'PUT', headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ name: fullName, phone, role, church, state_country: stateCountry, attendance_mode: attendance, attendance_days: days, needs_accommodation: accommodation }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message ?? 'We could not save your registration.');
      router.push('/dashboard');
      close();
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const goBack = () => {
    const previous: Record<Step, Step | null> = { email: null, otp: 'email', about: 'otp', attendance: 'about' };
    const previousStep = previous[step];
    if (previousStep) {
      setError('');
      setStep(previousStep);
    } else {
      close();
    }
  };

  const toggleDay = (day: string) => setDays((selected) => selected.includes(day) ? selected.filter((item) => item !== day) : [...selected, day]);
  const stepIndex = stepDetails.findIndex((item) => item.key === step);

  if (!open) return null;

  return <div className="fixed inset-0 z-[100] overflow-y-auto bg-[#e8edf3]/90 p-3 backdrop-blur-sm sm:p-6 lg:p-10" role="dialog" aria-modal="true" aria-labelledby="registration-title"><div className="mx-auto flex min-h-[calc(100vh-1.5rem)] max-w-5xl overflow-hidden rounded-[1.5rem] bg-cream shadow-[0_25px_90px_rgba(7,29,54,.28)] sm:min-h-[calc(100vh-3rem)] lg:min-h-[calc(100vh-5rem)]"><aside className="hidden w-[260px] shrink-0 bg-[#03284a] p-7 text-white md:flex md:flex-col"><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-full border border-[#9bc4e5]/40 bg-[#0a3557] text-xs font-bold">M</span><span className="font-display text-lg uppercase leading-none">Jan. Conf 2027</span></div><div className="mt-16 grid gap-7">{stepDetails.map((item, index) => <div key={item.key} className="relative flex gap-3">{index < stepDetails.length - 1 && <span className="absolute left-[15px] top-8 h-10 w-px bg-[#9bc4e5]/40" />}<span className={`relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-bold ${index < stepIndex ? 'bg-[#34865e] text-white' : index === stepIndex ? 'bg-cream text-ink' : 'border-2 border-[#9bc4e5]/50 text-[#9bc4e5]'}`}>{index < stepIndex ? '✓' : index + 1}</span><span><strong className={`block text-sm ${index === stepIndex ? 'text-white' : 'text-[#9bc4e5]'}`}>{item.label}</strong><small className="mt-1 block text-xs text-[#9bc4e5]">{item.detail}</small></span></div>)}</div><p className="mt-auto text-xs leading-5 text-[#9bc4e5]/70">Free registration. You can update your attendance details later.</p></aside><section className="flex min-w-0 flex-1 flex-col"><div className="flex items-center justify-between border-b border-ink/10 px-5 py-4 md:hidden"><span className="text-xs font-bold text-ink/50">Step {stepIndex + 1} of 4</span><button type="button" onClick={close} className="grid h-9 w-9 place-items-center rounded-full bg-ink text-lg text-white" aria-label="Close registration">×</button></div><div className="flex items-center justify-between px-6 pt-6 sm:px-10 sm:pt-10"><div><p className="eyebrow">Free delegate registration</p><h1 id="registration-title" className="mt-3 font-display text-5xl uppercase leading-[.85] text-[#03284a] sm:text-6xl">{step === 'email' ? 'Reserve your pass' : step === 'otp' ? 'Check your email' : step === 'about' ? 'About you' : 'How will you attend?'}</h1></div><button type="button" onClick={close} className="hidden h-10 w-10 place-items-center rounded-full border border-ink/15 text-xl text-ink/60 transition hover:bg-ink hover:text-white md:grid" aria-label="Close registration">×</button></div><form onSubmit={submitStep} className="flex flex-1 flex-col px-6 pb-6 pt-8 sm:px-10 sm:pb-10"><div className="flex-1">{step === 'email' && <EmailStep email={email} setEmail={setEmail} />}{step === 'otp' && <OtpStep email={email} otp={otp} setOtp={setOtp} />}{step === 'about' && <AboutStep fullName={fullName} setFullName={setFullName} phone={phone} setPhone={setPhone} church={church} setChurch={setChurch} stateCountry={stateCountry} setStateCountry={setStateCountry} role={role} setRole={setRole} />}{step === 'attendance' && <AttendanceStep attendance={attendance} setAttendance={setAttendance} days={days} toggleDay={toggleDay} accommodation={accommodation} setAccommodation={setAccommodation} />}{error && <p className="mt-5 rounded-lg bg-[#fff0ee] px-4 py-3 text-sm font-semibold text-coral" role="alert">{error}</p>}</div><div className="mt-8 flex items-center justify-between gap-4 border-t border-ink/10 pt-5"><button type="button" onClick={goBack} className="px-2 py-3 text-sm font-bold uppercase tracking-[0.08em] text-[#0b4779]">{step === 'email' ? 'Cancel' : 'Back'}</button><button type="submit" disabled={submitting} className="rounded-md bg-[#1469a9] px-7 py-4 text-sm font-bold uppercase tracking-[0.08em] text-white transition hover:bg-[#0e568d] disabled:cursor-wait disabled:opacity-60">{submitting ? 'Please wait…' : step === 'email' ? 'Send code' : step === 'otp' ? 'Verify code' : step === 'about' ? 'Continue' : 'Enter dashboard'}</button></div></form></section></div></div>;
}

function EmailStep({ email, setEmail }: { email: string; setEmail: (value: string) => void }) {
  return <div className="max-w-xl"><p className="text-base leading-7 text-ink/65">Start with your email. We’ll send a one-time code so your delegate pass stays secure.</p><label className="mt-8 block text-xs font-bold uppercase tracking-[0.12em] text-ink/60">Email address<input autoFocus required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-lg border-2 border-ink/15 bg-white px-4 py-4 text-base outline-none transition focus:border-[#1469a9]" placeholder="you@example.com" /></label><p className="mt-3 text-sm text-ink/50">No password needed. We’ll use this email to sign you in.</p></div>;
}

function OtpStep({ email, otp, setOtp }: { email: string; otp: string; setOtp: (value: string) => void }) {
  return <div className="max-w-xl"><p className="text-base leading-7 text-ink/65">Enter the 6-digit code we sent to <strong className="text-ink">{email}</strong>.</p><label className="mt-8 block text-xs font-bold uppercase tracking-[0.12em] text-ink/60">Verification code<input autoFocus required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, ''))} className="mt-2 w-full rounded-lg border-2 border-ink/15 bg-white px-4 py-4 text-2xl tracking-[0.45em] outline-none transition focus:border-[#1469a9]" placeholder="000000" /></label><button type="button" className="mt-4 text-sm font-bold text-[#1469a9]">Resend code</button></div>;
}

function AboutStep({ fullName, setFullName, phone, setPhone, church, setChurch, stateCountry, setStateCountry, role, setRole }: { fullName: string; setFullName: (value: string) => void; phone: string; setPhone: (value: string) => void; church: string; setChurch: (value: string) => void; stateCountry: string; setStateCountry: (value: string) => void; role: string; setRole: (value: string) => void }) {
  return <div className="grid max-w-2xl gap-5 sm:grid-cols-2"><label className="text-xs font-bold uppercase tracking-[0.12em] text-ink/60 sm:col-span-2">Full name<input autoFocus required value={fullName} onChange={(event) => setFullName(event.target.value)} className="mt-2 w-full rounded-lg border-2 border-ink/15 bg-white px-4 py-3 text-base outline-none focus:border-[#1469a9]" placeholder="Adebayo Ogunleye" /></label><label className="text-xs font-bold uppercase tracking-[0.12em] text-ink/60">Phone number<input required type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} className="mt-2 w-full rounded-lg border-2 border-ink/15 bg-white px-4 py-3 text-base outline-none focus:border-[#1469a9]" placeholder="+234 803 456 7821" /><small className="mt-2 block normal-case tracking-normal text-ink/50">We’ll text a code to verify. This is how you sign in.</small></label><label className="text-xs font-bold uppercase tracking-[0.12em] text-ink/60">Role<select value={role} onChange={(event) => setRole(event.target.value)} className="mt-2 w-full rounded-lg border-2 border-ink/15 bg-white px-4 py-3 text-base outline-none focus:border-[#1469a9]"><option>Delegate</option><option>International delegate</option><option>Minister</option></select></label><label className="text-xs font-bold uppercase tracking-[0.12em] text-ink/60">Church / ministry<input value={church} onChange={(event) => setChurch(event.target.value)} className="mt-2 w-full rounded-lg border-2 border-ink/15 bg-white px-4 py-3 text-base outline-none focus:border-[#1469a9]" placeholder="Christ Life Assembly" /></label><label className="text-xs font-bold uppercase tracking-[0.12em] text-ink/60">State / country<input value={stateCountry} onChange={(event) => setStateCountry(event.target.value)} className="mt-2 w-full rounded-lg border-2 border-ink/15 bg-white px-4 py-3 text-base outline-none focus:border-[#1469a9]" placeholder="Oyo, Nigeria" /></label></div>;
}

function AttendanceStep({ attendance, setAttendance, days, toggleDay, accommodation, setAccommodation }: { attendance: 'Onsite in Ibadan' | 'Online'; setAttendance: (value: 'Onsite in Ibadan' | 'Online') => void; days: string[]; toggleDay: (day: string) => void; accommodation: boolean; setAccommodation: (value: boolean) => void }) {
  const attendanceOptions: { label: 'Onsite in Ibadan' | 'Online'; detail: string }[] = [{ label: 'Onsite in Ibadan', detail: '1,846 / 2,500 onsite places taken' }, { label: 'Online', detail: 'Livestream + radio. Switch later.' }];
  return <div className="max-w-2xl"><div className="grid gap-3 sm:grid-cols-2">{attendanceOptions.map((option) => <button key={option.label} type="button" onClick={() => setAttendance(option.label)} className={`rounded-xl border-2 p-4 text-left ${attendance === option.label ? 'border-[#1469a9] bg-[#eaf3fb]' : 'border-ink/10 bg-white'}`}><div className="flex items-center justify-between"><strong>{option.label}</strong><span className={`grid h-6 w-6 place-items-center rounded-full border-2 ${attendance === option.label ? 'border-[#1469a9] bg-[#1469a9] text-white' : 'border-ink/20'}`}>{attendance === option.label ? '•' : ''}</span></div><p className="mt-2 text-xs text-ink/50">{option.detail}</p>{option.label === 'Onsite in Ibadan' && <div className="mt-3 h-2 overflow-hidden rounded-full bg-ink/10"><div className="h-full w-[74%] bg-[#1469a9]" /></div>}</button>)}</div><p className="mt-7 text-xs font-bold uppercase tracking-[0.12em] text-ink/60">Days you can come</p><div className="mt-3 flex flex-wrap gap-2">{['Tue 19', 'Wed 20', 'Thu 21', 'Fri 22', 'Sat 23', 'Sun 24'].map((day) => <button key={day} type="button" onClick={() => toggleDay(day)} className={`rounded-full px-4 py-3 text-sm font-bold ${days.includes(day) ? 'bg-[#1469a9] text-white' : 'border-2 border-ink/15 bg-white text-ink/60'}`}>{day}</button>)}</div><button type="button" onClick={() => setAccommodation(!accommodation)} className="mt-7 flex w-full items-center justify-between rounded-xl border-2 border-ink/10 bg-white p-4 text-left"><span><strong className="block">I need accommodation</strong><small className="mt-1 block text-ink/50">Show vetted lodging options near the venue.</small></span><span className={`h-7 w-12 rounded-full p-1 transition ${accommodation ? 'bg-[#1469a9]' : 'bg-[#cbd1d9]'}`}><span className={`block h-5 w-5 rounded-full bg-white transition ${accommodation ? 'translate-x-5' : ''}`} /></span></button></div>;
}
