'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { Hotel, MivEvent, ProgrammeDay } from '../../lib/events';
import { errorMessage, toast } from '../../lib/toast';
import { api, uploadImage } from './adminApi';

type AdminEvent = MivEvent & { publicity: { caption: string | null; assets: { title: string; image: string }[] }; registrations_count: number };
type Tab = 'Programme' | 'Live' | 'Publicity kit' | 'Hotels';
const TABS: Tab[] = ['Programme', 'Live', 'Publicity kit', 'Hotels'];

const input = 'w-full rounded-xl border border-ink/15 bg-white px-3.5 py-2.5 text-sm text-ink outline-none focus:border-[#1469a9]';
const label = 'block text-xs font-bold uppercase tracking-[.08em] text-ink/50';
const card = 'rounded-[1.25rem] border border-ink/10 bg-white p-4 sm:p-5';

function Field({ title, children, className = '' }: { title: string; children: ReactNode; className?: string }) {
  return <label className={`grid gap-1.5 ${className}`}><span className={label}>{title}</span>{children}</label>;
}

function SaveBar({ saving, onSave, note }: { saving: boolean; onSave: () => void; note?: string }) {
  return (
    <div className="sticky bottom-0 z-10 -mx-1 mt-6 flex items-center justify-between gap-3 rounded-2xl bg-[#03284a] px-4 py-3 text-white shadow-lg">
      <span className="text-xs text-[#9bc4e5]">{note ?? 'Changes show on delegates’ dashboards as soon as you save.'}</span>
      <button type="button" onClick={onSave} disabled={saving} className="shrink-0 rounded-full bg-white px-6 py-2.5 text-sm font-bold text-[#03284a] disabled:opacity-60">{saving ? 'Saving…' : 'Save changes'}</button>
    </div>
  );
}

/** Image preview with upload and paste-a-link options. */
function ImageInput({ value, onChange, aspect = 'aspect-square' }: { value: string; onChange: (url: string) => void; aspect?: string }) {
  const file = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const upload = async (chosen?: File) => {
    if (!chosen) return;
    setUploading(true);
    try { onChange(await uploadImage(chosen)); toast.success('Image uploaded.'); } catch (error) { toast.error(errorMessage(error, 'Upload failed.')); } finally { setUploading(false); }
  };
  return (
    <div className="grid gap-2">
      <button type="button" onClick={() => file.current?.click()} className={`relative grid ${aspect} w-full place-items-center overflow-hidden rounded-xl border-2 border-dashed border-ink/15 bg-[#f6f2e9] text-xs font-bold text-ink/50 hover:border-[#1469a9]`}>
        {value ? <img src={value} alt="" className="absolute inset-0 h-full w-full object-cover" /> : <span>{uploading ? 'Uploading…' : '+ Upload image'}</span>}
        {value && <span className="absolute bottom-2 right-2 rounded-full bg-white/95 px-2.5 py-1 text-[11px] text-ink shadow">{uploading ? 'Uploading…' : 'Replace'}</span>}
      </button>
      <input ref={file} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => { void upload(event.target.files?.[0]); event.target.value = ''; }} />
      <input value={value} onChange={(event) => onChange(event.target.value)} className={`${input} text-xs`} placeholder="…or paste an image link" />
    </div>
  );
}

/* ---------------------------------------------------------------- Programme */

function nextDate(date?: string | null) {
  const base = date ? new Date(`${date}T12:00:00Z`) : new Date();
  if (date) base.setUTCDate(base.getUTCDate() + 1);
  return base.toISOString().slice(0, 10);
}

function dayName(date: string) {
  return new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`));
}

function ProgrammeEditor({ event, onSaved }: { event: AdminEvent; onSaved: (event: AdminEvent) => void }) {
  const [days, setDays] = useState<ProgrammeDay[]>(() => event.programme.map((day) => ({ ...day, date: day.date ?? '', sessions: day.sessions.map((session) => ({ start: session.start ?? '', end: session.end ?? '', title: session.title, detail: session.detail ?? '' })) })));
  const [saving, setSaving] = useState(false);

  const updateDay = (index: number, patch: Partial<ProgrammeDay>) => setDays((current) => current.map((day, position) => position === index ? { ...day, ...patch } : day));
  const updateSession = (dayIndex: number, sessionIndex: number, field: string, value: string) => setDays((current) => current.map((day, position) => position === dayIndex ? { ...day, sessions: day.sessions.map((session, index) => index === sessionIndex ? { ...session, [field]: value } : session) } : day));
  const addDay = () => setDays((current) => {
    const fallback = event.starts_at ? event.starts_at.slice(0, 10) : null;
    const date = current.length ? nextDate(current[current.length - 1].date) : (fallback ?? nextDate(null));
    return [...current, { day: dayName(date), date, sessions: [] }];
  });

  const save = async () => {
    setSaving(true);
    try {
      const programme = days.map((day) => ({ day: day.day || (day.date ? dayName(day.date) : ''), date: day.date, sessions: day.sessions.map((session) => ({ start: session.start, end: session.end || null, title: session.title, detail: session.detail || null })) }));
      const data = await api(`/admin/events/${event.slug}/content`, { method: 'PATCH', body: JSON.stringify({ programme }) });
      onSaved({ ...event, ...data.event, publicity: event.publicity });
      toast.success('Programme saved.');
    } catch (error) { toast.error(errorMessage(error, 'Could not save the programme.')); } finally { setSaving(false); }
  };

  return (
    <div className="grid gap-4">
      <p className="text-sm text-ink/60">Delegates see today’s day first, with the session that is on now highlighted (Lagos time).</p>
      {days.length === 0 && <div className={`${card} text-sm text-ink/55`}>No programme yet. Add the first day.</div>}
      {days.map((day, dayIndex) => (
        <section key={dayIndex} className={card}>
          <div className="grid gap-3 sm:grid-cols-[180px_minmax(0,1fr)_auto] sm:items-end">
            <Field title="Date"><input type="date" value={day.date ?? ''} onChange={(event) => updateDay(dayIndex, { date: event.target.value, day: event.target.value ? dayName(event.target.value) : day.day })} className={input} /></Field>
            <Field title="Label"><input value={day.day} onChange={(event) => updateDay(dayIndex, { day: event.target.value })} className={input} placeholder="e.g. Day 1 · Tue 19" /></Field>
            <button type="button" onClick={() => setDays((current) => current.filter((_, index) => index !== dayIndex))} className="rounded-full bg-[#fff0ee] px-4 py-2.5 text-xs font-bold text-coral">Remove day</button>
          </div>
          <div className="mt-4 grid gap-2">
            {day.sessions.map((session, sessionIndex) => (
              <div key={sessionIndex} className="grid gap-2 rounded-xl bg-[#f6f2e9] p-3 sm:grid-cols-[110px_110px_minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-center">
                <input type="time" aria-label="Start" value={session.start ?? ''} onChange={(event) => updateSession(dayIndex, sessionIndex, 'start', event.target.value)} className={input} required />
                <input type="time" aria-label="End" value={session.end ?? ''} onChange={(event) => updateSession(dayIndex, sessionIndex, 'end', event.target.value)} className={input} />
                <input aria-label="Session title" value={session.title} onChange={(event) => updateSession(dayIndex, sessionIndex, 'title', event.target.value)} className={input} placeholder="Session title" />
                <input aria-label="Details" value={session.detail ?? ''} onChange={(event) => updateSession(dayIndex, sessionIndex, 'detail', event.target.value)} className={input} placeholder="Hall, speaker… (optional)" />
                <button type="button" onClick={() => updateDay(dayIndex, { sessions: day.sessions.filter((_, index) => index !== sessionIndex) })} className="grid h-10 w-10 place-items-center justify-self-end rounded-full bg-white text-lg text-ink/50 hover:text-coral" aria-label="Remove session">×</button>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => updateDay(dayIndex, { sessions: [...day.sessions, { start: day.sessions.at(-1)?.end || '09:00', end: '', title: '', detail: '' }] })} className="mt-3 rounded-full border border-ink/15 px-4 py-2 text-xs font-bold text-[#0b4779]">+ Add session</button>
        </section>
      ))}
      <button type="button" onClick={addDay} className="justify-self-start rounded-full bg-[#e7f1fa] px-5 py-2.5 text-sm font-bold text-[#0b4779]">+ Add day</button>
      <SaveBar saving={saving} onSave={() => void save()} />
    </div>
  );
}

/* --------------------------------------------------------------------- Live */

const youtubeId = (url: string) => url.match(/(?:youtu\.be\/|[?&]v=|\/live\/|\/embed\/|\/shorts\/)([\w-]{11})/)?.[1] ?? null;

function LiveEditor({ event, onSaved }: { event: AdminEvent; onSaved: (event: AdminEvent) => void }) {
  const [url, setUrl] = useState(event.stream_url ?? '');
  const [title, setTitle] = useState(event.stream_title ?? '');
  const [live, setLive] = useState(event.stream_live);
  const [saving, setSaving] = useState(false);
  const videoId = youtubeId(url);

  const save = async () => {
    setSaving(true);
    try {
      const data = await api(`/admin/events/${event.slug}/content`, { method: 'PATCH', body: JSON.stringify({ stream_url: url.trim() || null, stream_title: title.trim() || null, stream_live: live }) });
      onSaved({ ...event, ...data.event, publicity: event.publicity });
      setLive(data.event.stream_live);
      toast.success(data.event.stream_live ? 'Stream is live on delegates’ dashboards.' : 'Livestream settings saved.');
    } catch (error) { toast.error(errorMessage(error, 'Could not save the livestream.')); } finally { setSaving(false); }
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className={`${card} grid content-start gap-4`}>
        <Field title="YouTube link"><input value={url} onChange={(event) => setUrl(event.target.value)} className={input} placeholder="https://www.youtube.com/live/…" /></Field>
        {url && !videoId && <p className="text-xs text-[#9a6814]">Not a YouTube link. Delegates will get a button to open it instead of an embedded player.</p>}
        <Field title="Title shown above the player"><input value={title} onChange={(event) => setTitle(event.target.value)} className={input} placeholder="e.g. Opening night · Day 1" /></Field>
        <label className="flex items-center justify-between gap-4 rounded-xl bg-[#f6f2e9] p-4">
          <span><strong className="block text-sm">Live now</strong><span className="text-xs text-ink/55">Shows a red LIVE badge. Turn off afterwards to show it as a replay.</span></span>
          <button type="button" role="switch" aria-checked={live} onClick={() => setLive((value) => !value)} disabled={!url} className={`relative h-7 w-12 shrink-0 rounded-full transition disabled:opacity-40 ${live ? 'bg-[#e0352b]' : 'bg-ink/20'}`}><span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${live ? 'left-6' : 'left-1'}`} /></button>
        </label>
      </div>
      <div className={card}>
        <span className={label}>Preview</span>
        <div className="mt-2 aspect-video overflow-hidden rounded-xl bg-[#001b31]">
          {videoId ? <iframe className="h-full w-full" src={`https://www.youtube-nocookie.com/embed/${videoId}`} title="Preview" allow="encrypted-media; picture-in-picture" allowFullScreen /> : <div className="grid h-full place-items-center text-sm text-white/60">Paste a YouTube link to preview</div>}
        </div>
      </div>
      <div className="lg:col-span-2"><SaveBar saving={saving} onSave={() => void save()} /></div>
    </div>
  );
}

/* ---------------------------------------------------------------- Publicity */

function PublicityEditor({ event, onSaved }: { event: AdminEvent; onSaved: (event: AdminEvent) => void }) {
  const [caption, setCaption] = useState(event.publicity.caption ?? '');
  const [assets, setAssets] = useState(event.publicity.assets ?? []);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const incomplete = assets.find((asset) => !asset.title.trim() || !asset.image.trim());
    if (incomplete) { toast.warning('Every flyer needs a title and an image.'); return; }
    setSaving(true);
    try {
      const data = await api(`/admin/events/${event.slug}/content`, { method: 'PATCH', body: JSON.stringify({ publicity: { caption, assets } }) });
      onSaved({ ...event, ...data.event, publicity: { caption: caption.trim() || null, assets } });
      toast.success('Publicity kit saved.');
    } catch (error) { toast.error(errorMessage(error, 'Could not save the publicity kit.')); } finally { setSaving(false); }
  };

  return (
    <div className="grid gap-4">
      <div className={card}>
        <Field title="Share caption"><textarea value={caption} onChange={(event) => setCaption(event.target.value)} maxLength={600} className={`${input} min-h-24`} placeholder={`Leave empty to use: I'm attending ${event.title}… #MIV`} /></Field>
        <p className="mt-1 text-right text-[11px] text-ink/40">{caption.length}/600</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {assets.map((asset, index) => (
          <div key={index} className={`${card} grid gap-3`}>
            <ImageInput value={asset.image} onChange={(image) => setAssets((current) => current.map((item, position) => position === index ? { ...item, image } : item))} />
            <input value={asset.title} onChange={(event) => setAssets((current) => current.map((item, position) => position === index ? { ...item, title: event.target.value } : item))} className={input} placeholder="Title, e.g. WhatsApp status" />
            <button type="button" onClick={() => setAssets((current) => current.filter((_, position) => position !== index))} className="rounded-full bg-[#fff0ee] py-2 text-xs font-bold text-coral">Remove</button>
          </div>
        ))}
        <button type="button" onClick={() => setAssets((current) => [...current, { title: '', image: '' }])} className="grid min-h-[200px] place-items-center rounded-[1.25rem] border-2 border-dashed border-ink/15 text-sm font-bold text-[#0b4779] hover:border-[#1469a9]">+ Add flyer</button>
      </div>
      <SaveBar saving={saving} onSave={() => void save()} />
    </div>
  );
}

/* ------------------------------------------------------------------- Hotels */

const emptyHotel = (): Hotel => ({ name: '', area: '', price: null, distance: '', conference_rate: false, phone: '', url: '', image: '', notes: '' });

function HotelsEditor({ event, onSaved }: { event: AdminEvent; onSaved: (event: AdminEvent) => void }) {
  const [offers, setOffers] = useState(event.offers_accommodation);
  const [hotels, setHotels] = useState<Hotel[]>(() => event.hotels.map((hotel) => ({ ...emptyHotel(), ...hotel })));
  const [saving, setSaving] = useState(false);
  const update = (index: number, patch: Partial<Hotel>) => setHotels((current) => current.map((hotel, position) => position === index ? { ...hotel, ...patch } : hotel));

  const save = async () => {
    if (hotels.some((hotel) => !hotel.name.trim())) { toast.warning('Every hotel needs a name.'); return; }
    setSaving(true);
    try {
      const payload = hotels.map((hotel) => ({ ...hotel, area: hotel.area || null, distance: hotel.distance || null, phone: hotel.phone || null, url: hotel.url || null, image: hotel.image || null, notes: hotel.notes || null }));
      const data = await api(`/admin/events/${event.slug}/content`, { method: 'PATCH', body: JSON.stringify({ offers_accommodation: offers, hotels: payload }) });
      onSaved({ ...event, ...data.event, publicity: event.publicity });
      toast.success('Hotels saved.');
    } catch (error) { toast.error(errorMessage(error, 'Could not save hotels.')); } finally { setSaving(false); }
  };

  return (
    <div className="grid gap-4">
      <label className={`${card} flex items-center justify-between gap-4`}>
        <span><strong className="block text-sm">Offer accommodation</strong><span className="text-xs text-ink/55">Shows the Hotels & travel section and lets onsite delegates ask for accommodation.</span></span>
        <button type="button" role="switch" aria-checked={offers} onClick={() => setOffers((value) => !value)} className={`relative h-7 w-12 shrink-0 rounded-full transition ${offers ? 'bg-[#1469a9]' : 'bg-ink/20'}`}><span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${offers ? 'left-6' : 'left-1'}`} /></button>
      </label>
      <div className="grid gap-3 xl:grid-cols-2">
        {hotels.map((hotel, index) => (
          <div key={index} className={`${card} grid gap-4 sm:grid-cols-[160px_minmax(0,1fr)]`}>
            <ImageInput value={hotel.image ?? ''} onChange={(image) => update(index, { image })} aspect="aspect-[4/3]" />
            <div className="grid content-start gap-3 sm:grid-cols-2">
              <Field title="Name" className="sm:col-span-2"><input value={hotel.name} onChange={(event) => update(index, { name: event.target.value })} className={input} /></Field>
              <Field title="Area"><input value={hotel.area ?? ''} onChange={(event) => update(index, { area: event.target.value })} className={input} placeholder="Ojoo, Ibadan" /></Field>
              <Field title="Distance"><input value={hotel.distance ?? ''} onChange={(event) => update(index, { distance: event.target.value })} className={input} placeholder="2.4 km" /></Field>
              <Field title="Price per night (₦)"><input type="number" min="0" value={hotel.price ?? ''} onChange={(event) => update(index, { price: event.target.value === '' ? null : Number(event.target.value) })} className={input} /></Field>
              <Field title="Phone / WhatsApp"><input value={hotel.phone ?? ''} onChange={(event) => update(index, { phone: event.target.value })} className={input} placeholder="+234…" /></Field>
              <Field title="Website or booking link" className="sm:col-span-2"><input value={hotel.url ?? ''} onChange={(event) => update(index, { url: event.target.value })} className={input} placeholder="https://" /></Field>
              <Field title="Notes" className="sm:col-span-2"><input value={hotel.notes ?? ''} onChange={(event) => update(index, { notes: event.target.value })} className={input} placeholder="Breakfast included, shuttle to venue…" /></Field>
              <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={hotel.conference_rate} onChange={(event) => update(index, { conference_rate: event.target.checked })} className="h-4 w-4" />Conference rate</label>
              <button type="button" onClick={() => setHotels((current) => current.filter((_, position) => position !== index))} className="justify-self-end rounded-full bg-[#fff0ee] px-4 py-2 text-xs font-bold text-coral">Remove hotel</button>
            </div>
          </div>
        ))}
        <button type="button" onClick={() => setHotels((current) => [...current, emptyHotel()])} className="grid min-h-[160px] place-items-center rounded-[1.25rem] border-2 border-dashed border-ink/15 text-sm font-bold text-[#0b4779] hover:border-[#1469a9]">+ Add hotel</button>
      </div>
      <SaveBar saving={saving} onSave={() => void save()} />
    </div>
  );
}

/* ------------------------------------------------------------------ Manager */

/** Admin page for each event's dashboard content. */
export default function EventContentManager() {
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [slug, setSlug] = useState('');
  const [tab, setTab] = useState<Tab>('Programme');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void api('/admin/events')
      .then((data) => { setEvents(data.events); setSlug((current) => current || data.events[0]?.slug || ''); })
      .catch((error) => toast.error(errorMessage(error, 'Could not load events.')))
      .finally(() => setLoading(false));
  }, []);

  const event = events.find((item) => item.slug === slug);
  const saved = (updated: AdminEvent) => setEvents((current) => current.map((item) => item.slug === updated.slug ? { ...item, ...updated } : item));

  if (loading) return <div className="h-64 animate-pulse rounded-[1.5rem] bg-white" />;
  if (!event) return <div className={card}>No events found.</div>;

  return (
    <div className="grid gap-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <label className="flex items-center gap-3">
          <span className="text-sm font-bold text-ink/60">Event</span>
          <select value={slug} onChange={(change) => setSlug(change.target.value)} className={`${input} min-w-[260px] font-semibold`}>
            {events.map((item) => <option key={item.slug} value={item.slug}>{item.short_name} · {item.date_label} ({item.registrations_count} registered)</option>)}
          </select>
        </label>
        <div className="flex flex-wrap gap-1.5" role="tablist">
          {TABS.map((item) => <button key={item} type="button" role="tab" aria-selected={tab === item} onClick={() => setTab(item)} className={`rounded-full px-4 py-2 text-sm font-bold transition ${tab === item ? 'bg-[#03284a] text-white' : 'bg-white text-ink/65 ring-1 ring-ink/10 hover:text-ink'}`}>{item}{item === 'Live' && event.stream_live && <span className="ml-1.5 inline-block h-2 w-2 rounded-full bg-[#e0352b]" />}</button>)}
        </div>
      </div>
      {/* Keyed so each editor reloads its form when the event changes. */}
      {tab === 'Programme' && <ProgrammeEditor key={event.slug} event={event} onSaved={saved} />}
      {tab === 'Live' && <LiveEditor key={event.slug} event={event} onSaved={saved} />}
      {tab === 'Publicity kit' && <PublicityEditor key={event.slug} event={event} onSaved={saved} />}
      {tab === 'Hotels' && <HotelsEditor key={event.slug} event={event} onSaved={saved} />}
    </div>
  );
}
