'use client';

import { FormEvent, useEffect, useState } from 'react';
import AttendingCardStudio from '../attending/AttendingCardStudio';
import { AccountUser, EventRegistration, MivEvent, PRIMARY_EVENT_SLUG, needsAttendanceStep, registerForEvent } from '../../lib/events';
import { Countdown, Qr, api } from './ui';
import { toast } from '../../lib/toast';
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
      {tab === 'attending-card' && <section className="rounded-[1.75rem] bg-white p-5 shadow-sm sm:p-8"><p className="eyebrow">Share the invite</p><h2 className="mb-6 mt-2 font-display text-4xl uppercase text-[#03284a]">I will be attending</h2><AttendingCardStudio event={event} name={profile.name} church={profile.church} hasSavedPhoto={profile.has_photo} onPhotoSaved={onPhotoSaved} /></section>}
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

function PassPanel({ registration, profile, go, onRegistrationChange }: { registration: EventRegistration; profile: AccountUser; go: (href: string) => void; onRegistrationChange: (registration: EventRegistration) => void }) {
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
      <section className="h-fit rounded-[1.75rem] bg-[#03284a] p-6 text-white sm:p-8">
        <h2 className="font-display text-3xl uppercase">My pass</h2>
        <p className="mt-1 text-xs font-bold uppercase tracking-[.12em] text-[#9bc4e5]">Show this at the welcome desk</p>
        <div className="mt-5 overflow-hidden rounded-[1.5rem] bg-white text-ink">
          <div className="flex items-center justify-between gap-3 border-b border-dashed border-[#d9c99e] p-5"><div><p className="font-bold leading-tight">{event.short_name}</p><p className="text-xs text-ink/50">{event.date_label}{event.location ? ` · ${event.location}` : ''}</p></div><span className="text-xs font-bold text-[#1469a9]">ADMIT ONE</span></div>
          <div className="flex justify-center p-7"><Qr seed={registration.ticket_code} /></div>
          <p className="pb-6 text-center font-display text-2xl tracking-wide">{registration.ticket_code}</p>
          <div className="grid grid-cols-3 border-t border-[#e7dcc1] text-xs"><div className="p-4"><span className="block uppercase text-ink/45">Name</span><strong className="mt-1 block break-words">{profile.name}</strong></div><div className="border-x border-[#e7dcc1] p-4"><span className="block uppercase text-ink/45">Type</span><strong className="mt-1 block">{profile.role || 'Delegate'}</strong></div><div className="p-4"><span className="block uppercase text-ink/45">Mode</span><strong className="mt-1 block">{registration.attendance_mode || '—'}</strong></div></div>
        </div>
      </section>
      <div className="grid content-start gap-6">
        {upcoming && event.starts_at && <section className="rounded-[1.75rem] bg-[#001b31] p-6 text-white sm:p-8"><p className="text-xs font-bold uppercase tracking-[.16em] text-[#9bc4e5]">Starts in</p><div className="mt-4"><Countdown startsAt={event.starts_at} compact /></div><button type="button" onClick={addToCalendar} className="mt-6 rounded-md bg-[#fffaf0] px-4 py-2 text-xs font-bold uppercase text-ink">Add to calendar</button></section>}
        {needsAttendanceStep(event) && <AttendanceForm registration={registration} onSaved={onRegistrationChange} />}
        <section className="grid gap-3 sm:grid-cols-3">
          {[['Attending card', 'attending-card', 'Upload your photo and share'], ['Programme', 'programme', 'Sessions and times'], ['Publicity kit', 'publicity-kit', 'Flyers and captions']].map(([title, slug, detail]) => <button key={slug} type="button" onClick={() => go(`/dashboard/events/${event.slug}/${slug}`)} className="rounded-[1.25rem] border border-ink/10 bg-white p-5 text-left shadow-sm hover:border-[#1469a9]"><strong className="block">{title}</strong><span className="mt-1 block text-sm text-ink/55">{detail}</span></button>)}
        </section>
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

function ProgrammePanel({ event }: { event: MivEvent }) {
  const [day, setDay] = useState(event.programme[0]?.day ?? '');
  const selected = event.programme.find((item) => item.day === day) ?? event.programme[0];
  if (!selected) return <EmptyState title="Programme coming soon" text={`The ${event.short_name} programme will be published here closer to the date. We’ll also send updates by email.`} />;
  return (
    <div>
      {event.programme.length > 1 && <div className="mb-4 flex gap-2 overflow-x-auto pb-2">{event.programme.map((item) => <button key={item.day} type="button" onClick={() => setDay(item.day)} className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold ${item.day === selected.day ? 'bg-ink text-white' : 'bg-white text-ink/55'}`}>{item.day}</button>)}</div>}
      <div className="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm"><p className="text-xs font-bold uppercase text-ink/45">{event.short_name}</p><h2 className="mt-1 font-display text-4xl uppercase">{selected.day}</h2></div>
      <div className="mt-3 grid gap-3">{selected.sessions.map((session) => <article key={`${session.time}-${session.title}`} className="grid grid-cols-[80px_1fr] gap-4 rounded-2xl border-l-4 border-[#1469a9] bg-white p-5 shadow-sm"><strong className="font-display text-xl">{session.time}</strong><div><h3 className="font-display text-2xl uppercase">{session.title}</h3>{session.detail && <p className="mt-1 text-sm text-ink/55">{session.detail}</p>}</div></article>)}</div>
    </div>
  );
}

function LivePanel({ event }: { event: MivEvent }) {
  const youtubeId = event.stream_url?.match(/(?:youtu\.be\/|v=|\/live\/|\/embed\/)([\w-]{11})/)?.[1];
  return (
    <section className="overflow-hidden rounded-[1.75rem] bg-[#001b31] p-5 text-white sm:p-8">
      <h2 className="font-display text-3xl uppercase">Live</h2>
      {event.stream_url ? (
        youtubeId
          ? <div className="mt-6 aspect-video overflow-hidden rounded-2xl"><iframe className="h-full w-full" src={`https://www.youtube.com/embed/${youtubeId}`} title={`${event.title} livestream`} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen /></div>
          : <a href={event.stream_url} target="_blank" rel="noreferrer" className="mt-6 inline-flex rounded-full bg-cream px-6 py-3 text-sm font-bold text-ink">Open the livestream →</a>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-center">
          <div className="relative aspect-video overflow-hidden rounded-2xl bg-[#03284a]">{event.image && <img src={event.image} alt="" className="h-full w-full object-cover opacity-50" />}<span className="absolute left-4 top-4 rounded-full bg-white/15 px-4 py-2 text-xs font-bold uppercase backdrop-blur">Not live yet</span></div>
          <div><p className="text-[#dbe9f8]">The livestream for {event.short_name} will appear here when it starts.</p>{event.starts_at && new Date(event.starts_at).getTime() > Date.now() && <div className="mt-5"><Countdown startsAt={event.starts_at} compact /></div>}</div>
        </div>
      )}
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
  const [selected, setSelected] = useState(assets[0]);
  const [copied, setCopied] = useState(false);
  const caption = event.publicity.caption;
  const copy = () => { void navigator.clipboard?.writeText(caption); setCopied(true); window.setTimeout(() => setCopied(false), 1600); };
  return (
    <div className="grid gap-7 2xl:grid-cols-[minmax(0,1fr)_440px]">
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        <button type="button" onClick={() => go(eventTabHref(event, 'attending-card'))} className="grid place-items-center rounded-[1.4rem] bg-[#03284a] p-6 text-center text-white shadow-sm"><span className="font-display text-3xl uppercase leading-none">Your attending card</span><span className="mt-3 text-sm text-[#9bc4e5]">Personalised with your photo →</span></button>
        {assets.map((asset) => <button key={asset.title} type="button" onClick={() => setSelected(asset)} className={`rounded-[1.4rem] bg-white p-3 text-left shadow-sm ${selected?.title === asset.title ? 'ring-2 ring-[#1469a9]' : ''}`}><img src={asset.image} alt={asset.title} className="aspect-square w-full rounded-xl object-cover" /><strong className="mt-4 block">{asset.title}</strong><span className="mt-1 block text-sm text-ink/50">Ready to share</span></button>)}
      </div>
      {selected && <aside className="h-fit rounded-[1.5rem] border border-ink/10 bg-white p-5 shadow-sm sm:p-7"><h2 className="font-display text-3xl uppercase">{selected.title}</h2><img src={selected.image} alt="" className="mt-5 aspect-square w-full rounded-xl object-cover" /><p className="mt-5 rounded-xl bg-[#f1f2f4] p-4 text-sm leading-6 text-ink/70">{caption}</p><div className="mt-4 grid grid-cols-2 gap-3"><button type="button" onClick={copy} className="rounded-full bg-[#1469a9] px-5 py-3 text-sm font-bold text-white">{copied ? 'Copied caption' : 'Copy caption'}</button><a href={selected.image} download className="rounded-full border border-ink/15 px-5 py-3 text-center text-sm font-bold text-[#0b4779]">Download</a></div><a href={`https://wa.me/?text=${encodeURIComponent(caption)}`} target="_blank" rel="noreferrer" className="mt-3 block rounded-full bg-[#dff2e5] px-5 py-3 text-center text-sm font-bold text-[#2f7d4f]">Share caption on WhatsApp</a></aside>}
    </div>
  );
}

type Story = { id: number; name: string; meta: string; tag: string; quote: string; likes: number };

function TestimonialsPanel({ event }: { event: MivEvent }) {
  const [stories, setStories] = useState<Story[]>([]);
  const [text, setText] = useState('');
  const [topic, setTopic] = useState('Healing');
  const [showName, setShowName] = useState(true);
  useEffect(() => { void api(`/auth/testimonials?event=${encodeURIComponent(event.slug)}`).then((data) => setStories(data.testimonials)).catch(() => undefined); }, [event.slug]);
  const submit = async () => {
    if (text.trim().length < 10) { toast.error('Please write at least 10 characters.'); return; }
    try {
      await api('/auth/testimonials', { method: 'POST', body: JSON.stringify({ type: 'Write', content: text, topic, show_name: showName, event: event.slug }) });
      setText('');
      toast.success('Thank you. Your testimony was sent to the media team for review.');
    } catch (submitError) {
      toast.error(submitError instanceof Error ? submitError.message : 'Could not submit testimony.');
    }
  };
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="grid content-start gap-4">
        {stories.length === 0 && <div className="rounded-2xl bg-white p-7 text-sm text-ink/60">Published testimonies from {event.short_name} will appear here.</div>}
        {stories.map((story) => <article key={story.id} className="rounded-[1.25rem] border border-ink/10 bg-white p-5 shadow-sm"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-full bg-[#eaf3fb] text-xs font-bold text-[#1469a9]">{story.name.slice(0, 2).toUpperCase()}</span><div><strong className="block text-sm">{story.name}</strong><span className="text-xs text-ink/50">{story.meta}</span></div><span className="ml-auto rounded-full bg-[#fff0ee] px-3 py-1 text-xs font-bold text-coral">{story.tag}</span></div><p className="mt-5 leading-7 text-ink/75">{story.quote}</p></article>)}
      </div>
      <aside className="h-fit rounded-[1.5rem] bg-[#03284a] p-6 text-white"><p className="text-xs font-bold uppercase tracking-[.15em] text-[#9bc4e5]">Share your story</p><h2 className="mt-3 font-display text-3xl uppercase">What did God do at {event.short_name}?</h2><textarea value={text} onChange={(changeEvent) => setText(changeEvent.target.value)} className="mt-5 min-h-36 w-full rounded-xl p-4 text-ink" placeholder="Tell us what God did..." /><div className="mt-4 flex flex-wrap gap-2">{['Healing', 'Ministry', 'Family', 'Provision', 'Salvation'].map((item) => <button key={item} type="button" onClick={() => setTopic(item)} className={topic === item ? 'rounded-full bg-white px-3 py-2 text-xs font-bold text-[#0b4779]' : 'rounded-full border border-white/30 px-3 py-2 text-xs font-bold'}>{item}</button>)}</div><label className="mt-5 flex items-center gap-3 text-sm"><input type="checkbox" checked={showName} onChange={(changeEvent) => setShowName(changeEvent.target.checked)} /> Show my name</label><button type="button" onClick={() => void submit()} className="mt-6 w-full rounded-full bg-white px-5 py-3 text-sm font-bold text-[#0b4779]">Send to media team</button></aside>
    </div>
  );
}

function HotelsPanel({ event }: { event: MivEvent }) {
  const hotels = [{ name: 'Olororo Guest Lodge', area: 'Olororo, Ojoo', price: 18000, distance: '0.8 km', rate: true }, { name: 'Ojoo Grand Hotel', area: 'Ojoo roundabout', price: 25000, distance: '2.4 km', rate: false }, { name: 'Moniya Suites', area: 'Oyo Road, Moniya', price: 15000, distance: '5.1 km', rate: false }, { name: 'Bodija Executive Inn', area: 'Bodija, Ibadan', price: 35000, distance: '9.6 km', rate: false }];
  const [filter, setFilter] = useState('All');
  const filtered = hotels.filter((hotel) => filter === 'All' || (filter === 'Under ₦20k' && hotel.price < 20000) || (filter === '₦20k–₦35k' && hotel.price >= 20000 && hotel.price <= 35000) || (filter === 'Conference rate' && hotel.rate));
  if (event.slug !== PRIMARY_EVENT_SLUG) return <EmptyState title="Hotels coming soon" text={`Recommended places to stay for ${event.short_name} will be listed here once the venue is confirmed.`} />;
  return <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,.7fr)]"><div><div className="flex gap-2 overflow-x-auto pb-2">{['All', 'Under ₦20k', '₦20k–₦35k', 'Conference rate'].map((item) => <button key={item} type="button" onClick={() => setFilter(item)} className={filter === item ? 'shrink-0 rounded-full bg-ink px-4 py-2 text-xs font-bold text-white' : 'shrink-0 rounded-full border-2 border-ink/15 bg-white px-4 py-2 text-xs font-bold text-ink/65'}>{item}</button>)}</div><div className="mt-5 grid gap-5 sm:grid-cols-2">{filtered.map((hotel) => <article key={hotel.name} className="rounded-[1.4rem] border border-ink/10 bg-white p-3 shadow-sm"><div className="relative aspect-[1.35] overflow-hidden rounded-xl bg-[#e7edf3]"><img src="/images/photos/lp-hotel.webp" alt={`${hotel.name} accommodation`} className="h-full w-full object-cover" /><span className="absolute left-3 top-3 rounded-full bg-white px-3 py-2 text-xs font-bold">{hotel.distance}</span>{hotel.rate && <span className="absolute right-3 top-3 rounded-full bg-[#1469a9] px-3 py-2 text-xs font-bold text-white">Conference rate</span>}</div><div className="mt-4 flex items-start justify-between gap-3"><div><h3 className="font-bold">{hotel.name}</h3><p className="mt-1 text-sm text-ink/50">{hotel.area}</p></div><strong className="text-[#0b4779]">₦{hotel.price.toLocaleString()}<span className="block text-right text-xs font-normal text-ink/45">per night</span></strong></div></article>)}</div></div><aside className="grid min-h-[360px] place-items-center rounded-[1.5rem] border-2 border-dashed border-ink/20 bg-[#e7edf3] p-6 text-center text-ink/50"><div><span className="text-4xl">⌖</span><p className="mt-3 text-sm font-semibold">Hotels around the venue</p><button type="button" onClick={() => window.open('https://maps.google.com/?q=Leadership+Missions+Conference+Centre+Ibadan', '_blank')} className="mt-5 rounded-full bg-[#1469a9] px-5 py-3 text-sm font-bold text-white">Open directions</button></div></aside></div>;
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return <section className="max-w-2xl rounded-[1.75rem] border border-ink/10 bg-white p-7 shadow-sm sm:p-10"><h2 className="font-display text-4xl uppercase leading-none text-[#0b2c4a]">{title}</h2><p className="mt-4 leading-7 text-ink/60">{text}</p></section>;
}
