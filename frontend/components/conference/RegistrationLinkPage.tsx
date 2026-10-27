'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:8000/api';

type RegistrationUser = {
  email?: string;
  name?: string;
  phone?: string;
  role?: string;
  church?: string;
  state_country?: string;
};

export default function RegistrationLinkPage() {
  const router = useRouter();
  const params = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'form' | 'error'>('loading');
  const [error, setError] = useState('');
  const [token, setToken] = useState('');
  const [user, setUser] = useState<RegistrationUser>({});
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('Delegate');
  const [church, setChurch] = useState('');
  const [stateCountry, setStateCountry] = useState('');
  const [attendance, setAttendance] = useState<'Onsite in Ibadan' | 'Online'>('Onsite in Ibadan');
  const [days, setDays] = useState<string[]>(['Tue 19', 'Wed 20', 'Thu 21', 'Fri 22', 'Sat 23', 'Sun 24']);
  const [accommodation, setAccommodation] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const verificationToken = params.get('token');

    if (!verificationToken) {
      setError('This verification link is missing its token. Please request a new code.');
      setStatus('error');
      return;
    }

    void (async () => {
      try {
        const response = await fetch(`${API_URL}/auth/verify-link`, {
          method: 'POST',
          headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: verificationToken, device_name: 'jan-conf-web-link' }),
        });
        const data = await response.json();

        if (!response.ok) throw new Error(data.message ?? 'This verification link is invalid or has expired.');

        window.localStorage.setItem('jan-conf-session', data.token);
        if (!data.profile_required) {
          router.replace('/dashboard');
          return;
        }

        const verifiedUser = data.user ?? {};
        setToken(data.token);
        setUser(verifiedUser);
        setFullName(verifiedUser.name === 'Pending delegate' ? '' : verifiedUser.name ?? '');
        setPhone(verifiedUser.phone ?? '');
        setRole(verifiedUser.role ?? 'Delegate');
        setChurch(verifiedUser.church ?? '');
        setStateCountry(verifiedUser.state_country ?? '');
        setStatus('form');
      } catch (verificationError) {
        setError(verificationError instanceof Error ? verificationError.message : 'We could not verify this link.');
        setStatus('error');
      }
    })();
  }, [params, router]);

  const toggleDay = (day: string) => setDays((selected) => selected.includes(day) ? selected.filter((item) => item !== day) : [...selected, day]);

  const completeRegistration = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const sessionToken = token || window.localStorage.getItem('jan-conf-session');
      const response = await fetch(`${API_URL}/auth/profile`, {
        method: 'PUT',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: `Bearer ${sessionToken}` },
        body: JSON.stringify({ name: fullName, phone, role, church, state_country: stateCountry, attendance_mode: attendance, attendance_days: days, needs_accommodation: accommodation }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message ?? 'We could not save your registration.');
      router.replace('/dashboard');
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (status === 'loading') return <StatusCard title="Verifying your email" description="One moment while we secure your delegate account." />;
  if (status === 'error') return <StatusCard title="Link unavailable" description={error} action="Back to registration" onAction={() => router.replace('/#register')} />;

  return <main className="min-h-screen bg-[#e8edf3] px-4 py-8 text-ink sm:px-8 sm:py-14"><div className="mx-auto max-w-5xl overflow-hidden rounded-[1.5rem] bg-cream shadow-[0_25px_90px_rgba(7,29,54,.22)]"><div className="grid md:grid-cols-[260px_1fr]"><aside className="bg-[#03284a] p-7 text-white md:min-h-[700px]"><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-full border border-[#9bc4e5]/40 bg-[#0a3557] text-xs font-bold">M</span><span className="font-display text-lg uppercase leading-none">Jan. Conf 2027</span></div><div className="mt-16"><p className="eyebrow text-[#ff7565]">Email verified</p><h1 className="mt-3 font-display text-5xl uppercase leading-[.85]">Finish<br />your pass.</h1><p className="mt-6 text-sm leading-6 text-[#9bc4e5]">Your email is secure. Add your delegate details and choose how you’ll attend.</p></div></aside><section className="p-6 sm:p-10"><p className="eyebrow">Step 2 of 2</p><h2 className="mt-3 font-display text-5xl uppercase leading-[.85] text-[#03284a]">About you</h2><p className="mt-5 max-w-xl text-sm leading-6 text-ink/60">{user.email ? `Signed in as ${user.email}.` : 'Complete your delegate profile to continue.'}</p><form onSubmit={completeRegistration} className="mt-8 grid gap-5 sm:grid-cols-2"><Field label="Full name" value={fullName} onChange={setFullName} required className="sm:col-span-2" placeholder="Adebayo Ogunleye" /><Field label="Phone number" value={phone} onChange={setPhone} required type="tel" placeholder="+234 803 456 7821" /><label className="text-xs font-bold uppercase tracking-[0.12em] text-ink/60">Role<select value={role} onChange={(event) => setRole(event.target.value)} className="mt-2 w-full rounded-lg border-2 border-ink/15 bg-white px-4 py-3 text-base outline-none focus:border-[#1469a9]"><option>Delegate</option><option>International delegate</option><option>Minister</option></select></label><Field label="Church / ministry" value={church} onChange={setChurch} placeholder="Christ Life Assembly" /><Field label="State / country" value={stateCountry} onChange={setStateCountry} placeholder="Oyo, Nigeria" /><div className="sm:col-span-2"><p className="text-xs font-bold uppercase tracking-[0.12em] text-ink/60">How will you attend?</p><div className="mt-2 grid gap-3 sm:grid-cols-2">{(['Onsite in Ibadan', 'Online'] as const).map((option) => <button key={option} type="button" onClick={() => setAttendance(option)} className={`rounded-xl border-2 p-4 text-left font-bold ${attendance === option ? 'border-[#1469a9] bg-[#eaf3fb] text-[#0b4779]' : 'border-ink/10 bg-white'}`}>{option}<span className="mt-1 block text-xs font-normal text-ink/50">{option === 'Online' ? 'Livestream + radio' : 'Join us in Ibadan'}</span></button>)}</div></div><div className="sm:col-span-2"><p className="text-xs font-bold uppercase tracking-[0.12em] text-ink/60">Days you can come</p><div className="mt-2 flex flex-wrap gap-2">{['Tue 19', 'Wed 20', 'Thu 21', 'Fri 22', 'Sat 23', 'Sun 24'].map((day) => <button key={day} type="button" onClick={() => toggleDay(day)} className={`rounded-full px-4 py-3 text-sm font-bold ${days.includes(day) ? 'bg-[#1469a9] text-white' : 'border-2 border-ink/15 bg-white text-ink/60'}`}>{day}</button>)}</div></div><button type="button" onClick={() => setAccommodation(!accommodation)} className="sm:col-span-2 flex items-center justify-between rounded-xl border-2 border-ink/10 bg-white p-4 text-left"><span><strong className="block">I need accommodation</strong><small className="mt-1 block text-ink/50">Show vetted lodging options near the venue.</small></span><span className={`h-7 w-12 rounded-full p-1 ${accommodation ? 'bg-[#1469a9]' : 'bg-[#cbd1d9]'}`}><span className={`block h-5 w-5 rounded-full bg-white transition ${accommodation ? 'translate-x-5' : ''}`} /></span></button>{error && <p className="sm:col-span-2 rounded-lg bg-[#fff0ee] px-4 py-3 text-sm font-semibold text-coral" role="alert">{error}</p>}<div className="sm:col-span-2 flex justify-end border-t border-ink/10 pt-5"><button type="submit" disabled={submitting} className="rounded-md bg-[#1469a9] px-7 py-4 text-sm font-bold uppercase tracking-[0.08em] text-white disabled:cursor-wait disabled:opacity-60">{submitting ? 'Please wait…' : 'Enter dashboard'}</button></div></form></section></div></div></main>;
}

function Field({ label, value, onChange, placeholder, required = false, type = 'text', className = '' }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; required?: boolean; type?: string; className?: string }) {
  return <label className={`text-xs font-bold uppercase tracking-[0.12em] text-ink/60 ${className}`}>{label}<input required={required} type={type} value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-lg border-2 border-ink/15 bg-white px-4 py-3 text-base outline-none focus:border-[#1469a9]" placeholder={placeholder} /></label>;
}

function StatusCard({ title, description, action, onAction }: { title: string; description: string; action?: string; onAction?: () => void }) {
  return <main className="grid min-h-screen place-items-center bg-[#e8edf3] px-5 text-center text-ink"><div className="w-full max-w-md rounded-[1.5rem] bg-cream p-8 shadow-[0_25px_90px_rgba(7,29,54,.22)] sm:p-12"><div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#eaf3fb] text-2xl text-[#1469a9]">{action ? '!' : '✓'}</div><h1 className="mt-6 font-display text-4xl uppercase leading-none text-[#03284a]">{title}</h1><p className="mt-4 text-sm leading-6 text-ink/60">{description}</p>{action && onAction && <button type="button" onClick={onAction} className="mt-7 rounded-md bg-[#1469a9] px-6 py-3 text-sm font-bold uppercase tracking-[0.08em] text-white">{action}</button>}</div></main>;
}
