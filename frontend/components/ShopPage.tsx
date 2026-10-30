'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import RegistrationModal from './conference/RegistrationModal';
import { Mark } from './conference/ConferenceAtoms';
import { merch } from './conference/conference-data';
import { apiUrl } from '../lib/api';
import { productSlug } from '../lib/shop';

type Product = {
  id?: number;
  name: string;
  description?: string | null;
  price: number;
  image?: string | null;
  tag?: string | null;
  stock?: number | null;
};

const fallbackProducts: Product[] = merch.map((item) => ({ ...item, price: Number(item.price.replace(/[^0-9]/g, '')), description: 'Official Jan. Conf 2027 merchandise.' }));

export default function ShopPage() {
  const [products, setProducts] = useState<Product[]>(fallbackProducts);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [notice, setNotice] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);

  useEffect(() => {
    const savedCart = window.localStorage.getItem('jan-conf-cart');
    if (savedCart) setCart(JSON.parse(savedCart));
    void fetch(apiUrl('/shop/products'))
      .then((response) => response.ok ? response.json() : Promise.reject(new Error('Shop unavailable')))
      .then((data) => { if (Array.isArray(data.products) && data.products.length) setProducts(data.products); })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    window.localStorage.setItem('jan-conf-cart', JSON.stringify(cart));
  }, [cart]);

  const cartItems = products.filter((product) => cart[product.name]);
  const total = useMemo(() => cartItems.reduce((sum, product) => sum + product.price * (cart[product.name] || 0), 0), [cartItems, cart]);

  const addToCart = (product: Product) => {
    setCart((current) => ({ ...current, [product.name]: (current[product.name] || 0) + 1 }));
    setNotice(`${product.name} added to your cart.`);
    window.setTimeout(() => setNotice(''), 2200);
  };

  const checkout = () => {
    if (!total) return;
    if (!window.localStorage.getItem('jan-conf-session')) {
      setNotice('Please sign in or register before checkout.');
      window.dispatchEvent(new Event('open-registration-modal'));
      return;
    }
    setNotice('You are signed in. Your cart is ready for checkout at the delegate store.');
  };

  const cartQuantity = Object.values(cart).reduce((sum, quantity) => sum + quantity, 0);

  return <main className="min-h-screen bg-[#f6f2e9] text-ink">
    <RegistrationModal />
    <header className="sticky top-0 z-50 border-b border-white/10 bg-ink/95 py-3 text-white shadow-lg backdrop-blur-md sm:py-4">
      <div className="container-shell flex items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-2 sm:gap-3" aria-label="Jan Conf home"><Mark /><span className="font-display text-lg uppercase leading-none tracking-wide sm:text-xl">Jan Conf<br /><span className="text-coral">2027</span></span></Link>
        <nav className="hidden items-center gap-7 text-sm font-semibold text-white/80 lg:flex" aria-label="Main navigation">
          <Link className="transition hover:text-white" href="/#about">About</Link>
          <Link className="transition hover:text-white" href="/#speakers">Speakers</Link>
          <Link className="transition hover:text-white" href="/#schedule">Schedule</Link>
          <Link className="transition hover:text-white" href="/#venue">Venue</Link>
          <Link className="transition hover:text-white" href="/#media">Media</Link>
          <Link className="text-white" href="/shop">Shop</Link>
        </nav>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setMenuOpen((open) => !open)} className="grid h-11 w-11 place-items-center rounded-full border border-white/20 bg-white/10 text-xl transition hover:bg-white/20 lg:hidden" aria-expanded={menuOpen} aria-controls="shop-mobile-navigation" aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}>{menuOpen ? '×' : '☰'}</button>
          <Link className="button-primary px-3 py-3 text-[10px] sm:px-4 sm:text-xs" href="/#register">Register free <span aria-hidden="true">↗</span></Link>
        </div>
      </div>
      {menuOpen && <nav id="shop-mobile-navigation" className="absolute left-4 right-4 top-full mt-3 rounded-2xl border border-ink/10 bg-white p-5 text-ink shadow-2xl lg:hidden" aria-label="Mobile navigation">
        <p className="px-1 pb-3 text-2xl font-bold text-ink">Menu</p>
        <Link onClick={() => setMenuOpen(false)} className="block border-b border-ink/10 px-1 py-4 text-base font-semibold transition hover:text-coral" href="/#about">About</Link>
        <Link onClick={() => setMenuOpen(false)} className="block border-b border-ink/10 px-1 py-4 text-base font-semibold transition hover:text-coral" href="/#speakers">Speakers</Link>
        <Link onClick={() => setMenuOpen(false)} className="block border-b border-ink/10 px-1 py-4 text-base font-semibold transition hover:text-coral" href="/#schedule">Schedule</Link>
        <Link onClick={() => setMenuOpen(false)} className="block border-b border-ink/10 px-1 py-4 text-base font-semibold transition hover:text-coral" href="/#venue">Accommodation</Link>
        <Link onClick={() => setMenuOpen(false)} className="block border-b border-ink/10 px-1 py-4 text-base font-semibold transition hover:text-coral" href="/shop">Shop</Link>
        <Link onClick={() => setMenuOpen(false)} className="mt-5 block rounded-full bg-coral px-4 py-4 text-center text-base font-bold text-white" href="/#register">Register Now</Link>
      </nav>}
    </header>

    <button type="button" onClick={() => { setCartOpen(true); document.getElementById('shop-cart')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }} className="fixed right-4 top-24 z-40 grid h-14 w-14 place-items-center rounded-full bg-white text-2xl text-ink shadow-xl ring-4 ring-[#f6f2e9] transition hover:scale-105" aria-label={`Open cart, ${cartQuantity} item${cartQuantity === 1 ? '' : 's'}`}>
      <svg className="fa fa-shopping-cart h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="9" cy="20" r="1" /><circle cx="18" cy="20" r="1" /><path d="M3 4h2l2.4 10.2a2 2 0 0 0 2 1.5h7.8a2 2 0 0 0 1.9-1.4L21 8H6" /></svg>{cartQuantity > 0 && <span className="absolute -right-1 -top-1 grid h-6 min-w-6 place-items-center rounded-full bg-[#d7263d] px-1 text-xs font-bold text-white">{cartQuantity}</span>}
    </button>

    <section className="container-shell py-16 sm:py-24">
      <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between"><div><p className="eyebrow mb-5">Pay online · collect at the venue</p><h1 className="section-title">Conference<br /><span className="text-coral">shop.</span></h1><p className="mt-6 max-w-xl text-base leading-7 text-ink/65">Browse the official Revival collection before you register. You only need to sign in when you are ready to check out.</p></div><div id="shop-cart" className={`rounded-[1.5rem] bg-ink p-6 text-white lg:w-80 ${cartOpen ? 'ring-4 ring-coral/30' : ''}`}><div className="flex items-start justify-between gap-3"><div><p className="eyebrow text-[#ff7565]">Your cart</p><strong className="mt-2 block font-display text-5xl">{cartQuantity}</strong><p className="mt-1 text-sm text-sky/70">items · ₦{total.toLocaleString()}</p></div><button type="button" onClick={() => setCartOpen(false)} className="text-xs font-bold uppercase tracking-[.08em] text-white/60 hover:text-white">{cartOpen ? 'Close' : 'View'}</button></div><button type="button" onClick={checkout} disabled={!total} className="mt-5 w-full rounded-full bg-cream px-5 py-3 text-sm font-bold text-ink disabled:cursor-not-allowed disabled:opacity-40">Proceed to checkout</button>{notice && <p className="mt-4 text-sm leading-5 text-[#ffcf96]" role="status">{notice}</p>}</div></div>
      <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{products.map((product) => <article key={product.id ?? product.name} className="group rounded-[1.5rem] border border-ink/10 bg-white p-3 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"><Link href={`/shop/${productSlug(product.name)}`} className="block"><div className="relative aspect-[.92] overflow-hidden rounded-[1.2rem] bg-[#e7edf3]"><img src={product.image || '/images/miv-logo.png'} alt={product.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />{product.tag && <span className="absolute left-3 top-3 rounded-full bg-cream px-3 py-1 text-[10px] font-bold uppercase tracking-[.1em]">{product.tag}</span>}</div><div className="p-2 pt-5"><div className="flex items-start justify-between gap-3"><h2 className="font-display text-2xl uppercase leading-none">{product.name}</h2><strong className="shrink-0 text-sm">₦{product.price.toLocaleString()}</strong></div><p className="mt-3 min-h-12 text-sm leading-5 text-ink/55">{product.description || 'Official conference merchandise.'}</p><span className="mt-4 inline-block text-xs font-bold uppercase tracking-[.1em] text-coral">View product details →</span></div></Link><button type="button" onClick={() => addToCart(product)} className="mt-5 w-full rounded-full bg-[#1469a9] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#0b4779]">Add to cart</button></article>)}</div>
    </section>

  </main>;
}
