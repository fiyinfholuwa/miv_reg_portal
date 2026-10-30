'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiUrl } from '../lib/api';
import ShopBarcode from './ShopBarcode';

type Order = { reference: string; status: string; total: number; pickup_code: string | null; created_at: string | null; items: { name: string; quantity: number; line_total: number }[] };

export default function OrderPaidPage({ reference }: { reference: string }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = window.localStorage.getItem('jan-conf-session');
    if (!token) { setError('Please sign in again to view this order.'); setLoading(false); return; }
    void fetch(apiUrl(`/shop/orders/${encodeURIComponent(reference)}/verify`), { headers: { Accept: 'application/json', Authorization: `Bearer ${token}` } }).then(async (response) => { const data = await response.json().catch(() => ({})); if (!response.ok) throw new Error(data.message || data.errors?.payment?.[0] || 'We could not verify this payment.'); return data; }).then((data) => { setOrder(data.order); window.localStorage.removeItem('jan-conf-cart'); }).catch((requestError) => setError(requestError instanceof Error ? requestError.message : 'We could not verify this payment.')).finally(() => setLoading(false));
  }, [reference]);

  return <main className="min-h-screen bg-[#f6f2e9] text-ink"><section className="container-shell py-12 sm:py-20"><div className="mx-auto max-w-3xl">{loading && <div className="rounded-[2rem] bg-white p-10 text-center shadow-soft"><p className="font-display text-4xl uppercase">Confirming payment…</p><p className="mt-3 text-ink/60">Please keep this page open.</p></div>}{error && <div className="rounded-[2rem] bg-[#fff0ee] p-10 text-center"><p className="eyebrow">Payment status</p><h1 className="mt-3 font-display text-5xl uppercase text-coral">Verification needed</h1><p className="mx-auto mt-4 max-w-lg text-ink/65">{error}</p><Link href="/shop" className="button-primary mt-7">Return to shop</Link></div>}{order && order.status === 'paid' && order.pickup_code && <div className="rounded-[2rem] bg-white p-6 text-center shadow-soft sm:p-10"><p className="eyebrow text-[#34865e]">Payment successful</p><h1 className="mt-3 font-display text-6xl uppercase leading-none sm:text-8xl">Order paid.</h1><p className="mt-5 text-base leading-7 text-ink/65">Show this barcode at the conference store to collect your order.</p><div className="mt-8 rounded-2xl border-2 border-dashed border-ink/15 bg-[#f6f2e9] p-4 sm:p-8"><ShopBarcode value={order.pickup_code} large /><p className="mt-5 font-display text-3xl tracking-[.14em] sm:text-5xl">{order.pickup_code}</p><p className="mt-2 text-xs uppercase tracking-[.16em] text-ink/50">Pickup barcode</p></div><div className="mx-auto mt-8 max-w-md border-t border-ink/10 pt-6 text-left">{order.items.map((item) => <div key={item.name} className="flex justify-between gap-3 py-2 text-sm"><span>{item.name} × {item.quantity}</span><strong>₦{item.line_total.toLocaleString()}</strong></div>)}<div className="mt-3 flex justify-between border-t border-ink/10 pt-4 font-bold"><span>Total paid</span><span>₦{order.total.toLocaleString()}</span></div></div><Link href="/dashboard" className="button-primary mt-8">Go to order history</Link></div>}</div></section></main>;
}
