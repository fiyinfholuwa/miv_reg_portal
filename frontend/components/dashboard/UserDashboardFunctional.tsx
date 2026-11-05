'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import RegistrationModal from '../conference/RegistrationModal';
import { AccountUser, EventRegistration, MivEvent, PRIMARY_EVENT_SLUG, apiRequest, clearSession, fetchAccount, fetchMyRegistrations, fetchPhotoUrl, readSession } from '../../lib/events';
import EventWorkspace, { EventTab, tabFromSlug } from './EventWorkspace';
import { OrderHistory, Profile } from './AccountPanels';
import { AccountMenu, EventSwitcher, Icon } from './DashboardChrome';
import { Countdown, api } from './ui';
import Code128Barcode from '../shop/Code128Barcode';

type Route =
  | { kind: 'home' }
  | { kind: 'event'; slug: string; tabSlug?: string }
  | { kind: 'store' | 'order-history' | 'profile' }
  | { kind: 'legacy'; tabSlug: string };

/** Old single-conference URLs now live under the IMLC workspace. */
const LEGACY_TABS: Record<string, string> = { programme: 'programme', pass: '', live: 'live', testimonials: 'testimonials', 'attending-card': 'attending-card', team: 'team', 'publicity-kit': 'publicity-kit', 'hotels-travel': 'hotels-travel' };

function parseRoute(pathname: string): Route {
  const [, , section, slug, tab] = pathname.split('/');
  if (!section) return { kind: 'home' };
  if (section === 'events' && slug) return { kind: 'event', slug, tabSlug: tab };
  if (section === 'store' || section === 'order-history' || section === 'profile') return { kind: section };
  if (section in LEGACY_TABS) return { kind: 'legacy', tabSlug: LEGACY_TABS[section] };
  return { kind: 'home' };
}

const ACCOUNT_TITLES: Record<'profile' | 'order-history', string> = { profile: 'Profile', 'order-history': 'Order history' };

export default function UserDashboardFunctional() {
  const pathname = usePathname();
  const router = useRouter();
  const route = parseRoute(pathname);
  const [profile, setProfile] = useState<AccountUser | null>(null);
  const [registrations, setRegistrations] = useState<EventRegistration[]>([]);
  const [catalog, setCatalog] = useState<MivEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [welcome, setWelcome] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const content = useRef<HTMLDivElement>(null);

  const reload = useCallback(async () => {
    const [account, events] = await Promise.all([fetchAccount(), fetchMyRegistrations()]);
    setProfile(account);
    setRegistrations(events);
    return events;
  }, []);

  useEffect(() => {
    if (!readSession()) {
      window.location.assign('/');
      return;
    }
    void reload().catch(() => { clearSession(); window.location.assign('/'); }).finally(() => setLoading(false));
    void apiRequest<{ events: MivEvent[] }>('/events').then((data) => setCatalog(data.events)).catch(() => undefined);
  }, [reload]);

  useEffect(() => {
    setWelcome(new URLSearchParams(window.location.search).get('welcome') === '1');
    content.current?.scrollTo({ top: 0 });
  }, [pathname]);

  const hasPhoto = profile?.has_photo ?? false;
  useEffect(() => { if (hasPhoto) void fetchPhotoUrl().then(setPhotoUrl); }, [hasPhoto]);

  // The shop lives on its own page now; old /dashboard/store links go there.
  useEffect(() => { if (route.kind === 'store') window.location.assign('/shop'); }, [route.kind]);

  const go = useCallback((href: string) => {
    setWelcome(false);
    router.push(href);
  }, [router]);

  const activeSlug = route.kind === 'event' ? route.slug : null;
  const activeRegistration = registrations.find((registration) => registration.event.slug === activeSlug) ?? null;

  // A registration made from the modal on this page lands on a slug we haven't loaded yet.
  useEffect(() => {
    if (loading || !activeSlug || activeRegistration) return;
    void reload().catch(() => undefined);
  }, [loading, activeSlug, activeRegistration, reload]);

  const legacyTab = route.kind === 'legacy' ? route.tabSlug : null;
  useEffect(() => {
    if (loading || legacyTab === null) return;
    const hasImlc = registrations.some((registration) => registration.event.slug === PRIMARY_EVENT_SLUG);
    router.replace(hasImlc ? `/dashboard/events/${PRIMARY_EVENT_SLUG}${legacyTab ? `/${legacyTab}` : ''}` : '/dashboard');
  }, [loading, legacyTab, registrations, router]);

  const joinable = useMemo(() => catalog.filter((event) => event.registration_open && !registrations.some((registration) => registration.event.slug === event.slug)), [catalog, registrations]);

  const logout = async () => {
    await api('/auth/logout', { method: 'POST' }).catch(() => undefined);
    clearSession();
    window.location.assign('/');
  };

  if (loading || !profile || route.kind === 'store') {
    return <main className="grid h-dvh place-items-center bg-[#f6f2e9]"><div className="flex flex-col items-center gap-3"><img src="/images/miv-logo.png" alt="" className="h-12 w-12 animate-pulse object-contain" /><span className="text-sm font-bold text-[#0b4779]">{route.kind === 'store' ? 'Opening the shop…' : 'Loading your dashboard…'}</span></div></main>;
  }

  const activeTab: EventTab | null = activeRegistration ? tabFromSlug(activeRegistration.event, route.kind === 'event' ? route.tabSlug : undefined) : null;
  const firstName = profile.name.split(' ')[0];
  const initials = profile.name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();
  const title = route.kind === 'home' ? `Hello, ${firstName}` : route.kind === 'event' ? (activeRegistration?.event.short_name ?? 'Event') : route.kind === 'profile' || route.kind === 'order-history' ? ACCOUNT_TITLES[route.kind] : '';
  const subtitle = route.kind === 'home' ? `${registrations.length} event${registrations.length === 1 ? '' : 's'} registered` : route.kind === 'event' ? activeRegistration?.event.date_label : route.kind === 'order-history' ? 'Your shop orders and pickup codes' : 'Your details and attending-card photo';

  const sideLink = (active: boolean) => `flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold transition ${active ? 'bg-[#e7f1fa] text-[#0b4779]' : 'text-ink/70 hover:bg-ink/5 hover:text-ink'}`;
  const tabs: { key: string; label: string; icon: Parameters<typeof Icon>[0]['name']; href: string; active: boolean; external?: boolean }[] = [
    { key: 'home', label: 'Home', icon: 'home', href: '/dashboard', active: route.kind === 'home' || route.kind === 'event' },
    { key: 'find', label: 'Discover', icon: 'search', href: '/events', active: false, external: true },
    { key: 'shop', label: 'Shop', icon: 'bag', href: '/shop', active: false, external: true },
    { key: 'orders', label: 'Orders', icon: 'receipt', href: '/dashboard/order-history', active: route.kind === 'order-history' },
    { key: 'profile', label: 'Profile', icon: 'user', href: '/dashboard/profile', active: route.kind === 'profile' },
  ];

  return (
    <main className="flex h-dvh overflow-hidden bg-[#f6f2e9] text-ink">
      <RegistrationModal />

      {/* Desktop sidebar: fixed height, never scrolls. */}
      <aside className="hidden h-full w-[264px] shrink-0 flex-col border-r border-ink/10 bg-white px-4 py-5 lg:flex">
        <Logo />
        <nav className="mt-8 flex flex-col gap-1" aria-label="Dashboard navigation">
          <button type="button" onClick={() => go('/dashboard')} className={sideLink(route.kind === 'home')}><Icon name="home" className="text-[#1469a9]" />Home</button>
          {registrations.length > 0 && (
            <div className="mt-3">
              <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-[.14em] text-ink/40">Current event</p>
              <EventSwitcher registrations={registrations} activeSlug={activeSlug} go={go} />
            </div>
          )}
          <a href="/events" className={`${sideLink(false)} mt-2 text-[#1469a9]`}><Icon name="search" />Find more events</a>

          <p className="mb-1 mt-6 px-3 text-[11px] font-bold uppercase tracking-[.14em] text-ink/40">Account</p>
          <button type="button" onClick={() => go('/dashboard/profile')} className={sideLink(route.kind === 'profile')}><Icon name="user" className="text-[#1469a9]" />Profile</button>
          <a href="/shop" className={sideLink(false)}><Icon name="bag" className="text-[#1469a9]" /><span className="flex-1">Shop</span><Icon name="external" size={14} className="text-ink/35" /></a>
          <button type="button" onClick={() => go('/dashboard/order-history')} className={sideLink(route.kind === 'order-history')}><Icon name="receipt" className="text-[#1469a9]" />Order history</button>
        </nav>
        <div className="mt-auto flex items-center gap-3 rounded-2xl bg-[#f5ecd9] p-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-[#e2edf6] text-sm font-bold text-[#1469a9]">{photoUrl ? <img src={photoUrl} alt="" className="h-full w-full object-cover" /> : initials}</span>
          <div className="min-w-0 flex-1"><strong className="block truncate text-sm">{profile.name}</strong><span className="block truncate text-xs text-ink/50">{profile.role || 'Delegate'}</span></div>
          <button type="button" onClick={() => void logout()} className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-ink/55 transition hover:bg-white hover:text-coral" aria-label="Log out" title="Log out"><Icon name="logout" size={18} /></button>
        </div>
      </aside>

      <div className="flex h-full min-w-0 flex-1 flex-col">
        {/* Top bar: fixed, never scrolls. */}
        <header className="z-30 flex shrink-0 items-center gap-3 border-b border-ink/10 bg-white/95 px-4 py-3 backdrop-blur sm:px-6 lg:px-8 lg:py-4">
          <a href="/" className="shrink-0 lg:hidden" aria-label="MIV home"><img src="/images/miv-logo.png" alt="MIV" className="h-9 w-9 object-contain" /></a>
          {route.kind === 'event' && registrations.length > 0 ? (
            <div className="min-w-0 flex-1 lg:hidden"><EventSwitcher registrations={registrations} activeSlug={activeSlug} go={go} compact /></div>
          ) : (
            <div className="min-w-0 flex-1 lg:hidden"><strong className="block truncate text-base leading-tight">{title}</strong>{subtitle && <span className="block truncate text-xs text-ink/50">{subtitle}</span>}</div>
          )}
          <div className="hidden min-w-0 flex-1 lg:block"><h1 className="truncate text-2xl font-bold leading-tight text-[#0b2c4a]">{title}</h1>{subtitle && <p className="truncate text-sm text-ink/50">{subtitle}</p>}</div>
          {route.kind === 'home' && joinable.length > 0 && <button type="button" onClick={() => document.getElementById('join')?.scrollIntoView({ behavior: 'smooth' })} className="hidden shrink-0 rounded-full border border-ink/15 px-4 py-2 text-xs font-bold text-[#0b4779] transition hover:border-[#1469a9] sm:inline-flex">Join another event</button>}
          <AccountMenu name={profile.name} initials={initials} photoUrl={photoUrl} onProfile={() => go('/dashboard/profile')} onLogout={() => void logout()} />
        </header>

        {/* Only this area scrolls. */}
        <div ref={content} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <section className="w-full px-4 py-5 sm:px-6 sm:py-7 lg:px-8 lg:py-8 2xl:px-10">
            {route.kind === 'home' && <MyEvents registrations={registrations} joinable={joinable} go={go} />}
            {route.kind === 'event' && activeRegistration && activeTab && <EventWorkspace registration={activeRegistration} profile={profile} tab={activeTab} welcome={welcome} go={go} onRegistrationChange={(updated) => setRegistrations((current) => current.map((item) => item.id === updated.id ? updated : item))} onPhotoSaved={() => setProfile((current) => current ? { ...current, has_photo: true } : current)} />}
            {route.kind === 'event' && activeRegistration && !activeTab && <NotFound text="That section isn’t available for this event." action={() => go(`/dashboard/events/${activeRegistration.event.slug}`)} actionLabel="Back to event" />}
            {route.kind === 'event' && !activeRegistration && <NotRegistered slug={route.slug} event={catalog.find((event) => event.slug === route.slug)} />}
            {route.kind === 'profile' && <Profile profile={profile} onSaved={setProfile} onLogout={() => void logout()} />}
            {route.kind === 'order-history' && <OrderHistory />}
          </section>
        </div>

        {/* Phone tab bar: fixed at the bottom. */}
        <nav className="grid shrink-0 grid-cols-5 border-t border-ink/10 bg-white px-1 pb-[max(env(safe-area-inset-bottom),6px)] pt-1.5 lg:hidden" aria-label="Dashboard sections">
          {tabs.map((tab) => {
            const className = `flex flex-col items-center gap-0.5 rounded-xl py-1.5 text-[11px] font-bold transition ${tab.active ? 'text-[#0b4779]' : 'text-ink/50'}`;
            const inner = <><span className={`grid h-7 w-12 place-items-center rounded-full transition ${tab.active ? 'bg-[#e7f1fa]' : ''}`}><Icon name={tab.icon} size={20} /></span>{tab.label}</>;
            return tab.external
              ? <a key={tab.key} href={tab.href} className={className}>{inner}</a>
              : <button key={tab.key} type="button" onClick={() => go(tab.href)} aria-current={tab.active ? 'page' : undefined} className={className}>{inner}</button>;
          })}
        </nav>
      </div>
    </main>
  );
}

function openRegistration(slug: string) {
  window.dispatchEvent(new CustomEvent('open-registration-modal', { detail: { event: slug } }));
}

type Announcement = { id: number; title: string; body: string; scheduled_at: string | null; created_at: string | null };

/** Admin broadcasts, newest first. Collapsed to the latest two. */
function Announcements() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [expanded, setExpanded] = useState(false);
  useEffect(() => { void api('/auth/broadcasts').then((data) => setItems(data.broadcasts ?? [])).catch(() => undefined); }, []);
  if (items.length === 0) return null;
  const shown = expanded ? items : items.slice(0, 2);
  return (
    <section className="rounded-[1.5rem] border border-ink/10 bg-white p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-[.12em] text-ink/45"><span className="h-2 w-2 rounded-full bg-coral" />Announcements</h2>
        {items.length > 2 && <button type="button" onClick={() => setExpanded((value) => !value)} className="text-xs font-bold text-[#1469a9]">{expanded ? 'Show less' : `View all ${items.length}`}</button>}
      </div>
      <ul className="m-0 mt-3 grid list-none gap-2 p-0 lg:grid-cols-2">
        {shown.map((item) => (
          <li key={item.id} className="rounded-xl bg-[#f6f2e9] p-3.5">
            <div className="flex items-baseline justify-between gap-3"><strong className="text-sm">{item.title}</strong><span className="shrink-0 text-[11px] text-ink/45">{new Date(item.scheduled_at ?? item.created_at ?? Date.now()).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}</span></div>
            <p className={`mt-1 whitespace-pre-line text-sm leading-6 text-ink/70 ${expanded ? '' : 'line-clamp-3'}`}>{item.body}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function MyEvents({ registrations, joinable, go }: { registrations: EventRegistration[]; joinable: MivEvent[]; go: (href: string) => void }) {
  const next = registrations.find((registration) => registration.event.starts_at && new Date(registration.event.ends_at ?? registration.event.starts_at).getTime() > Date.now());
  return (
    <div className="grid gap-7">
      <Announcements />
      {next?.event.starts_at && (
        <section className="relative overflow-hidden rounded-[1.5rem] bg-[#03284a] p-5 text-white sm:p-7">
          {next.event.image && <img src={next.event.image} alt="" className="absolute inset-0 h-full w-full object-cover opacity-25" />}
          <div className="absolute inset-0 bg-gradient-to-r from-[#001428] via-[#001428]/85 to-[#001428]/40" />
          <div className="relative flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[.16em] text-[#9bc4e5]">Next up · {next.event.date_label}</p>
              <h2 className="mt-1.5 text-xl font-bold leading-tight sm:text-2xl">{next.event.title}</h2>
              <div className="mt-4"><Countdown startsAt={next.event.starts_at} compact /></div>
            </div>
            <button type="button" onClick={() => go(`/dashboard/events/${next.event.slug}`)} className="w-full shrink-0 rounded-full bg-white px-5 py-3 text-sm font-bold text-[#03284a] transition hover:bg-[#fffaf0] md:w-auto">Open my pass →</button>
          </div>
        </section>
      )}

      {registrations.length === 0
        ? <section className="rounded-[1.5rem] border border-ink/10 bg-white p-6 sm:p-9"><p className="eyebrow">No events yet</p><h2 className="mt-3 font-display text-4xl uppercase leading-none text-[#0b2c4a]">Find your next gathering</h2><p className="mt-4 leading-7 text-ink/60">Pick an event below. Your ticket, programme and attending card will appear here.</p></section>
        : (
          <section>
            <h2 className="mb-3 text-sm font-bold uppercase tracking-[.12em] text-ink/45">My events</h2>
            <div className="grid gap-3 sm:gap-4 md:grid-cols-2 2xl:grid-cols-3">{registrations.map((registration) => <EventCard key={registration.id} registration={registration} go={go} />)}</div>
          </section>
        )}

      {joinable.length > 0 && (
        <section id="join" className="scroll-mt-4">
          <h2 className="text-sm font-bold uppercase tracking-[.12em] text-ink/45">Join another event</h2>
          <p className="mt-1 text-sm text-ink/55">Your details are already saved. Registering takes a few seconds.</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {joinable.map((event) => <article key={event.slug} className="flex items-center gap-3 rounded-2xl border border-ink/10 bg-white p-2.5"><div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-[#03284a]">{event.image && <img src={event.image} alt="" className="h-full w-full object-cover" />}</div><div className="min-w-0 flex-1"><span className="block text-xs font-semibold text-ink/50">{event.date_label}</span><strong className="line-clamp-2 text-sm leading-snug">{event.title}</strong></div><button type="button" onClick={() => openRegistration(event.slug)} className="shrink-0 rounded-full bg-coral px-4 py-2 text-xs font-bold text-white">Register</button></article>)}
          </div>
        </section>
      )}
    </div>
  );
}

function EventCard({ registration, go }: { registration: EventRegistration; go: (href: string) => void }) {
  const { event } = registration;
  return (
    <article className="flex overflow-hidden rounded-[1.25rem] border border-ink/10 bg-white sm:flex-col">
      <button type="button" onClick={() => go(`/dashboard/events/${event.slug}`)} className="relative w-28 shrink-0 bg-[#03284a] sm:h-36 sm:w-full" aria-label={`Open ${event.short_name}`}>
        {event.image && <img src={event.image} alt="" className="absolute inset-0 h-full w-full object-cover" />}
        <span className="absolute left-2 top-2 hidden rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-ink sm:inline-block">{event.date_label}</span>
      </button>
      <div className="flex min-w-0 flex-1 flex-col p-3.5 sm:p-5">
        <span className="text-xs font-semibold text-ink/50 sm:hidden">{event.date_label}</span>
        <h3 className="line-clamp-2 text-[15px] font-bold leading-snug sm:text-lg">{event.title}</h3>
        <p className="mt-0.5 truncate text-xs text-ink/55 sm:text-sm">{[event.location, registration.attendance_mode].filter(Boolean).join(' · ') || 'Details coming soon'}</p>
        <div className="mt-3 rounded-xl bg-[#f6f2e9] p-2 sm:mt-4 sm:p-3">
          <div className="hidden overflow-hidden rounded-md sm:block"><Code128Barcode value={registration.ticket_code} height={44} /></div>
          <span className="block text-[10px] font-bold uppercase tracking-[.12em] text-ink/45 sm:mt-2">Ticket</span><strong className="block truncate font-mono text-sm font-bold tracking-[.1em] text-[#0b2c4a] sm:text-base">{registration.ticket_code}</strong>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 sm:mt-4">
          <button type="button" onClick={() => go(`/dashboard/events/${event.slug}`)} className="rounded-full bg-[#1469a9] px-4 py-2 text-xs font-bold text-white">Manage</button>
          <button type="button" onClick={() => go(`/dashboard/events/${event.slug}/attending-card`)} className="rounded-full border border-ink/15 px-4 py-2 text-xs font-bold text-[#0b4779]">Attending card</button>
        </div>
      </div>
    </article>
  );
}

function NotRegistered({ slug, event }: { slug: string; event?: MivEvent }) {
  return <section className="max-w-2xl rounded-[1.5rem] border border-ink/10 bg-white p-6 sm:p-10"><h2 className="font-display text-4xl uppercase leading-none text-[#0b2c4a]">{event ? event.title : 'Event not found'}</h2><p className="mt-4 leading-7 text-ink/60">{event ? 'You aren’t registered for this event yet.' : 'We couldn’t find this event.'}</p>{event?.registration_open && <button type="button" onClick={() => openRegistration(slug)} className="mt-7 rounded-full bg-coral px-6 py-3 text-sm font-bold text-white">Register now</button>}</section>;
}

function NotFound({ text, action, actionLabel }: { text: string; action: () => void; actionLabel: string }) {
  return <section className="max-w-2xl rounded-[1.75rem] border border-ink/10 bg-white p-7 shadow-sm"><p className="text-ink/60">{text}</p><button type="button" onClick={action} className="mt-5 rounded-full bg-[#1469a9] px-5 py-2.5 text-sm font-bold text-white">{actionLabel}</button></section>;
}


function Logo() {
  return <a href="/" className="flex items-center gap-3 px-1"><img src="/images/miv-logo.png" alt="MIV" className="h-10 w-10 rounded-full object-contain" /><span className="font-display text-xl uppercase leading-none tracking-wide text-[#0b2c4a]">MIV Events</span></a>;
}
