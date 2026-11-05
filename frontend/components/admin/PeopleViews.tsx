'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { errorMessage, toast } from '../../lib/toast';
import { api } from './adminApi';
import { Field, card, input } from './adminUi';
import { Badge, DataTable, Modal, Pagination, StatusBadge, StatusTabs, TableToolbar, dangerButton, formatDate, primaryButton, secondaryButton, useClientTable, type Column } from './table';

type EventOption = { slug: string; short_name: string };
type RegistrantEvent = { registration_id: number; slug: string; short_name: string; ticket_code: string; attendance_mode: string | null; team: string | null; checked_in_at: string | null };
type Registrant = { id: number; name: string; email: string; phone: string | null; role: string | null; church: string | null; state_country: string | null; approval_status: string; verified: boolean; verified_at: string | null; created_at: string | null; events: RegistrantEvent[] };
type Meta = { page: number; last_page: number; per_page: number; total: number };

const ROLES = ['Delegate', 'Minister', 'Leader', 'International delegate', 'Guest'];
const STATUSES = [{ value: '', label: 'All' }, { value: 'pending', label: 'Pending' }, { value: 'approved', label: 'Approved' }, { value: 'rejected', label: 'Rejected' }];

export function useEventOptions() {
  const [events, setEvents] = useState<EventOption[]>([]);
  useEffect(() => { void api('/admin/events').then((data) => setEvents(data.events.map((event: EventOption) => ({ slug: event.slug, short_name: event.short_name })))).catch(() => undefined); }, []);
  return events;
}

/* ------------------------------------------------------------ Registrants */

function EmailBadge({ verified }: { verified: boolean }) {
  return verified ? <Badge tone="green">✓ Email verified</Badge> : <Badge tone="amber">Email not verified</Badge>;
}

function RegistrantDetail({ person, onClose, onReview, onResend }: { person: Registrant; onClose: () => void; onReview: (ids: number[], status: string) => Promise<void>; onResend: (person: Registrant) => Promise<void> }) {
  const [sending, setSending] = useState(false);
  return (
    <Modal title={person.name} subtitle={person.email} onClose={onClose} size="lg" footer={<>
      {person.approval_status !== 'rejected' && <button type="button" onClick={() => void onReview([person.id], 'rejected').then(onClose)} className={dangerButton}>Reject</button>}
      {person.approval_status !== 'approved' && <button type="button" onClick={() => void onReview([person.id], 'approved').then(onClose)} className={primaryButton}>Approve</button>}
    </>}>
      <dl className="grid gap-3 sm:grid-cols-2">
        {[['Status', <StatusBadge key="s" status={person.approval_status} />], ['Phone', person.phone ?? '—'], ['Attends as', person.role ?? '—'], ['Church / ministry', person.church ?? '—'], ['State / country', person.state_country ?? '—'], ['Registered', formatDate(person.created_at, true)]].map(([label, value]) => <div key={String(label)} className="rounded-xl bg-white p-3"><dt className="text-[11px] font-bold uppercase tracking-[.08em] text-ink/45">{label}</dt><dd className="m-0 mt-1 text-sm font-semibold">{value}</dd></div>)}
      </dl>
      <div className={`mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl p-3 ${person.verified ? 'bg-[#eef8f1]' : 'bg-[#fff8e6]'}`}>
        <div><EmailBadge verified={person.verified} /><p className="mt-1 text-xs text-ink/60">{person.verified ? `Confirmed ${formatDate(person.verified_at, true)}` : 'They have not entered the code or clicked the link we emailed. They cannot sign in until they do.'}</p></div>
        {!person.verified && <button type="button" disabled={sending} onClick={() => { setSending(true); void onResend(person).finally(() => setSending(false)); }} className={secondaryButton}>{sending ? 'Sending…' : 'Resend verification email'}</button>}
      </div>
      <h3 className="mt-5 text-sm font-bold">Events</h3>
      <div className="mt-2 grid gap-2">
        {person.events.length === 0 && <p className="text-sm text-ink/55">Not registered for any event yet.</p>}
        {person.events.map((event) => <div key={event.registration_id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white p-3 text-sm"><span><strong>{event.short_name}</strong> <span className="font-mono text-xs text-ink/55">{event.ticket_code}</span></span><span className="flex flex-wrap gap-1.5">{event.attendance_mode && <Badge>{event.attendance_mode}</Badge>}{event.team && <Badge tone="blue">{event.team}</Badge>}{event.checked_in_at ? <Badge tone="green">Checked in</Badge> : <Badge>Not checked in</Badge>}</span></div>)}
      </div>
    </Modal>
  );
}

/** Registrants list; `approvals` mode starts on pending with bulk approve. */
export function RegistrantsView({ approvals = false }: { approvals?: boolean }) {
  const events = useEventOptions();
  const [rows, setRows] = useState<Registrant[]>([]);
  const [meta, setMeta] = useState<Meta>({ page: 1, last_page: 1, per_page: 15, total: 0 });
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({ status: approvals ? 'pending' : '' });
  const [range, setRange] = useState({ from: '', to: '' });
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(15);
  const [selected, setSelected] = useState<number[]>([]);
  const [viewing, setViewing] = useState<Registrant | null>(null);

  useEffect(() => { const timer = window.setTimeout(() => setDebounced(query), 300); return () => window.clearTimeout(timer); }, [query]);
  useEffect(() => { setPage(1); setSelected([]); }, [debounced, filters, range, perPage]);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), per_page: String(perPage) });
    if (debounced) params.set('search', debounced);
    Object.entries(filters).forEach(([key, value]) => { if (value) params.set(key, value); });
    if (range.from) params.set('from', range.from);
    if (range.to) params.set('to', range.to);
    try {
      const data = await api(`/admin/registrants?${params.toString()}`);
      setRows(data.data); setMeta(data.meta); setCounts({ ...data.counts, '': data.counts.all ?? 0 });
    } catch (error) { toast.error(errorMessage(error, 'Could not load registrants.')); } finally { setLoading(false); }
  }, [page, perPage, debounced, filters, range]);

  useEffect(() => { void load(); }, [load]);

  const review = async (ids: number[], status: string) => {
    try {
      const data = await api('/admin/registrants/review', { method: 'PATCH', body: JSON.stringify({ ids, status }) });
      toast.success(data.message);
      setSelected([]);
      await load();
    } catch (error) { toast.error(errorMessage(error, 'Could not update registrants.')); }
  };

  const resend = async (person: Registrant) => {
    try { const data = await api(`/admin/registrants/${person.id}/resend-verification`, { method: 'POST' }); toast.success(data.message); } catch (error) { toast.error(errorMessage(error, 'Could not send the email.')); }
  };

  const allSelected = rows.length > 0 && rows.every((row) => selected.includes(row.id));
  const columns: Column<Registrant>[] = [
    { key: 'select', header: <input type="checkbox" checked={allSelected} onChange={() => setSelected(allSelected ? [] : rows.map((row) => row.id))} aria-label="Select all on this page" className="h-4 w-4" />, cell: (row) => <input type="checkbox" checked={selected.includes(row.id)} onClick={(event) => event.stopPropagation()} onChange={() => setSelected((current) => current.includes(row.id) ? current.filter((id) => id !== row.id) : [...current, row.id])} aria-label={`Select ${row.name}`} className="h-4 w-4" />, className: 'w-10' },
    { key: 'name', header: 'Name', cell: (row) => <div className="min-w-0"><strong className="block truncate">{row.name}</strong><span className="flex items-center gap-1.5 text-xs text-ink/50"><span className="truncate">{row.email}</span>{row.verified ? <span title={`Email verified ${formatDate(row.verified_at)}`} className="shrink-0 font-bold text-[#2f7d4f]">✓</span> : <span title="Email not verified" className="shrink-0 rounded-full bg-[#fff4d9] px-1.5 text-[10px] font-bold text-[#9a6814]">unverified</span>}</span></div> },
    { key: 'role', header: 'Attends as', cell: (row) => <span className="text-ink/70">{row.role ?? '—'}</span> },
    { key: 'events', header: 'Events', cell: (row) => <div className="flex flex-wrap justify-end gap-1 md:justify-start">{row.events.length ? row.events.map((event) => <Badge key={event.registration_id} tone="blue">{event.short_name}</Badge>) : <span className="text-xs text-ink/40">None</span>}</div> },
    { key: 'status', header: 'Status', cell: (row) => <StatusBadge status={row.approval_status} /> },
    { key: 'date', header: 'Registered', cell: (row) => <span className="whitespace-nowrap text-ink/60">{formatDate(row.created_at)}</span> },
    { key: 'actions', header: <span className="sr-only">Actions</span>, className: 'text-right', cell: (row) => <div className="flex justify-end gap-1.5" onClick={(event) => event.stopPropagation()}>
      {row.approval_status !== 'approved' && <button type="button" onClick={() => void review([row.id], 'approved')} className="rounded-full bg-[#dff2e5] px-3 py-1 text-xs font-bold text-[#2f7d4f]">Approve</button>}
      {row.approval_status !== 'rejected' && <button type="button" onClick={() => void review([row.id], 'rejected')} className="rounded-full bg-[#fff0ee] px-3 py-1 text-xs font-bold text-coral">Reject</button>}
    </div> },
  ];

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <StatusTabs options={STATUSES} value={filters.status ?? ''} onChange={(status) => setFilters((current) => ({ ...current, status }))} counts={counts} />
        <div className="flex gap-1.5 text-xs font-bold" role="group" aria-label="Email verification">
          {[{ value: 'yes', label: `✓ ${counts.verified ?? 0} verified`, on: 'bg-[#2f7d4f] text-white', off: 'bg-[#dff2e5] text-[#2f7d4f]' }, { value: 'no', label: `${counts.unverified ?? 0} not verified`, on: 'bg-[#9a6814] text-white', off: 'bg-[#fff4d9] text-[#9a6814]' }].map((chip) => <button key={chip.value} type="button" aria-pressed={filters.verified === chip.value} onClick={() => setFilters((current) => ({ ...current, verified: current.verified === chip.value ? '' : chip.value }))} className={`rounded-full px-3 py-1.5 transition ${filters.verified === chip.value ? chip.on : chip.off}`}>{chip.label}</button>)}
        </div>
      </div>
      <TableToolbar
        query={query} onQuery={setQuery} placeholder="Name, email, phone, church or ticket code"
        filters={[{ key: 'verified', label: 'Email', options: [{ value: 'yes', label: 'Verified' }, { value: 'no', label: 'Not verified' }] }, { key: 'event', label: 'Event', options: events.map((event) => ({ value: event.slug, label: event.short_name })) }, { key: 'role', label: 'Attends as', options: ROLES.map((role) => ({ value: role, label: role })) }]}
        values={filters} onFilter={(key, value) => setFilters((current) => ({ ...current, [key]: value }))}
        dateRange={range} onDateRange={setRange} dateLabel="Registered"
        onReset={() => { setQuery(''); setFilters({ status: approvals ? 'pending' : '' }); setRange({ from: '', to: '' }); }}
      />
      {selected.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-[#03284a] px-4 py-2.5 text-sm text-white">
          <span>{selected.length} selected</span>
          <div className="flex gap-2"><button type="button" onClick={() => void review(selected, 'approved')} className="rounded-full bg-white px-4 py-1.5 text-xs font-bold text-[#03284a]">Approve selected</button><button type="button" onClick={() => void review(selected, 'rejected')} className="rounded-full bg-white/15 px-4 py-1.5 text-xs font-bold">Reject selected</button><button type="button" onClick={() => setSelected([])} className="px-2 text-xs font-bold text-white/70">Clear</button></div>
        </div>
      )}
      <DataTable columns={columns} rows={rows} rowKey={(row) => row.id} loading={loading && rows.length === 0} onRowClick={setViewing} empty={approvals && !filters.event && !debounced ? 'No one is waiting for approval.' : 'No registrants match.'} />
      <Pagination page={meta.page} pages={meta.last_page} total={meta.total} pageSize={meta.per_page} onPage={setPage} onPageSize={setPerPage} />
      {viewing && <RegistrantDetail person={viewing} onClose={() => setViewing(null)} onReview={review} onResend={resend} />}
    </div>
  );
}

/* ------------------------------------------------------------------ Teams */

type Team = { id: number; name: string; code: string; event: EventOption; leader: { id: number; name: string; email: string } | null; capacity: number | null; members_count: number; notes: string | null; created_at: string | null };
type Member = { registration_id: number; user_id: number; name: string; email: string; phone: string | null; church: string | null; ticket_code: string; attendance_mode: string | null };

function TeamForm({ team, events, eventSlug, onClose, onSaved }: { team: Team | null; events: EventOption[]; eventSlug: string; onClose: () => void; onSaved: () => Promise<void> }) {
  const [form, setForm] = useState({ event: team?.event.slug ?? eventSlug ?? events[0]?.slug ?? '', name: team?.name ?? '', capacity: team?.capacity ? String(team.capacity) : '', notes: team?.notes ?? '', leader_id: team?.leader?.id ?? null as number | null });
  const [saving, setSaving] = useState(false);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    try {
      const body = { name: form.name, capacity: form.capacity ? Number(form.capacity) : null, notes: form.notes || null, leader_id: form.leader_id, ...(team ? {} : { event: form.event }) };
      const data = await api(team ? `/admin/teams/${team.id}` : '/admin/teams', { method: team ? 'PATCH' : 'POST', body: JSON.stringify(body) });
      toast.success(data.message);
      await onSaved();
      onClose();
    } catch (error) { toast.error(errorMessage(error, 'Could not save the team.')); } finally { setSaving(false); }
  };
  return (
    <Modal title={team ? `Edit ${team.name}` : 'New team'} subtitle={team ? `Code ${team.code}` : 'A join code is created automatically.'} onClose={onClose} footer={<><button type="button" onClick={onClose} className={secondaryButton}>Cancel</button><button type="submit" form="team-form" disabled={saving} className={primaryButton}>{saving ? 'Saving…' : team ? 'Save team' : 'Create team'}</button></>}>
      <form id="team-form" onSubmit={submit} className="grid gap-4">
        {!team && <Field title="Event"><select required value={form.event} onChange={(event) => setForm({ ...form, event: event.target.value })} className={input}>{events.map((event) => <option key={event.slug} value={event.slug}>{event.short_name}</option>)}</select></Field>}
        <Field title="Team name"><input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className={input} placeholder="e.g. Redemption Faith Church, Ibadan" /></Field>
        <Field title="Maximum members (optional)"><input type="number" min="1" value={form.capacity} onChange={(event) => setForm({ ...form, capacity: event.target.value })} className={input} /></Field>
        <Field title="Notes for members (optional)"><textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} className={`${input} min-h-20`} placeholder="Meeting point, bus time…" /></Field>
        {team && <p className="text-xs text-ink/55">Choose a leader from the members list (Members → Make leader).</p>}
      </form>
    </Modal>
  );
}

function TeamMembers({ team, onClose, onChanged }: { team: Team; onClose: () => void; onChanged: () => Promise<void> }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [unassigned, setUnassigned] = useState<Member[]>([]);
  const [search, setSearch] = useState('');
  const [picked, setPicked] = useState<number[]>([]);
  const [leaderId, setLeaderId] = useState(team.leader?.id ?? null);

  const load = useCallback(async () => {
    try { const data = await api(`/admin/teams/${team.id}/members`); setMembers(data.members); setUnassigned(data.unassigned); } catch (error) { toast.error(errorMessage(error, 'Could not load members.')); }
  }, [team.id]);
  useEffect(() => { void load(); }, [load]);

  const matches = useMemo(() => { const needle = search.trim().toLowerCase(); return needle ? unassigned.filter((person) => `${person.name} ${person.email} ${person.ticket_code} ${person.church ?? ''}`.toLowerCase().includes(needle)).slice(0, 30) : unassigned.slice(0, 30); }, [search, unassigned]);

  const add = async () => {
    try { const data = await api(`/admin/teams/${team.id}/members`, { method: 'POST', body: JSON.stringify({ registration_ids: picked }) }); toast.success(data.message); setPicked([]); await load(); await onChanged(); } catch (error) { toast.error(errorMessage(error, 'Could not add members.')); }
  };
  const remove = async (member: Member) => {
    try { await api(`/admin/teams/${team.id}/members/${member.registration_id}`, { method: 'DELETE' }); toast.success(`${member.name} removed.`); await load(); await onChanged(); } catch (error) { toast.error(errorMessage(error, 'Could not remove member.')); }
  };
  const makeLeader = async (member: Member) => {
    try { await api(`/admin/teams/${team.id}`, { method: 'PATCH', body: JSON.stringify({ name: team.name, capacity: team.capacity, notes: team.notes, leader_id: member.user_id }) }); setLeaderId(member.user_id); toast.success(`${member.name} is now the team leader.`); await onChanged(); } catch (error) { toast.error(errorMessage(error, 'Could not set the leader.')); }
  };

  return (
    <Modal title={`${team.name} members`} subtitle={`${team.event.short_name} · code ${team.code}${team.capacity ? ` · ${members.length}/${team.capacity}` : ''}`} onClose={onClose} size="xl">
      <div className="grid gap-5 lg:grid-cols-2">
        <section>
          <h3 className="text-sm font-bold">In this team ({members.length})</h3>
          <ul className="m-0 mt-2 grid list-none gap-1.5 p-0">
            {members.length === 0 && <li className="rounded-xl bg-white p-4 text-sm text-ink/55">No members yet. Add delegates from the right, or share the code <strong>{team.code}</strong>; they can join from their dashboard.</li>}
            {members.map((member) => <li key={member.registration_id} className="flex items-center gap-3 rounded-xl bg-white p-3 text-sm"><span className="min-w-0 flex-1"><strong className="block truncate">{member.name}{leaderId === member.user_id && <span className="ml-2"><Badge tone="navy">Leader</Badge></span>}</strong><span className="block truncate text-xs text-ink/50">{member.church ?? member.email}</span></span>{leaderId !== member.user_id && <button type="button" onClick={() => void makeLeader(member)} className="text-xs font-bold text-[#1469a9]">Make leader</button>}<button type="button" onClick={() => void remove(member)} className="text-xs font-bold text-coral">Remove</button></li>)}
          </ul>
        </section>
        <section>
          <h3 className="text-sm font-bold">Add delegates without a team ({unassigned.length})</h3>
          <input value={search} onChange={(event) => setSearch(event.target.value)} className={`${input} mt-2`} placeholder="Search name, email, church or ticket" />
          <ul className="m-0 mt-2 grid max-h-[340px] list-none gap-1 overflow-y-auto p-0">
            {matches.length === 0 && <li className="p-3 text-sm text-ink/50">No one to add.</li>}
            {matches.map((person) => <li key={person.registration_id}><label className="flex cursor-pointer items-center gap-3 rounded-xl bg-white p-2.5 text-sm"><input type="checkbox" checked={picked.includes(person.registration_id)} onChange={() => setPicked((current) => current.includes(person.registration_id) ? current.filter((id) => id !== person.registration_id) : [...current, person.registration_id])} className="h-4 w-4" /><span className="min-w-0"><strong className="block truncate">{person.name}</strong><span className="block truncate text-xs text-ink/50">{person.church ?? person.email} · {person.ticket_code}</span></span></label></li>)}
          </ul>
          <button type="button" disabled={picked.length === 0} onClick={() => void add()} className={`${primaryButton} mt-3 w-full`}>Add {picked.length || ''} to team</button>
        </section>
      </div>
    </Modal>
  );
}

export function TeamsView() {
  const events = useEventOptions();
  const [eventSlug, setEventSlug] = useState('');
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Team | 'new' | null>(null);
  const [membersOf, setMembersOf] = useState<Team | null>(null);

  const load = useCallback(async () => {
    try { setTeams((await api(`/admin/teams${eventSlug ? `?event=${eventSlug}` : ''}`)).teams); } catch (error) { toast.error(errorMessage(error, 'Could not load teams.')); } finally { setLoading(false); }
  }, [eventSlug]);
  useEffect(() => { void load(); }, [load]);

  const table = useClientTable(teams, { search: (team) => `${team.name} ${team.code} ${team.leader?.name ?? ''}`, filters: { fill: (team, value) => value === 'empty' ? team.members_count === 0 : value === 'full' ? team.capacity !== null && team.members_count >= team.capacity : true }, date: (team) => team.created_at });

  const remove = async (team: Team) => {
    if (!window.confirm(`Delete ${team.name}? Its ${team.members_count} member(s) stay registered without a team.`)) return;
    try { await api(`/admin/teams/${team.id}`, { method: 'DELETE' }); toast.success(`${team.name} deleted.`); await load(); } catch (error) { toast.error(errorMessage(error, 'Could not delete the team.')); }
  };
  const copy = (code: string) => { void navigator.clipboard?.writeText(code).then(() => toast.success(`Copied ${code}.`)); };

  const columns: Column<Team>[] = [
    { key: 'name', header: 'Team', cell: (team) => <div className="min-w-0"><strong className="block truncate">{team.name}</strong>{!eventSlug && <span className="text-xs text-ink/50">{team.event.short_name}</span>}</div> },
    { key: 'code', header: 'Join code', cell: (team) => <button type="button" onClick={(event) => { event.stopPropagation(); copy(team.code); }} className="rounded-lg bg-[#f4f5f7] px-2 py-1 font-mono text-xs font-bold" title="Copy">{team.code}</button> },
    { key: 'leader', header: 'Leader', cell: (team) => <span className="text-ink/70">{team.leader?.name ?? '—'}</span> },
    { key: 'members', header: 'Members', cell: (team) => <span className="font-bold">{team.members_count}{team.capacity ? <span className="font-normal text-ink/45"> / {team.capacity}</span> : ''}</span> },
    { key: 'actions', header: <span className="sr-only">Actions</span>, className: 'text-right', cell: (team) => <div className="flex justify-end gap-1.5" onClick={(event) => event.stopPropagation()}><button type="button" onClick={() => setMembersOf(team)} className="rounded-full bg-[#03284a] px-3 py-1 text-xs font-bold text-white">Members</button><button type="button" onClick={() => setEditing(team)} className="rounded-full border border-ink/15 px-3 py-1 text-xs font-bold">Edit</button><button type="button" onClick={() => void remove(team)} className="rounded-full bg-[#fff0ee] px-3 py-1 text-xs font-bold text-coral">Delete</button></div> },
  ];

  return (
    <div className="grid gap-4">
      <div className={`${card} flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`}>
        <p className="text-sm text-ink/60">Group delegates by church, ministry or committee. Delegates can join with a team’s code from their dashboard (My team).</p>
        <select value={eventSlug} onChange={(event) => { setEventSlug(event.target.value); setLoading(true); }} className={`${input} sm:w-60`} aria-label="Event"><option value="">All events</option>{events.map((event) => <option key={event.slug} value={event.slug}>{event.short_name}</option>)}</select>
      </div>
      <TableToolbar query={table.query} onQuery={table.setQuery} placeholder="Team name, code or leader" filters={[{ key: 'fill', label: 'Members', options: [{ value: 'empty', label: 'No members yet' }, { value: 'full', label: 'Full' }] }]} values={table.values} onFilter={table.setFilter} dateRange={table.range} onDateRange={table.setRange} dateLabel="Created" onReset={table.reset} actions={<button type="button" onClick={() => setEditing('new')} className={primaryButton}>+ New team</button>} />
      <DataTable columns={columns} rows={table.shown} rowKey={(team) => team.id} loading={loading} onRowClick={setMembersOf} empty="No teams yet. Create one to start grouping delegates." />
      <Pagination page={table.page} pages={table.pages} total={table.total} pageSize={table.pageSize} onPage={table.setPage} onPageSize={table.setPageSize} />
      {editing && <TeamForm team={editing === 'new' ? null : editing} events={events} eventSlug={eventSlug} onClose={() => setEditing(null)} onSaved={load} />}
      {membersOf && <TeamMembers team={membersOf} onClose={() => setMembersOf(null)} onChanged={load} />}
    </div>
  );
}
