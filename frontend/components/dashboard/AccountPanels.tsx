'use client';

import { variantLabel } from '../../lib/shop';
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { AccountUser, fetchPhotoUrl, uploadPhoto } from '../../lib/events';
import { api } from './ui';
import Code128Barcode from '../shop/Code128Barcode';
import { errorMessage, toast } from '../../lib/toast';

type ShopOrder = { id: number; reference: string; status: string; total: number; currency: string; pickup_code: string | null; paid_at: string | null; created_at: string | null; items: { name: string; color?: string | null; size?: string | null; quantity: number; line_total: number }[] };

const naira = (value: number) => `₦${value.toLocaleString('en-NG')}`;
const STATUS_STYLES: Record<string, string> = { paid: 'bg-[#dff2e5] text-[#2f7d4f]', failed: 'bg-[#fff0ee] text-coral', pending: 'bg-[#fff4d9] text-[#9a6814]' };
const STATUS_FILTERS = [{ value: 'all', label: 'All' }, { value: 'paid', label: 'Paid' }, { value: 'pending', label: 'Pending' }, { value: 'failed', label: 'Failed' }];
const PAGE_SIZE = 8;

const orderDate = (order: ShopOrder) => order.created_at ? new Date(order.created_at).toLocaleDateString('en-NG', { dateStyle: 'medium' }) : '—';
const itemLabel = (item: ShopOrder['items'][number]) => `${item.name}${variantLabel(item) ? ` (${variantLabel(item)})` : ''}`;

/** Full-screen pickup pass: big scannable barcode on white for the store scanner. */
function PickupBarcode({ order, onClose }: { order: ShopOrder; onClose: () => void }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  if (!order.pickup_code) return null;
  const copy = () => { void navigator.clipboard?.writeText(order.pickup_code ?? '').then(() => toast.success('Pickup code copied.')).catch(() => toast.error('Copy is blocked in this browser.')); };

  return (
    <div className="fixed inset-0 z-[150] flex items-end justify-center bg-[#001428]/60 p-0 backdrop-blur-sm sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby="pickup-title" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="w-full max-w-xl rounded-t-[1.75rem] bg-white p-5 shadow-2xl sm:rounded-[1.75rem] sm:p-8">
        <div className="flex items-start justify-between gap-3">
          <div><p className="text-xs font-bold uppercase tracking-[.14em] text-[#2f7d4f]">Ready for pickup</p><h2 id="pickup-title" className="mt-1 text-xl font-bold">Show this at the store</h2></div>
          <button type="button" onClick={onClose} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#f4f5f7] text-xl" aria-label="Close">×</button>
        </div>
        <div className="mt-5 rounded-2xl border border-ink/10 bg-white px-2 py-4 sm:px-4">
          <Code128Barcode value={order.pickup_code} height={150} />
          <p className="mt-3 text-center font-mono text-xl font-bold tracking-[.18em] sm:text-2xl">{order.pickup_code}</p>
        </div>
        <p className="mt-3 text-center text-xs text-ink/50">Turn your screen brightness up and hold the phone flat for the scanner.</p>
        <div className="mt-5 grid gap-1.5 border-t border-ink/10 pt-4 text-sm">
          {order.items.map((item, index) => <div key={`${item.name}-${index}`} className="flex justify-between gap-3"><span className="min-w-0 text-ink/75">{itemLabel(item)} × {item.quantity}</span><span className="shrink-0 tabular-nums">{naira(item.line_total)}</span></div>)}
          <div className="mt-1 flex justify-between border-t border-ink/10 pt-2 font-bold"><span>{order.reference}</span><span className="tabular-nums">{naira(order.total)}</span></div>
        </div>
        <div className="mt-5 flex gap-2">
          <button type="button" onClick={copy} className="flex-1 rounded-full border border-ink/15 py-3 text-sm font-bold text-[#0b4779]">Copy code</button>
          <button type="button" onClick={onClose} className="flex-1 rounded-full bg-[#03284a] py-3 text-sm font-bold text-white">Done</button>
        </div>
      </div>
    </div>
  );
}

export function OrderHistory() {
  const [orders, setOrders] = useState<ShopOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [scanning, setScanning] = useState<ShopOrder | null>(null);

  useEffect(() => { void api('/shop/orders').then((data) => setOrders(data.orders || [])).catch((requestError) => toast.error(errorMessage(requestError, 'Could not load your orders.'))).finally(() => setLoading(false)); }, []);

  const counts = useMemo(() => orders.reduce<Record<string, number>>((result, order) => ({ ...result, [order.status]: (result[order.status] ?? 0) + 1 }), { all: orders.length }), [orders]);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return orders.filter((order) => (status === 'all' || order.status === status) && (!needle || [order.reference, order.pickup_code ?? '', orderDate(order), ...order.items.map(itemLabel)].join(' ').toLowerCase().includes(needle)));
  }, [orders, query, status]);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const shown = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  useEffect(() => { setPage(1); setExpanded(null); }, [query, status]);

  if (loading) return <div className="grid gap-2">{[0, 1, 2, 3].map((row) => <div key={row} className="h-[68px] animate-pulse rounded-2xl bg-white" />)}</div>;

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-[1.5rem] border border-dashed border-ink/15 bg-white p-10 text-center">
        <p className="m-0 font-bold">No orders yet</p>
        <p className="m-0 text-sm text-ink/55">Paid orders show here with a pickup barcode for the conference store.</p>
        <a href="/shop" className="mt-1 rounded-full bg-[#1469a9] px-5 py-2.5 text-sm font-bold text-white">Visit the shop</a>
      </div>
    );
  }

  return (
    <div>
      {/* Search + status filters */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <label className="flex h-11 items-center gap-2 rounded-full border border-ink/15 bg-white px-4 focus-within:border-[#1469a9] lg:w-[380px]">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="shrink-0 text-ink/40" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          <span className="sr-only">Search orders</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by product, reference or pickup code" className="min-w-0 flex-1 border-0 bg-transparent text-sm outline-none" />
          {query && <button type="button" onClick={() => setQuery('')} className="text-lg leading-none text-ink/40 hover:text-ink" aria-label="Clear search">×</button>}
        </label>
        <div className="no-scrollbar flex gap-1.5 overflow-x-auto" role="group" aria-label="Filter by status">
          {STATUS_FILTERS.map((filter) => <button key={filter.value} type="button" onClick={() => setStatus(filter.value)} aria-pressed={status === filter.value} className={`flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition ${status === filter.value ? 'bg-[#03284a] text-white' : 'bg-white text-ink/65 ring-1 ring-ink/10 hover:text-ink'}`}>{filter.label}<span className={`rounded-full px-1.5 text-[10px] ${status === filter.value ? 'bg-white/20' : 'bg-ink/5'}`}>{counts[filter.value] ?? 0}</span></button>)}
        </div>
      </div>

      {/* Desktop column headings */}
      <div className="mt-5 hidden grid-cols-[minmax(0,2.4fr)_minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,.8fr)_minmax(0,.8fr)_200px] gap-4 px-4 pb-2 text-[11px] font-bold uppercase tracking-[.12em] text-ink/40 lg:grid">
        <span>Items</span><span>Reference</span><span>Date</span><span>Total</span><span>Status</span><span className="text-right">Pickup</span>
      </div>

      <ul className="m-0 mt-3 grid list-none gap-2 p-0 lg:mt-0">
        {shown.length === 0 && <li className="rounded-2xl bg-white p-8 text-center text-sm text-ink/55">No orders match “{query || status}”. <button type="button" onClick={() => { setQuery(''); setStatus('all'); }} className="font-bold text-[#1469a9]">Clear filters</button></li>}
        {shown.map((order) => {
          const isOpen = expanded === order.id;
          const units = order.items.reduce((sum, item) => sum + item.quantity, 0);
          const canPickUp = order.status === 'paid' && Boolean(order.pickup_code);
          return (
            <li key={order.id} className={`overflow-hidden rounded-2xl border bg-white transition ${isOpen ? 'border-[#1469a9]/30 shadow-sm' : 'border-ink/10'}`}>
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 p-3.5 sm:p-4 lg:grid-cols-[minmax(0,2.4fr)_minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,.8fr)_minmax(0,.8fr)_200px] lg:gap-4">
                <button type="button" onClick={() => setExpanded(isOpen ? null : order.id)} aria-expanded={isOpen} className="flex min-w-0 items-center gap-3 text-left">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#f6f2e9] text-sm font-bold text-[#0b4779]">{units}×</span>
                  <span className="min-w-0">
                    <strong className="block truncate text-sm">{order.items.map((item) => item.name).join(', ')}</strong>
                    <span className="block truncate text-xs text-ink/50 lg:hidden">{orderDate(order)} · {naira(order.total)}</span>
                    <span className="hidden text-xs font-semibold text-[#1469a9] lg:block">{isOpen ? 'Hide details' : 'View details'}</span>
                  </span>
                </button>
                <span className="hidden truncate font-mono text-xs text-ink/60 lg:block">{order.reference}</span>
                <span className="hidden text-sm text-ink/70 lg:block">{orderDate(order)}</span>
                <strong className="hidden text-sm tabular-nums lg:block">{naira(order.total)}</strong>
                <span className="hidden lg:block"><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${STATUS_STYLES[order.status] ?? 'bg-[#f1f2f4] text-ink/60'}`}>{order.status}</span></span>
                <span className="flex items-center justify-end gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase lg:hidden ${STATUS_STYLES[order.status] ?? 'bg-[#f1f2f4] text-ink/60'}`}>{order.status}</span>
                  {canPickUp
                    ? <button type="button" onClick={() => setScanning(order)} className="flex items-center gap-1.5 rounded-full bg-[#03284a] px-3.5 py-2 text-xs font-bold text-white transition hover:bg-[#0b4779]"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M4 6v12M8 6v12M11 6v12M15 6v12M18 6v12M20 6v12" /></svg><span className="hidden sm:inline">View barcode</span><span className="sm:hidden">Barcode</span></button>
                    : <span className="hidden text-xs text-ink/40 lg:inline">Not available</span>}
                </span>
              </div>
              {isOpen && (
                <div className="border-t border-ink/5 px-3.5 pb-4 pt-3 sm:px-4">
                  <div className="grid gap-1.5 text-sm lg:max-w-xl">
                    {order.items.map((item, index) => <div key={`${item.name}-${index}`} className="flex justify-between gap-3"><span className="min-w-0 text-ink/75">{itemLabel(item)} × {item.quantity}</span><span className="shrink-0 tabular-nums">{naira(item.line_total)}</span></div>)}
                  </div>
                  <p className="mt-2 font-mono text-xs text-ink/45 lg:hidden">{order.reference}</p>
                  {order.status === 'pending' && <p className="mt-2 text-xs text-[#9a6814]">Payment not confirmed yet. If you paid, it will update shortly.</p>}
                  {order.status === 'failed' && <p className="mt-2 text-xs text-coral">This payment did not go through. No pickup code was issued.</p>}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {filtered.length > 0 && (
        <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
          <span className="text-xs text-ink/50">Showing {(current - 1) * PAGE_SIZE + 1}–{(current - 1) * PAGE_SIZE + shown.length} of {filtered.length} order{filtered.length === 1 ? '' : 's'}</span>
          {pages > 1 && (
            <nav className="flex items-center gap-1" aria-label="Order pages">
              <button type="button" onClick={() => setPage(current - 1)} disabled={current === 1} className="h-9 rounded-full px-3 text-xs font-bold ring-1 ring-ink/10 disabled:opacity-35">← Prev</button>
              {Array.from({ length: pages }, (_, index) => index + 1).map((number) => <button key={number} type="button" onClick={() => setPage(number)} aria-current={number === current ? 'page' : undefined} className={`h-9 min-w-9 rounded-full px-2 text-xs font-bold ${number === current ? 'bg-[#03284a] text-white' : 'hover:bg-ink/5'}`}>{number}</button>)}
              <button type="button" onClick={() => setPage(current + 1)} disabled={current === pages} className="h-9 rounded-full px-3 text-xs font-bold ring-1 ring-ink/10 disabled:opacity-35">Next →</button>
            </nav>
          )}
        </div>
      )}

      {scanning && <PickupBarcode order={scanning} onClose={() => setScanning(null)} />}
    </div>
  );
}

const ROLES = ['Delegate', 'Minister', 'Leader', 'International delegate', 'Guest'];

/** Personal details and the photo reused on every attending card. */
export function Profile({ profile, onSaved, onLogout }: { profile: AccountUser; onSaved: (profile: AccountUser) => void; onLogout: () => void }) {
  const [name, setName] = useState(profile.name);
  const [phone, setPhone] = useState(profile.phone ?? '');
  const [role, setRole] = useState(profile.role ?? 'Delegate');
  const [church, setChurch] = useState(profile.church ?? '');
  const [stateCountry, setStateCountry] = useState(profile.state_country ?? '');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => { if (profile.has_photo) void fetchPhotoUrl().then(setPhotoUrl); }, [profile.has_photo]);

  const save = async (formEvent: FormEvent<HTMLFormElement>) => {
    formEvent.preventDefault();
    setSaving(true);
    try {
      const data = await api('/auth/profile', { method: 'PUT', body: JSON.stringify({ name, phone, role, church, state_country: stateCountry }) });
      onSaved({ ...profile, ...data.user });
      toast.success('Your profile was saved.');
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : 'Could not save.');
    } finally {
      setSaving(false);
    }
  };

  const changePhoto = async (file: File | undefined) => {
    if (!file) return;
    try {
      await uploadPhoto(file);
      setPhotoUrl(URL.createObjectURL(file));
      onSaved({ ...profile, has_photo: true });
      toast.success('Photo updated. It now appears on all your attending cards.');
    } catch (uploadError) {
      toast.error(uploadError instanceof Error ? uploadError.message : 'Could not upload photo.');
    }
  };

  const field = 'mt-2 w-full rounded-lg border-2 border-ink/15 bg-white px-4 py-3 text-base outline-none focus:border-[#1469a9]';
  return (
    <form onSubmit={save} className="rounded-[1.5rem] border border-ink/10 bg-white p-5 sm:p-8">
      <div className="flex items-center gap-5">
        <span className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-full bg-[#e2edf6] text-2xl font-bold text-[#1469a9]">{photoUrl ? <img src={photoUrl} alt="Your photo" className="h-full w-full object-cover" /> : name.slice(0, 1).toUpperCase()}</span>
        <div><p className="font-bold">{profile.name}</p><p className="text-sm text-ink/60">Your photo is used on your attending cards.</p><input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(changeEvent) => { void changePhoto(changeEvent.target.files?.[0]); changeEvent.target.value = ''; }} /><button type="button" onClick={() => fileInput.current?.click()} className="mt-2 rounded-full border-2 border-ink/15 px-4 py-2 text-xs font-bold text-[#0b4779]">{photoUrl ? 'Change photo' : 'Upload photo'}</button></div>
      </div>
      <div className="mt-7 grid gap-4 sm:grid-cols-2 sm:gap-5">
        <label className="form-label sm:col-span-2">Full name<input required value={name} onChange={(changeEvent) => setName(changeEvent.target.value)} className={field} /></label>
        <label className="form-label">Email<input value={profile.email} disabled className={`${field} bg-ink/5 text-ink/50`} /></label>
        <label className="form-label">Phone / WhatsApp<input required value={phone} onChange={(changeEvent) => setPhone(changeEvent.target.value)} className={field} /></label>
        <label className="form-label">I attend as<select value={role} onChange={(changeEvent) => setRole(changeEvent.target.value)} className={field}>{ROLES.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label className="form-label">Church / ministry<input value={church} onChange={(changeEvent) => setChurch(changeEvent.target.value)} className={field} /></label>
        <label className="form-label sm:col-span-2">State / country<input value={stateCountry} onChange={(changeEvent) => setStateCountry(changeEvent.target.value)} className={field} /></label>
      </div>
      <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><button type="submit" disabled={saving} className="rounded-full bg-[#1469a9] px-7 py-3 text-sm font-bold text-white disabled:opacity-60">{saving ? 'Saving…' : 'Save profile'}</button><button type="button" onClick={onLogout} className="rounded-full border border-ink/15 px-6 py-3 text-sm font-bold text-coral lg:hidden">Log out</button></div>
    </form>
  );
}
