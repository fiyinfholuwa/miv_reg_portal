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
          <ShopLink href={routes.cart} routes={routes} className="flex shrink-0 items-center justify-between gap-3 rounded-full bg-[#1469a9] py-2 pl-4 pr-2 text-sm font-bold text-white transition hover:bg-[#0b4779]">
            <span>Cart · {naira(shop.total)}</span>
            <span className="grid h-8 min-w-8 place-items-center rounded-full bg-white px-2 text-xs text-[#0b4779]">{shop.count}</span>
          </ShopLink>
        </div>
      )}

      {view === 'catalog' && <ShopCatalog shop={shop} routes={routes} variant="app" />}
      {view === 'product' && productSlug && <ProductDetail shop={shop} slug={productSlug} routes={routes} variant="app" />}
      {view === 'cart' && <CartView shop={shop} routes={routes} variant="app" />}
    </div>
  );
}
