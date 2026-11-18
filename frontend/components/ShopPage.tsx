'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import RegistrationModal from './conference/RegistrationModal';
import { HubFooter, HubNav } from './landing/HubChrome';
import { naira } from './landing/hub-data';
import CartButton from './shop/CartButton';
import { ShopCatalog, publicShopRoutes } from './shop/ShopViews';
import { useShopCart } from './shop/useShopCart';
import { apiUrl } from '../lib/api';
import { errorMessage, toast } from '../lib/toast';

export default function ShopPage() {
  const shop = useShopCart();
  const { setCart, total, count } = shop;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reference = params.get('reference');
    const token = window.localStorage.getItem('jan-conf-session');
    if (params.get('payment') !== 'success' || !reference || !token) return;
    toast.info('Confirming your payment…', { id: 'payment' });
    void fetch(apiUrl(`/shop/orders/${encodeURIComponent(reference)}/verify`), { headers: { Accept: 'application/json', Authorization: `Bearer ${token}` } })
      .then(async (response) => { const data = await response.json().catch(() => ({})); if (!response.ok) throw new Error(data.message || data.errors?.payment?.[0] || 'Payment verification failed.'); return data; })
      .then((data) => { setCart({}); toast.success(`Your pickup code is ${data.order.pickup_code}.`, { id: 'payment', title: 'Payment confirmed', duration: 10000 }); window.history.replaceState({}, '', '/shop'); })
      .catch((error) => toast.error(errorMessage(error, 'Payment verification failed.'), { id: 'payment', title: 'Payment not confirmed' }));
  }, [setCart]);

  return <main className="miv-hub">
    <RegistrationModal />
    <div className="p-2.5 sm:p-4"><HubNav variant="solid" /></div>
    <CartButton count={count} />

    <section className="flex flex-col gap-8 px-4 py-10 sm:gap-10 sm:px-10 sm:py-16 lg:px-[72px]">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-col gap-3">
          <span className="text-sm font-semibold text-[#a82e26] sm:text-[15px]">Shop · pay online, collect at the venue</span>
          <h1 className="m-0 text-[34px] font-semibold leading-[1.02] tracking-[-0.025em] text-[#0c0d10] sm:text-[56px]">Wear the vision.</h1>
          <p className="m-0 max-w-xl text-[15px] leading-[1.6] text-[#4d5460] sm:text-base">Pick your colour and size, pay securely online, and collect your order at the conference store. You only sign in at checkout.</p>
        </div>
        <div className="rounded-[24px] bg-[#001428] p-5 text-[#faf6ec] sm:p-6 lg:w-80">
          <div className="flex items-start justify-between gap-3">
            <div><span className="text-sm font-semibold text-[#bcd6ec]">Your cart</span><strong className="mt-1 block text-5xl font-semibold tabular-nums">{count}</strong><span className="mt-1 block text-sm text-[#bcd6ec]">item{count === 1 ? '' : 's'} · {naira(total)}</span></div>
            <Link href="/shop/cart" className="-m-2 p-2 text-sm font-bold text-white/80 hover:text-white">View cart →</Link>
          </div>
        </div>
      </div>
      <ShopCatalog shop={shop} routes={publicShopRoutes} />
    </section>
    <HubFooter />
  </main>;
}
