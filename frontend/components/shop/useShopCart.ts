'use client';

import { useEffect, useMemo, useState } from 'react';
import { cartCount, cartLines, fallbackShopProducts, fetchAccountCart, loadShopProducts, mergeCart, persistAccountCart, readCart, type Cart, type ShopProduct } from '../../lib/shop';

const CART_STORAGE_KEY = 'jan-conf-cart';

/**
 * Shared shop state for the shop, product and cart pages: the product list,
 * the cart (localStorage for guests, merged with the account cart once signed
 * in) and its lines. Every change is saved locally and synced to the account.
 */
export function useShopCart() {
  const [products, setProducts] = useState<ShopProduct[]>(fallbackShopProducts);
  const [cart, setCart] = useState<Cart>({});
  const [cartLoaded, setCartLoaded] = useState(false);
  const [productsLoaded, setProductsLoaded] = useState(false);
  const [accountCartLoaded, setAccountCartLoaded] = useState(false);
  const [accountId, setAccountId] = useState<number | null>(null);

  useEffect(() => {
    const localCart = readCart(window.localStorage.getItem(CART_STORAGE_KEY));
    setCart(localCart);
    setCartLoaded(true);

    void loadShopProducts().then((live) => { if (live) setProducts(live); }).finally(() => setProductsLoaded(true));

    void fetchAccountCart()
      .then((accountCart) => {
        if (!accountCart) return;
        setAccountId(accountCart.accountId);
        const owner = window.localStorage.getItem('jan-conf-cart-owner');
        setCart(owner === String(accountCart.accountId) ? accountCart.cart : mergeCart(accountCart.cart, localCart));
      })
      .finally(() => setAccountCartLoaded(true));
  }, []);

  useEffect(() => {
    if (cartLoaded) window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  }, [cart, cartLoaded]);

  useEffect(() => {
    if (!cartLoaded || !accountCartLoaded || !productsLoaded || !accountId) return;
    void persistAccountCart(cart, products, accountId);
  }, [cart, products, cartLoaded, accountCartLoaded, productsLoaded, accountId]);

  const lines = useMemo(() => cartLines(cart, products), [cart, products]);
  const total = useMemo(() => lines.reduce((sum, line) => sum + line.product.price * line.quantity, 0), [lines]);

  /** Units of a product already in the cart, across all its colours and sizes. */
  const quantityOf = (product: ShopProduct) => lines.filter((line) => line.product.name === product.name).reduce((sum, line) => sum + line.quantity, 0);

  return { products, productsLoaded, cart, setCart, lines, total, count: cartCount(cart), quantityOf };
}
