'use client';

import { FormEvent, useEffect, useState } from 'react';
import { API_URL } from '../../lib/api';
import { EventRegistration, PRIMARY_EVENT_SLUG, fetchMyRegistrations } from '../../lib/events';
import { usePathname, useRouter } from 'next/navigation';

type Page = 'My events' | 'Programme' | 'My pass' | 'Live' | 'Testimonials' | 'Attending card' | 'My team' | 'Publicity kit' | 'Store' | 'Order history' | 'Hotels & travel';
type Profile = { id: number; name: string; email: string; phone: string | null; role: string | null; church: string | null; state_country: string | null; attendance_mode: string | null; attendance_days: string[] | null; needs_accommodation: boolean; ticket_code: string | null; approval_status: string; registered_events: string[] };
type Story = { id: number; name: string; meta: string; tag: string; quote: string; likes: number; status: string };
type ShopOrder = { id: number; reference: string; status: string; total: number; currency: string; pickup_code: string | null; paid_at: string | null; created_at: string | null; items: { name: string; quantity: number; line_total: number }[] };

/** imlcOnly items are the Jan Conf (IMLC) delegate tools; they show only for IMLC registrants. */
const navigation: { label: Page; icon: string; imlcOnly?: boolean }[] = [
  { label: 'My events', icon: '⌂' }, { label: 'Programme', icon: '▤', imlcOnly: true }, { label: 'My pass', icon: '▣', imlcOnly: true }, { label: 'Live', icon: '▶', imlcOnly: true }, { label: 'Testimonials', icon: '♡' },
  { label: 'Attending card', icon: 'A', imlcOnly: true }, { label: 'My team', icon: '♧', imlcOnly: true }, { label: 'Publicity kit', icon: '▣', imlcOnly: true }, { label: 'Store', icon: '$' }, { label: 'Order history', icon: '▤' }, { label: 'Hotels & travel', icon: 'H', imlcOnly: true },
];
const pageSlugs: Record<Page, string> = {
  'My events': '',
  Programme: 'programme',
  'My pass': 'pass',
  Live: 'live',
  Testimonials: 'testimonials',
  'Attending card': 'attending-card',
  'My team': 'team',
  'Publicity kit': 'publicity-kit',
  Store: 'store',
  'Order history': 'order-history',
  'Hotels & travel': 'hotels-travel',
};
const pageBySlug = Object.entries(pageSlugs).reduce<Record<string, Page>>((pages, [page, slug]) => {
  pages[slug] = page as Page;
  return pages;
}, {});
const programme = [
  ['7:00', 'AM', 'Arrival & check-in', 'Gates A and B'], ['9:00', 'AM', 'Royal Conference', 'Main hall · until 1 PM'], ['1:00', 'PM', 'Lunch', 'Meal points 1–3'], ['2:00', 'PM', 'IYLC', 'Main hall · ages 16–45 · until 8 PM'],
];
const days = ['Tue 19', 'Wed 20', 'Thu 21', 'Fri 22', 'Sat 23', 'Sun 24'];

async function api(path: string, options: RequestInit = {}) {
  const token = window.localStorage.getItem('jan-conf-session');
  const response = await fetch(API_URL + path, { ...options, headers: { Accept: 'application/json', ...(options.body ? { 'Content-Type': 'application/json' } : {}), Authorization: 'Bearer ' + token, ...options.headers } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'Request failed.');
  return data;
}

export default function UserDashboardFunctional() {
  const pathname = usePathname();
  const router = useRouter();
  const requested = pageBySlug[pathname.split('/')[2] || ''] || 'My events';
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [registrations, setRegistrations] = useState<EventRegistration[]>([]);
  const [justRegistered, setJustRegistered] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async () => {
    const [data, events] = await Promise.all([api('/auth/user'), fetchMyRegistrations()]);
    setProfile(data.user);
    setRegistrations(events);
  };

  useEffect(() => {
    if (!window.localStorage.getItem('jan-conf-session')) {
      window.location.assign('/');
      return;
    }
    void loadProfile().catch(() => { window.localStorage.removeItem('jan-conf-session'); window.location.assign('/'); }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    if (query.get('welcome') === 'attending') {
      router.replace('/dashboard/attending-card');
    }
    if (query.get('registered')) {
      setJustRegistered(query.get('registered'));
      router.replace('/dashboard');
    }
  }, [router]);

  const logout = async () => {
    await api('/auth/logout', { method: 'POST' }).catch(() => undefined);
    window.localStorage.removeItem('jan-conf-session');
    window.location.assign('/');
  };

  const imlc = registrations.find((registration) => registration.event.slug === PRIMARY_EVENT_SLUG) ?? null;
  const visibleNavigation = navigation.filter((item) => !item.imlcOnly || imlc);
  const active: Page = visibleNavigation.some((item) => item.label === requested) ? requested : 'My events';
  if (loading || !profile) return <main className="grid min-h-screen place-items-center bg-[#f6f2e9] text-sm font-bold text-[#0b4779]">Loading your dashboard…</main>;
  const select = (page: Page) => {
    router.push(pageSlugs[page] ? `/dashboard/${pageSlugs[page]}` : '/dashboard');
    setMobileOpen(false);
  };
  const initials = profile.name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();
  return <main className="min-h-screen bg-[#f6f2e9] text-ink"><div className="flex min-h-screen"><aside className="hidden w-[285px] shrink-0 border-r border-ink/10 bg-white p-5 lg:flex lg:flex-col"><Logo /><Nav items={visibleNavigation} active={active} select={select} /><div className="mt-auto rounded-2xl bg-[#f5ecd9] p-4"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-full bg-[#e2edf6] font-bold text-[#1469a9]">{initials}</span><div><strong className="block text-sm">{profile.name}</strong><span className="text-xs text-ink/50">{profile.role || 'Delegate'} · {registrations.length} event{registrations.length === 1 ? '' : 's'}</span></div></div><button type="button" onClick={logout} className="mt-4 w-full border-t border-ink/10 pt-3 text-left text-sm font-bold text-ink/60">↪ Log out</button></div></aside><div className="min-w-0 flex-1"><header className="flex items-center justify-between border-b border-ink/10 bg-white px-5 py-4 lg:hidden"><Logo /><button type="button" onClick={() => setMobileOpen((open) => !open)} className="grid h-11 w-11 place-items-center rounded-xl bg-ink text-xl text-white">{mobileOpen ? '×' : '☰'}</button></header>{mobileOpen && <div className="border-b border-ink/10 bg-white p-4 lg:hidden"><Nav items={visibleNavigation} active={active} select={select} /><button type="button" onClick={logout} className="mt-3 w-full border-t border-ink/10 pt-4 text-left text-sm font-bold text-ink/60">↪ Log out</button></div>}<div className="border-b border-ink/10 bg-[#e8edf3] px-5 py-2 text-xs font-medium text-ink/50 sm:px-10">MIV events portal · The Men of Issachar Vision</div><section className="p-4 sm:p-7 lg:p-10"><div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-base text-ink/50">Good evening</p><h1 className="page-title mt-1">{active === 'My events' ? profile.name.split(' ')[0] : active}</h1></div>{active === 'My events' && <a href="/events" className="rounded-full border-2 border-ink/15 bg-white px-5 py-2.5 text-xs font-bold uppercase text-[#0b4779] hover:border-[#1469a9]">Browse more events</a>}</div>{active === 'My events' && <MyEvents registrations={registrations} justRegistered={justRegistered} select={select} />}{active === 'Programme' && <Programme />}{active === 'My pass' && <Pass profile={profile} ticketCode={imlc?.ticket_code ?? profile.ticket_code} attendanceMode={imlc?.attendance_mode ?? profile.attendance_mode} />}{active === 'Live' && <Live />}{active === 'Testimonials' && <Testimonials />}{active === 'Attending card' && <Attending profile={profile} onSaved={setProfile} />}{active === 'My team' && <Team ticketCode={imlc?.ticket_code ?? profile.ticket_code} attendanceMode={imlc?.attendance_mode ?? null} />}{active === 'Publicity kit' && <Publicity />}{active === 'Store' && <Store />}{active === 'Order history' && <OrderHistory />}{active === 'Hotels & travel' && <Hotels />}</section></div></div></main>;
}

function Logo() { return <a href="/" className="flex items-center gap-3"><img src="/images/miv-logo.png" alt="MIV" className="h-10 w-10 rounded-full object-contain" /><span className="font-display text-xl uppercase leading-none tracking-wide text-[#0b2c4a]">MIV Events</span></a>; }
function Nav({ items, active, select }: { items: typeof navigation; active: Page; select: (page: Page) => void }) { return <nav className="mt-10 grid gap-1" aria-label="Delegate navigation">{items.map((item) => <button key={item.label} type="button" onClick={() => select(item.label)} className={active === item.label ? 'flex items-center gap-3 rounded-xl bg-[#e7f1fa] px-4 py-3 text-left font-bold text-[#0b4779]' : 'flex items-center gap-3 rounded-xl px-4 py-3 text-left font-bold text-ink/75 hover:bg-ink/5'}><span className="grid h-6 w-6 place-items-center text-[#1469a9]">{item.icon}</span>{item.label}</button>)}</nav>; }
function Countdown({ startsAt }: { startsAt: string }) { const target = new Date(startsAt).getTime(); const [remaining, setRemaining] = useState(Math.max(target - Date.now(), 0)); useEffect(() => { const timer = window.setInterval(() => setRemaining(Math.max(target - Date.now(), 0)), 1000); return () => window.clearInterval(timer); }, [target]); const total = Math.floor(remaining / 1000); const values = [['days', Math.floor(total / 86400)], ['hrs', Math.floor((total % 86400) / 3600)], ['min', Math.floor((total % 3600) / 60)], ['sec', total % 60]]; return <div className="flex gap-4 sm:gap-6">{values.map(([label, value]) => <div key={label}><strong className="font-display text-5xl text-[#fffaf0] sm:text-7xl">{String(value).padStart(2, '0')}</strong><span className="block text-[10px] font-bold uppercase tracking-[.14em] text-[#9bc4e5]">{label}</span></div>)}</div>; }
function Qr({ small = false }: { small?: boolean }) { return <div className={small ? 'grid grid-cols-7 gap-1 rounded-lg bg-white p-3' : 'grid grid-cols-9 gap-1 rounded-lg bg-white p-4'}>{Array.from({ length: small ? 49 : 81 }, (_, index) => <span key={index} className={(index * 17 + index % 7) % 4 < 2 ? 'aspect-square bg-[#071d36]' : 'aspect-square bg-white'} />)}</div>; }
function MyEvents({ registrations, justRegistered, select }: { registrations: EventRegistration[]; justRegistered: string | null; select: (page: Page) => void }) {
  const next = registrations.find((registration) => registration.event.starts_at && new Date(registration.event.ends_at ?? registration.event.starts_at).getTime() > Date.now());
  const welcome = registrations.find((registration) => registration.event.slug === justRegistered);
  if (registrations.length === 0) {
    return <section className="max-w-2xl rounded-[1.75rem] border border-ink/10 bg-white p-7 shadow-sm sm:p-10"><p className="eyebrow">No events yet</p><h2 className="mt-3 font-display text-4xl uppercase leading-none text-[#0b2c4a]">Find your next gathering</h2><p className="mt-4 leading-7 text-ink/60">Events you register for will show up here with your ticket code.</p><a href="/events" className="mt-7 inline-flex rounded-full bg-coral px-6 py-3 text-sm font-bold text-white">Browse events →</a></section>;
  }
  return <div className="grid gap-6">
    {welcome && <p className="rounded-xl bg-[#dff2e5] px-5 py-4 text-sm font-bold text-[#34865e]" role="status">You’re registered for {welcome.event.title}. Your ticket code is {welcome.ticket_code}.</p>}
    {next?.event.starts_at && <section className="rounded-[1.75rem] bg-[#03284a] p-7 text-white shadow-sm sm:p-9"><p className="text-xs font-bold uppercase tracking-[.16em] text-[#9bc4e5]">Next up · {next.event.short_name} · {next.event.date_label}</p><div className="mt-6"><Countdown startsAt={next.event.starts_at} /></div><div className="mt-6 flex flex-wrap gap-3">{next.attendance_mode && <span className="rounded-md border border-[#9bc4e5]/40 px-3 py-1 text-[10px] font-bold uppercase">{next.attendance_mode}</span>}<button type="button" onClick={() => addToCalendar(next)} className="rounded-md bg-[#fffaf0] px-4 py-2 text-xs font-bold uppercase text-ink">Add to calendar</button></div></section>}
    <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">{registrations.map((registration) => <EventTicket key={registration.id} registration={registration} highlighted={registration.event.slug === justRegistered} select={select} />)}</div>
  </div>;
}
function EventTicket({ registration, highlighted, select }: { registration: EventRegistration; highlighted: boolean; select: (page: Page) => void }) {
  const { event } = registration;
  const isImlc = event.slug === PRIMARY_EVENT_SLUG;
  return <article className={`flex flex-col overflow-hidden rounded-[1.5rem] border bg-white shadow-sm ${highlighted ? 'border-[#1469a9] ring-2 ring-[#1469a9]/30' : 'border-ink/10'}`}>
    <div className="relative h-40 bg-[#03284a]">{event.image && <img src={event.image} alt="" className="h-full w-full object-cover" />}<span className="absolute left-3 top-3 rounded-full bg-white px-3 py-1 text-xs font-bold text-ink">{event.date_label}</span></div>
    <div className="flex flex-1 flex-col p-5">
      <h3 className="text-lg font-bold leading-snug">{event.title}</h3>
      <p className="mt-1 text-sm text-ink/55">{[event.location, registration.attendance_mode].filter(Boolean).join(' · ') || 'Details coming soon'}</p>
      {registration.attendance_days.length > 0 && <p className="mt-1 text-xs text-ink/45">Days: {registration.attendance_days.join(', ')}</p>}
      <div className="mt-5 flex items-center gap-4 rounded-xl bg-[#f6f2e9] p-3"><div className="w-16 shrink-0"><Qr small /></div><div className="min-w-0"><span className="block text-[10px] font-bold uppercase tracking-[.12em] text-ink/45">Ticket code</span><strong className="block break-all font-display text-2xl tracking-wide text-[#0b2c4a]">{registration.ticket_code}</strong></div></div>
      <div className="mt-5 flex flex-wrap gap-2">{isImlc ? <button type="button" onClick={() => select('My pass')} className="rounded-full bg-[#1469a9] px-4 py-2 text-xs font-bold text-white">Open my pass</button> : null}<a href={`/events/${event.slug}`} className="rounded-full border-2 border-ink/15 px-4 py-2 text-xs font-bold text-[#0b4779]">Event details</a></div>
    </div>
  </article>;
}
function addToCalendar(registration: EventRegistration) {
  const { event } = registration;
  if (!event.starts_at) return;
  const stamp = (value: string) => new Date(value).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const end = event.ends_at ?? new Date(new Date(event.starts_at).getTime() + 3 * 3600 * 1000).toISOString();
  const params = new URLSearchParams({ action: 'TEMPLATE', text: event.title, dates: `${stamp(event.starts_at)}/${stamp(end)}`, location: event.location ?? '' });
  window.open(`https://calendar.google.com/calendar/render?${params.toString()}`, '_blank', 'noopener');
}
function Action({ title, letter, onClick }: { title: string; letter: string; onClick: () => void }) { return <button type="button" onClick={onClick} className="min-h-[145px] rounded-[1.25rem] border border-ink/10 bg-white p-5 text-left shadow-sm hover:border-[#1469a9]"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#eaf3fb] font-display text-xl text-[#1469a9]">{letter}</span><strong className="mt-6 block text-sm leading-5">{title}</strong></button>; }
function Programme() { return <div className="max-w-3xl"><div className="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm"><p className="text-xs font-bold uppercase text-ink/45">Today · Saturday 23</p><h2 className="mt-1 font-display text-4xl uppercase">Day 5 of 6</h2></div><div className="mt-5 flex gap-2 overflow-x-auto pb-2">{days.map((day) => <button key={day} type="button" className={day === 'Sat 23' ? 'shrink-0 rounded-full bg-ink px-4 py-2 text-xs font-bold text-white' : 'shrink-0 rounded-full bg-white px-4 py-2 text-xs font-bold text-ink/55'}>{day}</button>)}</div><div className="mt-3 grid gap-3">{programme.map(([time, meridiem, title, detail], index) => <article key={title} className={index === 1 ? 'grid grid-cols-[54px_1fr] gap-4 rounded-2xl border-l-4 border-coral bg-white p-5 shadow-sm' : 'grid grid-cols-[54px_1fr] gap-4 rounded-2xl border-l-4 border-ink/15 bg-white p-5 shadow-sm'}><div className="text-right"><strong className="font-display text-2xl">{time}</strong><span className="block text-[10px] font-bold text-ink/45">{meridiem}</span></div><div><h3 className="font-display text-2xl uppercase">{title}</h3><p className="mt-2 text-sm text-ink/55">{detail}</p></div></article>)}</div></div>; }
function Pass({ profile, ticketCode, attendanceMode }: { profile: Profile; ticketCode: string | null; attendanceMode: string | null }) { return <div className="grid gap-6 xl:grid-cols-[minmax(0,520px)_minmax(0,1fr)]"><section className="rounded-[1.75rem] bg-[#03284a] p-6 text-white sm:p-8"><h2 className="font-display text-3xl uppercase">My pass</h2><p className="mt-1 text-xs font-bold uppercase tracking-[.12em] text-[#9bc4e5]">Works offline</p><div className="mt-5 overflow-hidden rounded-[1.5rem] bg-white text-ink"><div className="flex items-center justify-between border-b border-dashed border-[#d9c99e] p-5"><div><p className="font-display text-xl uppercase">Jan. Conf 2027</p><p className="text-xs text-ink/50">19–24 Jan · Ibadan</p></div><span className="text-xs font-bold text-[#1469a9]">CLAIM TICKET</span></div><div className="flex justify-center p-7"><Qr /></div><p className="pb-6 text-center font-display text-2xl tracking-wide">{ticketCode || 'Pending'}</p><div className="grid grid-cols-3 border-t border-[#e7dcc1] text-xs"><div className="p-4"><span className="block uppercase text-ink/45">Name</span><strong className="mt-1 block">{profile.name}</strong></div><div className="border-x border-[#e7dcc1] p-4"><span className="block uppercase text-ink/45">Type</span><strong className="mt-1 block">{profile.role || 'Delegate'}</strong></div><div className="p-4"><span className="block uppercase text-ink/45">Mode</span><strong className="mt-1 block">{attendanceMode || 'Online'}</strong></div></div></div></section><section className="rounded-[1.75rem] border border-ink/10 bg-white p-6 shadow-sm sm:p-8"><p className="text-xs font-bold uppercase tracking-[.14em] text-ink/45">My badge</p><h2 className="mt-2 font-display text-4xl uppercase">{profile.name}</h2><p className="mt-1 text-sm text-ink/55">{profile.church || 'Delegate'}</p><div className="mt-6 rounded-[1.5rem] border-t-8 border-coral bg-[#073a77] p-6 text-white"><p className="text-xs font-bold uppercase tracking-[.16em] text-[#9bc4e5]">{profile.role || 'Delegate'}</p><h3 className="mt-4 font-display text-5xl uppercase leading-[.85]">{profile.name}</h3><p className="mt-4 text-sm text-[#dbe9f8]">One code · gate · hall · meal · merch</p><div className="mt-6 flex justify-center"><Qr small /></div></div></section></div>; }
function Live() { const [mode, setMode] = useState('Video'); const [reminder, setReminder] = useState(false); return <section className="overflow-hidden rounded-[1.75rem] bg-[#001b31] p-5 text-white sm:p-8"><div className="flex justify-between"><h2 className="font-display text-3xl uppercase">Live</h2><div className="flex rounded-full bg-[#29435a] p-1"><button type="button" onClick={() => setMode('Video')} className={mode === 'Video' ? 'rounded-full bg-cream px-5 py-2 text-sm font-bold text-ink' : 'px-5 py-2 text-sm font-bold text-[#bcd1e2]'}>Video</button><button type="button" onClick={() => setMode('Radio')} className={mode === 'Radio' ? 'rounded-full bg-cream px-5 py-2 text-sm font-bold text-ink' : 'px-5 py-2 text-sm font-bold text-[#bcd1e2]'}>Radio</button></div></div>{mode === 'Video' ? <div className="mt-7 grid gap-7 xl:grid-cols-[minmax(0,1fr)_360px]"><div><div className="relative aspect-video overflow-hidden rounded-2xl bg-[#03284a]"><img src="/images/church-building.jpeg" alt="Conference venue" className="h-full w-full object-cover opacity-80" /><span className="absolute left-4 top-4 rounded-full bg-[#c9362e] px-4 py-2 text-xs font-bold uppercase">● Live</span></div><h3 className="mt-5 font-display text-4xl uppercase">Royal Conference</h3><p className="mt-2 text-sm text-[#9bc4e5]">Saturday 23 January · Main hall · 9:00 AM–1:00 PM</p></div><div><h3 className="font-display text-2xl uppercase">Today</h3><div className="mt-4 grid gap-3">{programme.map(([time, meridiem, title, detail], index) => <div key={title} className="rounded-xl border border-white/15 p-4"><strong className={index === 1 ? 'text-[#ff7565]' : 'text-[#9bc4e5]'}>{index === 1 ? 'NOW' : time + ' ' + meridiem}</strong><span className="mt-1 block text-sm font-bold">{title}</span><span className="text-xs text-[#9bc4e5]">{detail}</span></div>)}</div><button type="button" onClick={() => setReminder(!reminder)} className="mt-5 rounded-full bg-cream px-5 py-3 text-sm font-bold text-ink">{reminder ? 'Reminder set' : 'Remind me about IYLC'}</button></div></div> : <div className="grid min-h-[560px] place-items-center text-center"><div><div className="mx-auto grid h-56 w-56 place-items-center rounded-full border border-[#1469a9] bg-[#073a77] text-5xl">M</div><span className="mt-8 inline-block rounded-full bg-[#c9362e] px-4 py-2 text-xs font-bold uppercase">● On air</span><h3 className="mt-5 font-display text-4xl uppercase">Jan. Conf Radio</h3><p className="mt-3 text-[#9bc4e5]">Audio-only mode for weak data connections.</p></div></div>}</section>; }

function Hotels() {
  const hotels = [{ name: 'Olororo Guest Lodge', area: 'Olororo, Ojoo', price: 18000, distance: '0.8 km', rate: true }, { name: 'Ojoo Grand Hotel', area: 'Ojoo roundabout', price: 25000, distance: '2.4 km', rate: false }, { name: 'Moniya Suites', area: 'Oyo Road, Moniya', price: 15000, distance: '5.1 km', rate: false }, { name: 'Bodija Executive Inn', area: 'Bodija, Ibadan', price: 35000, distance: '9.6 km', rate: false }];
  const [filter, setFilter] = useState('All');
  const filtered = hotels.filter((hotel) => filter === 'All' || filter === 'Under ₦20k' && hotel.price < 20000 || filter === '₦20k–₦35k' && hotel.price >= 20000 && hotel.price <= 35000 || filter === 'Conference rate' && hotel.rate);
  return <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(360px,.82fr)]"><div><div className="flex gap-2 overflow-x-auto pb-2">{['All', 'Under ₦20k', '₦20k–₦35k', 'Conference rate'].map((item) => <button key={item} type="button" onClick={() => setFilter(item)} className={filter === item ? 'shrink-0 rounded-full bg-ink px-4 py-2 text-xs font-bold text-white' : 'shrink-0 rounded-full border-2 border-ink/15 bg-white px-4 py-2 text-xs font-bold text-ink/65'}>{item}</button>)}</div><div className="mt-5 grid gap-5 sm:grid-cols-2">{filtered.map((hotel) => <article key={hotel.name} className="rounded-[1.4rem] border border-ink/10 bg-white p-3 shadow-sm"><div className="relative aspect-[1.35] overflow-hidden rounded-xl bg-[#e7edf3]"><img src="/images/photos/lp-hotel.webp" alt={`${hotel.name} accommodation`} className="h-full w-full object-cover" /><span className="absolute left-3 top-3 rounded-full bg-white px-3 py-2 text-xs font-bold">{hotel.distance}</span>{hotel.rate && <span className="absolute right-3 top-3 rounded-full bg-[#1469a9] px-3 py-2 text-xs font-bold text-white">Conference rate</span>}</div><div className="mt-4 flex items-start justify-between gap-3"><div><h3 className="font-bold">{hotel.name}</h3><p className="mt-1 text-sm text-ink/50">{hotel.area}</p></div><strong className="text-[#0b4779]">₦{hotel.price.toLocaleString()}<span className="block text-right text-xs font-normal text-ink/45">per night</span></strong></div></article>)}</div></div><aside className="grid min-h-[480px] place-items-center rounded-[1.5rem] border-2 border-dashed border-ink/20 bg-[#e7edf3] p-6 text-center text-ink/50"><div><span className="text-4xl">⌖</span><p className="mt-3 text-sm font-semibold">Map of hotels around the venue</p><button type="button" onClick={() => window.open('https://maps.google.com/?q=Leadership+Missions+Conference+Centre+Ibadan', '_blank')} className="mt-5 rounded-full bg-[#1469a9] px-5 py-3 text-sm font-bold text-white">Open directions</button></div></aside></div>;
}

function Attending({ profile, onSaved }: { profile: Profile; onSaved: (profile: Profile) => void }) {
  const [name, setName] = useState(profile.name);
  const [church, setChurch] = useState(profile.church || '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setSaving(true); setMessage('');
    try { const data = await api('/auth/profile', { method: 'PUT', body: JSON.stringify({ name, phone: profile.phone || '', role: profile.role || 'Delegate', church, state_country: profile.state_country || '' }) }); onSaved(data.user); setMessage('Your profile was saved.'); } catch (saveError) { setMessage(saveError instanceof Error ? saveError.message : 'Could not save.'); } finally { setSaving(false); }
  };
  const shareImage = async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1350;
    const context = canvas.getContext('2d');
    if (!context) return;
    context.fillStyle = '#f6f2e9';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = '#b52e28';
    context.fillRect(0, 0, 36, canvas.height);
    context.fillStyle = '#0b2c4a';
    context.font = '700 38px Arial';
    context.fillText('37th IMLC & IYLC 2027', 90, 110);
    context.font = '700 112px Arial';
    context.fillText('I WILL BE', 90, 780);
    context.fillText('ATTENDING', 90, 900);
    context.fillStyle = '#b52e28';
    context.font = '700 30px Arial';
    context.fillText('19–24 JAN 2027 · IBADAN', 90, 1010);
    context.fillStyle = '#0b2c4a';
    context.font = '700 48px Arial';
    context.fillText(name || 'Your name', 90, 1110);
    context.fillStyle = '#5b6773';
    context.font = '400 30px Arial';
    context.fillText(church || 'Ministry and leadership conference', 90, 1165);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!blob) return;
    const file = new File([blob], 'jan-conf-attending-card.png', { type: 'image/png' });
    if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
      await navigator.share({ title: 'I will be attending Jan. Conf 2027', text: 'I will be attending Jan. Conf 2027 in Ibadan.', files: [file] }).catch(() => undefined);
      return;
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = file.name;
    link.click();
    URL.revokeObjectURL(url);
    setMessage('Your attending card image was downloaded.');
  };
  return <div className="grid gap-8 2xl:grid-cols-[minmax(0,600px)_minmax(0,1fr)]"><div className="rounded-[1.75rem] bg-[#fbf7ee] p-4 shadow-sm sm:p-8"><div id="attending-card" className="relative mx-auto aspect-[.72] w-full max-w-[510px] overflow-hidden rounded-[1.5rem] border-l-[10px] border-[#b52e28] bg-[#f6f2e9] p-7 shadow-[0_18px_40px_rgba(7,29,54,.14)] sm:p-9"><div className="absolute right-7 top-7 h-36 w-28 rounded-2xl border-8 border-white bg-[#dbe9f8] p-3 text-center text-xs font-bold text-[#1469a9] sm:right-9 sm:top-9">YOUR<br />PHOTO</div><p className="font-display text-base uppercase text-[#0b2c4a] sm:text-lg">37th IMLC<br />& IYLC 2027</p><div className="absolute bottom-9 left-7 right-7 sm:bottom-12 sm:left-9 sm:right-9"><p className="font-display text-[clamp(2.6rem,8vw,5.8rem)] uppercase leading-[.78] text-[#03284a]">I will be<br />attending</p><p className="mt-5 break-words text-lg font-bold sm:text-xl">{name || 'Your name'}</p><p className="mt-2 text-[10px] font-bold uppercase tracking-[.1em] text-[#b52e28] sm:text-xs">19–24 Jan 2027 · Ibadan</p></div></div></div><form onSubmit={save} className="rounded-[1.75rem] bg-white p-6 shadow-sm sm:p-8"><p className="eyebrow text-[#b52e28]">Share the invite</p><h2 className="mt-4 font-display text-5xl uppercase leading-[.85] text-[#03284a] sm:text-7xl">I will be<br /><span className="text-coral">attending.</span></h2><p className="mt-5 max-w-md text-sm leading-6 text-ink/60">Personalize your card, save it, and share the image directly to social apps from your phone.</p><label className="mt-8 block text-xs font-bold uppercase tracking-[.12em] text-ink/60">Name on card<input required value={name} onChange={(event) => setName(event.target.value)} className="mt-2 w-full rounded-lg border-2 border-ink/15 bg-white px-4 py-4 text-base outline-none focus:border-[#1469a9]" /></label><label className="mt-6 block text-xs font-bold uppercase tracking-[.12em] text-ink/60">Church / ministry<input value={church} onChange={(event) => setChurch(event.target.value)} className="mt-2 w-full rounded-lg border-2 border-ink/15 bg-white px-4 py-4 text-base outline-none focus:border-[#1469a9]" /></label>{message && <p className="mt-5 rounded-lg bg-[#dff2e5] px-4 py-3 text-sm font-bold text-[#34865e]">{message}</p>}<div className="mt-8 flex flex-wrap gap-3"><button type="submit" disabled={saving} className="rounded-md bg-[#1469a9] px-7 py-4 text-sm font-bold uppercase text-white">{saving ? 'Saving…' : 'Save card'}</button><button type="button" onClick={() => void shareImage()} className="rounded-md border-2 border-ink/15 bg-white px-7 py-4 text-sm font-bold uppercase text-[#0b2c4a]">Share image</button></div></form></div>;
}

function Testimonials() {
  const [tab, setTab] = useState<'testimonies' | 'feedback'>('testimonies');
  const [stories, setStories] = useState<Story[]>([]);
  const [text, setText] = useState('');
  const [topic, setTopic] = useState('Healing');
  const [showName, setShowName] = useState(true);
  const [message, setMessage] = useState('');
  const [likelihood, setLikelihood] = useState(5);
  const [ratings, setRatings] = useState<Record<string, number>>({ Registration: 5, 'Venue & seating': 4, Meals: 3, Livestream: 0 });
  const [highlight, setHighlight] = useState('The word');
  const [improvement, setImprovement] = useState('');
  useEffect(() => { void api('/auth/testimonials').then((data) => setStories(data.testimonials)).catch(() => undefined); }, []);
  const submitStory = async () => { if (text.trim().length < 10) { setMessage('Please write at least 10 characters.'); return; } try { await api('/auth/testimonials', { method: 'POST', body: JSON.stringify({ type: 'Write', content: text, topic, show_name: showName }) }); setText(''); setMessage('Your testimony was sent for review.'); } catch (submitError) { setMessage(submitError instanceof Error ? submitError.message : 'Could not submit testimony.'); } };
  const submitFeedback = async () => { try { await api('/auth/feedback', { method: 'POST', body: JSON.stringify({ likelihood, ratings, highlight, improvement }) }); setMessage('Thank you. Your feedback was recorded.'); } catch (submitError) { setMessage(submitError instanceof Error ? submitError.message : 'Could not submit feedback.'); } };
  return <div className="max-w-5xl"><div className="inline-flex w-full rounded-full bg-[#eef0f3] p-1 sm:w-auto"><button type="button" onClick={() => setTab('testimonies')} className={tab === 'testimonies' ? 'flex-1 rounded-full bg-[#1469a9] px-7 py-3 text-sm font-bold text-white sm:flex-none' : 'flex-1 rounded-full px-7 py-3 text-sm font-bold text-ink/60 sm:flex-none'}>Testimonies</button><button type="button" onClick={() => setTab('feedback')} className={tab === 'feedback' ? 'flex-1 rounded-full bg-[#1469a9] px-7 py-3 text-sm font-bold text-white sm:flex-none' : 'flex-1 rounded-full px-7 py-3 text-sm font-bold text-ink/60 sm:flex-none'}>Feedback</button></div>{message && <p className="mt-5 rounded-xl bg-[#dff2e5] px-4 py-3 text-sm font-bold text-[#34865e]">{message}</p>}{tab === 'testimonies' ? <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]"><div><div className="grid gap-4">{stories.length === 0 && <div className="rounded-2xl bg-white p-7 text-sm text-ink/60">Published testimonies will appear here.</div>}{stories.map((story) => <article key={story.id} className="rounded-[1.25rem] border border-ink/10 bg-white p-5 shadow-sm"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-full bg-[#eaf3fb] text-xs font-bold text-[#1469a9]">{story.name.slice(0, 2).toUpperCase()}</span><div><strong className="block text-sm">{story.name}</strong><span className="text-xs text-ink/50">{story.meta}</span></div><span className="ml-auto rounded-full bg-[#fff0ee] px-3 py-1 text-xs font-bold text-coral">{story.tag}</span></div><p className="mt-5 leading-7 text-ink/75">{story.quote}</p><p className="mt-4 text-sm font-bold text-coral">♡ {story.likes} &nbsp; Amen</p></article>)}</div></div><aside className="h-fit rounded-[1.5rem] bg-[#03284a] p-6 text-white"><p className="text-xs font-bold uppercase tracking-[.15em] text-[#9bc4e5]">Share your story</p><h2 className="mt-3 font-display text-3xl uppercase">Your voice matters</h2><textarea value={text} onChange={(event) => setText(event.target.value)} className="mt-5 min-h-36 w-full rounded-xl p-4 text-ink" placeholder="Tell us what God did..." /><div className="mt-4 flex flex-wrap gap-2">{['Healing', 'Ministry', 'Family', 'Provision', 'Salvation'].map((item) => <button key={item} type="button" onClick={() => setTopic(item)} className={topic === item ? 'rounded-full bg-white px-3 py-2 text-xs font-bold text-[#0b4779]' : 'rounded-full border border-white/30 px-3 py-2 text-xs font-bold'}>{item}</button>)}</div><label className="mt-5 flex items-center gap-3 text-sm"><input type="checkbox" checked={showName} onChange={(event) => setShowName(event.target.checked)} /> Show my name</label><button type="button" onClick={() => void submitStory()} className="mt-6 w-full rounded-full bg-white px-5 py-3 text-sm font-bold text-[#0b4779]">Send to media team</button></aside></div> : <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,620px)_minmax(0,1fr)]"><section className="rounded-[1.5rem] bg-white p-6 shadow-sm sm:p-8"><h2 className="font-display text-3xl uppercase">Help us plan IMLC 2028</h2><p className="mt-7 font-bold">How likely are you to attend next year?</p><div className="mt-4 grid grid-cols-5 gap-2">{[1, 2, 3, 4, 5].map((value) => <button key={value} type="button" onClick={() => setLikelihood(value)} className={likelihood === value ? 'rounded-xl border-2 border-[#1469a9] bg-[#1469a9] py-4 text-lg font-bold text-white' : 'rounded-xl border-2 border-ink/15 bg-white py-4 text-lg font-bold'}>{value}</button>)}</div><p className="mt-7 font-bold">Rate these</p><div className="mt-2 divide-y divide-ink/10">{Object.entries(ratings).map(([label, value]) => <div key={label} className="flex items-center justify-between py-4"><span className="text-sm font-semibold">{label}</span><span className="flex gap-1">{[1, 2, 3, 4, 5].map((star) => <button key={star} type="button" onClick={() => setRatings((current) => ({ ...current, [label]: star }))} className="text-xl text-[#bd7818]">{star <= value ? '★' : '☆'}</button>)}</span></div>)}</div><button type="button" onClick={() => void submitFeedback()} className="mt-5 w-full rounded-full bg-[#1469a9] px-5 py-4 text-sm font-bold text-white">Send feedback</button></section><section className="rounded-[1.5rem] border border-ink/10 bg-white p-6 shadow-sm sm:p-8"><h2 className="font-display text-3xl uppercase">What stood out?</h2><div className="mt-4 flex flex-wrap gap-2">{['The word', 'Worship', 'Prayer time', 'Sound', 'Seating'].map((item) => <button key={item} type="button" onClick={() => setHighlight(item)} className={highlight === item ? 'rounded-full bg-ink px-4 py-2 text-sm font-bold text-white' : 'rounded-full border border-ink/15 px-4 py-2 text-sm font-bold text-ink/65'}>{item}</button>)}</div><textarea value={improvement} onChange={(event) => setImprovement(event.target.value)} className="mt-7 min-h-32 w-full rounded-xl bg-[#f1f2f4] p-4 text-sm outline-none" placeholder="Anything we should improve? (optional)" /></section></div>}</div>;
}

function Team({ ticketCode, attendanceMode }: { ticketCode: string | null; attendanceMode: string | null }) { const [copied, setCopied] = useState(false); const code = ticketCode ? ticketCode.replace('DLG', 'TEAM') : 'TEAM-JC27'; const copy = () => { void navigator.clipboard?.writeText(code); setCopied(true); window.setTimeout(() => setCopied(false), 1600); }; return <div className="max-w-3xl rounded-[1.75rem] bg-[#03284a] p-7 text-white sm:p-10"><p className="eyebrow text-[#ff7565]">Delegate team</p><h2 className="mt-3 font-display text-5xl uppercase">My team</h2><p className="mt-5 max-w-lg leading-7 text-[#dbe9f8]">Share your team code with your church or ministry delegates so the committee can keep everyone together.</p><div className="mt-8 rounded-2xl bg-white p-5 text-ink"><p className="text-xs font-bold uppercase tracking-[.12em] text-ink/45">Your team code</p><div className="mt-2 flex items-center justify-between gap-3"><strong className="font-display text-4xl text-[#0b4779]">{code}</strong><button type="button" onClick={copy} className="rounded-full bg-[#eaf3fb] px-4 py-2 text-xs font-bold text-[#0b4779]">{copied ? 'Copied' : 'Copy'}</button></div></div><div className="mt-6 grid gap-3 sm:grid-cols-3"><div className="rounded-xl border border-white/15 p-4"><strong className="block text-2xl">1</strong><span className="text-xs text-[#9bc4e5]">Team members</span></div><div className="rounded-xl border border-white/15 p-4"><strong className="block text-2xl">{attendanceMode && /online/i.test(attendanceMode) ? 'Online' : 'Onsite'}</strong><span className="text-xs text-[#9bc4e5]">Attendance mode</span></div><div className="rounded-xl border border-white/15 p-4"><strong className="block text-2xl">Active</strong><span className="text-xs text-[#9bc4e5]">Team status</span></div></div></div>; }

function Publicity() { const assets = [{ title: 'Official flyer', image: '/images/publicity/flyer-square.jpg' }, { title: 'Promo banner', image: '/images/publicity/flyer-preview.jpg' }, { title: 'Logo pack', image: '/images/miv-logo.png' }]; const [selected, setSelected] = useState(assets[0]); const [copied, setCopied] = useState(false); const caption = 'The 37th IMLC & IYLC holds 19–24 January 2027 in Ibadan. Registration is free. #JanConf2027 #IMLC2027'; const copy = () => { void navigator.clipboard?.writeText(caption); setCopied(true); window.setTimeout(() => setCopied(false), 1600); }; return <div className="grid gap-7 2xl:grid-cols-[minmax(0,1fr)_480px]"><div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{assets.map((asset) => <button key={asset.title} type="button" onClick={() => setSelected(asset)} className={selected.title === asset.title ? 'rounded-[1.4rem] bg-white p-3 text-left shadow-sm ring-2 ring-[#1469a9]' : 'rounded-[1.4rem] bg-white p-3 text-left shadow-sm'}><img src={asset.image} alt={asset.title} className="aspect-square w-full rounded-xl object-cover" /><strong className="mt-4 block">{asset.title}</strong><span className="mt-1 block text-sm text-ink/50">Ready to share</span></button>)}</div><aside className="h-fit rounded-[1.5rem] border border-ink/10 bg-white p-5 shadow-sm sm:p-7"><h2 className="font-display text-3xl uppercase">{selected.title}</h2><img src={selected.image} alt="" className="mt-5 aspect-square w-full rounded-xl object-cover" /><p className="mt-5 rounded-xl bg-[#f1f2f4] p-4 text-sm leading-6 text-ink/70">{caption}</p><div className="mt-4 grid grid-cols-2 gap-3"><button type="button" onClick={copy} className="rounded-full bg-[#1469a9] px-5 py-3 text-sm font-bold text-white">{copied ? 'Copied caption' : 'Copy caption'}</button><button type="button" onClick={() => window.open(selected.image, '_blank')} className="rounded-full border border-ink/15 px-5 py-3 text-sm font-bold text-[#0b4779]">Open asset</button></div></aside></div>; }

function Store() { return <div className="max-w-2xl rounded-[1.75rem] bg-[#03284a] p-7 text-white sm:p-10"><p className="eyebrow text-[#ff7565]">Official merchandise</p><h2 className="mt-3 font-display text-5xl uppercase">Visit the store</h2><p className="mt-5 leading-7 text-[#dbe9f8]">Browse products, add them to your cart, and pay securely with Paystack. Your paid orders and pickup barcodes will appear in Order history.</p><a href="/shop" className="mt-7 inline-flex rounded-full bg-white px-6 py-4 text-sm font-bold text-[#0b4779]">Open conference shop →</a></div>; }

function OrderHistory() {
  const [orders, setOrders] = useState<ShopOrder[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { void api('/shop/orders').then((data) => setOrders(data.orders || [])).catch((requestError) => setError(requestError instanceof Error ? requestError.message : 'Could not load your orders.')).finally(() => setLoading(false)); }, []);

  if (loading) return <div className="rounded-2xl bg-white p-7 text-sm font-semibold text-ink/60">Loading your order history…</div>;
  if (error) return <div className="rounded-2xl bg-[#fff0ee] p-7 text-sm font-semibold text-coral">{error}</div>;
  return <div className="max-w-4xl"><div className="rounded-[1.75rem] bg-[#03284a] p-7 text-white sm:p-10"><p className="eyebrow text-[#ff7565]">Store collection</p><h2 className="mt-3 font-display text-5xl uppercase">Order history</h2><p className="mt-5 max-w-xl leading-7 text-[#dbe9f8]">Paid orders have a unique barcode and pickup code. Show either one to the store team when you collect your items.</p></div><div className="mt-6 grid gap-4">{orders.length === 0 && <div className="rounded-2xl bg-white p-7 text-sm text-ink/60">You have no orders yet. <a href="/shop" className="font-bold text-coral">Visit the shop →</a></div>}{orders.map((order) => <article key={order.id} className="rounded-[1.5rem] border border-ink/10 bg-white p-5 shadow-sm sm:p-7"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.12em] text-ink/45">{order.reference}</p><h3 className="mt-2 font-display text-3xl uppercase">₦{order.total.toLocaleString()}</h3><p className="mt-1 text-sm text-ink/55">{order.created_at ? new Date(order.created_at).toLocaleDateString('en-NG', { dateStyle: 'medium' }) : 'Order date unavailable'}</p></div><span className={`rounded-full px-3 py-2 text-xs font-bold uppercase ${order.status === 'paid' ? 'bg-[#dff2e5] text-[#34865e]' : order.status === 'failed' ? 'bg-[#fff0ee] text-coral' : 'bg-[#fff4d9] text-[#9a6814]'}`}>{order.status}</span></div><div className="mt-5 grid gap-2 border-t border-ink/10 pt-5 text-sm text-ink/70">{order.items.map((item) => <div key={item.name} className="flex justify-between gap-3"><span>{item.name} × {item.quantity}</span><strong>₦{item.line_total.toLocaleString()}</strong></div>)}</div>{order.status === 'paid' && order.pickup_code && <><button type="button" onClick={() => setSelected(selected === order.id ? null : order.id)} className="mt-6 rounded-full bg-[#1469a9] px-5 py-3 text-sm font-bold text-white">{selected === order.id ? 'Hide pickup barcode' : 'Show pickup barcode'}</button>{selected === order.id && <div className="mt-5 rounded-2xl border-2 border-dashed border-ink/15 bg-[#f6f2e9] p-5 text-center"><Barcode value={order.pickup_code} /><p className="mt-4 font-display text-2xl tracking-[.12em]">{order.pickup_code}</p><p className="mt-2 text-xs text-ink/55">Show this screen at the store collection desk.</p></div>}</>}</article>)}</div></div>;
}

function Barcode({ value }: { value: string }) { const bars = Array.from(value).flatMap((character, index) => { const code = character.charCodeAt(0) + index; return [1 + (code % 3), 1 + ((code >> 2) % 3), 1 + ((code >> 4) % 2)]; }); return <div className="mx-auto flex h-20 max-w-sm items-stretch justify-center gap-[2px] bg-white p-3" aria-label={`Barcode ${value}`}>{bars.map((width, index) => <span key={`${index}-${width}`} className={index % 2 === 0 ? 'bg-[#071d36]' : 'bg-transparent'} style={{ width: `${width}px` }} />)}</div>; }
