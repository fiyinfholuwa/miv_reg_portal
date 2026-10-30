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

const fallbackProducts: Product[] = merch.map((item, index) => ({ ...item, id: index + 1, price: Number(item.price.replace(/[^0-9]/g, '')), description: 'Official Jan. Conf 2027 merchandise.' }));

export default function ProductDetailsPage({ slug }: { slug: string }) {
  const [product, setProduct] = useState<Product | null>(fallbackProducts.find((item) => productSlug(item.name) === slug) || null);
  const [quantity, setQuantity] = useState(1);
  const [cartQuantity, setCartQuantity] = useState(0);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const savedCart = window.localStorage.getItem('jan-conf-cart');
    if (savedCart) {
      const cart = JSON.parse(savedCart) as Record<string, number>;
      setCartQuantity(Object.values(cart).reduce((sum, value) => sum + value, 0));
    }
    void fetch(apiUrl('/shop/products')).then((response) => response.ok ? response.json() : Promise.reject(new Error('Shop unavailable'))).then((data) => {
      if (Array.isArray(data.products)) {
        const remoteProduct = data.products.find((item: Product) => productSlug(item.name) === slug);
        if (remoteProduct) setProduct(remoteProduct);
      }
    }).catch(() => undefined);
  }, [slug]);

  const addToCart = () => {
    if (!product) return;
    const savedCart = window.localStorage.getItem('jan-conf-cart');
    const cart = savedCart ? JSON.parse(savedCart) as Record<string, number> : {};
    cart[product.name] = (cart[product.name] || 0) + quantity;
    window.localStorage.setItem('jan-conf-cart', JSON.stringify(cart));
    setCartQuantity(Object.values(cart).reduce((sum, value) => sum + value, 0));
    setNotice(`${quantity} ${product.name} added to your cart.`);
    window.setTimeout(() => setNotice(''), 2400);
  };

  const total = useMemo(() => product ? product.price * quantity : 0, [product, quantity]);

  return <main className="min-h-screen bg-[#f6f2e9] text-ink">
    <RegistrationModal />
    <header className="sticky top-0 z-50 border-b border-white/10 bg-ink/95 py-3 text-white shadow-lg backdrop-blur-md sm:py-4">
      <div className="container-shell flex items-center justify-between gap-3"><Link href="/" className="flex items-center gap-2 sm:gap-3" aria-label="Jan Conf home"><Mark /><span className="font-display text-lg uppercase leading-none tracking-wide sm:text-xl">Jan Conf<br /><span className="text-coral">2027</span></span></Link><Link href="/shop" className="rounded-full border border-white/25 px-4 py-3 text-xs font-bold uppercase tracking-[.08em]">Back to shop</Link></div>
    </header>
    <Link href="/shop" className="fixed right-4 top-24 z-40 grid h-14 w-14 place-items-center rounded-full bg-white text-ink shadow-xl ring-4 ring-[#f6f2e9] transition hover:scale-105" aria-label={`Return to shop, ${cartQuantity} item${cartQuantity === 1 ? '' : 's'} in cart`}><svg className="fa fa-shopping-cart h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="9" cy="20" r="1" /><circle cx="18" cy="20" r="1" /><path d="M3 4h2l2.4 10.2a2 2 0 0 0 2 1.5h7.8a2 2 0 0 0 1.9-1.4L21 8H6" /></svg>{cartQuantity > 0 && <span className="absolute -right-1 -top-1 grid h-6 min-w-6 place-items-center rounded-full bg-[#d7263d] px-1 text-xs font-bold text-white">{cartQuantity}</span>}</Link>
    <section className="container-shell py-16 sm:py-24"><Link href="/shop" className="text-sm font-bold text-coral">← Back to conference shop</Link>{product ? <div className="mt-8 grid gap-8 lg:grid-cols-2 lg:items-center"><div className="aspect-square overflow-hidden rounded-[2rem] bg-white shadow-soft"><img src={product.image || '/images/miv-logo.png'} alt={product.name} className="h-full w-full object-cover" /></div><div className="rounded-[2rem] bg-white p-7 shadow-soft sm:p-10"><p className="eyebrow">{product.tag || 'Official merchandise'}</p><h1 className="mt-4 font-display text-5xl uppercase leading-[.86] sm:text-7xl">{product.name}</h1><p className="mt-5 text-2xl font-bold">₦{product.price.toLocaleString()}</p><p className="mt-6 max-w-xl text-base leading-7 text-ink/65">{product.description || 'Official conference merchandise for Jan. Conf 2027.'}</p>{product.stock !== null && product.stock !== undefined && <p className="mt-5 text-sm font-semibold text-ink/55">{product.stock > 0 ? `${product.stock} available` : 'Currently sold out'}</p>}<div className="mt-8 flex items-center gap-3"><button type="button" onClick={() => setQuantity((value) => Math.max(1, value - 1))} className="grid h-12 w-12 place-items-center rounded-full border border-ink/15 text-xl" aria-label="Decrease quantity">−</button><span className="min-w-8 text-center text-lg font-bold">{quantity}</span><button type="button" onClick={() => setQuantity((value) => value + 1)} className="grid h-12 w-12 place-items-center rounded-full border border-ink/15 text-xl" aria-label="Increase quantity">+</button><span className="ml-auto text-lg font-bold">₦{total.toLocaleString()}</span></div><button type="button" disabled={product.stock === 0} onClick={addToCart} className="mt-6 w-full rounded-full bg-[#1469a9] px-5 py-4 text-sm font-bold text-white transition hover:bg-[#0b4779] disabled:cursor-not-allowed disabled:opacity-40">Add to cart</button>{notice && <p className="mt-4 text-sm font-semibold text-[#34865e]" role="status">{notice}</p>}<Link href="/shop#shop-cart" className="mt-4 block text-center text-sm font-bold text-coral">View cart and checkout →</Link></div></div> : <div className="mt-16 rounded-[2rem] bg-white p-10 text-center shadow-soft"><h1 className="font-display text-5xl uppercase">Product not found</h1><p className="mt-4 text-ink/60">This product may have been removed or renamed.</p><Link href="/shop" className="button-primary mt-7">Return to shop</Link></div>}</section>
  </main>;
}
