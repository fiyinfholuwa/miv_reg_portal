'use client';

import { useEffect, useState, type MouseEvent, type ReactNode } from 'react';
import Link from 'next/link';
import { naira } from '../landing/hub-data';
import { ColorPicker, SizePicker, Swatch, SwatchRow } from './VariantPicker';
import type { ShopCart } from './useShopCart';
import { apiUrl } from '../../lib/api';
import { cartKey, cartPayload, colorHex, lineNeedsOptions, productColors, productEvents, productImage, productSizes, productSlug, variantLabel, type CartLine, type ShopProduct } from '../../lib/shop';
import { errorMessage, toast } from '../../lib/toast';

/**
 * The shop's catalog, product and cart screens, shared by the public /shop
 * pages and the in-app shop inside the dashboard. `routes` says where links
 * go; `variant` only adjusts spacing for the surrounding chrome.
 */
export type ShopRoutes = {
  shop: string;
  cart: string;
  product: (slug: string, color?: string) => string;
  /** In-app navigation (dashboard router). Public pages use plain Next links. */
  navigate?: (href: string) => void;
};
export type ShopVariant = 'public' | 'app';

/** Where Paystack should bring the buyer back to (read by the order page). */
export const CHECKOUT_ORIGIN_KEY = 'miv-checkout-origin';

export const publicShopRoutes: ShopRoutes = {
  shop: '/shop',
  cart: '/shop/cart',
  product: (slug, color) => `/shop/${slug}${color ? `?color=${encodeURIComponent(color)}` : ''}`,
};

export function ShopLink({ href, routes, className, children, ...rest }: { href: string; routes: ShopRoutes; className?: string; children: ReactNode; 'aria-label'?: string; 'aria-disabled'?: boolean }) {
  if (!routes.navigate) return <Link href={href} className={className} {...rest}>{children}</Link>;
  const navigate = routes.navigate;
  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    event.preventDefault();
    navigate(href);
  };
  return <a href={href} onClick={onClick} className={className} {...rest}>{children}</a>;
}

function ProductCard({ product, routes, onAdd }: { product: ShopProduct; routes: ShopRoutes; onAdd: (product: ShopProduct, color: string) => void }) {
  const colors = productColors(product);
  const [color, setColor] = useState(colors[0]?.name ?? '');
  const needsSize = productSizes(product).length > 0;
  const href = routes.product(productSlug(product.name), color);
  const soldOut = product.stock === 0;

  return (
    <article className="group flex min-w-0 flex-col rounded-[22px] border border-[#e4e7ec] bg-white px-2.5 pb-3 pt-2.5 transition hover:-translate-y-1 hover:shadow-lg">
      <ShopLink href={href} routes={routes} className="flex flex-1 flex-col gap-3">
        <div className="relative aspect-square overflow-hidden rounded-2xl bg-[#f4eddc]">
          <img src={productImage(product, color)} alt={`${product.name}${color ? ` in ${color}` : ''}`} className="block h-full w-full object-cover transition duration-500 group-hover:scale-105" loading="lazy" />
          {product.tag && <span className="absolute left-2 top-2 max-w-[calc(100%-1rem)] truncate rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-[#0c0d10] sm:left-3 sm:top-3 sm:px-3 sm:text-xs">{product.tag}</span>}
          {soldOut && <span className="absolute right-2 top-2 rounded-full bg-[#0c0d10] px-2.5 py-1 text-[11px] font-bold text-white sm:right-3 sm:top-3 sm:text-xs">Sold out</span>}
        </div>
        <div className="flex flex-1 flex-col gap-1 px-1.5 sm:px-2">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-2"><h2 className="m-0 text-[14px] font-semibold leading-snug text-[#0c0d10] sm:text-base">{product.name}</h2><span className="text-[14px] font-bold text-[#a82e26] sm:text-base">{naira(product.price)}</span></div>
          {product.event && <span className="text-[11px] font-semibold uppercase tracking-[.08em] text-[#1469a9]">{product.event.short_name}</span>}
          <p className="m-0 hidden text-sm leading-5 text-[#4d5460] sm:block">{product.description || 'Official MIV merchandise.'}</p>
        </div>
      </ShopLink>
      <div className="mt-3 px-1.5 sm:px-2"><SwatchRow colors={colors} value={color} onChange={setColor} /></div>
      {needsSize
        ? <ShopLink href={href} routes={routes} aria-disabled={soldOut} className={`mx-1.5 mt-3 rounded-full px-3 py-3 text-center text-[13px] font-bold transition sm:mx-2 sm:px-4 sm:text-sm ${soldOut ? 'pointer-events-none bg-[#e4e7ec] text-[#6b7280]' : 'bg-[#00203f] text-white hover:bg-[#003070]'}`}>{soldOut ? 'Sold out' : 'Choose size →'}</ShopLink>
        : <button type="button" disabled={soldOut} onClick={() => onAdd(product, color)} className="mx-1.5 mt-3 rounded-full bg-[#00203f] px-3 py-3 text-[13px] font-bold text-white transition hover:bg-[#003070] disabled:bg-[#e4e7ec] disabled:text-[#6b7280] sm:mx-2 sm:px-4 sm:text-sm">{soldOut ? 'Sold out' : 'Add to cart'}</button>}
    </article>
  );
}

/** Event chips ("All" + each event with products) and the product grid. */
export function ShopCatalog({ shop, routes, variant = 'public' }: { shop: ShopCart; routes: ShopRoutes; variant?: ShopVariant }) {
  const { products, setCart, quantityOf } = shop;
  const events = productEvents(products);
  const [eventSlug, setEventSlug] = useState('');

  // Keep ?event= in the address so a filtered shop can be shared.
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get('event');
    if (requested) setEventSlug(requested);
  }, []);
  const chooseEvent = (slug: string) => {
    setEventSlug(slug);
    const url = new URL(window.location.href);
    if (slug) url.searchParams.set('event', slug); else url.searchParams.delete('event');
    window.history.replaceState(window.history.state, '', url);
  };

  const activeSlug = events.some((event) => event.slug === eventSlug) ? eventSlug : '';
  const shown = activeSlug ? products.filter((product) => product.event?.slug === activeSlug) : products;

  const addToCart = (product: ShopProduct, color: string) => {
    if (product.stock != null && quantityOf(product) + 1 > product.stock) {
      toast.warning(`Only ${product.stock} ${product.name} left in stock.`, { title: 'Not enough stock' });
      return;
    }
    const key = cartKey(product.name, color);
    setCart((current) => ({ ...current, [key]: (current[key] || 0) + 1 }));
    toast.success(`${product.name}${color ? ` (${color})` : ''} added to your cart.`, { title: 'Added to cart' });
  };

  const chip = (active: boolean) => `shrink-0 rounded-full px-4 py-2.5 text-sm font-bold transition ${active ? (variant === 'app' ? 'bg-[#1469a9] text-white' : 'bg-[#00203f] text-white') : 'bg-white text-[#4d5460] ring-1 ring-[#e4e7ec] hover:text-[#0c0d10]'}`;

  return (
    <div className="flex flex-col gap-4">
      {events.length > 0 && (
        <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="group" aria-label="Filter by event">
          <button type="button" onClick={() => chooseEvent('')} aria-pressed={!activeSlug} className={chip(!activeSlug)}>All</button>
          {events.map((event) => <button key={event.slug} type="button" onClick={() => chooseEvent(event.slug)} aria-pressed={activeSlug === event.slug} className={chip(activeSlug === event.slug)}>{event.short_name}</button>)}
        </div>
      )}
      {shown.length === 0
        ? <p className="rounded-[22px] bg-white p-8 text-center text-sm text-[#4d5460]">No products for this event yet.</p>
        : <div className={`grid grid-cols-2 gap-3 sm:gap-4 ${variant === 'app' ? 'lg:grid-cols-3 2xl:grid-cols-4' : 'lg:grid-cols-4'}`}>{shown.map((product) => <ProductCard key={product.id ?? product.name} product={product} routes={routes} onAdd={addToCart} />)}</div>}
    </div>
  );
}

export function ProductDetail({ shop, slug, routes, variant = 'public' }: { shop: ShopCart; slug: string; routes: ShopRoutes; variant?: ShopVariant }) {
  const { products, productsLoaded, setCart, quantityOf } = shop;
  const product = products.find((item) => productSlug(item.name) === slug) ?? null;
  const colors = product ? productColors(product) : [];
  const sizes = product ? productSizes(product) : [];

  const [color, setColor] = useState('');
  const [size, setSize] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [missingSize, setMissingSize] = useState(0);

  // Start on the colour picked on the shop card (?color=), else the first one.
  useEffect(() => {
    if (!product) return;
    const requested = new URLSearchParams(window.location.search).get('color');
    const names = productColors(product).map((option) => option.name);
    setColor((current) => (names.includes(current) ? current : requested && names.includes(requested) ? requested : names[0] ?? ''));
    const sizeNames = productSizes(product);
    setSize((current) => (sizeNames.includes(current) ? current : sizeNames.length === 1 ? sizeNames[0] : ''));
  }, [product]);

  const chooseColor = (next: string) => {
    setColor(next);
    const url = new URL(window.location.href);
    url.searchParams.set('color', next);
    window.history.replaceState(window.history.state, '', url);
  };

  const inCart = product ? quantityOf(product) : 0;
  const available = product?.stock == null ? null : Math.max(0, product.stock - inCart);
  const soldOut = product?.stock === 0;

  const addToCart = () => {
    if (!product) return;
    if (colors.length && !color) { toast.warning('Pick a colour before adding to your cart.', { title: 'Choose a colour' }); return; }
    if (sizes.length && !size) {
      setMissingSize((attempt) => attempt + 1);
      toast.warning('Pick your size before adding to your cart.', { title: 'Choose a size' });
      return;
    }
    if (available !== null && quantity > available) {
      toast.warning(available ? `Only ${available} more can be added.` : 'You already have all remaining stock in your cart.', { title: 'Not enough stock' });
      return;
    }
    const key = cartKey(product.name, color, size);
    setCart((current) => ({ ...current, [key]: (current[key] || 0) + quantity }));
    toast.success(`${quantity} × ${product.name}${[color, size].filter(Boolean).length ? ` (${[color, size].filter(Boolean).join(', ')})` : ''}`, { title: 'Added to cart' });
    setQuantity(1);
  };

  const stepper = 'grid h-12 w-12 place-items-center rounded-full border-[1.5px] border-[#c9ced6] text-xl text-[#0c0d10] transition hover:border-[#0c0d10] disabled:opacity-40';
  const hex = product && color ? colorHex(product, color) : undefined;
  const sticky = variant === 'app' ? 'lg:sticky lg:top-4' : 'lg:sticky lg:top-32';

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <nav className="flex min-w-0 items-center gap-2 text-sm font-semibold text-[#6b7280]" aria-label="Breadcrumb">
        <ShopLink href={routes.shop} routes={routes} className={variant === 'app' ? 'text-[#1469a9]' : 'text-[#a82e26] hover:text-[#8c1f1c]'}>Shop</ShopLink><span aria-hidden="true">/</span><span className="truncate text-[#0c0d10]">{product?.name ?? 'Product'}</span>
      </nav>
      {product ? <div className="grid gap-6 lg:grid-cols-2 lg:items-start lg:gap-10">
        <div className={`flex min-w-0 flex-col gap-3 ${sticky}`}>
          <div className="relative aspect-square overflow-hidden rounded-[22px] bg-[#f4eddc] sm:rounded-[28px]">
            <img key={color} src={productImage(product, color)} alt={`${product.name}${color ? ` in ${color}` : ''}`} className="miv-fade h-full w-full object-cover" />
            {color && hex && <span className="absolute bottom-4 left-4 flex items-center gap-2 rounded-full bg-white/95 px-3 py-1.5 text-xs font-bold text-[#0c0d10] shadow"><Swatch hex={hex} size={12} />{color}</span>}
          </div>
          {colors.length > 1 && (
            <div className="no-scrollbar flex gap-3 overflow-x-auto">
              {colors.map((option) => (
                <button key={option.name} type="button" onClick={() => chooseColor(option.name)} aria-label={`Show ${option.name}`} className={`m-1 h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-[#f4eddc] transition sm:h-20 sm:w-20 ${option.name === color ? 'ring-2 ring-[#0c0d10] ring-offset-2' : 'opacity-70 hover:opacity-100'}`}>
                  <img src={productImage(product, option.name)} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex min-w-0 flex-col rounded-[22px] border border-[#e4e7ec] bg-white p-5 sm:rounded-[28px] sm:p-10">
          <span className="text-sm font-semibold text-[#a82e26] sm:text-[15px]">{product.event ? `${product.event.short_name} · ` : ''}{product.tag || 'Official merchandise'}</span>
          <h1 className={`m-0 mt-3 break-words font-semibold leading-[1.05] tracking-[-0.025em] text-[#0c0d10] ${variant === 'app' ? 'text-[28px] sm:text-[40px]' : 'text-[32px] sm:text-[52px]'}`}>{product.name}</h1>
          <p className="m-0 mt-4 text-2xl font-bold text-[#a82e26]">{naira(product.price)}</p>
          <p className="m-0 mt-5 max-w-xl text-base leading-[1.65] text-[#4d5460]">{product.description || 'Official MIV merchandise.'}</p>

          <div className="mt-8 flex flex-col gap-7 border-t border-[#e4e7ec] pt-7">
            {colors.length > 0 && <ColorPicker colors={colors} value={color} onChange={chooseColor} />}
            {sizes.length > 0 && <div key={missingSize}><SizePicker sizes={sizes} value={size} onChange={setSize} invalid={missingSize > 0} /></div>}
            <div>
              <span className="mb-3 block text-sm font-semibold text-[#22262e]">Quantity</span>
              <div className="flex flex-wrap items-center gap-3">
                <button type="button" onClick={() => setQuantity((value) => Math.max(1, value - 1))} disabled={quantity <= 1} className={stepper} aria-label="Decrease quantity">−</button>
                <span className="min-w-8 text-center text-lg font-bold tabular-nums" aria-live="polite">{quantity}</span>
                <button type="button" onClick={() => setQuantity((value) => Math.min(20, available ?? 20, value + 1))} disabled={quantity >= Math.min(20, available ?? 20)} className={stepper} aria-label="Increase quantity">+</button>
                <span className="ml-auto text-right"><span className="block text-xs font-semibold text-[#6b7280]">Total</span><span className="text-xl font-bold tabular-nums">{naira(product.price * quantity)}</span></span>
              </div>
              {product.stock != null && <p className={`m-0 mt-3 text-sm font-semibold ${soldOut ? 'text-[#a82e26]' : product.stock <= 5 ? 'text-[#b7791f]' : 'text-[#2f7d4f]'}`}>{soldOut ? 'Sold out' : product.stock <= 5 ? `Only ${product.stock} left` : 'In stock'}</p>}
            </div>
          </div>

          <button type="button" disabled={soldOut} onClick={addToCart} className="mt-7 w-full rounded-full bg-[#00203f] px-5 py-4 text-[15px] font-bold text-white transition hover:bg-[#003070] disabled:cursor-not-allowed disabled:bg-[#e4e7ec] disabled:text-[#6b7280]">
            {soldOut ? 'Sold out' : sizes.length && !size ? 'Choose a size' : `Add to cart · ${[color, size].filter(Boolean).join(' / ') || naira(product.price * quantity)}`}
          </button>
          {inCart > 0 && <ShopLink href={routes.cart} routes={routes} className="mt-4 py-2 text-center text-sm font-bold text-[#a82e26]">{inCart} in your cart · View cart →</ShopLink>}
          <ul className="m-0 mt-7 grid gap-2 border-t border-[#e4e7ec] p-0 pt-6 text-sm text-[#4d5460]">
            <li className="flex gap-2"><span aria-hidden="true">💳</span>Pay securely online with Paystack.</li>
            <li className="flex gap-2"><span aria-hidden="true">📦</span>Collect at the conference store with your pickup QR code.</li>
          </ul>
        </div>
      </div> : productsLoaded ? <div className="flex flex-col items-center gap-4 rounded-[28px] border border-[#e4e7ec] bg-white p-8 text-center sm:p-10">
        <h1 className="m-0 text-[28px] font-semibold text-[#0c0d10] sm:text-[36px]">Product not found</h1>
        <p className="m-0 text-[#4d5460]">This product may have been removed or renamed.</p>
        <ShopLink href={routes.shop} routes={routes} className="rounded-full bg-[#00203f] px-7 py-[15px] text-[15px] font-bold text-white">Return to shop</ShopLink>
      </div> : <div className="h-[420px] animate-pulse rounded-[28px] bg-[#f4eddc]" aria-label="Loading product" />}
    </div>
  );
}

const steps = ['Cart', 'Sign in', 'Pay', 'Collect'];

export function CartView({ shop, routes, variant = 'public' }: { shop: ShopCart; routes: ShopRoutes; variant?: ShopVariant }) {
  const { setCart, lines, total, count, quantityOf } = shop;
  const [checkingOut, setCheckingOut] = useState(false);
  const incomplete = lines.filter(lineNeedsOptions);

  const setQuantity = (line: CartLine, next: number) => {
    const quantity = Math.floor(Number(next));
    const stock = line.product.stock;
    const otherLines = quantityOf(line.product) - line.quantity;
    if (stock != null && quantity > stock - otherLines) {
      toast.warning(`Only ${stock} ${line.product.name} in stock across all colours and sizes.`, { title: 'Not enough stock' });
    }
    setCart((current) => {
      const updated = { ...current };
      if (!Number.isFinite(quantity) || quantity <= 0) delete updated[line.key];
      else updated[line.key] = Math.min(quantity, 20, stock != null ? Math.max(1, stock - otherLines) : 20);
      return updated;
    });
  };

  const changeSize = (line: CartLine, size: string) => {
    const key = cartKey(line.product.name, line.color, size);
    if (key === line.key) return;
    setCart((current) => {
      const updated = { ...current };
      delete updated[line.key];
      updated[key] = (updated[key] || 0) + line.quantity;
      return updated;
    });
  };

  const remove = (line: CartLine) => {
    setCart((current) => { const updated = { ...current }; delete updated[line.key]; return updated; });
    toast.info(`${line.product.name} removed from your cart.`, { title: 'Removed' });
  };

  const checkout = async () => {
    if (!total) return;
    if (incomplete.length) {
      toast.warning(`Choose a colour and size for ${incomplete[0].product.name} before checkout.`, { title: 'Options needed' });
      return;
    }
    if (!window.localStorage.getItem('jan-conf-session')) {
      toast.warning('Please sign in or register before checkout.', { title: 'Sign in to check out' });
      window.dispatchEvent(new CustomEvent('open-registration-modal', { detail: { returnTo: routes.cart } }));
      return;
    }

    const items = cartPayload(lines);
    if (!items.length) {
      toast.warning('Refresh the cart so we can confirm the products.');
      return;
    }

    setCheckingOut(true);
    toast.info('Opening secure payment…', { id: 'checkout' });
    try {
      const response = await fetch(apiUrl('/shop/orders/initialize'), {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${window.localStorage.getItem('jan-conf-session')}`,
        },
        body: JSON.stringify({ items }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.errors?.items?.[0] || data.errors?.payment?.[0] || data.message || 'Could not start payment.');
      // Paystack returns to /shop/orders/<reference> in this tab; remember where checkout began.
      try { window.sessionStorage.setItem(CHECKOUT_ORIGIN_KEY, variant === 'app' ? 'dashboard' : 'shop'); } catch { /* storage unavailable */ }
      window.location.assign(data.authorization_url);
    } catch (error) {
      toast.error(errorMessage(error, 'Could not start payment.'), { id: 'checkout', title: 'Payment could not start' });
      setCheckingOut(false);
    }
  };

  const app = variant === 'app';

  return (
    <div>
      <ShopLink href={routes.shop} routes={routes} className={`inline-block py-2 text-sm font-bold ${app ? 'text-[#1469a9]' : 'text-[#a82e26] hover:text-[#8c1f1c]'}`}>← Keep shopping</ShopLink>

      <ol className="no-scrollbar m-0 mt-4 flex list-none items-center gap-2 overflow-x-auto p-0 text-xs font-bold sm:mt-6 sm:text-sm" aria-label="Checkout steps">
        {steps.map((step, index) => (
          <li key={step} className="flex shrink-0 items-center gap-2">
            <span className={`flex items-center gap-2 rounded-full px-3 py-1.5 ${index === 0 ? 'bg-[#00203f] text-white' : 'bg-white text-[#6b7280] ring-1 ring-[#e4e7ec]'}`} aria-current={index === 0 ? 'step' : undefined}>
              <span className={`grid h-5 w-5 place-items-center rounded-full text-[11px] ${index === 0 ? 'bg-white text-[#00203f]' : 'bg-[#f4f5f7]'}`}>{index + 1}</span>{step}
            </span>
            {index < steps.length - 1 && <span className="h-px w-3 bg-[#c9ced6] sm:w-4" aria-hidden="true" />}
          </li>
        ))}
      </ol>

      <div className={`mt-6 grid gap-7 sm:mt-8 ${app ? 'xl:grid-cols-[1fr_340px]' : 'lg:grid-cols-[1fr_360px]'}`}>
        <div className="min-w-0">
          <div className="flex items-end justify-between gap-4">
            <div>
              <span className="text-sm font-semibold text-[#a82e26] sm:text-[15px]">Ready for collection</span>
              <h1 className={`m-0 mt-2 font-semibold leading-[1.02] tracking-[-0.025em] text-[#0c0d10] ${app ? 'text-[28px] sm:text-[40px]' : 'text-[34px] sm:text-[56px]'}`}>Your cart.</h1>
            </div>
            <span className="shrink-0 text-sm font-bold text-[#6b7280]">{count} item{count === 1 ? '' : 's'}</span>
          </div>

          <div className="mt-6 grid gap-4 sm:mt-8">
            {lines.length === 0 && (
              <div className="flex flex-col items-center gap-4 rounded-[22px] border border-dashed border-[#c9ced6] bg-white p-8 text-center sm:p-10">
                <p className="m-0 text-lg font-semibold text-[#0c0d10]">Your cart is empty.</p>
                <p className="m-0 text-sm text-[#4d5460]">Pick a colour and size from the collection to get started.</p>
                <ShopLink href={routes.shop} routes={routes} className="rounded-full bg-[#00203f] px-7 py-[15px] text-[15px] font-bold text-white">Browse the shop</ShopLink>
              </div>
            )}

            {lines.map((line) => {
              const { product } = line;
              const href = routes.product(productSlug(product.name), line.color);
              const sizes = productSizes(product);
              const hex = line.color ? colorHex(product, line.color) : undefined;
              const needsOptions = lineNeedsOptions(line);

              return (
                <article key={line.key} className={`flex gap-3 rounded-[22px] border bg-white p-3 sm:gap-4 sm:p-5 ${needsOptions ? 'border-[#e8c48a]' : 'border-[#e4e7ec]'}`}>
                  <ShopLink href={href} routes={routes} className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-[#f4eddc] sm:h-32 sm:w-32">
                    <img src={productImage(product, line.color)} alt={product.name} className="h-full w-full object-cover" />
                  </ShopLink>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-start justify-between gap-2 sm:gap-3">
                      <div className="min-w-0">
                        <ShopLink href={href} routes={routes} className="text-base font-semibold leading-tight text-[#0c0d10] hover:text-[#a82e26] sm:text-lg">{product.name}</ShopLink>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-[#4d5460]">
                          {line.color && <span className="flex items-center gap-1.5 rounded-full bg-[#f4f5f7] px-2.5 py-1 font-semibold text-[#22262e]">{hex && <Swatch hex={hex} size={12} />}{line.color}</span>}
                          {sizes.length > 0 && (
                            <label className="flex items-center gap-1.5 rounded-full bg-[#f4f5f7] py-1 pl-2.5 pr-1 font-semibold text-[#22262e]">
                              Size
                              <select value={sizes.includes(line.size) ? line.size : ''} onChange={(event) => changeSize(line, event.target.value)} className="rounded-full border-0 bg-white px-2 py-1 text-sm font-bold outline-none" aria-label={`Size for ${product.name}`}>
                                {!sizes.includes(line.size) && <option value="" disabled>Choose</option>}
                                {sizes.map((size) => <option key={size}>{size}</option>)}
                              </select>
                            </label>
                          )}
                          <span>{naira(product.price)} each</span>
                        </div>
                        {needsOptions && <ShopLink href={href} routes={routes} className="mt-2 inline-block text-sm font-bold text-[#b7791f]">Choose colour and size →</ShopLink>}
                      </div>
                      <button type="button" onClick={() => remove(line)} className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-[#6b7280] transition hover:bg-[#fff0ee] hover:text-[#a82e26]" aria-label={`Remove ${product.name}`}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg>
                      </button>
                    </div>
                    <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-3 sm:pt-4">
                      <div className="flex items-center gap-1 rounded-full border border-[#e4e7ec] p-1">
                        <button type="button" onClick={() => setQuantity(line, line.quantity - 1)} className="grid h-9 w-9 place-items-center rounded-full text-lg leading-none hover:bg-[#f4f5f7]" aria-label={`Decrease ${product.name}`}>−</button>
                        <span className="w-8 text-center text-sm font-bold tabular-nums">{line.quantity}</span>
                        <button type="button" onClick={() => setQuantity(line, line.quantity + 1)} className="grid h-9 w-9 place-items-center rounded-full text-lg leading-none hover:bg-[#f4f5f7]" aria-label={`Increase ${product.name}`}>+</button>
                      </div>
                      <strong className="tabular-nums">{naira(product.price * line.quantity)}</strong>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        <aside className={`h-fit min-w-0 rounded-[24px] p-5 text-[#faf6ec] sm:p-6 ${app ? 'bg-[#03284a] xl:sticky xl:top-4' : 'bg-[#001428] lg:sticky lg:top-32'}`}>
          <span className="text-sm font-semibold text-[#bcd6ec]">Order summary</span>
          <div className="mt-4 grid gap-2 border-b border-white/10 pb-4 text-sm">
            {lines.length === 0 && <span className="text-[#bcd6ec]">No items yet.</span>}
            {lines.map((line) => <div key={line.key} className="flex justify-between gap-3"><span className="min-w-0 truncate text-[#dceaf5]">{line.product.name}{variantLabel(line) ? ` · ${variantLabel(line)}` : ''} × {line.quantity}</span><span className="shrink-0 tabular-nums">{naira(line.product.price * line.quantity)}</span></div>)}
          </div>
          <div className="mt-4 flex items-end justify-between gap-3">
            <span className="text-sm text-[#bcd6ec]">Total</span>
            <strong className="text-3xl font-semibold tabular-nums sm:text-4xl">{naira(total)}</strong>
          </div>
          <p className="mt-4 text-sm leading-6 text-[#bcd6ec]">Payment is handled securely by Paystack. Collect your order at the conference store with your pickup QR code.</p>
          <button type="button" disabled={!total || checkingOut} onClick={() => void checkout()} className="mt-6 w-full rounded-full bg-[#a82e26] px-5 py-4 text-[15px] font-bold text-white transition hover:bg-[#8c1f1c] disabled:cursor-not-allowed disabled:opacity-40">
            {checkingOut ? 'Opening payment…' : `Checkout · ${naira(total)}`}
          </button>
        </aside>
      </div>
    </div>
  );
}
