'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { SESSION_CHANGED_EVENT, readSession } from '../../lib/events';
import { cartCount, cartLines, fallbackShopProducts, fetchAccountCart, loadShopProducts, mergeCart, persistAccountCart, readCart, type Cart, type ShopProduct } from '../../lib/shop';

/** Guest-only cart, kept until the guest signs in and it is merged into their account. */
const GUEST_CART_KEY = 'jan-conf-cart';

function readGuestCart(): Cart {
  try { return readCart(window.localStorage.getItem(GUEST_CART_KEY)); } catch { return {}; }
}
function writeGuestCart(cart: Cart) {
  try { window.localStorage.setItem(GUEST_CART_KEY, JSON.stringify(cart)); } catch { /* storage unavailable */ }
}
function clearGuestCart() {
  try { window.localStorage.removeItem(GUEST_CART_KEY); } catch { /* storage unavailable */ }
}

/**
 * Shared shop state for the shop, product and cart pages: the product list,
 * the cart and its lines.
 *
 * Signed in, the cart belongs to the account (it follows the person's email
 * across devices): it is loaded from and saved to the server only. Guests get
 * a temporary browser cart that is merged into the account once on sign-in.
 */
export function useShopCart() {
  const [products, setProducts] = useState<ShopProduct[]>(fallbackShopProducts);
  const [productsLoaded, setProductsLoaded] = useState(false);
  const [cart, setCart] = useState<Cart>({});
  const [mode, setMode] = useState<'loading' | 'guest' | 'account' | 'offline'>('loading');
  const pendingGuestMerge = useRef(false);

  useEffect(() => {
    void loadShopProducts().then((live) => { if (live) setProducts(live); }).finally(() => setProductsLoaded(true));
  }, []);

  useEffect(() => {
    let cancelled = false;
    const start = () => {
      if (!readSession()) {
        setCart(readGuestCart());
        setMode('guest');
        return;
      }
      setMode('loading');
      void fetchAccountCart().then((accountCart) => {
        if (cancelled) return;
        const guest = readGuestCart();
        if (!accountCart) {
          // Server unreachable: show what we have but never overwrite the saved account cart.
          setCart(guest);
          setMode('offline');
          return;
        }
        pendingGuestMerge.current = Object.keys(guest).length > 0;
        setCart(mergeCart(accountCart.cart, guest));
        setMode('account');
      });
    };
    start();
    window.addEventListener(SESSION_CHANGED_EVENT, start);
    return () => { cancelled = true; window.removeEventListener(SESSION_CHANGED_EVENT, start); };
  }, []);

  // Guests: keep the temporary browser cart up to date.
  useEffect(() => {
    if (mode === 'guest') writeGuestCart(cart);
  }, [cart, mode]);

  // Signed in: the server cart is the only copy. Debounced so quick +/- taps send one request.
  useEffect(() => {
    if (mode !== 'account' || !productsLoaded) return;
    const timer = window.setTimeout(() => {
      void persistAccountCart(cart, products).then((saved) => {
        if (saved && pendingGuestMerge.current) {
          pendingGuestMerge.current = false;
          clearGuestCart();
        }
      });
    }, 350);
    return () => window.clearTimeout(timer);
  }, [cart, products, productsLoaded, mode]);

  const lines = useMemo(() => cartLines(cart, products), [cart, products]);
  const total = useMemo(() => lines.reduce((sum, line) => sum + line.product.price * line.quantity, 0), [lines]);

  /** Units of a product already in the cart, across all its colours and sizes. */
  const quantityOf = (product: ShopProduct) => lines.filter((line) => line.product.name === product.name).reduce((sum, line) => sum + line.quantity, 0);

  return { products, productsLoaded, cart, setCart, lines, total, count: cartCount(cart), quantityOf, cartLoaded: mode !== 'loading' };
}

export type ShopCart = ReturnType<typeof useShopCart>;
