'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import AttendingCardStudio from '../attending/AttendingCardStudio';
import { AccountUser, EventRegistration, Hotel, MivEvent, eventPageUrl, needsAttendanceStep, registerForEvent } from '../../lib/events';
import { SessionState, dayLabel, defaultDayIndex, formatTime, lagosNow, sessionStart, sessionStates } from '../../lib/programme';
import Code128Barcode from '../shop/Code128Barcode';
import { Countdown, api } from './ui';
import { errorMessage, toast } from '../../lib/toast';
import { Icon } from './DashboardChrome';

export type EventTab = 'pass' | 'programme' | 'live' | 'attending-card' | 'team' | 'publicity-kit' | 'testimonials' | 'hotels-travel';

type IconName = Parameters<typeof Icon>[0]['name'];

const TABS: { tab: EventTab; label: string; icon: IconName; description: string; slug: string }[] = [
  { tab: 'pass', label: 'My pass', icon: 'ticket', description: 'Ticket to show at the desk', slug: '' },
  { tab: 'programme', label: 'Programme', icon: 'list', description: 'Sessions and times', slug: 'programme' },
  { tab: 'live', label: 'Live', icon: 'play', description: 'Watch online', slug: 'live' },
  { tab: 'attending-card', label: 'Attending card', icon: 'badge', description: 'Your photo card to share', slug: 'attending-card' },
  { tab: 'team', label: 'My team', icon: 'users', description: 'Invite people with your code', slug: 'team' },
  { tab: 'publicity-kit', label: 'Publicity kit', icon: 'megaphone', description: 'Flyers and captions', slug: 'publicity-kit' },
  { tab: 'testimonials', label: 'Testimonials', icon: 'heart', description: 'Share what God did', slug: 'testimonials' },
  { tab: 'hotels-travel', label: 'Hotels & travel', icon: 'bed', description: 'Places to stay nearby', slug: 'hotels-travel' },
];

/** Shown directly in the phone tab bar; the rest sit behind "More". */
const PRIMARY_TABS: EventTab[] = ['pass', 'programme', 'live'];

export function eventTabs(event: MivEvent) {
  return TABS.filter((item) => item.tab !== 'hotels-travel' || event.offers_accommodation);
}

export function tabFromSlug(event: MivEvent, slug: string | undefined): EventTab | null {
  const match = eventTabs(event).find((item) => item.slug === (slug ?? ''));
  return match ? match.tab : null;
}

export function eventTabHref(event: MivEvent, tab: EventTab) {
  const slug = TABS.find((item) => item.tab === tab)?.slug ?? '';
  return `/dashboard/events/${event.slug}${slug ? `/${slug}` : ''}`;
}

type Props = {
  registration: EventRegistration;
  profile: AccountUser;
  tab: EventTab;
  welcome: boolean;
  go: (href: string) => void;
  onRegistrationChange: (registration: EventRegistration) => void;
  onPhotoSaved: () => void;
};

export default function EventWorkspace({ registration, profile, tab, welcome, go, onRegistrationChange, onPhotoSaved }: Props) {
  const { event } = registration;

  useEffect(() => {
    if (welcome) toast.success(`Add your photo to your attending card and share it.`, { title: `You’re registered for ${event.short_name}` });
  }, [welcome, event.short_name]);

  return (
    <div>
      <header className="relative overflow-hidden rounded-[1.5rem] bg-[#03284a] text-white">
        {event.image && <img src={event.image} alt="" className="absolute inset-0 h-full w-full object-cover opacity-35" />}
        <div className="absolute inset-0 bg-gradient-to-r from-[#001428] via-[#001428]/80 to-transparent" />
        <div className="relative flex flex-col gap-4 p-5 sm:flex-row sm:items-end sm:justify-between sm:p-7">
          <div className="min-w-0 max-w-2xl">
            <h2 className="text-xl font-bold leading-tight sm:text-3xl">{event.title}</h2>
            <p className="mt-2 text-sm text-[#dbe9f8]">{[event.date_label, registration.attendance_mode, daysLabel(registration)].filter(Boolean).join(' · ')}</p>
          </div>
          <div className="w-fit shrink-0 rounded-2xl bg-white/10 px-4 py-2.5 backdrop-blur"><span className="block text-[10px] font-bold uppercase tracking-[.14em] text-[#9bc4e5]">Ticket</span><strong className="font-display text-xl tracking-wide sm:text-2xl">{registration.ticket_code}</strong></div>
        </div>
      </header>

      <SectionNav event={event} tab={tab} go={go} />

      {tab === 'pass' && <PassPanel registration={registration} profile={profile} go={go} onRegistrationChange={onRegistrationChange} />}
      {tab === 'programme' && <ProgrammePanel event={event} />}
      {tab === 'live' && <LivePanel event={event} />}
      {tab === 'attending-card' && <section className="rounded-[1.75rem] bg-white p-5 shadow-sm sm:p-8"><p className="eyebrow">Share the invite</p><h2 className="mb-6 mt-2 font-display text-4xl uppercase text-[#03284a]">I will be attending</h2><AttendingCardStudio event={event} name={profile.name} hasSavedPhoto={profile.has_photo} onPhotoSaved={onPhotoSaved} /></section>}
      {tab === 'team' && <TeamPanel registration={registration} />}
      {tab === 'publicity-kit' && <PublicityPanel event={event} go={go} />}
      {tab === 'testimonials' && <TestimonialsPanel event={event} />}
      {tab === 'hotels-travel' && <HotelsPanel event={event} />}
    </div>
  );
}

/** "All days", "1 day" or "3 days" instead of listing every chosen day. */
function daysLabel(registration: EventRegistration) {
  const chosen = registration.attendance_days.length;
  if (!chosen) return null;
  const offered = registration.event.day_options.length;
  return offered > 1 && chosen >= offered ? 'All days' : `${chosen} day${chosen === 1 ? '' : 's'}`;
}

/**
 * Event section navigation. Desktop shows every section in one row; phones
 * show the three main ones plus a labelled "More" button that opens a sheet
 * listing every section with a short description.
 */
function SectionNav({ event, tab, go }: { event: MivEvent; tab: EventTab; go: (href: string) => void }) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const sections = eventTabs(event);
  const primary = sections.filter((item) => PRIMARY_TABS.includes(item.tab));
  const extra = sections.filter((item) => !PRIMARY_TABS.includes(item.tab));
  const activeExtra = extra.find((item) => item.tab === tab);

  useEffect(() => {
    if (!sheetOpen) return;
    const onKey = (keyEvent: KeyboardEvent) => { if (keyEvent.key === 'Escape') setSheetOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sheetOpen]);

  const open = (next: EventTab) => { setSheetOpen(false); go(eventTabHref(event, next)); };
  const pill = (active: boolean) => `flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 sm:px-3.5 text-xs font-bold transition sm:text-sm ${active ? 'bg-[#03284a] text-white shadow-sm' : 'bg-white text-ink/70 ring-1 ring-ink/10 hover:text-ink'}`;

  return (
    <>
      <nav className="sticky top-0 z-20 -mx-4 mb-5 bg-[#f6f2e9]/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 2xl:-mx-10 2xl:px-10" aria-label={`${event.short_name} sections`}>
        {/* Phones and tablets */}
        <div className="flex items-center gap-1.5 lg:hidden">
          {primary.map((item) => <button key={item.tab} type="button" onClick={() => open(item.tab)} aria-current={tab === item.tab ? 'page' : undefined} className={pill(tab === item.tab)}><Icon name={item.icon} size={16} className="hidden min-[400px]:block" />{item.label}</button>)}
          {extra.length > 0 && (
            <button type="button" onClick={() => setSheetOpen(true)} aria-haspopup="dialog" aria-expanded={sheetOpen} className={`${pill(Boolean(activeExtra))} ml-auto`}>
              {activeExtra ? <><Icon name={activeExtra.icon} size={16} /><span className="max-w-[88px] truncate">{activeExtra.label}</span></> : <><Icon name="grid" size={16} />More</>}
              <span className={`grid h-5 min-w-5 place-items-center rounded-full px-1 text-[10px] ${activeExtra ? 'bg-white/20' : 'bg-[#e7f1fa] text-[#0b4779]'}`}>{activeExtra ? '▾' : `+${extra.length}`}</span>
            </button>
          )}
        </div>
        {/* Desktop: everything visible */}
        <div className="hidden flex-wrap gap-1.5 lg:flex">
          {sections.map((item) => <button key={item.tab} type="button" onClick={() => open(item.tab)} aria-current={tab === item.tab ? 'page' : undefined} className={pill(tab === item.tab)}><Icon name={item.icon} size={16} />{item.label}</button>)}
        </div>
      </nav>

      {sheetOpen && (
        <div className="fixed inset-0 z-[120] flex items-end bg-[#001428]/50 backdrop-blur-[2px] lg:hidden" role="dialog" aria-modal="true" aria-labelledby="sections-title" onMouseDown={(mouseEvent) => { if (mouseEvent.target === mouseEvent.currentTarget) setSheetOpen(false); }}>
          <div className="miv-sheet max-h-[85dvh] w-full overflow-y-auto rounded-t-[1.75rem] bg-white px-4 pb-[max(env(safe-area-inset-bottom),16px)] pt-3">
            <span className="mx-auto block h-1.5 w-10 rounded-full bg-ink/15" aria-hidden="true" />
            <div className="mt-3 flex items-center justify-between">
              <div><h2 id="sections-title" className="text-lg font-bold">{event.short_name}</h2><p className="text-xs text-ink/50">Everything for this event</p></div>
              <button type="button" onClick={() => setSheetOpen(false)} className="grid h-9 w-9 place-items-center rounded-full bg-[#f4f5f7] text-lg" aria-label="Close">×</button>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {sections.map((item) => {
                const active = item.tab === tab;
                return (
                  <button key={item.tab} type="button" onClick={() => open(item.tab)} aria-current={active ? 'page' : undefined} className={`flex flex-col items-start gap-2 rounded-2xl p-3.5 text-left transition ${active ? 'bg-[#03284a] text-white' : 'bg-[#f6f2e9] text-ink active:bg-[#efe6d2]'}`}>
                    <span className={`grid h-9 w-9 place-items-center rounded-xl ${active ? 'bg-white/15' : 'bg-white text-[#1469a9]'}`}><Icon name={item.icon} size={18} /></span>
                    <span><strong className="block text-sm leading-tight">{item.label}</strong><span className={`mt-0.5 block text-xs leading-snug ${active ? 'text-[#bcd6ec]' : 'text-ink/55'}`}>{item.description}</span></span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function PassPanel({ registration, profile, onRegistrationChange }: { registration: EventRegistration; profile: AccountUser; go: (href: string) => void; onRegistrationChange: (registration: EventRegistration) => void }) {
  const { event } = registration;
  const upcoming = event.starts_at && new Date(event.starts_at).getTime() > Date.now();
  const addToCalendar = () => {
    if (!event.starts_at) return;
    const stamp = (value: string) => new Date(value).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const end = event.ends_at ?? new Date(new Date(event.starts_at).getTime() + 3 * 3600 * 1000).toISOString();
    const params = new URLSearchParams({ action: 'TEMPLATE', text: event.title, dates: `${stamp(event.starts_at)}/${stamp(end)}`, location: event.location ?? '' });
    window.open(`https://calendar.google.com/calendar/render?${params.toString()}`, '_blank', 'noopener');
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,480px)_minmax(0,1fr)]">
      <section className="h-fit rounded-[1.75rem] bg-[#03284a] p-5 text-white sm:p-7">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-3xl uppercase">My pass</h2>
          <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[.12em] text-[#9bc4e5]">Admit one</span>
        </div>
        <p className="mt-1 text-xs text-[#9bc4e5]">Show this barcode at the welcome desk.</p>
        <div className="mt-5 overflow-hidden rounded-[1.5rem] bg-white text-ink">
          <div className="border-b border-dashed border-[#d9c99e] p-5"><p className="font-bold leading-tight">{event.short_name}</p><p className="text-xs text-ink/50">{event.date_label}{event.location ? ` · ${event.location}` : ''}</p></div>
          <div className="px-4 pt-5 sm:px-6"><Code128Barcode value={registration.ticket_code} height={110} /></div>
          <p className="pb-5 pt-3 text-center font-mono text-lg font-bold tracking-[.16em] sm:text-xl">{registration.ticket_code}</p>
          <div className="grid grid-cols-3 border-t border-[#e7dcc1] text-xs"><div className="p-4"><span className="block uppercase text-ink/45">Name</span><strong className="mt-1 block break-words">{profile.name}</strong></div><div className="border-x border-[#e7dcc1] p-4"><span className="block uppercase text-ink/45">Type</span><strong className="mt-1 block">{profile.role || 'Delegate'}</strong></div><div className="p-4"><span className="block uppercase text-ink/45">Mode</span><strong className="mt-1 block">{registration.attendance_mode || '—'}</strong></div></div>
        </div>
      </section>
      <div className="grid content-start gap-6">
        {upcoming && event.starts_at && <section className="rounded-[1.75rem] bg-[#001b31] p-6 text-white sm:p-8"><p className="text-xs font-bold uppercase tracking-[.16em] text-[#9bc4e5]">Starts in</p><div className="mt-4"><Countdown startsAt={event.starts_at} compact /></div><button type="button" onClick={addToCalendar} className="mt-6 rounded-md bg-[#fffaf0] px-4 py-2 text-xs font-bold uppercase text-ink">Add to calendar</button></section>}
        {needsAttendanceStep(event) && <AttendanceForm registration={registration} onSaved={onRegistrationChange} />}
      </div>
    </div>
  );
}

function AttendanceForm({ registration, onSaved }: { registration: EventRegistration; onSaved: (registration: EventRegistration) => void }) {
  const { event } = registration;
  const [mode, setMode] = useState(registration.attendance_mode ?? event.attendance_options[0] ?? '');
  const [days, setDays] = useState<string[]>(registration.attendance_days.length ? registration.attendance_days : event.day_options);
  const [accommodation, setAccommodation] = useState(registration.needs_accommodation);
  const [saving, setSaving] = useState(false);

  const save = async (formEvent: FormEvent<HTMLFormElement>) => {
    formEvent.preventDefault();
    setSaving(true);
    try {
      const result = await registerForEvent(event.slug, { attendance_mode: mode || null, attendance_days: event.day_options.length ? days : undefined, needs_accommodation: accommodation });
      onSaved(result.registration);
      toast.success('Your attendance was updated.');
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : 'Could not save.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save} className="rounded-[1.75rem] border border-ink/10 bg-white p-6 shadow-sm sm:p-8">
      <h3 className="font-display text-3xl uppercase text-[#03284a]">Manage attendance</h3>
      {event.attendance_options.length > 1 && <div className="mt-5 flex flex-wrap gap-2">{event.attendance_options.map((option) => <button key={option} type="button" aria-pressed={mode === option} onClick={() => setMode(option)} className={`rounded-full px-4 py-2.5 text-sm font-bold ${mode === option ? 'bg-[#1469a9] text-white' : 'border-2 border-ink/15 text-ink/65'}`}>{option}</button>)}</div>}
      {event.day_options.length > 0 && <><p className="mt-5 text-xs font-bold uppercase tracking-[.12em] text-ink/50">Days</p><div className="mt-2 flex flex-wrap gap-2">{event.day_options.map((day) => <button key={day} type="button" aria-pressed={days.includes(day)} onClick={() => setDays((current) => current.includes(day) ? current.filter((item) => item !== day) : [...current, day])} className={`rounded-full px-4 py-2 text-xs font-bold ${days.includes(day) ? 'bg-ink text-white' : 'border-2 border-ink/15 text-ink/60'}`}>{day}</button>)}</div></>}
      {event.offers_accommodation && !/online/i.test(mode) && <label className="mt-5 flex items-center gap-3 text-sm font-semibold"><input type="checkbox" checked={accommodation} onChange={(changeEvent) => setAccommodation(changeEvent.target.checked)} className="h-5 w-5" /> I need accommodation</label>}
      <button type="submit" disabled={saving} className="mt-6 rounded-full bg-[#1469a9] px-6 py-3 text-sm font-bold text-white disabled:opacity-60">{saving ? 'Saving…' : 'Save changes'}</button>
    </form>
  );
}

const STATE_STYLES: Record<SessionState, { card: string; badge?: string; label?: string }> = {
  past: { card: 'border-ink/10 bg-white/60 opacity-60' },
  now: { card: 'border-[#a82e26] bg-white shadow-[0_10px_30px_rgba(168,46,38,.12)] ring-1 ring-[#a82e26]/20', badge: 'bg-[#a82e26] text-white', label: 'Happening now' },
  next: { card: 'border-[#1469a9] bg-white', badge: 'bg-[#e7f1fa] text-[#0b4779]', label: 'Up next' },
  later: { card: 'border-ink/10 bg-white' },
};

function ProgrammePanel({ event }: { event: MivEvent }) {
  const programme = event.programme;
  const [now, setNow] = useState(() => lagosNow());
  const [dayIndex, setDayIndex] = useState(() => defaultDayIndex(programme));

  // Re-evaluate "now" every minute so the highlight moves through the day.
  useEffect(() => {
    const timer = window.setInterval(() => setNow(lagosNow()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  if (programme.length === 0) return <EmptyState title="Programme coming soon" text={`The ${event.short_name} programme will be published here closer to the date.`} />;

  const day = programme[Math.min(dayIndex, programme.length - 1)];
  const states = sessionStates(day, now);

  return (
    <div className="grid gap-5 xl:grid-cols-[260px_minmax(0,1fr)]">
      <div className="no-scrollbar flex gap-2 overflow-x-auto xl:flex-col xl:overflow-visible" role="tablist" aria-label="Programme days">
        {programme.map((item, index) => {
          const selected = index === dayIndex;
          const isToday = item.date === now.date;
          const isPast = Boolean(item.date && item.date < now.date);
          return (
            <button key={`${item.date}-${item.day}`} type="button" role="tab" aria-selected={selected} onClick={() => setDayIndex(index)} className={`flex shrink-0 items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left transition xl:w-full ${selected ? 'bg-[#03284a] text-white' : 'bg-white text-ink ring-1 ring-ink/10 hover:ring-[#1469a9]/40'} ${isPast && !selected ? 'opacity-60' : ''}`}>
              <span><strong className="block text-sm">{dayLabel(item)}</strong><span className={`block text-xs ${selected ? 'text-[#9bc4e5]' : 'text-ink/50'}`}>{item.sessions.length} session{item.sessions.length === 1 ? '' : 's'}</span></span>
              {isToday && <span className="rounded-full bg-[#a82e26] px-2 py-0.5 text-[10px] font-bold uppercase text-white">Today</span>}
            </button>
          );
        })}
      </div>

      <div>
        {day.sessions.length === 0 && <div className="rounded-2xl bg-white p-7 text-sm text-ink/60">Sessions for this day will be announced soon.</div>}
        <ol className="m-0 grid list-none gap-3 p-0">
          {day.sessions.map((session, index) => {
            const style = STATE_STYLES[states[index]];
            return (
              <li key={`${sessionStart(session)}-${session.title}`} className={`grid grid-cols-[76px_minmax(0,1fr)] gap-3 rounded-2xl border-l-4 p-4 transition sm:grid-cols-[110px_minmax(0,1fr)] sm:gap-5 sm:p-5 ${style.card}`}>
                <div>
                  <strong className="block text-sm font-bold sm:text-base">{formatTime(sessionStart(session))}</strong>
                  {session.end && <span className="block text-xs text-ink/50">to {formatTime(session.end)}</span>}
                </div>
                <div className="min-w-0">
                  {style.label && <span className={`mb-1.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[.08em] ${style.badge}`}>{states[index] === 'now' && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />}{style.label}</span>}
                  <h3 className="text-base font-bold leading-snug sm:text-lg">{session.title}</h3>
                  {session.detail && <p className="mt-0.5 text-sm text-ink/55">{session.detail}</p>}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

/** YouTube video id from watch, youtu.be, live, embed or shorts links. */
function youtubeId(url: string | null) {
  return url?.match(/(?:youtu\.be\/|[?&]v=|\/live\/|\/embed\/|\/shorts\/)([\w-]{11})/)?.[1] ?? null;
}

function LivePanel({ event }: { event: MivEvent }) {
  const videoId = youtubeId(event.stream_url);
  const title = event.stream_title || `${event.short_name} livestream`;

  if (!event.stream_url) {
    return (
      <section className="overflow-hidden rounded-[1.75rem] bg-[#001b31] p-5 text-white sm:p-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-center">
          <div className="relative aspect-video overflow-hidden rounded-2xl bg-[#03284a]">{event.image && <img src={event.image} alt="" className="h-full w-full object-cover opacity-50" />}<span className="absolute left-4 top-4 rounded-full bg-white/15 px-4 py-2 text-xs font-bold uppercase backdrop-blur">Not live yet</span></div>
          <div><h2 className="text-xl font-bold">The stream will appear here</h2><p className="mt-2 text-[#dbe9f8]">Come back when {event.short_name} starts and watch right from your dashboard.</p>{event.starts_at && new Date(event.starts_at).getTime() > Date.now() && <div className="mt-5"><Countdown startsAt={event.starts_at} compact /></div>}</div>
        </div>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-[1.75rem] bg-[#001b31] p-3 text-white sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 px-2 pb-3 pt-1 sm:px-1">
        <div className="flex min-w-0 items-center gap-3">
          {event.stream_live
            ? <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-[#e0352b] px-3 py-1 text-xs font-bold uppercase"><span className="h-2 w-2 animate-pulse rounded-full bg-white" />Live</span>
            : <span className="shrink-0 rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase">Replay</span>}
          <h2 className="truncate text-base font-bold sm:text-lg">{title}</h2>
        </div>
        <a href={event.stream_url} target="_blank" rel="noreferrer" className="text-xs font-bold text-[#9bc4e5] hover:text-white">Open on {videoId ? 'YouTube' : 'stream site'} ↗</a>
      </div>
      {videoId
        ? <div className="aspect-video overflow-hidden rounded-2xl bg-black"><iframe className="h-full w-full" src={`https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1${event.stream_live ? '&autoplay=1&mute=1' : ''}`} title={title} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen /></div>
        : <a href={event.stream_url} target="_blank" rel="noreferrer" className="grid aspect-video place-items-center rounded-2xl bg-[#03284a] text-center"><span><span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-white text-2xl text-[#03284a]">▶</span><span className="mt-3 block text-sm font-bold">Watch the stream</span></span></a>}
    </section>
  );
}

function TeamPanel({ registration }: { registration: EventRegistration }) {
  const [copied, setCopied] = useState(false);
  const code = registration.ticket_code.includes('DLG') ? registration.ticket_code.replace('DLG', 'TEAM') : `TEAM-${registration.ticket_code}`;
  const copy = () => { void navigator.clipboard?.writeText(code); setCopied(true); window.setTimeout(() => setCopied(false), 1600); };
  return <div className="rounded-[1.75rem] bg-[#03284a] p-7 text-white sm:p-10"><p className="eyebrow text-[#ff7565]">{registration.event.short_name} team</p><h2 className="mt-3 font-display text-5xl uppercase">My team</h2><p className="mt-5 max-w-lg leading-7 text-[#dbe9f8]">Share your team code with your church or ministry delegates so the committee can keep everyone together at {registration.event.short_name}.</p><div className="mt-8 rounded-2xl bg-white p-5 text-ink"><p className="text-xs font-bold uppercase tracking-[.12em] text-ink/45">Your team code</p><div className="mt-2 flex items-center justify-between gap-3"><strong className="break-all font-display text-3xl text-[#0b4779] sm:text-4xl">{code}</strong><button type="button" onClick={copy} className="shrink-0 rounded-full bg-[#eaf3fb] px-4 py-2 text-xs font-bold text-[#0b4779]">{copied ? 'Copied' : 'Copy'}</button></div></div></div>;
}

function PublicityPanel({ event, go }: { event: MivEvent; go: (href: string) => void }) {
  const assets = event.publicity.assets;
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selected = assets[selectedIndex];
  const caption = event.publicity.caption;

  const copy = async () => {
    try { await navigator.clipboard.writeText(caption); toast.success('Caption copied.'); } catch { toast.error('Copy is blocked in this browser.'); }
  };

  // Cross-origin images ignore the download attribute, so fetch them first.
  const download = async () => {
    if (!selected) return;
    try {
      const blob = await (await fetch(selected.image)).blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${event.short_name}-${selected.title}`.toLowerCase().replace(/[^a-z0-9]+/g, '-') + (blob.type.includes('png') ? '.png' : '.jpg');
      link.click();
      URL.revokeObjectURL(link.href);
    } catch {
      window.open(selected.image, '_blank', 'noopener');
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
      <div className="grid content-start gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        <button type="button" onClick={() => go(eventTabHref(event, 'attending-card'))} className="grid min-h-[180px] place-items-center rounded-[1.4rem] bg-[#03284a] p-6 text-center text-white"><span><Icon name="badge" size={28} className="mx-auto text-[#9bc4e5]" /><span className="mt-3 block text-lg font-bold">Your attending card</span><span className="mt-1 block text-sm text-[#9bc4e5]">Personalised with your photo →</span></span></button>
        {assets.map((asset, index) => <button key={`${asset.title}-${index}`} type="button" onClick={() => setSelectedIndex(index)} aria-pressed={index === selectedIndex} className={`rounded-[1.4rem] bg-white p-2.5 text-left transition ${index === selectedIndex ? 'ring-2 ring-[#1469a9]' : 'ring-1 ring-ink/10 hover:ring-[#1469a9]/40'}`}><img src={asset.image} alt={asset.title} className="aspect-square w-full rounded-xl bg-[#f6f2e9] object-cover" loading="lazy" /><strong className="mt-3 block px-1 text-sm">{asset.title}</strong></button>)}
        {assets.length === 0 && <div className="rounded-[1.4rem] bg-white p-6 text-sm text-ink/55 sm:col-span-2">Flyers for {event.short_name} will be added here by the media team.</div>}
      </div>
      <aside className="h-fit rounded-[1.5rem] border border-ink/10 bg-white p-5 sm:p-6 xl:sticky xl:top-20">
        {selected && <><h2 className="text-lg font-bold">{selected.title}</h2><img src={selected.image} alt="" className="mt-4 aspect-square w-full rounded-xl bg-[#f6f2e9] object-contain" /></>}
        <p className="mt-4 rounded-xl bg-[#f4f5f7] p-4 text-sm leading-6 text-ink/75">{caption}</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button type="button" onClick={() => void copy()} className="rounded-full bg-[#1469a9] px-4 py-3 text-sm font-bold text-white">Copy caption</button>
          <button type="button" onClick={() => void download()} disabled={!selected} className="rounded-full border border-ink/15 px-4 py-3 text-sm font-bold text-[#0b4779] disabled:opacity-40">Download</button>
        </div>
        <a href={`https://wa.me/?text=${encodeURIComponent(`${caption} ${eventPageUrl(event.slug)}`)}`} target="_blank" rel="noreferrer" className="mt-2 block rounded-full bg-[#dff2e5] px-4 py-3 text-center text-sm font-bold text-[#2f7d4f]">Share on WhatsApp</a>
      </aside>
    </div>
  );
}

type Story = { id: number; name: string; meta: string; tag: string; quote: string; likes: number; status: string; created_at?: string | null };
const TOPICS = ['Healing', 'Ministry', 'Family', 'Provision', 'Salvation', 'Other'];
const MAX_TESTIMONY = 6000;
const STORY_STATUS: Record<string, { label: string; className: string }> = {
  pending: { label: 'Waiting for review', className: 'bg-[#fff4d9] text-[#9a6814]' },
  published: { label: 'Published', className: 'bg-[#dff2e5] text-[#2f7d4f]' },
  rejected: { label: 'Not published', className: 'bg-[#f1f2f4] text-ink/60' },
};

function TestimonialsPanel({ event }: { event: MivEvent }) {
  const [stories, setStories] = useState<Story[]>([]);
  const [mine, setMine] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [topic, setTopic] = useState('Healing');
  const [showName, setShowName] = useState(true);
  const [sending, setSending] = useState(false);

  const load = useCallback(() => api(`/auth/testimonials?event=${encodeURIComponent(event.slug)}`)
    .then((data) => { setStories(data.testimonials ?? []); setMine(data.mine ?? []); })
    .catch((error) => toast.error(errorMessage(error, 'Could not load testimonies.')))
    .finally(() => setLoading(false)), [event.slug]);

  useEffect(() => { void load(); }, [load]);

  const submit = async (formEvent: FormEvent<HTMLFormElement>) => {
    formEvent.preventDefault();
    if (text.trim().length < 10) { toast.warning('Please write at least 10 characters.', { title: 'A little more detail' }); return; }
    setSending(true);
    try {
      await api('/auth/testimonials', { method: 'POST', body: JSON.stringify({ type: 'Write', content: text.trim(), topic, show_name: showName, event: event.slug }) });
      setText('');
      toast.success('The media team will review it before it is published.', { title: 'Testimony received' });
      await load();
    } catch (submitError) {
      toast.error(errorMessage(submitError, 'Could not submit testimony.'));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="grid content-start gap-6">
        {mine.length > 0 && (
          <section>
            <h2 className="mb-2 text-sm font-bold uppercase tracking-[.12em] text-ink/45">Your testimonies</h2>
            <ul className="m-0 grid list-none gap-2 p-0">
              {mine.map((story) => {
                const status = STORY_STATUS[story.status] ?? STORY_STATUS.pending;
                return <li key={story.id} className="rounded-2xl border border-ink/10 bg-white p-4"><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${status.className}`}>{status.label}</span><span className="text-xs text-ink/45">{story.tag}{story.created_at ? ` · ${new Date(story.created_at).toLocaleDateString('en-NG', { dateStyle: 'medium' })}` : ''}</span></div><p className="mt-2 line-clamp-3 text-sm leading-6 text-ink/75">{story.quote}</p></li>;
              })}
            </ul>
          </section>
        )}
        <section>
          <h2 className="mb-2 text-sm font-bold uppercase tracking-[.12em] text-ink/45">From the {event.short_name} family</h2>
          {loading && <div className="h-28 animate-pulse rounded-2xl bg-white" />}
          {!loading && stories.length === 0 && <div className="rounded-2xl bg-white p-7 text-sm text-ink/60">No published testimonies yet. Be the first to share what God did.</div>}
          <div className="grid gap-3 lg:grid-cols-2">
            {stories.map((story) => <article key={story.id} className="rounded-[1.25rem] border border-ink/10 bg-white p-5"><div className="flex items-center gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#eaf3fb] text-xs font-bold text-[#1469a9]">{story.name.slice(0, 2).toUpperCase()}</span><div className="min-w-0"><strong className="block truncate text-sm">{story.name}</strong><span className="block truncate text-xs text-ink/50">{story.meta}</span></div><span className="ml-auto shrink-0 rounded-full bg-[#fff0ee] px-3 py-1 text-xs font-bold text-coral">{story.tag}</span></div><p className="mt-4 leading-7 text-ink/75">{story.quote}</p></article>)}
          </div>
        </section>
      </div>
      <form onSubmit={submit} className="h-fit rounded-[1.5rem] bg-[#03284a] p-5 text-white sm:p-6 xl:sticky xl:top-20">
        <p className="text-xs font-bold uppercase tracking-[.15em] text-[#9bc4e5]">Share your story</p>
        <h2 className="mt-2 text-xl font-bold">What did God do at {event.short_name}?</h2>
        <textarea value={text} onChange={(changeEvent) => setText(changeEvent.target.value.slice(0, MAX_TESTIMONY))} className="mt-4 min-h-36 w-full rounded-xl p-4 text-ink outline-none" placeholder="Tell us what God did..." aria-label="Your testimony" />
        <p className="mt-1 text-right text-[11px] text-[#9bc4e5]">{text.length}/{MAX_TESTIMONY}</p>
        <div className="mt-2 flex flex-wrap gap-2">{TOPICS.map((item) => <button key={item} type="button" aria-pressed={topic === item} onClick={() => setTopic(item)} className={topic === item ? 'rounded-full bg-white px-3 py-1.5 text-xs font-bold text-[#0b4779]' : 'rounded-full border border-white/30 px-3 py-1.5 text-xs font-bold'}>{item}</button>)}</div>
        <label className="mt-4 flex items-center gap-3 text-sm"><input type="checkbox" checked={showName} onChange={(changeEvent) => setShowName(changeEvent.target.checked)} className="h-4 w-4" /> Show my name when published</label>
        <button type="submit" disabled={sending} className="mt-5 w-full rounded-full bg-white px-5 py-3 text-sm font-bold text-[#0b4779] disabled:opacity-60">{sending ? 'Sending…' : 'Send to media team'}</button>
      </form>
    </div>
  );
}

const PRICE_FILTERS = [
  { label: 'All', test: () => true },
  { label: 'Under ₦20k', test: (hotel: Hotel) => hotel.price !== null && hotel.price < 20000 },
  { label: '₦20k–₦35k', test: (hotel: Hotel) => hotel.price !== null && hotel.price >= 20000 && hotel.price <= 35000 },
  { label: 'Over ₦35k', test: (hotel: Hotel) => hotel.price !== null && hotel.price > 35000 },
  { label: 'Conference rate', test: (hotel: Hotel) => hotel.conference_rate },
];

function HotelsPanel({ event }: { event: MivEvent }) {
  const [filter, setFilter] = useState('All');
  const hotels = event.hotels ?? [];
  if (hotels.length === 0) return <EmptyState title="Hotels coming soon" text={`Recommended places to stay for ${event.short_name} will be listed here once confirmed.`} />;
  const filters = PRICE_FILTERS.filter((item) => item.label === 'All' || hotels.some(item.test));
  const shown = hotels.filter(PRICE_FILTERS.find((item) => item.label === filter)?.test ?? (() => true));
  const directions = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location || event.title)}`;

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div>
        <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">{filters.map((item) => <button key={item.label} type="button" aria-pressed={filter === item.label} onClick={() => setFilter(item.label)} className={filter === item.label ? 'shrink-0 rounded-full bg-[#03284a] px-4 py-2 text-xs font-bold text-white' : 'shrink-0 rounded-full bg-white px-4 py-2 text-xs font-bold text-ink/65 ring-1 ring-ink/10'}>{item.label}</button>)}</div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
          {shown.length === 0 && <p className="rounded-2xl bg-white p-6 text-sm text-ink/55 sm:col-span-2">No hotels match this filter.</p>}
          {shown.map((hotel) => (
            <article key={hotel.name} className="flex flex-col rounded-[1.4rem] border border-ink/10 bg-white p-3">
              <div className="relative aspect-[1.5] overflow-hidden rounded-xl bg-[#e7edf3]">
                <img src={hotel.image || '/images/photos/lp-hotel.webp'} alt={hotel.name} className="h-full w-full object-cover" loading="lazy" />
                {hotel.distance && <span className="absolute left-3 top-3 rounded-full bg-white px-3 py-1 text-xs font-bold">{hotel.distance}</span>}
                {hotel.conference_rate && <span className="absolute right-3 top-3 rounded-full bg-[#1469a9] px-3 py-1 text-xs font-bold text-white">Conference rate</span>}
              </div>
              <div className="mt-3 flex items-start justify-between gap-3 px-1">
                <div className="min-w-0"><h3 className="font-bold leading-snug">{hotel.name}</h3>{hotel.area && <p className="mt-0.5 text-sm text-ink/50">{hotel.area}</p>}</div>
                {hotel.price !== null && <strong className="shrink-0 text-right text-[#0b4779]">₦{hotel.price.toLocaleString()}<span className="block text-xs font-normal text-ink/45">per night</span></strong>}
              </div>
              {hotel.notes && <p className="mt-2 px-1 text-sm text-ink/60">{hotel.notes}</p>}
              <div className="mt-auto flex flex-wrap gap-2 px-1 pt-4">
                {hotel.phone && <a href={`tel:${hotel.phone.replace(/\s+/g, '')}`} className="rounded-full bg-[#03284a] px-4 py-2 text-xs font-bold text-white">Call</a>}
                {hotel.phone && <a href={`https://wa.me/${hotel.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hello, I'm attending ${event.short_name} and would like to book a room.`)}`} target="_blank" rel="noreferrer" className="rounded-full bg-[#dff2e5] px-4 py-2 text-xs font-bold text-[#2f7d4f]">WhatsApp</a>}
                {hotel.url && <a href={hotel.url} target="_blank" rel="noreferrer" className="rounded-full border border-ink/15 px-4 py-2 text-xs font-bold text-[#0b4779]">Website ↗</a>}
                <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${hotel.name} ${hotel.area ?? ''}`)}`} target="_blank" rel="noreferrer" className="rounded-full border border-ink/15 px-4 py-2 text-xs font-bold text-[#0b4779]">Map ↗</a>
              </div>
            </article>
          ))}
        </div>
      </div>
      <aside className="h-fit rounded-[1.5rem] bg-[#03284a] p-6 text-white xl:sticky xl:top-20">
        <Icon name="bed" size={28} className="text-[#9bc4e5]" />
        <h2 className="mt-3 text-lg font-bold">Staying near the venue</h2>
        <p className="mt-2 text-sm leading-6 text-[#dbe9f8]">Book directly with the hotel. Mention {event.short_name} to ask for the conference rate where offered.</p>
        {event.location && <p className="mt-4 rounded-xl bg-white/10 p-3 text-sm">{event.location}</p>}
        <a href={directions} target="_blank" rel="noreferrer" className="mt-4 block rounded-full bg-white px-5 py-3 text-center text-sm font-bold text-[#03284a]">Directions to venue ↗</a>
      </aside>
    </div>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return <section className="max-w-2xl rounded-[1.75rem] border border-ink/10 bg-white p-7 shadow-sm sm:p-10"><h2 className="font-display text-4xl uppercase leading-none text-[#0b2c4a]">{title}</h2><p className="mt-4 leading-7 text-ink/60">{text}</p></section>;
}
