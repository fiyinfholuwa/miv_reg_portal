'use client';

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { STANDARD_SIZES, variantLabel } from '../../lib/shop';
import { errorMessage, toast } from '../../lib/toast';
import { api } from './adminApi';
import { Field, ImageInput, card, input } from './adminUi';
import { Badge, DataTable, Modal, Pagination, StatusTabs, TableToolbar, downloadCsv, formatDate, primaryButton, secondaryButton, useClientTable, type Column } from './table';

const naira = (value: number) => `₦${value.toLocaleString('en-NG')}`;

/* ------------------------------------------------------------ Products */

type Color = { name: string; hex: string; image?: string | null };
type Product = { id: number; name: string; description: string | null; price: number; image: string | null; tag: string | null; colors: Color[] | null; sizes: string[] | null; stock: number | null; active: boolean; sort_order: number; created_at?: string | null };

function ProductForm({ product, onClose, onSaved }: { product: Product | null; onClose: () => void; onSaved: () => Promise<void> }) {
  const [form, setForm] = useState({ name: product?.name ?? '', description: product?.description ?? '', price: product ? String(product.price) : '', image: product?.image ?? '', tag: product?.tag ?? '', stock: product?.stock == null ? '' : String(product.stock), active: product?.active ?? true, sort_order: String(product?.sort_order ?? 0) });
  const [colors, setColors] = useState<{ name: string; hex: string; image: string }[]>((product?.colors ?? []).map((color) => ({ name: color.name, hex: color.hex, image: color.image ?? '' })));
  const [sizes, setSizes] = useState<string[]>(product?.sizes ?? []);
  const [customSize, setCustomSize] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (field: keyof typeof form, value: string | boolean) => setForm((current) => ({ ...current, [field]: value }));
  const toggleSize = (size: string) => setSizes((current) => current.includes(size) ? current.filter((item) => item !== size) : [...current, size]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    try {
      const cleanColors = colors.filter((color) => color.name.trim()).map((color) => ({ name: color.name.trim(), hex: color.hex, image: color.image.trim() || null }));
      const payload = { ...form, price: Number(form.price), stock: form.stock === '' ? null : Number(form.stock), sort_order: Number(form.sort_order), image: form.image || null, tag: form.tag || null, colors: cleanColors.length ? cleanColors : null, sizes: sizes.length ? sizes : null };
      await api(product ? `/admin/shop/products/${product.id}` : '/admin/shop/products', { method: product ? 'PATCH' : 'POST', body: JSON.stringify(payload) });
      toast.success(product ? `${form.name} saved.` : `${form.name} added to the shop.`);
      await onSaved();
      onClose();
    } catch (error) { toast.error(errorMessage(error, 'Could not save the product.')); } finally { setSaving(false); }
  };

  return (
    <Modal title={product ? `Edit ${product.name}` : 'New product'} onClose={onClose} size="xl" footer={<><button type="button" onClick={onClose} className={secondaryButton}>Cancel</button><button type="submit" form="product-form" disabled={saving} className={primaryButton}>{saving ? 'Saving…' : product ? 'Save product' : 'Add product'}</button></>}>
      <form id="product-form" onSubmit={submit} className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
        <div className="grid content-start gap-3">
          <Field title="Main photo"><ImageInput value={form.image} onChange={(url) => set('image', url)} /></Field>
          <label className="flex items-center justify-between gap-3 rounded-xl bg-white p-3 text-sm font-semibold">Visible in shop<input type="checkbox" checked={form.active} onChange={(event) => set('active', event.target.checked)} className="h-4 w-4" /></label>
        </div>
        <div className="grid content-start gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field title="Name" className="sm:col-span-2"><input required value={form.name} onChange={(event) => set('name', event.target.value)} className={input} /></Field>
            <Field title="Description" className="sm:col-span-2"><textarea value={form.description} onChange={(event) => set('description', event.target.value)} className={`${input} min-h-20`} /></Field>
            <Field title="Price (₦)"><input required type="number" min="0" value={form.price} onChange={(event) => set('price', event.target.value)} className={input} /></Field>
            <Field title="Stock (blank = unlimited)"><input type="number" min="0" value={form.stock} onChange={(event) => set('stock', event.target.value)} className={input} /></Field>
            <Field title="Tag"><input value={form.tag} onChange={(event) => set('tag', event.target.value)} className={input} placeholder="New, Limited set…" /></Field>
            <Field title="Order"><input type="number" min="0" value={form.sort_order} onChange={(event) => set('sort_order', event.target.value)} className={input} /></Field>
          </div>
          <div className="rounded-2xl bg-white p-4">
            <div className="flex items-center justify-between"><strong className="text-sm">Colours</strong><button type="button" onClick={() => setColors((current) => [...current, { name: '', hex: '#1b2a4e', image: '' }])} className="text-xs font-bold text-[#1469a9]">+ Add colour</button></div>
            <div className="mt-2 grid gap-2">
              {colors.length === 0 && <p className="text-xs text-ink/50">No colour options.</p>}
              {colors.map((color, index) => <div key={index} className="grid gap-2 sm:grid-cols-[48px_minmax(0,1fr)_minmax(0,1.4fr)_40px]"><input type="color" value={color.hex} onChange={(event) => setColors((current) => current.map((item, position) => position === index ? { ...item, hex: event.target.value } : item))} className="h-10 w-12 cursor-pointer rounded-lg" aria-label="Colour" /><input required value={color.name} onChange={(event) => setColors((current) => current.map((item, position) => position === index ? { ...item, name: event.target.value } : item))} className={input} placeholder="Navy" /><input value={color.image} onChange={(event) => setColors((current) => current.map((item, position) => position === index ? { ...item, image: event.target.value } : item))} className={input} placeholder="Photo link for this colour" /><button type="button" onClick={() => setColors((current) => current.filter((_, position) => position !== index))} className="grid h-10 w-10 place-items-center rounded-full bg-[#fff0ee] text-coral" aria-label="Remove colour">×</button></div>)}
            </div>
          </div>
          <div className="rounded-2xl bg-white p-4">
            <strong className="text-sm">Sizes</strong>
            <div className="mt-2 flex flex-wrap gap-1.5">{[...STANDARD_SIZES, ...sizes.filter((size) => !STANDARD_SIZES.includes(size))].map((size) => <button key={size} type="button" aria-pressed={sizes.includes(size)} onClick={() => toggleSize(size)} className={`min-w-11 rounded-lg px-3 py-1.5 text-sm font-bold ${sizes.includes(size) ? 'bg-[#03284a] text-white' : 'bg-[#f4f5f7] text-ink/60'}`}>{size}</button>)}</div>
            <div className="mt-2 flex gap-2"><input value={customSize} onChange={(event) => setCustomSize(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); const size = customSize.trim().toUpperCase(); if (size && !sizes.includes(size)) setSizes((current) => [...current, size]); setCustomSize(''); } }} className={`${input} max-w-[200px]`} placeholder="Other size + Enter" /></div>
          </div>
        </div>
      </form>
    </Modal>
  );
}

export function ShopProductsView() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Product | 'new' | null>(null);

  const load = useCallback(async () => {
    try { setProducts((await api('/admin/shop/products')).products); } catch (error) { toast.error(errorMessage(error, 'Could not load products.')); } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const table = useClientTable(products, { search: (product) => `${product.name} ${product.tag ?? ''} ${product.description ?? ''}`, filters: { visibility: (product, value) => (value === 'visible') === product.active, stock: (product, value) => value === 'out' ? product.stock === 0 : value === 'low' ? product.stock !== null && product.stock > 0 && product.stock <= 10 : true } });

  const toggle = async (product: Product) => {
    try { await api(`/admin/shop/products/${product.id}`, { method: 'PATCH', body: JSON.stringify({ ...product, active: !product.active }) }); toast.success(product.active ? `${product.name} hidden.` : `${product.name} is visible.`); await load(); } catch (error) { toast.error(errorMessage(error, 'Could not update the product.')); }
  };
  const remove = async (product: Product) => {
    if (!window.confirm(`Delete ${product.name}?`)) return;
    try { await api(`/admin/shop/products/${product.id}`, { method: 'DELETE' }); toast.success(`${product.name} deleted.`); await load(); } catch (error) { toast.error(errorMessage(error, 'Could not delete the product.')); }
  };

  const columns: Column<Product>[] = [
    { key: 'product', header: 'Product', cell: (product) => <div className="flex min-w-0 items-center gap-3"><img src={product.image || '/images/miv-logo.png'} alt="" className="h-11 w-11 shrink-0 rounded-lg bg-[#f6f2e9] object-cover" /><span className="min-w-0"><strong className="block truncate">{product.name}</strong>{product.tag && <span className="text-xs text-ink/50">{product.tag}</span>}</span></div> },
    { key: 'price', header: 'Price', cell: (product) => <strong>{naira(product.price)}</strong> },
    { key: 'options', header: 'Options', cell: (product) => <div className="flex flex-wrap items-center justify-end gap-1 md:justify-start">{(product.colors ?? []).map((color) => <span key={color.name} title={color.name} className="h-4 w-4 rounded-full ring-1 ring-inset ring-black/10" style={{ background: color.hex }} />)}{(product.sizes?.length ?? 0) > 0 && <span className="text-xs text-ink/55">{product.sizes?.join(' ')}</span>}{!product.colors?.length && !product.sizes?.length && <span className="text-xs text-ink/40">—</span>}</div> },
    { key: 'stock', header: 'Stock', cell: (product) => product.stock === null ? <span className="text-ink/50">Unlimited</span> : product.stock === 0 ? <Badge tone="red">Sold out</Badge> : product.stock <= 10 ? <Badge tone="amber">{product.stock} left</Badge> : <span>{product.stock}</span> },
    { key: 'status', header: 'Visible', cell: (product) => <button type="button" onClick={(event) => { event.stopPropagation(); void toggle(product); }} className={`relative h-6 w-11 rounded-full transition ${product.active ? 'bg-[#1469a9]' : 'bg-ink/20'}`} role="switch" aria-checked={product.active} aria-label="Visible in shop"><span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${product.active ? 'left-6' : 'left-1'}`} /></button> },
    { key: 'actions', header: <span className="sr-only">Actions</span>, className: 'text-right', cell: (product) => <div className="flex justify-end gap-1.5" onClick={(event) => event.stopPropagation()}><button type="button" onClick={() => setEditing(product)} className="rounded-full border border-ink/15 px-3 py-1 text-xs font-bold">Edit</button><button type="button" onClick={() => void remove(product)} className="rounded-full bg-[#fff0ee] px-3 py-1 text-xs font-bold text-coral">Delete</button></div> },
  ];

  return (
    <div className="grid gap-4">
      <TableToolbar query={table.query} onQuery={table.setQuery} placeholder="Search products" filters={[{ key: 'visibility', label: 'Visibility', options: [{ value: 'visible', label: 'Visible' }, { value: 'hidden', label: 'Hidden' }] }, { key: 'stock', label: 'Stock', options: [{ value: 'low', label: '10 or fewer left' }, { value: 'out', label: 'Sold out' }] }]} values={table.values} onFilter={table.setFilter} onReset={table.reset} actions={<button type="button" onClick={() => setEditing('new')} className={primaryButton}>+ New product</button>} />
      <DataTable columns={columns} rows={table.shown} rowKey={(product) => product.id} loading={loading} onRowClick={setEditing} empty="No products yet." />
      <Pagination page={table.page} pages={table.pages} total={table.total} pageSize={table.pageSize} onPage={table.setPage} onPageSize={table.setPageSize} />
      {editing && <ProductForm product={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={load} />}
    </div>
  );
}

/* --------------------------------------------------------------- Orders */

type Order = {
  id: number; reference: string; status: string; total: number; pickup_code: string | null; paid_at: string | null; collected_at: string | null; created_at: string | null;
  items: { name: string; color?: string | null; size?: string | null; quantity: number; line_total: number }[];
  user: { name: string | null; email: string | null };
};

const orderState = (order: Order) => order.collected_at ? 'collected' : order.status;
const itemText = (item: Order['items'][number]) => `${item.name}${variantLabel(item) ? ` (${variantLabel(item)})` : ''} × ${item.quantity}`;

export function AdminOrdersView() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewing, setViewing] = useState<Order | null>(null);
  const [pickup, setPickup] = useState('');
  const [collecting, setCollecting] = useState(false);
  const pickupInput = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try { setOrders((await api('/admin/shop/orders')).orders); } catch (error) { toast.error(errorMessage(error, 'Could not load orders.')); } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const table = useClientTable(orders, { search: (order) => [order.reference, order.pickup_code, order.user.name, order.user.email, ...order.items.map((item) => item.name)].join(' '), filters: { state: (order, value) => orderState(order) === value, product: (order, value) => order.items.some((item) => item.name === value) }, date: (order) => order.created_at, pageSize: 15 });
  const counts = orders.reduce<Record<string, number>>((result, order) => ({ ...result, [orderState(order)]: (result[orderState(order)] ?? 0) + 1 }), { '': orders.length });
  const paid = orders.filter((order) => order.status === 'paid');
  const products = [...new Set(orders.flatMap((order) => order.items.map((item) => item.name)))];

  // Units still to hand over (paid, not yet collected), by product, colour and size.
  const pickList = useMemo(() => {
    const totals = new Map<string, number>();
    paid.filter((order) => !order.collected_at).forEach((order) => order.items.forEach((item) => { const key = `${item.name}${variantLabel(item) ? ` · ${variantLabel(item)}` : ''}`; totals.set(key, (totals.get(key) ?? 0) + item.quantity); }));
    return [...totals.entries()].sort((a, b) => b[1] - a[1]);
  }, [paid]);

  const collect = async (code: string) => {
    if (!code.trim()) return;
    setCollecting(true);
    try {
      const data = await api('/admin/shop/orders/collect', { method: 'POST', body: JSON.stringify({ pickup_code: code }) });
      toast.success(data.order.items.map(itemText).join(', '), { title: data.message, duration: 8000 });
      setPickup('');
      setViewing(null);
      await load();
    } catch (error) { toast.error(errorMessage(error, 'Could not collect this order.')); } finally { setCollecting(false); pickupInput.current?.focus(); }
  };

  const exportCsv = () => downloadCsv(`orders-${new Date().toISOString().slice(0, 10)}.csv`, ['Reference', 'Pickup code', 'Name', 'Email', 'Status', 'Items', 'Total', 'Ordered', 'Collected'], table.filtered.map((order) => [order.reference, order.pickup_code, order.user.name, order.user.email, orderState(order), order.items.map(itemText).join('; '), order.total, formatDate(order.created_at, true), order.collected_at ? formatDate(order.collected_at, true) : '']));

  const columns: Column<Order>[] = [
    { key: 'buyer', header: 'Buyer', cell: (order) => <div className="min-w-0"><strong className="block truncate">{order.user.name ?? 'Unknown'}</strong><span className="block truncate text-xs text-ink/50">{order.user.email}</span></div> },
    { key: 'items', header: 'Items', cell: (order) => <span className="line-clamp-2 max-w-[320px] text-ink/70">{order.items.map(itemText).join(', ')}</span> },
    { key: 'code', header: 'Pickup code', cell: (order) => <span className="font-mono text-xs">{order.pickup_code ?? '—'}</span> },
    { key: 'total', header: 'Total', cell: (order) => <strong>{naira(order.total)}</strong> },
    { key: 'status', header: 'Status', cell: (order) => <Badge tone={orderState(order) === 'collected' ? 'navy' : orderState(order) === 'paid' ? 'green' : orderState(order) === 'pending' ? 'amber' : 'red'}>{orderState(order) === 'paid' ? 'Paid · to collect' : orderState(order)}</Badge> },
    { key: 'date', header: 'Ordered', cell: (order) => <span className="whitespace-nowrap text-ink/60">{formatDate(order.created_at)}</span> },
    { key: 'actions', header: <span className="sr-only">Actions</span>, className: 'text-right', cell: (order) => orderState(order) === 'paid' && order.pickup_code ? <button type="button" onClick={(event) => { event.stopPropagation(); void collect(order.pickup_code ?? ''); }} className="rounded-full bg-[#03284a] px-3 py-1 text-xs font-bold text-white">Hand over</button> : null },
  ];

  return (
    <div className="grid gap-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className={card}><span className="text-xs font-bold uppercase tracking-[.1em] text-ink/45">Revenue (paid)</span><strong className="mt-1 block text-2xl">{naira(paid.reduce((sum, order) => sum + order.total, 0))}</strong></div>
        <div className={card}><span className="text-xs font-bold uppercase tracking-[.1em] text-ink/45">Paid orders</span><strong className="mt-1 block text-2xl">{paid.length}</strong></div>
        <div className={card}><span className="text-xs font-bold uppercase tracking-[.1em] text-ink/45">Waiting for pickup</span><strong className="mt-1 block text-2xl">{counts.paid ?? 0}</strong></div>
        <div className={card}><span className="text-xs font-bold uppercase tracking-[.1em] text-ink/45">Collected</span><strong className="mt-1 block text-2xl">{counts.collected ?? 0}</strong></div>
      </div>

      <form onSubmit={(event) => { event.preventDefault(); void collect(pickup); }} className={`${card} flex flex-col gap-3 sm:flex-row sm:items-center`}>
        <div className="min-w-0 flex-1"><strong className="block text-sm">Store collection</strong><span className="text-xs text-ink/55">Scan the buyer’s pickup barcode (or type the code) to hand over their order.</span></div>
        <input ref={pickupInput} value={pickup} onChange={(event) => setPickup(event.target.value.toUpperCase())} className="h-12 rounded-xl border-2 border-[#03284a]/20 bg-white px-4 font-mono font-bold tracking-[.06em] outline-none focus:border-[#1469a9] sm:w-80" placeholder="JC27-ORD-…" aria-label="Pickup code" autoComplete="off" />
        <button type="submit" disabled={collecting || !pickup.trim()} className={`${primaryButton} h-12`}>{collecting ? 'Checking…' : 'Hand over'}</button>
      </form>

      <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="grid content-start gap-4">
          <StatusTabs options={[{ value: '', label: 'All' }, { value: 'paid', label: 'To collect' }, { value: 'collected', label: 'Collected' }, { value: 'pending', label: 'Pending payment' }, { value: 'failed', label: 'Failed' }]} value={table.values.state ?? ''} onChange={(value) => table.setFilter('state', value)} counts={counts} />
          <TableToolbar query={table.query} onQuery={table.setQuery} placeholder="Pickup code, reference, name, email or product" filters={[{ key: 'product', label: 'Product', options: products.map((name) => ({ value: name, label: name })) }]} values={table.values} onFilter={table.setFilter} dateRange={table.range} onDateRange={table.setRange} dateLabel="Ordered" onReset={table.reset} actions={<button type="button" onClick={exportCsv} disabled={table.total === 0} className={secondaryButton}>Export CSV</button>} />
          <DataTable columns={columns} rows={table.shown} rowKey={(order) => order.id} loading={loading} onRowClick={setViewing} empty="No orders match." />
          <Pagination page={table.page} pages={table.pages} total={table.total} pageSize={table.pageSize} onPage={table.setPage} onPageSize={table.setPageSize} />
        </div>
        <aside className={`${card} h-fit`}>
          <h3 className="text-sm font-bold">Still to hand over</h3>
          <p className="text-xs text-ink/50">Paid but not yet collected.</p>
          <ul className="m-0 mt-3 grid list-none gap-1.5 p-0 text-sm">
            {pickList.length === 0 && <li className="text-ink/50">Nothing waiting.</li>}
            {pickList.map(([name, quantity]) => <li key={name} className="flex justify-between gap-3"><span className="min-w-0 truncate">{name}</span><strong>{quantity}</strong></li>)}
          </ul>
        </aside>
      </div>

      {viewing && (
        <Modal title={`Order ${viewing.reference}`} subtitle={`${viewing.user.name ?? ''} · ${viewing.user.email ?? ''}`} onClose={() => setViewing(null)} footer={orderState(viewing) === 'paid' && viewing.pickup_code ? <button type="button" disabled={collecting} onClick={() => void collect(viewing.pickup_code ?? '')} className={primaryButton}>Hand over order</button> : undefined}>
          <div className="grid gap-1.5 text-sm">{viewing.items.map((item, index) => <div key={index} className="flex justify-between gap-3"><span>{itemText(item)}</span><span>{naira(item.line_total)}</span></div>)}<div className="mt-2 flex justify-between border-t border-ink/10 pt-2 font-bold"><span>Total</span><span>{naira(viewing.total)}</span></div></div>
          <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">{[['Status', orderState(viewing)], ['Pickup code', viewing.pickup_code ?? '—'], ['Ordered', formatDate(viewing.created_at, true)], ['Paid', formatDate(viewing.paid_at, true)], ['Collected', formatDate(viewing.collected_at, true)]].map(([label, value]) => <div key={label} className="rounded-xl bg-white p-3"><dt className="text-[11px] font-bold uppercase text-ink/45">{label}</dt><dd className="m-0 mt-0.5 font-semibold capitalize">{value}</dd></div>)}</dl>
        </Modal>
      )}
    </div>
  );
}
