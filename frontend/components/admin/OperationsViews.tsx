'use client';

import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { errorMessage, toast } from '../../lib/toast';
import { api } from './adminApi';
import { Field, card, input } from './adminUi';
import { useEventOptions } from './PeopleViews';
import { Badge, DataTable, Modal, Pagination, StatusBadge, StatusTabs, TableToolbar, formatDate, primaryButton, secondaryButton, useClientTable, type Column } from './table';

const MEALS = ['Breakfast', 'Lunch', 'Dinner'] as const;

/* --------------------------------------------------------- Check-in & meals */

type DeskRegistration = {
  id: number; ticket_code: string; name: string; email: string; phone: string | null; role: string | null; church: string | null; approval_status: string;
  event: { slug: string; short_name: string }; attendance_mode: string | null; attendance_days: string[]; needs_accommodation: boolean; team: string | null;
  checked_in_at: string | null; meals_today: Record<string, string | null>;
};
type DeskStats = { date: string; registered: number; checked_in: number; checked_in_today: number; meals_today: Record<string, number>; recent: { type: string; name: string; ticket_code: string; at: string }[] };

const time = (iso: string | null) => iso ? new Date(iso).toLocaleTimeString('en-NG', { hour: 'numeric', minute: '2-digit', timeZone: 'Africa/Lagos' }) : '';

/**
 * Welcome desk and meal points. A barcode scanner types the ticket code and
 * presses Enter, so the code box stays focused and ready for the next scan.
 */
export function CheckInView() {
  const events = useEventOptions();
  const [eventSlug, setEventSlug] = useState('');
  const [mode, setMode] = useState<'checkin' | (typeof MEALS)[number]>('checkin');
  const [autoAction, setAutoAction] = useState(true);
  const [code, setCode] = useState('');
  const [current, setCurrent] = useState<DeskRegistration | null>(null);
  const [stats, setStats] = useState<DeskStats | null>(null);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<'ok' | 'error' | null>(null);
  const codeInput = useRef<HTMLInputElement>(null);

  useEffect(() => { if (!eventSlug && events[0]) setEventSlug(events[0].slug); }, [events, eventSlug]);

  const loadStats = useCallback(async () => {
    if (!eventSlug) return;
    try { setStats(await api(`/admin/check-in/events/${eventSlug}`)); } catch { /* stats are best effort */ }
  }, [eventSlug]);
  useEffect(() => { void loadStats(); const timer = window.setInterval(() => void loadStats(), 30_000); return () => window.clearInterval(timer); }, [loadStats]);

  const signal = (tone: 'ok' | 'error') => { setFlash(tone); window.setTimeout(() => setFlash(null), 900); };

  const act = async (registration: DeskRegistration, action: typeof mode) => {
    setBusy(true);
    try {
      const data = action === 'checkin'
        ? await api(`/admin/check-in/${registration.id}`, { method: 'POST' })
        : await api(`/admin/check-in/${registration.id}/meals`, { method: 'POST', body: JSON.stringify({ meal: action }) });
      setCurrent(data.registration);
      toast.success(data.message);
      signal('ok');
      void loadStats();
    } catch (error) { toast.error(errorMessage(error, 'Could not record that.')); signal('error'); } finally { setBusy(false); codeInput.current?.focus(); }
  };

  const lookup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = code.trim();
    if (!value) return;
    setBusy(true);
    try {
      const data = await api(`/admin/check-in/lookup?code=${encodeURIComponent(value)}&event=${encodeURIComponent(eventSlug)}`);
      setCurrent(data.registration);
      setCode('');
      setBusy(false);
      const already = mode === 'checkin' ? data.registration.checked_in_at : data.registration.meals_today[mode];
      if (autoAction && !already) await act(data.registration, mode);
      else if (already) { toast.warning(mode === 'checkin' ? `Already checked in at ${time(already)}.` : `${mode} already served at ${time(already)}.`, { title: data.registration.name }); signal('error'); }
    } catch (error) { setCurrent(null); toast.error(errorMessage(error, 'Ticket not found.')); signal('error'); setBusy(false); }
    codeInput.current?.focus();
  };

  const undo = async () => {
    if (!current || !window.confirm(`Undo check-in for ${current.name}?`)) return;
    try { const data = await api(`/admin/check-in/${current.id}`, { method: 'DELETE' }); setCurrent(data.registration); toast.info(data.message); void loadStats(); } catch (error) { toast.error(errorMessage(error, 'Could not undo.')); }
  };

  return (
    <div className="grid gap-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <div className={card}><span className="text-xs font-bold uppercase tracking-[.1em] text-ink/45">Checked in</span><strong className="mt-1 block text-3xl">{stats?.checked_in ?? '—'}<span className="text-base font-semibold text-ink/40"> / {stats?.registered ?? '—'}</span></strong><span className="text-xs text-ink/50">{stats?.checked_in_today ?? 0} today</span></div>
        {MEALS.map((meal) => <div key={meal} className={card}><span className="text-xs font-bold uppercase tracking-[.1em] text-ink/45">{meal} today</span><strong className="mt-1 block text-3xl">{stats?.meals_today[meal] ?? 0}</strong></div>)}
        <div className={card}><span className="text-xs font-bold uppercase tracking-[.1em] text-ink/45">Desk date</span><strong className="mt-1 block text-lg">{stats ? new Date(`${stats.date}T12:00:00Z`).toLocaleDateString('en-NG', { weekday: 'short', day: 'numeric', month: 'short' }) : '—'}</strong><span className="text-xs text-ink/50">Lagos time · refreshes every 30s</span></div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <section className={`${card} grid content-start gap-4 transition ${flash === 'ok' ? 'ring-4 ring-[#2f7d4f]/40' : flash === 'error' ? 'ring-4 ring-coral/40' : ''}`}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field title="Event"><select value={eventSlug} onChange={(event) => setEventSlug(event.target.value)} className={input}>{events.map((event) => <option key={event.slug} value={event.slug}>{event.short_name}</option>)}</select></Field>
            <Field title="This desk is for"><select value={mode} onChange={(event) => setMode(event.target.value as typeof mode)} className={input}><option value="checkin">Welcome desk (check-in)</option>{MEALS.map((meal) => <option key={meal} value={meal}>{meal} point</option>)}</select></Field>
          </div>
          <form onSubmit={lookup} className="flex gap-2">
            <input ref={codeInput} autoFocus value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} className="h-14 min-w-0 flex-1 rounded-2xl border-2 border-[#03284a]/20 bg-white px-4 font-mono text-lg font-bold tracking-[.08em] outline-none focus:border-[#1469a9]" placeholder="Scan or type ticket code" aria-label="Ticket code" autoComplete="off" />
            <button type="submit" disabled={busy || !code.trim()} className={`${primaryButton} h-14 px-6`}>{busy ? '…' : 'Find'}</button>
          </form>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={autoAction} onChange={(event) => setAutoAction(event.target.checked)} className="h-4 w-4" />{mode === 'checkin' ? 'Check in automatically after each scan' : `Serve ${mode.toLowerCase()} automatically after each scan`}</label>

          {current ? (
            <div className="rounded-2xl border border-ink/10 bg-[#fafaf8] p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0"><strong className="block text-xl">{current.name}</strong><span className="block text-sm text-ink/55">{[current.role, current.church].filter(Boolean).join(' · ')}</span><span className="mt-1 block font-mono text-xs text-ink/50">{current.ticket_code} · {current.event.short_name}</span></div>
                {current.checked_in_at ? <Badge tone="green">Checked in {time(current.checked_in_at)}</Badge> : <Badge tone="amber">Not checked in</Badge>}
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {current.approval_status !== 'approved' && <StatusBadge status={current.approval_status} />}
                {current.attendance_mode && <Badge>{current.attendance_mode}</Badge>}
                {current.team && <Badge tone="blue">Team: {current.team}</Badge>}
                {current.needs_accommodation && <Badge tone="blue">Needs accommodation</Badge>}
                {current.attendance_days.length > 0 && <Badge>{current.attendance_days.join(', ')}</Badge>}
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-4">
                <button type="button" disabled={busy || Boolean(current.checked_in_at)} onClick={() => void act(current, 'checkin')} className={`${primaryButton} sm:col-span-1`}>{current.checked_in_at ? '✓ In' : 'Check in'}</button>
                {MEALS.map((meal) => <button key={meal} type="button" disabled={busy || Boolean(current.meals_today[meal])} onClick={() => void act(current, meal)} className={current.meals_today[meal] ? 'rounded-full bg-[#dff2e5] px-3 py-2.5 text-sm font-bold text-[#2f7d4f]' : secondaryButton}>{current.meals_today[meal] ? `✓ ${meal} ${time(current.meals_today[meal])}` : `Serve ${meal}`}</button>)}
              </div>
              {current.checked_in_at && <button type="button" onClick={() => void undo()} className="mt-3 text-xs font-bold text-coral">Undo check-in</button>}
            </div>
          ) : <p className="rounded-2xl border-2 border-dashed border-ink/10 p-6 text-center text-sm text-ink/50">Scan a ticket barcode from the delegate’s pass (My pass on their dashboard).</p>}
        </section>

        <section className={card}>
          <h3 className="text-sm font-bold">Latest activity</h3>
          <ul className="m-0 mt-3 grid list-none gap-1.5 p-0">
            {(stats?.recent.length ?? 0) === 0 && <li className="text-sm text-ink/50">No scans yet today.</li>}
            {stats?.recent.map((item, index) => <li key={`${item.at}-${index}`} className="flex items-center gap-3 rounded-xl bg-[#fafaf8] px-3 py-2 text-sm"><Badge tone={item.type === 'Check-in' ? 'navy' : 'green'}>{item.type}</Badge><span className="min-w-0 flex-1 truncate font-semibold">{item.name}</span><span className="shrink-0 text-xs text-ink/50">{time(item.at)}</span></li>)}
          </ul>
        </section>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- Broadcasts */

type Broadcast = { id: number; title: string; body: string; scheduled_at: string | null; status: string; created_at: string | null };

export function BroadcastsView() {
  const [items, setItems] = useState<Broadcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [composing, setComposing] = useState(false);
  const [reading, setReading] = useState<Broadcast | null>(null);
  const [form, setForm] = useState({ title: '', body: '', status: 'draft', scheduled_at: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try { setItems((await api('/admin/broadcasts')).broadcasts); } catch (error) { toast.error(errorMessage(error, 'Could not load broadcasts.')); } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const table = useClientTable(items, { search: (item) => `${item.title} ${item.body}`, filters: { status: (item, value) => item.status === value }, date: (item) => item.scheduled_at ?? item.created_at });
  const counts = items.reduce<Record<string, number>>((result, item) => ({ ...result, [item.status]: (result[item.status] ?? 0) + 1 }), { '': items.length });

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (form.status === 'sent' && !window.confirm('Send this broadcast by email to every verified delegate now?')) return;
    setSaving(true);
    try {
      const data = await api('/admin/broadcasts', { method: 'POST', body: JSON.stringify({ title: form.title, body: form.body, status: form.status, scheduled_at: form.status === 'scheduled' && form.scheduled_at ? `${form.scheduled_at}:00+01:00` : null }) });
      toast.success(form.status === 'sent' ? `Sent to ${data.recipients ?? 0} delegates.` : 'Broadcast saved.');
      setForm({ title: '', body: '', status: 'draft', scheduled_at: '' });
      setComposing(false);
      await load();
    } catch (error) { toast.error(errorMessage(error, 'Could not save the broadcast.')); } finally { setSaving(false); }
  };

  const columns: Column<Broadcast>[] = [
    { key: 'title', header: 'Title', cell: (item) => <div className="min-w-0 max-w-[460px]"><strong className="block truncate">{item.title}</strong><span className="block truncate text-xs text-ink/50">{item.body}</span></div> },
    { key: 'status', header: 'Status', cell: (item) => <StatusBadge status={item.status} /> },
    { key: 'when', header: 'Date', cell: (item) => <span className="whitespace-nowrap text-ink/60">{item.status === 'scheduled' && item.scheduled_at ? `For ${formatDate(item.scheduled_at, true)}` : formatDate(item.created_at, true)}</span> },
  ];

  return (
    <div className="grid gap-4">
      <StatusTabs options={[{ value: '', label: 'All' }, { value: 'sent', label: 'Sent' }, { value: 'scheduled', label: 'Scheduled' }, { value: 'draft', label: 'Drafts' }, { value: 'failed', label: 'Failed' }]} value={table.values.status ?? ''} onChange={(value) => table.setFilter('status', value)} counts={counts} />
      <TableToolbar query={table.query} onQuery={table.setQuery} placeholder="Search title or message" values={table.values} onFilter={table.setFilter} dateRange={table.range} onDateRange={table.setRange} onReset={table.reset} actions={<button type="button" onClick={() => setComposing(true)} className={primaryButton}>+ New broadcast</button>} />
      <DataTable columns={columns} rows={table.shown} rowKey={(item) => item.id} loading={loading} onRowClick={setReading} empty="No broadcasts yet." />
      <Pagination page={table.page} pages={table.pages} total={table.total} pageSize={table.pageSize} onPage={table.setPage} onPageSize={table.setPageSize} />

      {composing && (
        <Modal title="New broadcast" subtitle="Shows on every delegate’s dashboard. “Send now” also emails verified delegates." onClose={() => setComposing(false)} footer={<><button type="button" onClick={() => setComposing(false)} className={secondaryButton}>Cancel</button><button type="submit" form="broadcast-form" disabled={saving} className={primaryButton}>{saving ? 'Saving…' : form.status === 'sent' ? 'Send now' : form.status === 'scheduled' ? 'Schedule' : 'Save draft'}</button></>}>
          <form id="broadcast-form" onSubmit={submit} className="grid gap-4">
            <Field title="Title"><input required maxLength={160} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} className={input} /></Field>
            <Field title="Message"><textarea required maxLength={4000} value={form.body} onChange={(event) => setForm({ ...form, body: event.target.value })} className={`${input} min-h-36`} /></Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field title="When"><select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })} className={input}><option value="draft">Save as draft</option><option value="scheduled">Schedule for later</option><option value="sent">Send now</option></select></Field>
              {form.status === 'scheduled' && <Field title="Show from (Lagos time)"><input required type="datetime-local" value={form.scheduled_at} onChange={(event) => setForm({ ...form, scheduled_at: event.target.value })} className={input} /></Field>}
            </div>
          </form>
        </Modal>
      )}
      {reading && <Modal title={reading.title} subtitle={`${reading.status} · ${formatDate(reading.scheduled_at ?? reading.created_at, true)}`} onClose={() => setReading(null)}><p className="whitespace-pre-line text-sm leading-7 text-ink/80">{reading.body}</p></Modal>}
    </div>
  );
}

/* -------------------------------------------------------------- Testimonies */

type Testimony = { id: number; name: string; email: string; content: string; topic: string | null; event: string | null; event_slug: string | null; status: string; show_name: boolean; created_at: string | null; published_at: string | null };

export function TestimoniesView() {
  const events = useEventOptions();
  const [items, setItems] = useState<Testimony[]>([]);
  const [loading, setLoading] = useState(true);
  const [reading, setReading] = useState<Testimony | null>(null);

  const load = useCallback(async () => {
    try { setItems((await api('/admin/testimonials')).testimonials); } catch (error) { toast.error(errorMessage(error, 'Could not load testimonies.')); } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const table = useClientTable(items, { search: (item) => `${item.name} ${item.email} ${item.content} ${item.topic ?? ''}`, filters: { status: (item, value) => item.status === value, event: (item, value) => item.event_slug === value, topic: (item, value) => item.topic === value }, date: (item) => item.created_at });
  const counts = items.reduce<Record<string, number>>((result, item) => ({ ...result, [item.status]: (result[item.status] ?? 0) + 1 }), { '': items.length });
  const topics = [...new Set(items.map((item) => item.topic).filter(Boolean))] as string[];

  const review = async (item: Testimony, status: 'approved' | 'rejected' | 'pending') => {
    try {
      await api(`/admin/testimonials/${item.id}/review`, { method: 'PATCH', body: JSON.stringify({ status }) });
      toast.success(status === 'approved' ? 'Published.' : status === 'rejected' ? 'Declined.' : 'Moved back to pending.');
      setReading(null);
      await load();
    } catch (error) { toast.error(errorMessage(error, 'Could not update the testimony.')); }
  };

  const actions = (item: Testimony) => <div className="flex justify-end gap-1.5" onClick={(event) => event.stopPropagation()}>
    {item.status !== 'published' && <button type="button" onClick={() => void review(item, 'approved')} className="rounded-full bg-[#dff2e5] px-3 py-1 text-xs font-bold text-[#2f7d4f]">Publish</button>}
    {item.status !== 'rejected' && <button type="button" onClick={() => void review(item, 'rejected')} className="rounded-full bg-[#fff0ee] px-3 py-1 text-xs font-bold text-coral">{item.status === 'published' ? 'Unpublish' : 'Decline'}</button>}
  </div>;

  const columns: Column<Testimony>[] = [
    { key: 'who', header: 'From', cell: (item) => <div className="min-w-0"><strong className="block truncate">{item.name}{!item.show_name && <span className="ml-1 text-xs font-normal text-ink/45">(anonymous)</span>}</strong><span className="block truncate text-xs text-ink/50">{item.email}</span></div> },
    { key: 'text', header: 'Testimony', cell: (item) => <span className="line-clamp-2 max-w-[420px] text-ink/75">{item.content}</span> },
    { key: 'meta', header: 'Event / topic', cell: (item) => <div className="flex flex-wrap justify-end gap-1 md:justify-start">{item.event && <Badge tone="blue">{item.event}</Badge>}{item.topic && <Badge>{item.topic}</Badge>}</div> },
    { key: 'status', header: 'Status', cell: (item) => <StatusBadge status={item.status} /> },
    { key: 'date', header: 'Submitted', cell: (item) => <span className="whitespace-nowrap text-ink/60">{formatDate(item.created_at)}</span> },
    { key: 'actions', header: <span className="sr-only">Actions</span>, className: 'text-right', cell: actions },
  ];

  return (
    <div className="grid gap-4">
      <StatusTabs options={[{ value: '', label: 'All' }, { value: 'pending', label: 'Pending' }, { value: 'published', label: 'Published' }, { value: 'rejected', label: 'Declined' }]} value={table.values.status ?? ''} onChange={(value) => table.setFilter('status', value)} counts={counts} />
      <TableToolbar query={table.query} onQuery={table.setQuery} placeholder="Search name, email or words in the testimony" filters={[{ key: 'event', label: 'Event', options: events.map((event) => ({ value: event.slug, label: event.short_name })) }, { key: 'topic', label: 'Topic', options: topics.map((topic) => ({ value: topic, label: topic })) }]} values={table.values} onFilter={table.setFilter} dateRange={table.range} onDateRange={table.setRange} dateLabel="Submitted" onReset={table.reset} />
      <DataTable columns={columns} rows={table.shown} rowKey={(item) => item.id} loading={loading} onRowClick={setReading} empty="No testimonies match." />
      <Pagination page={table.page} pages={table.pages} total={table.total} pageSize={table.pageSize} onPage={table.setPage} onPageSize={table.setPageSize} />
      {reading && (
        <Modal title={`Testimony from ${reading.name}`} subtitle={`${reading.event ?? 'General'} · ${reading.topic ?? 'No topic'} · ${formatDate(reading.created_at, true)}`} onClose={() => setReading(null)} footer={<><StatusBadge status={reading.status} /><span className="flex-1" />{reading.status !== 'pending' && <button type="button" onClick={() => void review(reading, 'pending')} className={secondaryButton}>Back to pending</button>}{actions(reading)}</>}>
          <p className="whitespace-pre-line leading-7 text-ink/80">{reading.content}</p>
          <p className="mt-4 text-xs text-ink/50">{reading.show_name ? 'Name will be shown when published.' : 'Will be published anonymously as “A delegate”.'} · {reading.email}</p>
        </Modal>
      )}
    </div>
  );
}

/* -------------------------------------------------------- Partner enquiries */

type Enquiry = { id: number; name: string; email: string; phone: string | null; organization: string | null; message: string; status: 'new' | 'contacted' | 'closed'; created_at: string | null };

export function PartnerEnquiriesView() {
  const [items, setItems] = useState<Enquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [reading, setReading] = useState<Enquiry | null>(null);

  const load = useCallback(async () => {
    try { setItems((await api('/admin/partner-inquiries')).inquiries); } catch (error) { toast.error(errorMessage(error, 'Could not load enquiries.')); } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  // Messages are stored as "Partnership type: message".
  const typeOf = (item: Enquiry) => item.message.includes(':') ? item.message.split(':')[0].trim() : 'General';
  const table = useClientTable(items, { search: (item) => `${item.name} ${item.email} ${item.phone ?? ''} ${item.organization ?? ''} ${item.message}`, filters: { status: (item, value) => item.status === value, type: (item, value) => typeOf(item) === value }, date: (item) => item.created_at });
  const counts = items.reduce<Record<string, number>>((result, item) => ({ ...result, [item.status]: (result[item.status] ?? 0) + 1 }), { '': items.length });
  const types = [...new Set(items.map(typeOf))];

  const setStatus = async (item: Enquiry, status: Enquiry['status']) => {
    try { await api(`/admin/partner-inquiries/${item.id}/review`, { method: 'PATCH', body: JSON.stringify({ status }) }); toast.success(`Marked as ${status}.`); setReading((current) => current && current.id === item.id ? { ...current, status } : current); await load(); } catch (error) { toast.error(errorMessage(error, 'Could not update the enquiry.')); }
  };

  const columns: Column<Enquiry>[] = [
    { key: 'who', header: 'Partner', cell: (item) => <div className="min-w-0"><strong className="block truncate">{item.name}</strong><span className="block truncate text-xs text-ink/50">{item.organization ?? item.email}</span></div> },
    { key: 'type', header: 'Type', cell: (item) => <Badge tone="blue">{typeOf(item)}</Badge> },
    { key: 'contact', header: 'Contact', cell: (item) => <div className="text-xs"><a href={`mailto:${item.email}`} onClick={(event) => event.stopPropagation()} className="block text-[#1469a9]">{item.email}</a>{item.phone && <a href={`tel:${item.phone}`} onClick={(event) => event.stopPropagation()} className="block text-ink/60">{item.phone}</a>}</div> },
    { key: 'status', header: 'Status', cell: (item) => <select value={item.status} onClick={(event) => event.stopPropagation()} onChange={(event) => void setStatus(item, event.target.value as Enquiry['status'])} className="rounded-full border border-ink/15 bg-white px-2 py-1 text-xs font-bold" aria-label="Status"><option value="new">New</option><option value="contacted">Contacted</option><option value="closed">Closed</option></select> },
    { key: 'date', header: 'Received', cell: (item) => <span className="whitespace-nowrap text-ink/60">{formatDate(item.created_at)}</span> },
  ];

  return (
    <div className="grid gap-4">
      <StatusTabs options={[{ value: '', label: 'All' }, { value: 'new', label: 'New' }, { value: 'contacted', label: 'Contacted' }, { value: 'closed', label: 'Closed' }]} value={table.values.status ?? ''} onChange={(value) => table.setFilter('status', value)} counts={counts} />
      <TableToolbar query={table.query} onQuery={table.setQuery} placeholder="Search name, organisation, email or message" filters={[{ key: 'type', label: 'Partnership type', options: types.map((type) => ({ value: type, label: type })) }]} values={table.values} onFilter={table.setFilter} dateRange={table.range} onDateRange={table.setRange} dateLabel="Received" onReset={table.reset} />
      <DataTable columns={columns} rows={table.shown} rowKey={(item) => item.id} loading={loading} onRowClick={setReading} empty="No enquiries match." />
      <Pagination page={table.page} pages={table.pages} total={table.total} pageSize={table.pageSize} onPage={table.setPage} onPageSize={table.setPageSize} />
      {reading && (
        <Modal title={reading.name} subtitle={`${reading.organization ?? 'Individual'} · ${formatDate(reading.created_at, true)}`} onClose={() => setReading(null)} footer={<>
          <a href={`mailto:${reading.email}?subject=${encodeURIComponent('Partnering with MIV')}`} className={secondaryButton}>Email</a>
          {reading.phone && <a href={`https://wa.me/${reading.phone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer" className={secondaryButton}>WhatsApp</a>}
          {reading.status !== 'contacted' && <button type="button" onClick={() => void setStatus(reading, 'contacted')} className={primaryButton}>Mark contacted</button>}
          {reading.status !== 'closed' && <button type="button" onClick={() => void setStatus(reading, 'closed')} className={secondaryButton}>Close</button>}
        </>}>
          <div className="flex flex-wrap gap-1.5"><StatusBadge status={reading.status} /><Badge tone="blue">{typeOf(reading)}</Badge></div>
          <p className="mt-4 whitespace-pre-line leading-7 text-ink/80">{reading.message.includes(':') ? reading.message.slice(reading.message.indexOf(':') + 1).trim() : reading.message}</p>
          <p className="mt-4 text-sm text-ink/60">{reading.email}{reading.phone ? ` · ${reading.phone}` : ''}</p>
        </Modal>
      )}
    </div>
  );
}
