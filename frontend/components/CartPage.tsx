'use client';

import RegistrationModal from './conference/RegistrationModal';
import { HubFooter, HubNav } from './landing/HubChrome';
import { CartView, publicShopRoutes } from './shop/ShopViews';
import { useShopCart } from './shop/useShopCart';

export default function CartPage() {
  const shop = useShopCart();

  return (
    <main className="miv-hub">
      <RegistrationModal />
      <div className="p-2.5 sm:p-4"><HubNav variant="solid" /></div>
      <section className="px-4 py-8 sm:px-10 sm:py-14 lg:px-[72px]">
        <CartView shop={shop} routes={publicShopRoutes} />
      </section>
      <HubFooter />
    </main>
  );
}
