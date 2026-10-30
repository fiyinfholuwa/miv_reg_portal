'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import RegistrationModal from './conference/RegistrationModal';
import { Mark } from './conference/ConferenceAtoms';
import { merch } from './conference/conference-data';
import { apiUrl } from '../lib/api';

type Product = { id?: number; name: string; description?: string | null; price: number; image?: string | null; stock?: number | null };
const fallbackProducts: Product[] = merch.map((item, index) => ({ ...item, id: index + 1, price: Number(item.price.replace(/[^0-9]/g, '')), description: 'Official Jan. Conf 2027 merchandise.' }));

export default function CartPage() {
  const [products, setProducts] = useState<Product[]>(fallbackProducts);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [notice, setNotice] = useState('');
  const [checkingOut, setCheckingOut] = useState(false);

  useEffect(() => {
    const savedCart = window.localStorage.getItem('jan-conf-cart');
    if (savedCart) setCart(JSON.parse(savedCart));
    void fetch(apiUrl('/shop/products')).then((response) => response.ok ? response.json() : Promise.reject(new Error('Shop unavailable'))).then((data) => { if (Array.isArray(data.products) && data.products.length) setProducts(data.products); }).catch(() => undefined);
  }, []);

  useEffect(() => { window.localStorage.setItem('jan-conf-cart', JSON.stringify(cart)); }, [cart]);

  const cartItems = products.filter((product) => cart[product.name]);
  const total = useMemo(() => cartItems.reduce((sum, product) => sum + product.price * (cart[product.name] || 0), 0), [cartItems, cart]);
  const quantity = Object.values(cart).reduce((sum, value) => sum + value, 0);

  const updateQuantity = (product: Product, next: number) => setCart((current) => { const updated = { ...current }; if (next <= 0) delete updated[product.name]; else updated[product.name] = next; return updated; });
  const checkout = async () => {
    if (!total) return;
    if (!window.localStorage.getItem('jan-conf-session')) {
      setNotice('Please sign in or register before checkout.');
      window.dispatchEvent(new CustomEvent('open-registration-modal', { detail: { returnTo: '/shop/cart' } }));
      return;
    }
    const items = cartItems.filter((product) => product.id).map((product) => ({ product_id: product.id, quantity: cart[product.name] }));
    setCheckingOut(true);
    setNotice('Opening secure payment…');
    try {
      const response = await fetch(apiUrl('/shop/orders/initialize'), { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: `Bearer ${window.localStorage.getItem('jan-conf-session')}` }, body: JSON.stringify({ items }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || data.errors?.payment?.[0] || data.errors?.items?.[0] || 'Could not start payment.');
      window.location.assign(data.authorization_url);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not start payment.');
      setCheckingOut(false);
    }
  };

  return <main className="min-h-screen bg-[#f6f2e9] text-ink"><RegistrationModal /><header className="sticky top-0 z-50 border-b border-white/10 bg-ink/95 py-3 text-white shadow-lg backdrop-blur-md sm:py-4"><div className="container-shell flex items-center justify-between gap-3"><Link href="/" className="flex items-center gap-2 sm:gap-3" aria-label="Jan Conf home"><Mark /><span className="font-display text-lg uppercase leading-none tracking-wide sm:text-xl">Jan Conf<br /><span className="text-coral">2027</span></span></Link><Link href="/shop" className="rounded-full border border-white/25 px-4 py-3 text-xs font-bold uppercase tracking-[.08em]">Back to shop</Link></div></header><section className="container-shell py-16 sm:py-24"><Link href="/shop" className="text-sm font-bold text-coral">← Continue shopping</Link><div className="mt-8 grid gap-7 lg:grid-cols-[1fr_360px]"><div><div className="flex items-end justify-between gap-4"><div><p className="eyebrow">Ready for collection</p><h1 className="section-title mt-3">Your<br /><span className="text-coral">cart.</span></h1></div><span className="text-sm font-bold text-ink/50">{quantity} item{quantity === 1 ? '' : 's'}</span></div><div className="mt-8 grid gap-4">{cartItems.length === 0 && <div className="rounded-[1.5rem] bg-white p-8 text-center shadow-sm"><p className="text-ink/60">Your cart is empty.</p><Link href="/shop" className="button-primary mt-5">Browse products</Link></div>}{cartItems.map((product) => <article key={product.name} className="flex gap-4 rounded-[1.5rem] border border-ink/10 bg-white p-4 shadow-sm sm:p-5"><Link href={`/shop/${product.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`} className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-[#e7edf3] sm:h-32 sm:w-32"><img src={product.image || '/images/miv-logo.png'} alt={product.name} className="h-full w-full object-cover" /></Link><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-3"><div><Link href={`/shop/${product.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`} className="font-display text-2xl uppercase leading-none hover:text-coral">{product.name}</Link><p className="mt-2 text-sm text-ink/55">₦{product.price.toLocaleString()} each</p></div><button type="button" onClick={() => updateQuantity(product, 0)} className="text-xs font-bold uppercase text-ink/45 hover:text-coral">Remove</button></div><div className="mt-5 flex items-center justify-between gap-3"><div className="flex items-center gap-3"><button type="button" onClick={() => updateQuantity(product, (cart[product.name] || 0) - 1)} className="grid h-9 w-9 place-items-center rounded-full border border-ink/15 text-lg" aria-label={`Decrease ${product.name}`}>−</button><span className="min-w-5 text-center font-bold">{cart[product.name]}</span><button type="button" onClick={() => updateQuantity(product, (cart[product.name] || 0) + 1)} className="grid h-9 w-9 place-items-center rounded-full border border-ink/15 text-lg" aria-label={`Increase ${product.name}`}>+</button></div><strong>₦{(product.price * cart[product.name]).toLocaleString()}</strong></div></div></article>)}</div></div><aside className="h-fit rounded-[1.5rem] bg-ink p-6 text-white shadow-lg lg:sticky lg:top-28"><p className="eyebrow text-[#ff7565]">Order total</p><div className="mt-4 flex items-end justify-between gap-3"><span className="text-sm text-sky/70">{quantity} item{quantity === 1 ? '' : 's'}</span><strong className="font-display text-4xl">₦{total.toLocaleString()}</strong></div><p className="mt-4 text-sm leading-6 text-sky/70">Payment is handled securely by Paystack. Collect your order at the conference store.</p><button type="button" disabled={!total || checkingOut} onClick={() => void checkout()} className="mt-6 w-full rounded-full bg-white px-5 py-4 text-sm font-bold text-ink disabled:cursor-not-allowed disabled:opacity-40">{checkingOut ? 'Opening payment…' : 'Pay with Paystack'}</button>{notice && <p className="mt-4 rounded-xl bg-white/10 p-3 text-sm leading-5 text-[#ffcf96]" role="status">{notice}</p>}</aside></div></section></main>;
}
