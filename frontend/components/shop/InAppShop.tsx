'use client';

import { useMemo } from 'react';
import { naira } from '../landing/hub-data';
import { CartView, ProductDetail, ShopCatalog, ShopLink, type ShopRoutes } from './ShopViews';
import { useShopCart } from './useShopCart';

type Props = {
  view: 'catalog' | 'cart' | 'product';
  productSlug?: string;
  /** Dashboard navigation (keeps the dashboard shell mounted). */
  go: (href: string) => void;
};

/**
 * The shop inside the signed-in dashboard: catalog, product and cart with
 * Paystack checkout, without the public site's navigation. Uses the same
 * account cart as the public /shop pages.
 */
export default function InAppShop({ view, productSlug, go }: Props) {
  const shop = useShopCart();
  const routes = useMemo<ShopRoutes>(() => ({
    shop: '/dashboard/shop',
    cart: '/dashboard/shop/cart',
    product: (slug, color) => `/dashboard/shop/${slug}${color ? `?color=${encodeURIComponent(color)}` : ''}`,
    navigate: go,
  }), [go]);

  return (
    <div className="grid gap-5 pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-0">
      {view !== 'cart' && (
        <div className="flex flex-col gap-3 rounded-[1.5rem] border border-ink/10 bg-white p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[.14em] text-[#1469a9]">Shop · pay online, collect at the venue</p>
            <p className="mt-1 text-sm text-ink/60">Pick your colour and size, pay with Paystack, then show your pickup QR code at the store.</p>
          </div>
        </div>
      )}

      {view === 'catalog' && <ShopCatalog shop={shop} routes={routes} variant="app" />}
      {view === 'product' && productSlug && <ProductDetail shop={shop} slug={productSlug} routes={routes} variant="app" />}
      {view === 'cart' && <CartView shop={shop} routes={routes} variant="app" />}

      {/* Floating cart: always reachable while browsing; sits above the phone tab bar. */}
      {view !== 'cart' && (
        <ShopLink href={routes.cart} routes={routes} className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] right-4 z-40 flex items-center gap-2 rounded-full bg-[#1469a9] py-2 pl-2 pr-4 text-sm font-bold text-white shadow-[0_12px_30px_rgba(3,40,74,.3)] transition hover:bg-[#0b4779] sm:right-6 lg:bottom-8 lg:right-10">
          <span className="relative grid h-10 w-10 place-items-center rounded-full bg-white text-[#0b4779]">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="9" cy="20" r="1" /><circle cx="18" cy="20" r="1" /><path d="M3 4h2l2.4 10.2a2 2 0 0 0 2 1.5h7.8a2 2 0 0 0 1.9-1.4L21 8H6" /></svg>
            {shop.count > 0 && <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-[#a82e26] px-1 text-[10px] font-bold text-white">{shop.count}</span>}
          </span>
          <span>{naira(shop.total)}</span>
          <span className="sr-only">Open cart, {shop.count} item{shop.count === 1 ? '' : 's'}</span>
        </ShopLink>
      )}
    </div>
  );
}
