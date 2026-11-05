'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import RegistrationModal from './conference/RegistrationModal';
import { HubFooter, HubNav } from './landing/HubChrome';
import { naira } from './landing/hub-data';
import CartButton from './shop/CartButton';
import { SwatchRow } from './shop/VariantPicker';
import { useShopCart } from './shop/useShopCart';
import { apiUrl } from '../lib/api';
import { cartKey, productColors, productImage, productSizes, productSlug, type ShopProduct } from '../lib/shop';
import { errorMessage, toast } from '../lib/toast';

function ProductCard({ product, onAdd }: { product: ShopProduct; onAdd: (product: ShopProduct, color: string) => void }) {
  const colors = productColors(product);
  const [color, setColor] = useState(colors[0]?.name ?? '');
  const needsSize = productSizes(product).length > 0;
  const href = `/shop/${productSlug(product.name)}${color ? `?color=${encodeURIComponent(color)}` : ''}`;
  const soldOut = product.stock === 0;

  return (
    <article className="group flex flex-col rounded-[22px] border border-[#e4e7ec] bg-white px-2.5 pb-3 pt-2.5 transition hover:-translate-y-1 hover:shadow-lg">
      <Link href={href} className="flex flex-1 flex-col gap-3">
        <div className="relative aspect-square overflow-hidden rounded-2xl bg-[#f4eddc]">
          <img src={productImage(product, color)} alt={`${product.name}${color ? ` in ${color}` : ''}`} className="block h-full w-full object-cover transition duration-500 group-hover:scale-105" loading="lazy" />
          {product.tag && <span className="absolute left-3 top-3 rounded-full bg-white px-3 py-1 text-xs font-bold text-[#0c0d10]">{product.tag}</span>}
          {soldOut && <span className="absolute right-3 top-3 rounded-full bg-[#0c0d10] px-3 py-1 text-xs font-bold text-white">Sold out</span>}
        </div>
        <div className="flex flex-1 flex-col gap-1 px-2">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-2"><h2 className="m-0 text-[15px] font-semibold text-[#0c0d10] sm:text-base">{product.name}</h2><span className="text-[15px] font-bold text-[#a82e26] sm:text-base">{naira(product.price)}</span></div>
          <p className="m-0 hidden text-sm leading-5 text-[#4d5460] sm:block">{product.description || 'Official MIV merchandise.'}</p>
        </div>
      </Link>
      <div className="mt-3 px-2"><SwatchRow colors={colors} value={color} onChange={setColor} /></div>
      {needsSize
        ? <Link href={href} aria-disabled={soldOut} className={`mx-2 mt-3 rounded-full px-4 py-3 text-center text-sm font-bold transition ${soldOut ? 'pointer-events-none bg-[#e4e7ec] text-[#6b7280]' : 'bg-[#00203f] text-white hover:bg-[#003070]'}`}>{soldOut ? 'Sold out' : 'Choose size →'}</Link>
        : <button type="button" disabled={soldOut} onClick={() => onAdd(product, color)} className="mx-2 mt-3 rounded-full bg-[#00203f] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#003070] disabled:bg-[#e4e7ec] disabled:text-[#6b7280]">{soldOut ? 'Sold out' : 'Add to cart'}</button>}
    </article>
  );
}

export default function ShopPage() {
  const { products, setCart, total, count, quantityOf } = useShopCart();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reference = params.get('reference');
    const token = window.localStorage.getItem('jan-conf-session');
    if (params.get('payment') !== 'success' || !reference || !token) return;
    toast.info('Confirming your payment…', { id: 'payment' });
    void fetch(apiUrl(`/shop/orders/${encodeURIComponent(reference)}/verify`), { headers: { Accept: 'application/json', Authorization: `Bearer ${token}` } })
      .then(async (response) => { const data = await response.json().catch(() => ({})); if (!response.ok) throw new Error(data.message || data.errors?.payment?.[0] || 'Payment verification failed.'); return data; })
      .then((data) => { window.localStorage.removeItem('jan-conf-cart'); setCart({}); toast.success(`Your pickup code is ${data.order.pickup_code}.`, { id: 'payment', title: 'Payment confirmed', duration: 10000 }); window.history.replaceState({}, '', '/shop'); })
      .catch((error) => toast.error(errorMessage(error, 'Payment verification failed.'), { id: 'payment', title: 'Payment not confirmed' }));
  }, [setCart]);

  const addToCart = (product: ShopProduct, color: string) => {
    if (product.stock != null && quantityOf(product) + 1 > product.stock) {
      toast.warning(`Only ${product.stock} ${product.name} left in stock.`, { title: 'Not enough stock' });
      return;
    }
    const key = cartKey(product.name, color);
    setCart((current) => ({ ...current, [key]: (current[key] || 0) + 1 }));
    toast.success(`${product.name}${color ? ` (${color})` : ''} added to your cart.`, { title: 'Added to cart' });
  };

  return <main className="miv-hub">
    <RegistrationModal />
    <div className="p-2.5 sm:p-4"><HubNav variant="solid" /></div>
    <CartButton count={count} />

    <section className="flex flex-col gap-10 px-5 py-12 sm:px-10 sm:py-16 lg:px-[72px]">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-col gap-3">
          <span className="text-sm font-semibold text-[#a82e26] sm:text-[15px]">Shop · pay online, collect at the venue</span>
          <h1 className="m-0 text-[36px] font-semibold leading-[1.02] tracking-[-0.025em] text-[#0c0d10] sm:text-[56px]">Wear the vision.</h1>
          <p className="m-0 max-w-xl text-[15px] leading-[1.6] text-[#4d5460] sm:text-base">Pick your colour and size, pay securely online, and collect your order at the conference store. You only sign in at checkout.</p>
        </div>
        <div className="rounded-[24px] bg-[#001428] p-6 text-[#faf6ec] lg:w-80">
          <div className="flex items-start justify-between gap-3">
            <div><span className="text-sm font-semibold text-[#bcd6ec]">Your cart</span><strong className="mt-1 block text-5xl font-semibold tabular-nums">{count}</strong><span className="mt-1 block text-sm text-[#bcd6ec]">item{count === 1 ? '' : 's'} · {naira(total)}</span></div>
            <Link href="/shop/cart" className="text-sm font-bold text-white/80 hover:text-white">View cart →</Link>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">{products.map((product) => <ProductCard key={product.id ?? product.name} product={product} onAdd={addToCart} />)}</div>
    </section>
    <HubFooter />
  </main>;
}
