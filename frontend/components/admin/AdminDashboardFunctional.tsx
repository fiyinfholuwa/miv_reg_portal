'use client';

import { errorMessage, toast } from '../../lib/toast';
import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { API_URL } from '../../lib/api';
import { api } from './adminApi';
import { PasswordInput } from './adminUi';
import EventContentManager from './EventContentManager';
import EventsManager from './EventsManager';
import LandingContentManager from './LandingContentManager';
import { RegistrantsView, TeamsView, useEventOptions } from './PeopleViews';
import { BroadcastsView, CheckInView, PartnerEnquiriesView, TestimoniesView } from './OperationsViews';
import { AdminOrdersView, ShopProductsView } from './ShopAdminViews';
import { SettingsView } from './SettingsView';
import { AdminIcon, type AdminIconName } from './AdminIcons';
import { hasPermission, permissionSummary, type AdminPermission, type AdminPermissions } from './adminPermissions';


type AdminPage = 'Overview' | 'Registrants' | 'Teams' | 'Accommodation' | 'Events' | 'Event content' | 'Broadcasts' | 'Testimonies' | 'Check-in' | 'Meals' | 'Landing page' | 'Partner enquiries' | 'Shop products' | 'Store orders' | 'Settings';
type Overview = { event: { slug: string; short_name: string } | null; registered: number; onsite: number; online: number; checked_in: number; accommodation: number; daily: { label: string; value: number }[]; capacity: { label: string; value: number }[] };

/** Each page and the permission(s) that unlock it. `null` = every admin. */
const navigation: { group: string; items: { label: AdminPage; icon: AdminIconName; permission: AdminPermission | AdminPermission[] | null }[] }[] = [
  { group: '', items: [{ label: 'Overview', icon: 'home', permission: null }] },
  { group: 'People', items: [{ label: 'Registrants', icon: 'users', permission: 'people' }, { label: 'Teams', icon: 'team', permission: 'people' }, { label: 'Accommodation', icon: 'bed', permission: 'accommodation' }] },
  { group: 'Events', items: [{ label: 'Events', icon: 'calendar', permission: 'events' }, { label: 'Event content', icon: 'layers', permission: 'events' }] },
  { group: 'Event day', items: [{ label: 'Check-in', icon: 'scan', permission: 'check_in' }, { label: 'Meals', icon: 'meal', permission: 'meals' }] },
  { group: 'Media', items: [{ label: 'Broadcasts', icon: 'megaphone', permission: 'media' }, { label: 'Testimonies', icon: 'heart', permission: 'media' }, { label: 'Landing page', icon: 'globe', permission: 'media' }, { label: 'Partner enquiries', icon: 'mail', permission: 'media' }] },
  { group: 'Shop', items: [{ label: 'Shop products', icon: 'tag', permission: 'merch' }, { label: 'Store orders', icon: 'bag', permission: ['finance', 'merch'] }] },
  { group: '', items: [{ label: 'Settings', icon: 'settings', permission: null }] },
];
const PAGE_PERMISSION = Object.fromEntries(navigation.flatMap((section) => section.items.map((item) => [item.label, item.permission]))) as Record<AdminPage, AdminPermission | AdminPermission[] | null>;
const canOpen = (permissions: AdminPermissions, page: AdminPage) => PAGE_PERMISSION[page] === null || hasPermission(permissions, PAGE_PERMISSION[page] as AdminPermission | AdminPermission[]);

/** URL segment for each admin page: /admin/<slug>. Overview is /admin. */
const PAGE_SLUGS: Record<AdminPage, string> = {
  Overview: '', Registrants: 'registrants', Teams: 'teams', Accommodation: 'accommodation',
  Events: 'events', 'Event content': 'event-content', Broadcasts: 'broadcasts', Testimonies: 'testimonies', 'Check-in': 'check-in', Meals: 'meals',
  'Landing page': 'landing-page', 'Partner enquiries': 'partner-enquiries',
  'Shop products': 'shop-products', 'Store orders': 'store-orders', Settings: 'settings',
};
const pageHref = (page: AdminPage) => `/admin${PAGE_SLUGS[page] ? `/${PAGE_SLUGS[page]}` : ''}`;
const pageFromPath = (pathname: string): AdminPage | null => {
  const slug = pathname.replace(/^\/admin\/?/, '').split('/')[0] ?? '';
  return (Object.entries(PAGE_SLUGS).find(([, value]) => value === slug)?.[0] as AdminPage | undefined) ?? null;
};

const PAGE_HINTS: Partial<Record<AdminPage, string>> = {
  Events: 'Create events and choose what shows on the website.',
  'Event content': 'Programme, livestream, publicity kit and hotels for each event dashboard.',
  'Landing page': 'Everything on the public home page.',
  Broadcasts: 'Announcements appear on every delegate’s dashboard.',
  'Check-in': 'Welcome desk: scan tickets as delegates arrive.',
  Meals: 'Meal points: scan tickets to serve breakfast, lunch or dinner.',
  Accommodation: 'Delegates who asked for a room, by event.',
  'Store orders': 'Paid orders and what to hand over at the store.',
};

type Account = { id: number; name: string; email: string; permissions: AdminPermissions };

export default function AdminDashboardFunctional() {
  const pathname = usePathname();
  const router = useRouter();
  const routed = pageFromPath(pathname);
  const active: AdminPage = routed ?? 'Overview';
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loginRequired, setLoginRequired] = useState(false);
  const [account, setAccount] = useState<Account | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const load = async () => {
    setLoading(true);
    try {
      setAccount((await api('/admin/account')).admin);
      setLoginRequired(false);
      setRefreshKey((key) => key + 1);
    } catch (loadError) {
      if (String(loadError).toLowerCase().includes('unauthorized') || String(loadError).toLowerCase().includes('admin access') || String(loadError).toLowerCase().includes('unauthenticated')) setLoginRequired(true);
      else toast.error(errorMessage(loadError, 'Could not load the admin dashboard.'));
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
    await api('/auth/logout', { method: 'POST' }).catch(() => undefined);
    window.localStorage.removeItem('jan-conf-session');
    window.location.assign('/');
  };

  const permissions = account?.permissions ?? null;
  const allowed = account ? canOpen(permissions, active) : true;

  // Unknown /admin/<thing> addresses, and pages this admin can't use, fall back to the overview.
  useEffect(() => { if (!routed) router.replace('/admin'); }, [routed, router]);
  useEffect(() => { if (account && !allowed) { toast.warning(`You don't have access to ${active}.`); router.replace('/admin'); } }, [account, allowed, active, router]);
  useEffect(() => { document.title = `${active} · MIV Admin`; setMobileNavOpen(false); }, [active]);

  const select = (page: AdminPage) => {
    router.push(pageHref(page));
    setMobileNavOpen(false);
  };

  if (loginRequired) return <AdminLogin onLoggedIn={() => { setLoginRequired(false); void load(); }} />;
  if (loading || !account) return <main className="grid min-h-screen place-items-center bg-cream text-sm font-bold text-[#0b4779]">Loading admin dashboard…</main>;

  return (
    <main className="flex h-dvh overflow-hidden bg-cream text-ink">
      {/* Sidebar: fixed height, never scrolls on a normal screen. */}
      <aside className="hidden h-full w-[272px] shrink-0 flex-col bg-[#001a2d] px-4 py-5 text-white lg:flex">
        <Brand />
        <AdminNav active={active} permissions={permissions} onNavigate={() => setMobileNavOpen(false)} />
        <AccountFooter account={account} onLogout={() => void logout()} />
      </aside>
      <div className="flex h-full min-w-0 flex-1 flex-col">
        {/* Top bar: stays put while the page scrolls. */}
        <header className="z-30 flex shrink-0 items-center gap-3 border-b border-ink/10 bg-cream/95 px-4 py-3 backdrop-blur sm:px-6 lg:px-8">
          <button type="button" onClick={() => setMobileNavOpen(true)} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#001a2d] text-lg text-white lg:hidden" aria-label="Open menu">☰</button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-bold leading-tight text-[#03284a] sm:text-2xl">{active}</h1>
            <p className="hidden truncate text-xs text-ink/50 sm:block">{PAGE_HINTS[active] ?? 'Conference operations'}</p>
          </div>
          <a href="/" target="_blank" rel="noreferrer" className="hidden rounded-full border border-ink/15 bg-white px-4 py-2 text-xs font-bold sm:inline-flex">View site ↗</a>
          <button type="button" onClick={() => void load()} className="grid h-10 w-10 place-items-center rounded-full border border-ink/15 bg-white text-base font-bold sm:h-auto sm:w-auto sm:px-4 sm:py-2 sm:text-xs" aria-label="Refresh"><span className="sm:hidden" aria-hidden="true">↻</span><span className="hidden sm:inline">Refresh</span></button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <section className="p-3 sm:p-6 lg:p-8"><div key={`${active}-${refreshKey}`}>
            {allowed && <>
              {active === 'Overview' && <OverviewView permissions={permissions} select={select} />}
              {active === 'Registrants' && <RegistrantsView />}
              {active === 'Teams' && <TeamsView />}
              {active === 'Accommodation' && <RegistrantsView accommodation />}
              {active === 'Events' && <EventsManager onManageContent={() => select('Event content')} />}
              {active === 'Event content' && <EventContentManager />}
              {active === 'Broadcasts' && <BroadcastsView />}
              {active === 'Testimonies' && <TestimoniesView />}
              {active === 'Check-in' && <CheckInView desk="check-in" />}
              {active === 'Meals' && <CheckInView desk="meals" />}
              {active === 'Landing page' && <LandingContentManager />}
              {active === 'Partner enquiries' && <PartnerEnquiriesView />}
              {active === 'Shop products' && <ShopProductsView />}
              {active === 'Store orders' && <AdminOrdersView />}
              {active === 'Settings' && <SettingsView onProfileChange={(profile) => setAccount((current) => current ? { ...current, name: profile.name, email: profile.email } : current)} />}
            </>}
          </div></section>
        </div>
      </div>

      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 bg-[#001428]/60 lg:hidden" onClick={() => setMobileNavOpen(false)}>
          <aside className="flex h-full w-[min(86vw,300px)] flex-col bg-[#001a2d] px-4 pb-[max(env(safe-area-inset-bottom),20px)] pt-5 text-white" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between"><Brand /><button type="button" onClick={() => setMobileNavOpen(false)} className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-lg" aria-label="Close menu">×</button></div>
            <AdminNav active={active} permissions={permissions} onNavigate={() => setMobileNavOpen(false)} />
            <AccountFooter account={account} onLogout={() => void logout()} />
          </aside>
        </div>
      )}
    </main>
  );
}

function AccountFooter({ account, onLogout }: { account: Account; onLogout: () => void }) {
  return (
    <div className="mt-2 flex shrink-0 items-center gap-3 rounded-xl bg-white/5 p-2.5">
      <span className="min-w-0 flex-1"><strong className="block truncate text-sm">{account.name}</strong><span className="block truncate text-[11px] text-[#9bb4ca]">{permissionSummary(account.permissions)}</span></span>
      <button type="button" onClick={onLogout} className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[#c6d7e6] hover:bg-white/10 hover:text-white" aria-label="Log out" title="Log out"><AdminIcon name="logout" size={19} /></button>
    </div>
  );
}

function AdminLogin({ onLoggedIn }: { onLoggedIn: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setSubmitting(true);    try {
      const response = await fetch(API_URL + '/admin/login', { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, device_name: 'jan-conf-admin-web' }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Admin login failed.');
      window.localStorage.setItem('jan-conf-session', data.token); onLoggedIn();
    } catch (loginError) { toast.error(errorMessage(loginError, 'Admin login failed.'), { title: 'Sign-in failed' }); }
    finally { setSubmitting(false); }
  };
  return <main className="grid min-h-screen place-items-center bg-[#e8edf3] p-5"><form onSubmit={submit} className="w-full max-w-md rounded-[1.75rem] bg-cream p-7 shadow-2xl sm:p-10"><Brand light /><p className="eyebrow mt-12">Admin access</p><h1 className="page-title mt-3 text-[#03284a]">Welcome back.</h1><p className="type-body-muted mt-5 text-ink/60">Use the seeded administrator account or your configured admin credentials.</p><label className="form-label mt-7 block">Email<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="form-control" /></label><label className="form-label mt-5 block">Password<PasswordInput required autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="form-control" /></label><button disabled={submitting} className="mt-7 w-full rounded-full bg-[#1469a9] px-5 py-4 text-sm font-bold text-white disabled:opacity-60">{submitting ? 'Signing in…' : 'Sign in to admin'}</button></form></main>;
}

function Brand({ light = false }: { light?: boolean }) { return <div className={`flex items-center gap-3 ${light ? 'text-[#03284a]' : 'text-white'}`}><span className="grid h-10 w-10 place-items-center rounded-full border border-[#9bc4e5]/40 bg-[#0a3557] text-xs font-bold">M</span><span className="font-display text-xl uppercase leading-none">MIV Admin</span></div>; }
function AdminNav({ active, permissions, onNavigate }: { active: AdminPage; permissions: AdminPermissions; onNavigate: () => void }) {
  const sections = navigation.map((section) => ({ ...section, items: section.items.filter((item) => canOpen(permissions, item.label)) })).filter((section) => section.items.length > 0);
  return (
    <nav className="no-scrollbar mt-6 flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto" aria-label="Admin navigation">
      {sections.map((section, index) => (
        <div key={`${section.group}-${index}`} className={section.group || index > 0 ? 'mt-3' : ''}>
          {section.group && <p className="mb-1 px-3 text-[11px] font-bold uppercase tracking-[.16em] text-[#6f8aa3]">{section.group}</p>}
          {section.items.map((item) => <Link key={item.label} href={pageHref(item.label)} onClick={onNavigate} aria-current={active === item.label ? 'page' : undefined} className={`flex w-full items-center gap-3 rounded-xl px-3 py-[7px] text-left text-[15px] font-semibold transition ${active === item.label ? 'bg-[#304457] text-white' : 'text-[#c6d7e6] hover:bg-white/10 hover:text-white'}`}><AdminIcon name={item.icon} size={21} className={active === item.label ? 'text-[#9bc4e5]' : 'text-[#7f9ab2]'} /><span className="flex-1">{item.label}</span></Link>)}
        </div>
      ))}
    </nav>
  );
}

/** Headline numbers for every event, or one event picked from the filter. */
function OverviewView({ permissions, select }: { permissions: AdminPermissions; select: (page: AdminPage) => void }) {
  const events = useEventOptions();
  const [eventSlug, setEventSlug] = useState('');
  const [overview, setOverview] = useState<Overview | null>(null);

  useEffect(() => {
    let cancelled = false;
    setOverview(null);
    void api(`/admin/overview${eventSlug ? `?event=${encodeURIComponent(eventSlug)}` : ''}`)
      .then((data) => { if (!cancelled) setOverview(data); })
      .catch((error) => toast.error(errorMessage(error, 'Could not load the overview.')));
    return () => { cancelled = true; };
  }, [eventSlug]);

  const max = Math.max(...(overview?.daily ?? []).map((day) => day.value), 1);
  const actions: { title: string; value: string; action: string; page: AdminPage }[] = [
    { title: 'Registrants', value: 'People', action: 'Open registrants', page: 'Registrants' },
    { title: 'Check-in', value: 'Desk', action: 'Open welcome desk', page: 'Check-in' },
    { title: 'Meals', value: 'Serve', action: 'Open meal point', page: 'Meals' },
    { title: 'Accommodation', value: String(overview?.accommodation ?? '—'), action: 'See who needs a room', page: 'Accommodation' },
    { title: 'Testimonies', value: 'Review', action: 'Open testimonies', page: 'Testimonies' },
    { title: 'Broadcasts', value: 'Manage', action: 'Create update', page: 'Broadcasts' },
    { title: 'Store orders', value: 'Shop', action: 'Open orders', page: 'Store orders' },
  ];
  const shortcuts = actions.filter((item) => canOpen(permissions, item.page)).slice(0, 3);

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <label className="flex min-w-0 flex-1 items-center gap-2 sm:flex-none"><span className="text-xs font-bold uppercase tracking-[.12em] text-ink/45">Event</span>
          <select value={eventSlug} onChange={(event) => setEventSlug(event.target.value)} className="min-w-0 flex-1 rounded-full border border-ink/15 bg-white px-4 py-2 text-sm font-semibold sm:w-64 sm:flex-none" aria-label="Filter overview by event">
            <option value="">All events</option>
            {events.map((event) => <option key={event.slug} value={event.slug}>{event.short_name}</option>)}
          </select>
        </label>
        {overview?.event && <span className="text-xs text-ink/50">Showing {overview.event.short_name} registrations only</span>}
      </div>
      {!overview ? <div className="h-64 animate-pulse rounded-[1.4rem] bg-white" /> : <>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          <Metric label="Registered" value={overview.registered} detail={overview.event ? 'Event registrations' : 'Verified accounts'} />
          <Metric label="Onsite" value={overview.onsite} detail="Physical attendance" />
          <Metric label="Online" value={overview.online} detail="Livestream access" />
          <Metric label="Checked in" value={overview.checked_in} detail="Arrived at the venue" />
        </div>
        <div className="mt-4 grid gap-4 sm:mt-6 xl:grid-cols-[1.45fr_1fr]">
          <section className="rounded-[1.4rem] border border-ink/10 bg-white p-4 shadow-sm sm:p-6"><div className="flex items-center justify-between gap-3"><h2 className="font-display text-2xl uppercase sm:text-3xl">Registrations · last 14 days</h2><span className="shrink-0 text-xs font-bold text-ink/45">Live data</span></div><div className="mt-5 flex h-48 items-end gap-1 border-b border-ink/10 sm:mt-7 sm:h-64 sm:gap-3">{overview.daily.map((day, index) => <div key={day.label + index} className="flex h-full flex-1 flex-col items-center justify-end gap-2"><div className={`w-full rounded-t-lg ${index === overview.daily.length - 1 ? 'bg-[#b52e28]' : 'bg-[#b9d5ec]'}`} style={{ height: Math.max(4, (day.value / max) * 90) + '%' }} title={`${day.value}`} /><span className="text-[10px] font-semibold text-ink/45 sm:text-xs">{day.label}</span></div>)}</div></section>
          <section className="rounded-[1.4rem] border border-ink/10 bg-white p-4 shadow-sm sm:p-6"><h2 className="font-display text-2xl uppercase sm:text-3xl">Who’s coming</h2><div className="mt-5 grid gap-4">{[...overview.capacity, { label: 'Need accommodation', value: overview.accommodation }].map((item) => <div key={item.label} className="flex items-center justify-between text-sm font-semibold"><span>{item.label}</span><strong>{item.value}</strong></div>)}</div></section>
        </div>
      </>}
      {shortcuts.length > 0 && <div className="mt-4 grid gap-3 sm:mt-6 sm:gap-4 md:grid-cols-3">{shortcuts.map((item) => <ActionPanel key={item.page} title={item.title} value={item.value} action={item.action} onClick={() => select(item.page)} />)}</div>}
    </>
  );
}
function Metric({ label, value, detail }: { label: string; value: number; detail: string }) { return <article className="rounded-[1.25rem] border border-ink/10 bg-white p-4 shadow-sm sm:p-6"><p className="text-sm font-semibold text-ink/60">{label}</p><strong className="mt-2 block font-display text-4xl sm:text-5xl">{value.toLocaleString()}</strong><p className="mt-3 text-xs font-bold text-[#34865e] sm:text-sm">{detail}</p></article>; }
function ActionPanel({ title, value, action, onClick }: { title: string; value: number | string; action: string; onClick: () => void }) { return <article className="rounded-[1.25rem] border border-ink/10 bg-white p-5 shadow-sm"><p className="text-sm font-semibold text-ink/55">{title}</p><strong className="mt-1 block font-display text-4xl">{value}</strong><button type="button" onClick={onClick} className="mt-5 text-sm font-bold text-[#1469a9]">{action} →</button></article>; }
