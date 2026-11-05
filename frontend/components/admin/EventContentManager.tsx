'use client';

import { FormEvent, useEffect, useState } from 'react';
import type { Hotel, MivEvent } from '../../lib/events';
import { errorMessage, toast } from '../../lib/toast';
import { api } from './adminApi';
import { Field, ImageInput, SaveBar, card, input, label } from './adminUi';
import { Modal, primaryButton, secondaryButton } from './table';

type AdminEvent = MivEvent & { publicity: { caption: string | null; assets: { title: string; image: string }[] }; registrations_count: number };
type Tab = 'Programme' | 'Live' | 'Publicity kit' | 'Hotels';
const TABS: Tab[] = ['Programme', 'Live', 'Publicity kit', 'Hotels'];

/* ---------------------------------------------------------------- Programme */

function nextDate(date?: string | null) {
  const base = date ? new Date(`${date}T12:00:00Z`) : new Date();
  if (date) base.setUTCDate(base.getUTCDate() + 1);
  return base.toISOString().slice(0, 10);
}

function dayName(date: string) {
  return new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`));
}

const to12h = (value?: string | null) => { if (!value) return ''; const [hours, minutes] = value.split(':').map(Number); return `${hours % 12 || 12}:${String(minutes).padStart(2, '0')} ${hours < 12 ? 'AM' : 'PM'}`; };

type Session = { start: string; end: string; title: string; detail: string };
type Day = { day: string; date: string; sessions: Session[] };

/** Saves the whole content section and reports the updated event. */
async function saveContent(event: AdminEvent, body: Record<string, unknown>, onSaved: (event: AdminEvent) => void, success: string) {
  const data = await api(`/admin/events/${event.slug}/content`, { method: 'PATCH', body: JSON.stringify(body) });
  onSaved({ ...event, ...data.event, publicity: (body.publicity as AdminEvent['publicity']) ?? event.publicity });
  toast.success(success);
}

function ProgrammeEditor({ event, onSaved }: { event: AdminEvent; onSaved: (event: AdminEvent) => void }) {
  const days: Day[] = event.programme.map((day) => ({ day: day.day, date: day.date ?? '', sessions: day.sessions.map((session) => ({ start: session.start ?? '', end: session.end ?? '', title: session.title, detail: session.detail ?? '' })) }));
  const [dayModal, setDayModal] = useState<{ index: number | null; date: string; label: string } | null>(null);
  const [sessionModal, setSessionModal] = useState<{ dayIndex: number; index: number | null; session: Session } | null>(null);
  const [saving, setSaving] = useState(false);

  const persist = async (next: Day[], success: string) => {
    setSaving(true);
    try {
      await saveContent(event, { programme: next.map((day) => ({ day: day.day || dayName(day.date), date: day.date, sessions: day.sessions.map((session) => ({ start: session.start, end: session.end || null, title: session.title, detail: session.detail || null })) })) }, onSaved, success);
      return true;
    } catch (error) { toast.error(errorMessage(error, 'Could not save the programme.')); return false; } finally { setSaving(false); }
  };

  const openNewDay = () => {
    const date = days.length ? nextDate(days[days.length - 1].date) : (event.starts_at ? event.starts_at.slice(0, 10) : nextDate(null));
    setDayModal({ index: null, date, label: dayName(date) });
  };
  const saveDay = async (formEvent: FormEvent<HTMLFormElement>) => {
    formEvent.preventDefault();
    if (!dayModal) return;
    const next = dayModal.index === null ? [...days, { day: dayModal.label, date: dayModal.date, sessions: [] }] : days.map((day, index) => index === dayModal.index ? { ...day, day: dayModal.label, date: dayModal.date } : day);
    if (await persist(next, dayModal.index === null ? 'Day added.' : 'Day updated.')) setDayModal(null);
  };
  const removeDay = async (index: number) => {
    if (!window.confirm(`Remove ${days[index].day} and its ${days[index].sessions.length} session(s)?`)) return;
    await persist(days.filter((_, position) => position !== index), 'Day removed.');
  };
  const saveSession = async (formEvent: FormEvent<HTMLFormElement>) => {
    formEvent.preventDefault();
    if (!sessionModal) return;
    const next = days.map((day, index) => index !== sessionModal.dayIndex ? day : { ...day, sessions: sessionModal.index === null ? [...day.sessions, sessionModal.session] : day.sessions.map((session, position) => position === sessionModal.index ? sessionModal.session : session) });
    if (await persist(next, sessionModal.index === null ? 'Session added.' : 'Session updated.')) setSessionModal(null);
  };
  const removeSession = async (dayIndex: number, index: number) => {
    await persist(days.map((day, position) => position !== dayIndex ? day : { ...day, sessions: day.sessions.filter((_, sessionIndex) => sessionIndex !== index) }), 'Session removed.');
  };
  const newSession = (dayIndex: number) => setSessionModal({ dayIndex, index: null, session: { start: days[dayIndex].sessions.at(-1)?.end || '09:00', end: '', title: '', detail: '' } });

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink/60">Delegates see today first, with the current session highlighted (Lagos time).</p>
        <button type="button" onClick={openNewDay} className={primaryButton}>+ Add day</button>
      </div>
      {days.length === 0 && <div className={`${card} text-sm text-ink/55`}>No programme yet. Add the first day.</div>}
      {days.map((day, dayIndex) => (
        <section key={`${day.date}-${dayIndex}`} className={card}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div><strong className="text-base">{day.day}</strong><span className="ml-2 text-xs text-ink/50">{day.date}</span></div>
            <div className="flex gap-1.5">
              <button type="button" onClick={() => newSession(dayIndex)} className="rounded-full bg-[#03284a] px-3 py-1.5 text-xs font-bold text-white">+ Session</button>
              <button type="button" onClick={() => setDayModal({ index: dayIndex, date: day.date, label: day.day })} className="rounded-full border border-ink/15 px-3 py-1.5 text-xs font-bold">Edit day</button>
              <button type="button" disabled={saving} onClick={() => void removeDay(dayIndex)} className="rounded-full bg-[#fff0ee] px-3 py-1.5 text-xs font-bold text-coral">Remove</button>
            </div>
          </div>
          <ul className="m-0 mt-3 grid list-none gap-1.5 p-0">
            {day.sessions.length === 0 && <li className="rounded-xl bg-[#fafaf8] p-3 text-sm text-ink/50">No sessions yet.</li>}
            {day.sessions.map((session, index) => (
              <li key={index} className="grid items-center gap-2 rounded-xl bg-[#fafaf8] px-3 py-2.5 text-sm sm:grid-cols-[150px_minmax(0,1fr)_auto]">
                <span className="font-bold">{to12h(session.start)}{session.end && <span className="font-normal text-ink/50"> – {to12h(session.end)}</span>}</span>
                <span className="min-w-0"><strong className="block truncate">{session.title}</strong>{session.detail && <span className="block truncate text-xs text-ink/55">{session.detail}</span>}</span>
                <span className="flex gap-2"><button type="button" onClick={() => setSessionModal({ dayIndex, index, session })} className="text-xs font-bold text-[#1469a9]">Edit</button><button type="button" disabled={saving} onClick={() => void removeSession(dayIndex, index)} className="text-xs font-bold text-coral">Remove</button></span>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {dayModal && (
        <Modal title={dayModal.index === null ? 'Add a programme day' : 'Edit day'} onClose={() => setDayModal(null)} size="sm" footer={<><button type="button" onClick={() => setDayModal(null)} className={secondaryButton}>Cancel</button><button type="submit" form="day-form" disabled={saving} className={primaryButton}>{saving ? 'Saving…' : 'Save day'}</button></>}>
          <form id="day-form" onSubmit={saveDay} className="grid gap-4">
            <Field title="Date"><input required type="date" value={dayModal.date} onChange={(change) => setDayModal({ ...dayModal, date: change.target.value, label: change.target.value ? dayName(change.target.value) : dayModal.label })} className={input} /></Field>
            <Field title="Label shown to delegates"><input required value={dayModal.label} onChange={(change) => setDayModal({ ...dayModal, label: change.target.value })} className={input} placeholder="e.g. Day 1 · Tue 19" /></Field>
          </form>
        </Modal>
      )}
      {sessionModal && (
        <Modal title={sessionModal.index === null ? `Add a session · ${days[sessionModal.dayIndex].day}` : 'Edit session'} onClose={() => setSessionModal(null)} footer={<><button type="button" onClick={() => setSessionModal(null)} className={secondaryButton}>Cancel</button><button type="submit" form="session-form" disabled={saving} className={primaryButton}>{saving ? 'Saving…' : 'Save session'}</button></>}>
          <form id="session-form" onSubmit={saveSession} className="grid gap-4 sm:grid-cols-2">
            <Field title="Starts"><input required type="time" value={sessionModal.session.start} onChange={(change) => setSessionModal({ ...sessionModal, session: { ...sessionModal.session, start: change.target.value } })} className={input} /></Field>
            <Field title="Ends (optional)"><input type="time" value={sessionModal.session.end} onChange={(change) => setSessionModal({ ...sessionModal, session: { ...sessionModal.session, end: change.target.value } })} className={input} /></Field>
            <Field title="Title" className="sm:col-span-2"><input required maxLength={120} value={sessionModal.session.title} onChange={(change) => setSessionModal({ ...sessionModal, session: { ...sessionModal.session, title: change.target.value } })} className={input} placeholder="Morning plenary" /></Field>
            <Field title="Details (optional)" className="sm:col-span-2"><input maxLength={240} value={sessionModal.session.detail} onChange={(change) => setSessionModal({ ...sessionModal, session: { ...sessionModal.session, detail: change.target.value } })} className={input} placeholder="Main hall · Rev. Samson Ajetomobi" /></Field>
          </form>
        </Modal>
      )}
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
  const assets = event.publicity.assets ?? [];
  const [modal, setModal] = useState<{ index: number | null; title: string; image: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const persist = async (nextAssets: { title: string; image: string }[], nextCaption: string, success: string) => {
    setSaving(true);
    try { await saveContent(event, { publicity: { caption: nextCaption.trim() || null, assets: nextAssets } }, onSaved, success); return true; } catch (error) { toast.error(errorMessage(error, 'Could not save the publicity kit.')); return false; } finally { setSaving(false); }
  };
  const saveAsset = async (formEvent: FormEvent<HTMLFormElement>) => {
    formEvent.preventDefault();
    if (!modal) return;
    if (!modal.image) { toast.warning('Upload an image or paste a link.'); return; }
    const asset = { title: modal.title.trim(), image: modal.image };
    const next = modal.index === null ? [...assets, asset] : assets.map((item, index) => index === modal.index ? asset : item);
    if (await persist(next, caption, modal.index === null ? 'Flyer added.' : 'Flyer updated.')) setModal(null);
  };
  const remove = async (index: number) => { if (window.confirm(`Remove ${assets[index].title}?`)) await persist(assets.filter((_, position) => position !== index), caption, 'Flyer removed.'); };

  return (
    <div className="grid gap-4">
      <div className={`${card} grid gap-3`}>
        <Field title="Share caption"><textarea value={caption} onChange={(change) => setCaption(change.target.value)} maxLength={600} className={`${input} min-h-20`} placeholder={`Leave empty to use: I'm attending ${event.title}… #MIV`} /></Field>
        <div className="flex items-center justify-between"><span className="text-[11px] text-ink/40">{caption.length}/600</span><button type="button" disabled={saving || caption === (event.publicity.caption ?? '')} onClick={() => void persist(assets, caption, 'Caption saved.')} className={secondaryButton}>Save caption</button></div>
      </div>
      <div className="flex items-center justify-between gap-3"><h3 className="text-sm font-bold">Flyers ({assets.length})</h3><button type="button" onClick={() => setModal({ index: null, title: '', image: '' })} className={primaryButton}>+ Add flyer</button></div>
      {assets.length === 0 && <div className={`${card} text-sm text-ink/55`}>No flyers yet.</div>}
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6">
        {assets.map((asset, index) => (
          <div key={`${asset.image}-${index}`} className="rounded-[1.1rem] border border-ink/10 bg-white p-2">
            <img src={asset.image} alt={asset.title} className="aspect-square w-full rounded-lg bg-[#f6f2e9] object-cover" />
            <strong className="mt-2 block truncate px-1 text-sm">{asset.title}</strong>
            <div className="mt-1 flex gap-3 px-1 pb-1"><button type="button" onClick={() => setModal({ index, ...asset })} className="text-xs font-bold text-[#1469a9]">Edit</button><button type="button" disabled={saving} onClick={() => void remove(index)} className="text-xs font-bold text-coral">Remove</button></div>
          </div>
        ))}
      </div>
      {modal && (
        <Modal title={modal.index === null ? 'Add a flyer' : 'Edit flyer'} onClose={() => setModal(null)} size="sm" footer={<><button type="button" onClick={() => setModal(null)} className={secondaryButton}>Cancel</button><button type="submit" form="flyer-form" disabled={saving} className={primaryButton}>{saving ? 'Saving…' : 'Save flyer'}</button></>}>
          <form id="flyer-form" onSubmit={saveAsset} className="grid gap-4">
            <Field title="Image"><ImageInput value={modal.image} onChange={(image) => setModal({ ...modal, image })} /></Field>
            <Field title="Title"><input required maxLength={80} value={modal.title} onChange={(change) => setModal({ ...modal, title: change.target.value })} className={input} placeholder="WhatsApp status" /></Field>
          </form>
        </Modal>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------- Hotels */

const emptyHotel = (): Hotel => ({ name: '', area: '', price: null, distance: '', conference_rate: false, phone: '', url: '', image: '', notes: '' });
const cleanHotel = (hotel: Hotel) => ({ ...hotel, name: hotel.name.trim(), area: hotel.area || null, distance: hotel.distance || null, phone: hotel.phone || null, url: hotel.url || null, image: hotel.image || null, notes: hotel.notes || null });

function HotelsEditor({ event, onSaved }: { event: AdminEvent; onSaved: (event: AdminEvent) => void }) {
  const hotels = event.hotels;
  const [modal, setModal] = useState<{ index: number | null; hotel: Hotel } | null>(null);
  const [saving, setSaving] = useState(false);

  const persist = async (body: Record<string, unknown>, success: string) => {
    setSaving(true);
    try { await saveContent(event, body, onSaved, success); return true; } catch (error) { toast.error(errorMessage(error, 'Could not save hotels.')); return false; } finally { setSaving(false); }
  };
  const saveHotel = async (formEvent: FormEvent<HTMLFormElement>) => {
    formEvent.preventDefault();
    if (!modal) return;
    const next = modal.index === null ? [...hotels, modal.hotel] : hotels.map((hotel, index) => index === modal.index ? modal.hotel : hotel);
    if (await persist({ hotels: next.map(cleanHotel) }, modal.index === null ? `${modal.hotel.name} added.` : `${modal.hotel.name} saved.`)) setModal(null);
  };
  const remove = async (index: number) => { if (window.confirm(`Remove ${hotels[index].name}?`)) await persist({ hotels: hotels.filter((_, position) => position !== index).map(cleanHotel) }, 'Hotel removed.'); };
  const set = (patch: Partial<Hotel>) => setModal((current) => current && { ...current, hotel: { ...current.hotel, ...patch } });

  return (
    <div className="grid gap-4">
      <label className={`${card} flex items-center justify-between gap-4`}>
        <span><strong className="block text-sm">Offer accommodation</strong><span className="text-xs text-ink/55">Shows Hotels & travel on the dashboard and lets onsite delegates ask for accommodation.</span></span>
        <button type="button" role="switch" aria-checked={event.offers_accommodation} disabled={saving} onClick={() => void persist({ offers_accommodation: !event.offers_accommodation }, event.offers_accommodation ? 'Accommodation turned off.' : 'Accommodation turned on.')} className={`relative h-7 w-12 shrink-0 rounded-full transition ${event.offers_accommodation ? 'bg-[#1469a9]' : 'bg-ink/20'}`}><span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${event.offers_accommodation ? 'left-6' : 'left-1'}`} /></button>
      </label>
      <div className="flex items-center justify-between gap-3"><h3 className="text-sm font-bold">Hotels ({hotels.length})</h3><button type="button" onClick={() => setModal({ index: null, hotel: emptyHotel() })} className={primaryButton}>+ Add hotel</button></div>
      <div className="overflow-hidden rounded-[1.25rem] border border-ink/10 bg-white">
        {hotels.length === 0 && <p className="p-6 text-sm text-ink/55">No hotels yet.</p>}
        {hotels.map((hotel, index) => (
          <div key={`${hotel.name}-${index}`} className="flex flex-wrap items-center gap-3 border-b border-ink/5 px-4 py-3 last:border-0">
            <img src={hotel.image || '/images/photos/lp-hotel.webp'} alt="" className="h-12 w-16 shrink-0 rounded-lg object-cover" />
            <span className="min-w-0 flex-1"><strong className="block truncate text-sm">{hotel.name}{hotel.conference_rate && <span className="ml-2 rounded-full bg-[#e7f1fa] px-2 py-0.5 text-[10px] font-bold text-[#0b4779]">Conference rate</span>}</strong><span className="block truncate text-xs text-ink/50">{[hotel.area, hotel.distance, hotel.phone].filter(Boolean).join(' · ')}</span></span>
            <strong className="text-sm">{hotel.price !== null ? `₦${hotel.price.toLocaleString()}` : '—'}</strong>
            <span className="flex gap-3"><button type="button" onClick={() => setModal({ index, hotel: { ...emptyHotel(), ...hotel } })} className="text-xs font-bold text-[#1469a9]">Edit</button><button type="button" disabled={saving} onClick={() => void remove(index)} className="text-xs font-bold text-coral">Remove</button></span>
          </div>
        ))}
      </div>
      {modal && (
        <Modal title={modal.index === null ? 'Add a hotel' : `Edit ${modal.hotel.name}`} onClose={() => setModal(null)} size="lg" footer={<><button type="button" onClick={() => setModal(null)} className={secondaryButton}>Cancel</button><button type="submit" form="hotel-form" disabled={saving} className={primaryButton}>{saving ? 'Saving…' : 'Save hotel'}</button></>}>
          <form id="hotel-form" onSubmit={saveHotel} className="grid gap-4 sm:grid-cols-[200px_minmax(0,1fr)]">
            <Field title="Photo"><ImageInput value={modal.hotel.image ?? ''} onChange={(image) => set({ image })} aspect="aspect-[4/3]" /></Field>
            <div className="grid content-start gap-3 sm:grid-cols-2">
              <Field title="Name" className="sm:col-span-2"><input required value={modal.hotel.name} onChange={(change) => set({ name: change.target.value })} className={input} /></Field>
              <Field title="Area"><input value={modal.hotel.area ?? ''} onChange={(change) => set({ area: change.target.value })} className={input} placeholder="Ojoo, Ibadan" /></Field>
              <Field title="Distance to venue"><input value={modal.hotel.distance ?? ''} onChange={(change) => set({ distance: change.target.value })} className={input} placeholder="2.4 km" /></Field>
              <Field title="Price per night (₦)"><input type="number" min="0" value={modal.hotel.price ?? ''} onChange={(change) => set({ price: change.target.value === '' ? null : Number(change.target.value) })} className={input} /></Field>
              <Field title="Phone / WhatsApp"><input value={modal.hotel.phone ?? ''} onChange={(change) => set({ phone: change.target.value })} className={input} placeholder="+234…" /></Field>
              <Field title="Website or booking link" className="sm:col-span-2"><input type="url" value={modal.hotel.url ?? ''} onChange={(change) => set({ url: change.target.value })} className={input} placeholder="https://" /></Field>
              <Field title="Notes" className="sm:col-span-2"><input value={modal.hotel.notes ?? ''} onChange={(change) => set({ notes: change.target.value })} className={input} placeholder="Breakfast included, shuttle to venue…" /></Field>
              <label className="flex items-center gap-2 text-sm font-semibold sm:col-span-2"><input type="checkbox" checked={modal.hotel.conference_rate} onChange={(change) => set({ conference_rate: change.target.checked })} className="h-4 w-4" />Offers a conference rate</label>
            </div>
          </form>
        </Modal>
      )}
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
