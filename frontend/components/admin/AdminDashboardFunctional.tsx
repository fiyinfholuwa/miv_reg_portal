'use client';

import { errorMessage, toast } from '../../lib/toast';
import { FormEvent, useEffect, useState } from 'react';
import { API_URL } from '../../lib/api';
import { api } from './adminApi';
import EventContentManager from './EventContentManager';
import EventsManager from './EventsManager';
import LandingContentManager from './LandingContentManager';
import { RegistrantsView, TeamsView } from './PeopleViews';
import { BroadcastsView, CheckInView, PartnerEnquiriesView, TestimoniesView } from './OperationsViews';
import { AdminOrdersView, ShopProductsView } from './ShopAdminViews';
import { SettingsView } from './SettingsView';
import { AdminIcon, type AdminIconName } from './AdminIcons';


type AdminPage = 'Overview' | 'Registrants' | 'Approvals' | 'Teams' | 'Events' | 'Event content' | 'Broadcasts' | 'Testimonies' | 'Check-in & meals' | 'Landing page' | 'Partner enquiries' | 'Shop products' | 'Store orders' | 'Settings';
type Overview = { registered: number; onsite: number; online: number; awaiting_approval: number; daily: { label: string; value: number }[]; capacity: { label: string; value: number }[] };

const navigation: { group: string; items: { label: AdminPage; icon: AdminIconName }[] }[] = [
  { group: '', items: [{ label: 'Overview', icon: 'home' }] },
  { group: 'People', items: [{ label: 'Registrants', icon: 'users' }, { label: 'Approvals', icon: 'check' }, { label: 'Teams', icon: 'team' }] },
  { group: 'Events', items: [{ label: 'Events', icon: 'calendar' }, { label: 'Event content', icon: 'layers' }, { label: 'Broadcasts', icon: 'megaphone' }, { label: 'Testimonies', icon: 'heart' }, { label: 'Check-in & meals', icon: 'scan' }] },
  { group: 'Website', items: [{ label: 'Landing page', icon: 'globe' }, { label: 'Partner enquiries', icon: 'mail' }] },
  { group: 'Shop', items: [{ label: 'Shop products', icon: 'tag' }, { label: 'Store orders', icon: 'bag' }] },
  { group: '', items: [{ label: 'Settings', icon: 'settings' }] },
];
const PAGE_HINTS: Partial<Record<AdminPage, string>> = {
  Events: 'Create events and choose what shows on the website.',
  'Event content': 'Programme, livestream, publicity kit and hotels for each event dashboard.',
  'Landing page': 'Everything on the public home page.',
  Broadcasts: 'Announcements appear on every delegate’s dashboard.',
  'Store orders': 'Paid orders and what to hand over at the store.',
};


export default function AdminDashboardFunctional() {
  const [active, setActive] = useState<AdminPage>('Overview');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loginRequired, setLoginRequired] = useState(false);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const load = async () => {
    setLoading(true);
    try {
      setOverview(await api('/admin/overview'));
      setLoginRequired(false);
      setRefreshKey((key) => key + 1);
    } catch (loadError) {
      if (String(loadError).toLowerCase().includes('unauthorized') || String(loadError).toLowerCase().includes('admin access')) setLoginRequired(true);
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
    await api('/auth/logout').catch(() => undefined);
    window.localStorage.removeItem('jan-conf-session');
    window.location.assign('/');
  };

  const select = (page: AdminPage) => {
    setActive(page);
    setMobileNavOpen(false);
  };




  if (loginRequired) return <AdminLogin onLoggedIn={() => { setLoginRequired(false); void load(); }} />;
  if (loading || !overview) return <main className="grid min-h-screen place-items-center bg-cream text-sm font-bold text-[#0b4779]">Loading admin dashboard…</main>;

  return (
    <main className="flex h-dvh overflow-hidden bg-cream text-ink">
      {/* Sidebar: fixed height, never scrolls on a normal screen. */}
      <aside className="hidden h-full w-[272px] shrink-0 flex-col bg-[#001a2d] px-4 py-5 text-white lg:flex">
        <Brand />
        <AdminNav active={active} select={select} />
        <button type="button" onClick={logout} className="mt-2 flex shrink-0 items-center gap-3 rounded-xl px-3 py-2 text-left text-[15px] font-semibold text-[#c6d7e6] hover:bg-white/10 hover:text-white"><AdminIcon name="logout" size={21} className="text-[#7f9ab2]" />Log out</button>
      </aside>
      <div className="flex h-full min-w-0 flex-1 flex-col">
        {/* Top bar: stays put while the page scrolls. */}
        <header className="z-30 flex shrink-0 items-center gap-3 border-b border-ink/10 bg-cream/95 px-4 py-3 backdrop-blur sm:px-6 lg:px-8">
          <button type="button" onClick={() => setMobileNavOpen(true)} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#001a2d] text-lg text-white lg:hidden" aria-label="Open menu">☰</button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-bold leading-tight text-[#03284a] sm:text-2xl">{active}</h1>
            <p className="hidden truncate text-xs text-ink/50 sm:block">{PAGE_HINTS[active] ?? 'Conference operations · connected to Laravel'}</p>
          </div>
          <a href="/" target="_blank" rel="noreferrer" className="hidden rounded-full border border-ink/15 bg-white px-4 py-2 text-xs font-bold sm:inline-flex">View site ↗</a>
          <button type="button" onClick={() => void load()} className="rounded-full border border-ink/15 bg-white px-4 py-2 text-xs font-bold">Refresh</button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <section className="p-4 sm:p-6 lg:p-8"><div key={`${active}-${refreshKey}`}>
            {active === 'Overview' && <OverviewView overview={overview} select={select} />}
            {active === 'Registrants' && <RegistrantsView />}
            {active === 'Approvals' && <RegistrantsView approvals />}
            {active === 'Teams' && <TeamsView />}
            {active === 'Events' && <EventsManager onManageContent={() => select('Event content')} />}
            {active === 'Event content' && <EventContentManager />}
            {active === 'Broadcasts' && <BroadcastsView />}
            {active === 'Testimonies' && <TestimoniesView />}
            {active === 'Check-in & meals' && <CheckInView />}
            {active === 'Landing page' && <LandingContentManager />}
            {active === 'Partner enquiries' && <PartnerEnquiriesView />}
            {active === 'Shop products' && <ShopProductsView />}
            {active === 'Store orders' && <AdminOrdersView />}
            {active === 'Settings' && <SettingsView />}
          </div></section>
        </div>
      </div>

      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 bg-[#001428]/60 lg:hidden" onClick={() => setMobileNavOpen(false)}>
          <aside className="flex h-full w-[min(86vw,300px)] flex-col bg-[#001a2d] px-4 py-5 text-white" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between"><Brand /><button type="button" onClick={() => setMobileNavOpen(false)} className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-lg" aria-label="Close menu">×</button></div>
            <AdminNav active={active} select={select} />
            <button type="button" onClick={logout} className="mt-2 flex shrink-0 items-center gap-3 rounded-xl px-3 py-2 text-left text-[15px] font-semibold text-[#c6d7e6] hover:bg-white/10 hover:text-white"><AdminIcon name="logout" size={21} className="text-[#7f9ab2]" />Log out</button>
          </aside>
        </div>
      )}
    </main>
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
  return <main className="grid min-h-screen place-items-center bg-[#e8edf3] p-5"><form onSubmit={submit} className="w-full max-w-md rounded-[1.75rem] bg-cream p-7 shadow-2xl sm:p-10"><Brand light /><p className="eyebrow mt-12">Admin access</p><h1 className="page-title mt-3 text-[#03284a]">Welcome back.</h1><p className="type-body-muted mt-5 text-ink/60">Use the seeded administrator account or your configured admin credentials.</p><label className="form-label mt-7 block">Email<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="form-control" /></label><label className="form-label mt-5 block">Password<input required type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="form-control" /></label><button disabled={submitting} className="mt-7 w-full rounded-full bg-[#1469a9] px-5 py-4 text-sm font-bold text-white disabled:opacity-60">{submitting ? 'Signing in…' : 'Sign in to admin'}</button></form></main>;
}

function Brand({ light = false }: { light?: boolean }) { return <div className={`flex items-center gap-3 ${light ? 'text-[#03284a]' : 'text-white'}`}><span className="grid h-10 w-10 place-items-center rounded-full border border-[#9bc4e5]/40 bg-[#0a3557] text-xs font-bold">M</span><span className="font-display text-xl uppercase leading-none">MIV Admin</span></div>; }
function AdminNav({ active, select }: { active: AdminPage; select: (page: AdminPage) => void }) {
  return (
    <nav className="no-scrollbar mt-6 flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto" aria-label="Admin navigation">
      {navigation.map((section, index) => (
        <div key={index} className={section.group ? 'mt-3' : index > 0 ? 'mt-3' : ''}>
          {section.group && <p className="mb-1 px-3 text-[11px] font-bold uppercase tracking-[.16em] text-[#6f8aa3]">{section.group}</p>}
          {section.items.map((item) => <button key={item.label} type="button" onClick={() => select(item.label)} aria-current={active === item.label ? 'page' : undefined} className={`flex w-full items-center gap-3 rounded-xl px-3 py-[7px] text-left text-[15px] font-semibold transition ${active === item.label ? 'bg-[#304457] text-white' : 'text-[#c6d7e6] hover:bg-white/10 hover:text-white'}`}><AdminIcon name={item.icon} size={21} className={active === item.label ? 'text-[#9bc4e5]' : 'text-[#7f9ab2]'} /><span className="flex-1">{item.label}</span></button>)}
        </div>
      ))}
    </nav>
  );
}
function OverviewView({ overview, select }: { overview: Overview; select: (page: AdminPage) => void }) { const max = Math.max(...overview.daily.map((day) => day.value), 1); return <><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Registered" value={overview.registered} detail="Verified accounts" /><Metric label="Onsite" value={overview.onsite} detail="Physical attendance" /><Metric label="Online" value={overview.online} detail="Livestream access" /><Metric label="Awaiting approval" value={overview.awaiting_approval} detail="Needs review" alert /></div><div className="mt-6 grid gap-4 xl:grid-cols-[1.45fr_1fr]"><section className="rounded-[1.4rem] border border-ink/10 bg-white p-6 shadow-sm"><div className="flex items-center justify-between"><h2 className="font-display text-3xl uppercase">Registrations · last 14 days</h2><span className="text-xs font-bold text-ink/45">Live data</span></div><div className="mt-7 flex h-64 items-end gap-2 border-b border-ink/10 sm:gap-3">{overview.daily.map((day, index) => <div key={day.label + index} className="flex h-full flex-1 flex-col items-center justify-end gap-2"><div className={`w-full rounded-t-lg ${index === overview.daily.length - 1 ? 'bg-[#b52e28]' : 'bg-[#b9d5ec]'}`} style={{ height: Math.max(4, (day.value / max) * 90) + '%' }} /><span className="text-xs font-semibold text-ink/45">{day.label}</span></div>)}</div></section><section className="rounded-[1.4rem] border border-ink/10 bg-white p-6 shadow-sm"><h2 className="font-display text-3xl uppercase">Capacity</h2><div className="mt-5 h-3 overflow-hidden rounded-full bg-[#e3e6eb]"><div className="h-full bg-[#1469a9]" style={{ width: Math.min(100, overview.onsite / 25) + '%' }} /></div><div className="mt-6 grid gap-4">{overview.capacity.map((item) => <div key={item.label} className="flex items-center justify-between text-sm font-semibold"><span>{item.label}</span><strong>{item.value}</strong></div>)}</div></section></div><div className="mt-6 grid gap-4 md:grid-cols-3"><ActionPanel title="Approvals" value={overview.awaiting_approval} action="Review queue" onClick={() => select('Approvals')} /><ActionPanel title="Testimonies" value="Review" action="Open testimonies" onClick={() => select('Testimonies')} /><ActionPanel title="Broadcasts" value="Manage" action="Create update" onClick={() => select('Broadcasts')} /></div></>; }
function Metric({ label, value, detail, alert = false }: { label: string; value: number; detail: string; alert?: boolean }) { return <article className="rounded-[1.25rem] border border-ink/10 bg-white p-6 shadow-sm"><p className="text-sm font-semibold text-ink/60">{label}</p><strong className="mt-2 block font-display text-5xl">{value.toLocaleString()}</strong><p className={`mt-3 text-sm font-bold ${alert ? 'text-coral' : 'text-[#34865e]'}`}>{detail}</p></article>; }
function ActionPanel({ title, value, action, onClick }: { title: string; value: number | string; action: string; onClick: () => void }) { return <article className="rounded-[1.25rem] border border-ink/10 bg-white p-5 shadow-sm"><p className="text-sm font-semibold text-ink/55">{title}</p><strong className="mt-1 block font-display text-4xl">{value}</strong><button type="button" onClick={onClick} className="mt-5 text-sm font-bold text-[#1469a9]">{action} →</button></article>; }
