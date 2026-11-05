'use client';

import { FormEvent, useEffect, useState } from 'react';
import type { MivEvent } from '../../lib/events';
import { errorMessage, toast } from '../../lib/toast';
import { api } from './adminApi';
import { Field, ImageInput, card, input } from './adminUi';
import { Pagination, StatusTabs, TableToolbar, primaryButton, secondaryButton, useClientTable } from './table';

type AdminEvent = MivEvent & { registrations_count: number; sort_order: number };
type Draft = {
  title: string; short_name: string; slug: string; summary: string; description: string; date_label: string;
  starts_at: string; ends_at: string; location: string; image: string; attendance_options: string[]; day_options: string[];
  is_featured: boolean; registration_open: boolean; sort_order: number;
};

const ATTENDANCE = ['Onsite', 'Online'];
const emptyDraft: Draft = { title: '', short_name: '', slug: '', summary: '', description: '', date_label: 'Date TBA', starts_at: '', ends_at: '', location: '', image: '', attendance_options: ['Onsite', 'Online'], day_options: [], is_featured: false, registration_open: true, sort_order: 100 };

/** ISO timestamp → "2027-01-19T17:00" in Lagos time for <input type="datetime-local">. */
function toLagosInput(iso: string | null) {
  if (!iso) return '';
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Lagos', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(iso)).map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}
const fromLagosInput = (value: string) => (value ? `${value}:00+01:00` : null);

function toDraft(event: AdminEvent): Draft {
  return {
    title: event.title, short_name: event.short_name, slug: event.slug, summary: event.summary ?? '', description: event.description ?? '', date_label: event.date_label,
    starts_at: toLagosInput(event.starts_at), ends_at: toLagosInput(event.ends_at), location: event.location ?? '', image: event.image ?? '',
    attendance_options: event.attendance_options, day_options: event.day_options, is_featured: event.is_featured, registration_open: event.registration_open, sort_order: event.sort_order ?? 100,
  };
}

function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (value: boolean) => void; label: string; hint: string }) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-xl bg-[#f6f2e9] p-3.5">
      <span><strong className="block text-sm">{label}</strong><span className="text-xs text-ink/55">{hint}</span></span>
      <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className={`relative h-7 w-12 shrink-0 rounded-full transition ${checked ? 'bg-[#1469a9]' : 'bg-ink/20'}`}><span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${checked ? 'left-6' : 'left-1'}`} /></button>
    </label>
  );
}

function EventForm({ initial, editingSlug, onDone, onCancel }: { initial: Draft; editingSlug: string | null; onDone: () => Promise<void>; onCancel: () => void }) {
  const [draft, setDraft] = useState<Draft>(initial);
  const [newDay, setNewDay] = useState('');
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof Draft>(field: K, value: Draft[K]) => setDraft((current) => ({ ...current, [field]: value }));

  const submit = async (formEvent: FormEvent<HTMLFormElement>) => {
    formEvent.preventDefault();
    setSaving(true);
    try {
      const body = JSON.stringify({ ...draft, starts_at: fromLagosInput(draft.starts_at), ends_at: fromLagosInput(draft.ends_at), summary: draft.summary || null, description: draft.description || null, location: draft.location || null, image: draft.image || null });
      await api(editingSlug ? `/admin/events/${editingSlug}` : '/admin/events', { method: editingSlug ? 'PATCH' : 'POST', body });
      toast.success(editingSlug ? `${draft.short_name} saved.` : `${draft.short_name} created. Add its programme under Event content.`);
      await onDone();
    } catch (error) { toast.error(errorMessage(error, 'Could not save the event.')); } finally { setSaving(false); }
  };

  return (
    <form onSubmit={submit} className="grid gap-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold">{editingSlug ? `Edit ${initial.short_name}` : 'New event'}</h2>
        <button type="button" onClick={onCancel} className="rounded-full border border-ink/15 px-4 py-2 text-xs font-bold">← Back to events</button>
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className={`${card} grid content-start gap-4 md:grid-cols-2`}>
          <Field title="Full title" className="md:col-span-2"><input required value={draft.title} onChange={(event) => set('title', event.target.value)} className={input} placeholder="International Ministers' & Leadership Conference" /></Field>
          <Field title="Short name"><input required value={draft.short_name} onChange={(event) => set('short_name', event.target.value)} className={input} placeholder="IMLC" /></Field>
          <Field title="Web address"><div className="flex items-center rounded-xl border border-ink/15 bg-white pl-3 text-sm text-ink/45 focus-within:border-[#1469a9]">/events/<input value={draft.slug} onChange={(event) => set('slug', event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))} className="min-w-0 flex-1 rounded-xl bg-transparent py-2.5 pr-3 text-ink outline-none" placeholder="from short name" /></div></Field>
          <Field title="Summary (on event cards)" className="md:col-span-2"><textarea value={draft.summary} onChange={(event) => set('summary', event.target.value)} maxLength={300} className={`${input} min-h-20`} /></Field>
          <Field title="Description" className="md:col-span-2"><textarea value={draft.description} onChange={(event) => set('description', event.target.value)} maxLength={4000} className={`${input} min-h-28`} /></Field>
          <Field title="Date shown to people"><input required value={draft.date_label} onChange={(event) => set('date_label', event.target.value)} className={input} placeholder="19–24 Jan 2027 or Date TBA" /></Field>
          <Field title="Location"><input value={draft.location} onChange={(event) => set('location', event.target.value)} className={input} placeholder="Olororo, Ojoo, Ibadan" /></Field>
          <Field title="Starts (Lagos time)"><input type="datetime-local" value={draft.starts_at} onChange={(event) => set('starts_at', event.target.value)} className={input} /></Field>
          <Field title="Ends (Lagos time)"><input type="datetime-local" value={draft.ends_at} onChange={(event) => set('ends_at', event.target.value)} className={input} /></Field>
          <div className="md:col-span-2">
            <span className="block text-xs font-bold uppercase tracking-[.08em] text-ink/50">How people can attend</span>
            <div className="mt-2 flex flex-wrap gap-2">{ATTENDANCE.map((option) => { const on = draft.attendance_options.includes(option); return <button key={option} type="button" aria-pressed={on} onClick={() => set('attendance_options', on ? draft.attendance_options.filter((item) => item !== option) : [...draft.attendance_options, option])} className={`rounded-full px-4 py-2 text-sm font-bold ${on ? 'bg-[#03284a] text-white' : 'bg-white ring-1 ring-ink/15'}`}>{option}</button>; })}</div>
          </div>
          <div className="md:col-span-2">
            <span className="block text-xs font-bold uppercase tracking-[.08em] text-ink/50">Days people choose from (optional)</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {draft.day_options.map((day) => <span key={day} className="flex items-center gap-1.5 rounded-full bg-[#e7f1fa] py-1.5 pl-3 pr-1.5 text-sm font-bold text-[#0b4779]">{day}<button type="button" onClick={() => set('day_options', draft.day_options.filter((item) => item !== day))} className="grid h-5 w-5 place-items-center rounded-full bg-white text-xs" aria-label={`Remove ${day}`}>×</button></span>)}
              <input value={newDay} onChange={(event) => setNewDay(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); const day = newDay.trim(); if (day && !draft.day_options.includes(day)) set('day_options', [...draft.day_options, day]); setNewDay(''); } }} className={`${input} w-40`} placeholder="Tue 19 + Enter" />
            </div>
          </div>
        </div>
        <div className="grid content-start gap-4">
          <div className={card}><Field title="Event photo"><ImageInput value={draft.image} onChange={(url) => set('image', url)} aspect="aspect-video" /></Field></div>
          <div className={`${card} grid gap-2`}>
            <Toggle checked={draft.registration_open} onChange={(value) => set('registration_open', value)} label="Registration open" hint="People can register from the website." />
            <Toggle checked={draft.is_featured} onChange={(value) => set('is_featured', value)} label="Featured on landing page" hint="Up to 6 featured events show on the home page." />
            <Field title="Order (lower shows first)"><input type="number" min="0" value={draft.sort_order} onChange={(event) => set('sort_order', Number(event.target.value))} className={input} /></Field>
          </div>
          <button type="submit" disabled={saving} className="rounded-full bg-[#03284a] px-6 py-3.5 text-sm font-bold text-white disabled:opacity-60">{saving ? 'Saving…' : editingSlug ? 'Save event' : 'Create event'}</button>
        </div>
      </div>
    </form>
  );
}

/** Admin list of all events with create / edit / delete. */
export default function EventsManager({ onManageContent }: { onManageContent: () => void }) {
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<AdminEvent | 'new' | null>(null);

  const load = async () => {
    try { setEvents((await api('/admin/events')).events); } catch (error) { toast.error(errorMessage(error, 'Could not load events.')); } finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  const upcoming = (event: AdminEvent) => Boolean(event.starts_at && Date.parse(event.ends_at ?? event.starts_at) >= Date.now());
  const table = useClientTable(events, {
    search: (event) => `${event.title} ${event.short_name} ${event.location ?? ''} ${event.date_label}`,
    filters: {
      registration: (event, value) => (value === 'open') === event.registration_open,
      featured: (event, value) => (value === 'yes') === event.is_featured,
      timing: (event, value) => value === 'upcoming' ? upcoming(event) : value === 'past' ? Boolean(event.starts_at) && !upcoming(event) : !event.starts_at,
    },
    date: (event) => event.starts_at,
    pageSize: 10,
  });
  const shown = table.shown;

  const quickUpdate = async (event: AdminEvent, patch: Partial<Draft>) => {
    try {
      const draft = { ...toDraft(event), ...patch };
      await api(`/admin/events/${event.slug}`, { method: 'PATCH', body: JSON.stringify({ ...draft, starts_at: fromLagosInput(draft.starts_at), ends_at: fromLagosInput(draft.ends_at), summary: draft.summary || null, description: draft.description || null, location: draft.location || null, image: draft.image || null }) });
      toast.success(`${event.short_name} updated.`);
      await load();
    } catch (error) { toast.error(errorMessage(error, 'Could not update the event.')); }
  };

  const remove = async (event: AdminEvent) => {
    if (!window.confirm(`Delete ${event.short_name}? This cannot be undone.`)) return;
    try { await api(`/admin/events/${event.slug}`, { method: 'DELETE' }); toast.success(`${event.short_name} deleted.`); await load(); } catch (error) { toast.error(errorMessage(error, 'Could not delete the event.')); }
  };

  if (editing) return <EventForm key={editing === 'new' ? 'new' : editing.slug} initial={editing === 'new' ? emptyDraft : toDraft(editing)} editingSlug={editing === 'new' ? null : editing.slug} onCancel={() => setEditing(null)} onDone={async () => { setEditing(null); await load(); }} />;
  if (loading) return <div className="h-64 animate-pulse rounded-[1.5rem] bg-white" />;

  return (
    <div className="grid gap-4">
      <StatusTabs options={[{ value: '', label: 'All' }, { value: 'open', label: 'Registration open' }, { value: 'closed', label: 'Closed' }]} value={table.values.registration ?? ''} onChange={(value) => table.setFilter('registration', value)} counts={{ '': events.length, open: events.filter((event) => event.registration_open).length, closed: events.filter((event) => !event.registration_open).length }} />
      <TableToolbar
        query={table.query} onQuery={table.setQuery} placeholder="Search events"
        filters={[{ key: 'timing', label: 'When', options: [{ value: 'upcoming', label: 'Upcoming' }, { value: 'past', label: 'Past' }, { value: 'tba', label: 'Date TBA' }] }, { key: 'featured', label: 'Featured', options: [{ value: 'yes', label: 'Featured' }, { value: 'no', label: 'Not featured' }] }]}
        values={table.values} onFilter={table.setFilter} dateRange={table.range} onDateRange={table.setRange} dateLabel="Starts" onReset={table.reset}
        actions={<><button type="button" onClick={onManageContent} className={secondaryButton}>Programme, live & hotels →</button><button type="button" onClick={() => setEditing('new')} className={primaryButton}>+ New event</button></>}
      />
      <div className="overflow-hidden rounded-[1.25rem] border border-ink/10 bg-white">
        <div className="hidden grid-cols-[minmax(0,2.4fr)_minmax(0,1.2fr)_90px_minmax(0,1.4fr)_220px] gap-4 border-b border-ink/5 px-4 py-3 text-[11px] font-bold uppercase tracking-[.1em] text-ink/40 lg:grid"><span>Event</span><span>Date</span><span>People</span><span>Status</span><span className="text-right">Actions</span></div>
        {shown.length === 0 && <p className="p-6 text-sm text-ink/55">No events match.</p>}
        {shown.map((event) => (
          <div key={event.slug} className="grid gap-3 border-b border-ink/5 px-4 py-3 last:border-0 lg:grid-cols-[minmax(0,2.4fr)_minmax(0,1.2fr)_90px_minmax(0,1.4fr)_220px] lg:items-center lg:gap-4">
            <div className="flex min-w-0 items-center gap-3"><span className="h-11 w-14 shrink-0 overflow-hidden rounded-lg bg-[#03284a]">{event.image && <img src={event.image} alt="" className="h-full w-full object-cover" />}</span><span className="min-w-0"><strong className="block truncate text-sm">{event.short_name}</strong><span className="block truncate text-xs text-ink/50">{event.title}</span></span></div>
            <span className="text-sm text-ink/70">{event.date_label}</span>
            <span className="text-sm font-bold">{event.registrations_count}</span>
            <div className="flex flex-wrap gap-1.5">
              <button type="button" onClick={() => void quickUpdate(event, { registration_open: !event.registration_open })} className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${event.registration_open ? 'bg-[#dff2e5] text-[#2f7d4f]' : 'bg-[#f1f2f4] text-ink/55'}`} title="Click to toggle">{event.registration_open ? 'Registration open' : 'Closed'}</button>
              <button type="button" onClick={() => void quickUpdate(event, { is_featured: !event.is_featured })} className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${event.is_featured ? 'bg-[#e7f1fa] text-[#0b4779]' : 'bg-[#f1f2f4] text-ink/55'}`} title="Click to toggle">{event.is_featured ? '★ Featured' : 'Not featured'}</button>
            </div>
            <div className="flex gap-2 lg:justify-end">
              <a href={`/events/${event.slug}`} target="_blank" rel="noreferrer" className="rounded-full border border-ink/15 px-3 py-1.5 text-xs font-bold">View</a>
              <button type="button" onClick={() => setEditing(event)} className="rounded-full bg-[#03284a] px-3 py-1.5 text-xs font-bold text-white">Edit</button>
              <button type="button" onClick={() => void remove(event)} className="rounded-full bg-[#fff0ee] px-3 py-1.5 text-xs font-bold text-coral">Delete</button>
            </div>
          </div>
        ))}
      </div>
      <Pagination page={table.page} pages={table.pages} total={table.total} pageSize={table.pageSize} onPage={table.setPage} onPageSize={table.setPageSize} />
      <p className="text-xs text-ink/50">Tip: click a status badge to switch it. Events with registrations can’t be deleted; close registration instead.</p>
    </div>
  );
}
