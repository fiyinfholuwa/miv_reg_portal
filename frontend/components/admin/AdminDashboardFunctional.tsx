'use client';

import { FormEvent, useEffect, useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:8000/api';

type AdminPage = 'Overview' | 'Registrants' | 'Approvals' | 'Teams' | 'Broadcasts' | 'Testimonies' | 'Publicity kit' | 'Store orders' | 'Check-in & meals' | 'Settings';
type Overview = { registered: number; onsite: number; online: number; awaiting_approval: number; daily: { label: string; value: number }[]; capacity: { label: string; value: number }[] };
type Registrant = { id: number; name: string; email: string; role: string | null; attendance_mode: string | null; approval_status: string; ticket_code: string | null; created_at: string | null };
type Testimonial = { id: number; name: string; email: string; content: string; topic: string | null; status: string; created_at: string | null };
type Broadcast = { id: number; title: string; body: string; scheduled_at: string | null; status: string };

const navigation: { label: AdminPage; icon: string }[] = [
  { label: 'Overview', icon: '⌂' }, { label: 'Registrants', icon: '◌' }, { label: 'Approvals', icon: '✓' },
  { label: 'Teams', icon: '♧' }, { label: 'Broadcasts', icon: '◉' }, { label: 'Testimonies', icon: '✦' },
  { label: 'Publicity kit', icon: '▣' }, { label: 'Store orders', icon: '□' }, { label: 'Check-in & meals', icon: '⌁' }, { label: 'Settings', icon: '⚙' },
];

async function api(path: string, options: RequestInit = {}) {
  const token = window.localStorage.getItem('jan-conf-session');
  const response = await fetch(API_URL + path, {
    ...options,
    headers: { Accept: 'application/json', ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: 'Bearer ' + token } : {}), ...options.headers },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'Request failed.');
  return data;
}

export default function AdminDashboardFunctional() {
  const [active, setActive] = useState<AdminPage>('Overview');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loginRequired, setLoginRequired] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [overview, setOverview] = useState<Overview | null>(null);
  const [registrants, setRegistrants] = useState<Registrant[]>([]);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [summary, people, stories, notices] = await Promise.all([
        api('/admin/overview'),
        api('/admin/registrants'),
        api('/admin/testimonials'),
        api('/admin/broadcasts'),
      ]);
      setOverview(summary);
      setRegistrants(people.registrants);
      setTestimonials(stories.testimonials);
      setBroadcasts(notices.broadcasts);
      setLoginRequired(false);
    } catch (loadError) {
      if (String(loadError).toLowerCase().includes('unauthorized') || String(loadError).toLowerCase().includes('admin access')) setLoginRequired(true);
      else setError(loadError instanceof Error ? loadError.message : 'Could not load the admin dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!window.localStorage.getItem('jan-conf-session')) {
      setLoginRequired(true);
      setLoading(false);
      return;
    }
    void load();
  }, []);

  const logout = async () => {
    await api('/auth/logout').catch(() => undefined);
    window.localStorage.removeItem('jan-conf-session');
    window.location.assign('/');
  };

  const select = (page: AdminPage) => {
    setActive(page);
    setMobileNavOpen(false);
  };

  const reviewRegistrant = async (id: number, status: 'approved' | 'rejected') => {
    await api('/admin/registrants/' + id + '/review', { method: 'PATCH', body: JSON.stringify({ status }) });
    await load();
  };

  const reviewTestimonial = async (id: number, status: 'approved' | 'rejected') => {
    await api('/admin/testimonials/' + id + '/review', { method: 'PATCH', body: JSON.stringify({ status }) });
    await load();
  };

  if (loginRequired) return <AdminLogin onLoggedIn={() => { setLoginRequired(false); void load(); }} error={loginError} setError={setLoginError} />;
  if (loading || !overview) return <main className="grid min-h-screen place-items-center bg-cream text-sm font-bold text-[#0b4779]">Loading admin dashboard…</main>;

  return <main className="min-h-screen bg-cream text-ink"><div className="flex min-h-screen w-full overflow-hidden"><aside className="hidden min-h-screen w-[295px] shrink-0 bg-[#001a2d] p-5 text-white lg:flex lg:flex-col"><Brand /><AdminNav active={active} select={select} /><button type="button" onClick={logout} className="mt-auto flex items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-bold text-[#b9cee1] hover:bg-white/10"><span>↪</span>Log out</button></aside><div className="min-w-0 flex-1"><header className="flex items-center justify-between border-b border-ink/10 bg-cream px-5 py-4 lg:hidden"><Brand /><button type="button" onClick={() => setMobileNavOpen((open) => !open)} className="grid h-11 w-11 place-items-center rounded-xl bg-ink text-xl text-white">{mobileNavOpen ? '×' : '☰'}</button></header>{mobileNavOpen && <div className="border-b border-white/10 bg-[#001a2d] p-4 lg:hidden"><AdminNav active={active} select={select} /><button type="button" onClick={logout} className="mt-3 w-full border-t border-white/10 px-4 pt-4 text-left text-sm font-bold text-[#b9cee1]">↪ Log out</button></div>}<div className="border-b border-ink/10 bg-[#e8edf3] px-5 py-2 text-xs font-medium text-ink/50 sm:px-8">Live admin operations · connected to Laravel</div><section className="p-5 sm:p-8 lg:p-10"><div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-semibold text-ink/50">Conference operations</p><h1 className="mt-1 font-display text-6xl uppercase leading-[.82] sm:text-7xl">{active}</h1></div><div className="flex gap-3"><button type="button" onClick={() => void load()} className="rounded-full border-2 border-ink/15 bg-white px-5 py-3 text-sm font-bold">Refresh</button>{active === 'Broadcasts' && <button type="button" onClick={() => select('Broadcasts')} className="rounded-full bg-[#1469a9] px-5 py-3 text-sm font-bold text-white">New broadcast</button>}</div></div>{error && <p className="mb-5 rounded-xl bg-[#fff0ee] px-4 py-3 text-sm font-bold text-coral">{error}</p>}{active === 'Overview' && <OverviewView overview={overview} select={select} />}{active === 'Registrants' && <RegistrantView people={registrants} onReview={reviewRegistrant} />}{active === 'Approvals' && <RegistrantView people={registrants.filter((person) => person.approval_status === 'pending')} onReview={reviewRegistrant} empty="No registrations are waiting for approval." />}{active === 'Testimonies' && <TestimonialView items={testimonials} onReview={reviewTestimonial} />}{active === 'Broadcasts' && <BroadcastView items={broadcasts} onCreated={load} />}{active === 'Teams' && <InfoView title="Teams" text="Team assignment is ready for committee review. Use the registrants list to approve delegates and group them after their profiles are complete." items={['Assign team codes', 'View team leaders', 'Export team roster']} />}{active === 'Publicity kit' && <InfoView title="Publicity kit" text="The delegate creatives remain available in the user dashboard. Admins can review the official assets and share the public campaign links." items={['Official flyer', 'Countdown assets', 'Logo pack']} />}{active === 'Store orders' && <InfoView title="Store orders" text="Orders are tracked here for collection at the conference venue." items={['Pending collection', 'Paid orders', 'Collected orders']} />}{active === 'Check-in & meals' && <InfoView title="Check-in & meals" text="Use the registrant ticket code at the print desk and meal points. The backend ticket code is shown in the registrants list." items={['Print desk queue', 'Meal redemptions', 'Badge activity']} />}{active === 'Settings' && <InfoView title="Settings" text="Conference configuration is controlled by the Laravel environment and admin account settings." items={['Registration capacity', 'Email delivery', 'Admin account']} />}</section></div></div></main>;
}

function AdminLogin({ onLoggedIn, error, setError }: { onLoggedIn: () => void; error: string; setError: (value: string) => void }) {
  const [email, setEmail] = useState('admin@janconf.test');
  const [password, setPassword] = useState('ChangeThisAdminPassword!');
  const [submitting, setSubmitting] = useState(false);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setSubmitting(true); setError('');
    try {
      const response = await fetch(API_URL + '/admin/login', { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, device_name: 'jan-conf-admin-web' }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Admin login failed.');
      window.localStorage.setItem('jan-conf-session', data.token); onLoggedIn();
    } catch (loginError) { setError(loginError instanceof Error ? loginError.message : 'Admin login failed.'); }
    finally { setSubmitting(false); }
  };
  return <main className="grid min-h-screen place-items-center bg-[#e8edf3] p-5"><form onSubmit={submit} className="w-full max-w-md rounded-[1.75rem] bg-cream p-7 shadow-2xl sm:p-10"><Brand light /><p className="eyebrow mt-12">Admin access</p><h1 className="mt-3 font-display text-6xl uppercase leading-[.8] text-[#03284a]">Welcome back.</h1><p className="mt-5 text-sm leading-6 text-ink/60">Use the seeded administrator account or your configured admin credentials.</p><label className="mt-7 block text-xs font-bold uppercase tracking-[.12em] text-ink/60">Email<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-lg border-2 border-ink/15 bg-white px-4 py-3 text-base outline-none focus:border-[#1469a9]" /></label><label className="mt-5 block text-xs font-bold uppercase tracking-[.12em] text-ink/60">Password<input required type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-lg border-2 border-ink/15 bg-white px-4 py-3 text-base outline-none focus:border-[#1469a9]" /></label>{error && <p className="mt-5 rounded-lg bg-[#fff0ee] px-4 py-3 text-sm font-bold text-coral">{error}</p>}<button disabled={submitting} className="mt-7 w-full rounded-full bg-[#1469a9] px-5 py-4 text-sm font-bold text-white disabled:opacity-60">{submitting ? 'Signing in…' : 'Sign in to admin'}</button></form></main>;
}

function Brand({ light = false }: { light?: boolean }) { return <div className={`flex items-center gap-3 ${light ? 'text-[#03284a]' : 'text-white'}`}><span className="grid h-10 w-10 place-items-center rounded-full border border-[#9bc4e5]/40 bg-[#0a3557] text-xs font-bold">M</span><span className="font-display text-xl uppercase leading-none">Jan. Conf 2027</span></div>; }
function AdminNav({ active, select }: { active: AdminPage; select: (page: AdminPage) => void }) { return <nav className="mt-8 grid gap-1" aria-label="Admin navigation">{navigation.map((item) => <button key={item.label} type="button" onClick={() => select(item.label)} className={`flex items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-bold ${active === item.label ? 'bg-[#304457] text-white' : 'text-[#b9cee1] hover:bg-white/10'}`}><span className="grid h-6 w-6 place-items-center">{item.icon}</span><span className="flex-1">{item.label}</span></button>)}</nav>; }
function OverviewView({ overview, select }: { overview: Overview; select: (page: AdminPage) => void }) { const max = Math.max(...overview.daily.map((day) => day.value), 1); return <><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Registered" value={overview.registered} detail="Verified accounts" /><Metric label="Onsite" value={overview.onsite} detail="Physical attendance" /><Metric label="Online" value={overview.online} detail="Livestream access" /><Metric label="Awaiting approval" value={overview.awaiting_approval} detail="Needs review" alert /></div><div className="mt-6 grid gap-4 xl:grid-cols-[1.45fr_1fr]"><section className="rounded-[1.4rem] border border-ink/10 bg-white p-6 shadow-sm"><div className="flex items-center justify-between"><h2 className="font-display text-3xl uppercase">Registrations · last 14 days</h2><span className="text-xs font-bold text-ink/45">Live data</span></div><div className="mt-7 flex h-64 items-end gap-2 border-b border-ink/10 sm:gap-3">{overview.daily.map((day, index) => <div key={day.label + index} className="flex h-full flex-1 flex-col items-center justify-end gap-2"><div className={`w-full rounded-t-lg ${index === overview.daily.length - 1 ? 'bg-[#b52e28]' : 'bg-[#b9d5ec]'}`} style={{ height: Math.max(4, (day.value / max) * 90) + '%' }} /><span className="text-xs font-semibold text-ink/45">{day.label}</span></div>)}</div></section><section className="rounded-[1.4rem] border border-ink/10 bg-white p-6 shadow-sm"><h2 className="font-display text-3xl uppercase">Capacity</h2><div className="mt-5 h-3 overflow-hidden rounded-full bg-[#e3e6eb]"><div className="h-full bg-[#1469a9]" style={{ width: Math.min(100, overview.onsite / 25) + '%' }} /></div><div className="mt-6 grid gap-4">{overview.capacity.map((item) => <div key={item.label} className="flex items-center justify-between text-sm font-semibold"><span>{item.label}</span><strong>{item.value}</strong></div>)}</div></section></div><div className="mt-6 grid gap-4 md:grid-cols-3"><ActionPanel title="Approvals" value={overview.awaiting_approval} action="Review queue" onClick={() => select('Approvals')} /><ActionPanel title="Testimonies" value="Review" action="Open testimonies" onClick={() => select('Testimonies')} /><ActionPanel title="Broadcasts" value="Manage" action="Create update" onClick={() => select('Broadcasts')} /></div></>; }
function Metric({ label, value, detail, alert = false }: { label: string; value: number; detail: string; alert?: boolean }) { return <article className="rounded-[1.25rem] border border-ink/10 bg-white p-6 shadow-sm"><p className="text-sm font-semibold text-ink/60">{label}</p><strong className="mt-2 block font-display text-5xl">{value.toLocaleString()}</strong><p className={`mt-3 text-sm font-bold ${alert ? 'text-coral' : 'text-[#34865e]'}`}>{detail}</p></article>; }
function ActionPanel({ title, value, action, onClick }: { title: string; value: number | string; action: string; onClick: () => void }) { return <article className="rounded-[1.25rem] border border-ink/10 bg-white p-5 shadow-sm"><p className="text-sm font-semibold text-ink/55">{title}</p><strong className="mt-1 block font-display text-4xl">{value}</strong><button type="button" onClick={onClick} className="mt-5 text-sm font-bold text-[#1469a9]">{action} →</button></article>; }
function RegistrantView({ people, onReview, empty = 'No registrants yet.' }: { people: Registrant[]; onReview: (id: number, status: 'approved' | 'rejected') => Promise<void>; empty?: string }) { return <section className="overflow-hidden rounded-[1.4rem] border border-ink/10 bg-white shadow-sm">{people.length === 0 ? <p className="p-8 text-sm text-ink/60">{empty}</p> : <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-[#f1f2f4] text-xs uppercase tracking-[.1em] text-ink/50"><tr><th className="p-4">Registrant</th><th className="p-4">Role</th><th className="p-4">Attendance</th><th className="p-4">Status</th><th className="p-4">Action</th></tr></thead><tbody>{people.map((person) => <tr key={person.id} className="border-t border-ink/10"><td className="p-4"><strong className="block">{person.name}</strong><span className="text-xs text-ink/50">{person.email}</span></td><td className="p-4">{person.role || '—'}</td><td className="p-4">{person.attendance_mode || '—'}</td><td className="p-4"><span className={`rounded-full px-3 py-1 text-xs font-bold ${person.approval_status === 'approved' ? 'bg-[#dff2e5] text-[#34865e]' : person.approval_status === 'rejected' ? 'bg-[#fff0ee] text-coral' : 'bg-[#fff4d9] text-[#8d651e]'}`}>{person.approval_status}</span></td><td className="p-4">{person.approval_status === 'pending' ? <div className="flex gap-2"><button type="button" onClick={() => void onReview(person.id, 'approved')} className="rounded-full bg-[#34865e] px-3 py-2 text-xs font-bold text-white">Approve</button><button type="button" onClick={() => void onReview(person.id, 'rejected')} className="rounded-full bg-[#fff0ee] px-3 py-2 text-xs font-bold text-coral">Reject</button></div> : <span className="text-xs text-ink/45">{person.ticket_code || 'No ticket'}</span>}</td></tr>)}</tbody></table></div>}</section>; }
function TestimonialView({ items, onReview }: { items: Testimonial[]; onReview: (id: number, status: 'approved' | 'rejected') => Promise<void> }) { return <div className="grid gap-4">{items.length === 0 && <div className="rounded-2xl bg-white p-8 text-sm text-ink/60">No testimonies have been submitted.</div>}{items.map((item) => <article key={item.id} className="rounded-[1.4rem] border border-ink/10 bg-white p-6 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-3"><div><strong>{item.name}</strong><p className="text-xs text-ink/50">{item.email} · {item.topic || 'General'}</p></div><span className="rounded-full bg-[#fff4d9] px-3 py-1 text-xs font-bold">{item.status}</span></div><p className="mt-5 leading-7 text-ink/75">{item.content}</p>{item.status === 'pending' && <div className="mt-5 flex gap-2"><button type="button" onClick={() => void onReview(item.id, 'approved')} className="rounded-full bg-[#34865e] px-4 py-2 text-xs font-bold text-white">Publish</button><button type="button" onClick={() => void onReview(item.id, 'rejected')} className="rounded-full bg-[#fff0ee] px-4 py-2 text-xs font-bold text-coral">Reject</button></div>}</article>)}</div>; }
function BroadcastView({ items, onCreated }: { items: Broadcast[]; onCreated: () => Promise<void> }) { const [title, setTitle] = useState(''); const [body, setBody] = useState(''); const [status, setStatus] = useState('draft'); const [message, setMessage] = useState(''); const submit = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); setMessage(''); try { await api('/admin/broadcasts', { method: 'POST', body: JSON.stringify({ title, body, status }) }); setTitle(''); setBody(''); setMessage('Broadcast saved.'); await onCreated(); } catch (submitError) { setMessage(submitError instanceof Error ? submitError.message : 'Could not save broadcast.'); } }; return <div className="grid gap-6 xl:grid-cols-[minmax(0,420px)_1fr]"><form onSubmit={submit} className="rounded-[1.4rem] bg-[#03284a] p-6 text-white shadow-sm"><p className="eyebrow text-[#ff7565]">Admin tools</p><h2 className="mt-3 font-display text-4xl uppercase">New broadcast</h2><input required value={title} onChange={(event) => setTitle(event.target.value)} className="mt-7 w-full rounded-xl bg-white p-4 text-ink outline-none" placeholder="Broadcast title" /><textarea required value={body} onChange={(event) => setBody(event.target.value)} className="mt-3 min-h-36 w-full rounded-xl bg-white p-4 text-ink outline-none" placeholder="Write an update for delegates..." /><select value={status} onChange={(event) => setStatus(event.target.value)} className="mt-3 w-full rounded-xl bg-white p-4 text-ink"><option value="draft">Save draft</option><option value="scheduled">Schedule</option><option value="sent">Send now</option></select>{message && <p className="mt-4 text-sm text-[#dbe9f8]">{message}</p>}<button className="mt-5 w-full rounded-full bg-white px-5 py-4 text-sm font-bold text-[#0b4779]">Save broadcast</button></form><div className="grid gap-3">{items.length === 0 && <div className="rounded-2xl bg-white p-8 text-sm text-ink/60">No broadcasts yet.</div>}{items.map((item) => <article key={item.id} className="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><div><h3 className="font-bold">{item.title}</h3><p className="mt-2 text-sm leading-6 text-ink/60">{item.body}</p></div><span className="rounded-full bg-[#eaf3fb] px-3 py-1 text-xs font-bold text-[#0b4779]">{item.status}</span></div></article>)}</div></div>; }
function InfoView({ title, text, items }: { title: string; text: string; items: string[] }) { return <div className="max-w-3xl rounded-[1.4rem] border border-ink/10 bg-white p-7 shadow-sm"><p className="eyebrow">Admin workspace</p><h2 className="mt-3 font-display text-5xl uppercase">{title}</h2><p className="mt-5 leading-7 text-ink/60">{text}</p><div className="mt-7 grid gap-3 sm:grid-cols-3">{items.map((item) => <div key={item} className="rounded-xl bg-[#f6f2e9] p-4 text-sm font-bold">{item}<span className="mt-3 block text-xs font-normal text-[#34865e]">Ready</span></div>)}</div></div>; }
