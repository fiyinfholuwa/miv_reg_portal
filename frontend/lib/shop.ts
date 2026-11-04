import { apiUrl } from './api';

export function productSlug(name: string) {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export type Cart = Record<string, number>;
export type ShopCartProduct = { id?: number; name: string };
export type AccountCart = { accountId: number; cart: Cart };

export function readCart(value: string | null): Cart {
  if (!value) return {};

  try {
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};

    return Object.entries(parsed as Record<string, unknown>).reduce<Cart>((cart, [name, quantity]) => {
      const normalizedQuantity = Number(quantity);
      if (name && Number.isFinite(normalizedQuantity) && normalizedQuantity > 0) {
        cart[name] = Math.floor(normalizedQuantity);
      }
      return cart;
    }, {});
  } catch {
    return {};
  }
}

export function mergeCart(...carts: Cart[]): Cart {
  return carts.reduce<Cart>((merged, cart) => {
    Object.entries(cart).forEach(([name, quantity]) => {
      merged[name] = (merged[name] || 0) + quantity;
    });
    return merged;
  }, {});
}

export async function fetchAccountCart(): Promise<AccountCart | null> {
  const token = typeof window === 'undefined' ? null : window.localStorage.getItem('jan-conf-session');
  if (!token) return null;

  try {
    const response = await fetch(apiUrl('/shop/cart'), {
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return null;
    const data = await response.json();
    const accountId = Number(data.account_id);
    if (!Number.isFinite(accountId) || accountId <= 0) return null;

    const items = (Array.isArray(data.items) ? data.items : []) as Array<{ name?: string; quantity?: number }>;
    const cart = items.reduce((result: Cart, item) => {
      const quantity = Number(item.quantity);
      if (item.name && Number.isFinite(quantity) && quantity > 0) result[item.name] = Math.floor(quantity);
      return result;
    }, {});
    return { accountId, cart };
  } catch {
    return null;
  }
}

export async function persistAccountCart(cart: Cart, products: ShopCartProduct[], accountId?: number): Promise<boolean> {
  const token = typeof window === 'undefined' ? null : window.localStorage.getItem('jan-conf-session');
  if (!token) return false;

  const items = products
    .filter((product): product is ShopCartProduct & { id: number } => Number.isInteger(product.id) && (cart[product.name] || 0) > 0)
    .map((product) => ({ product_id: product.id, quantity: cart[product.name] }));

  try {
    const response = await fetch(apiUrl('/shop/cart'), {
      method: 'PUT',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ items }),
    });
    if (!response.ok) return false;
    if (accountId) window.localStorage.setItem('jan-conf-cart-owner', String(accountId));
    return true;
  } catch {
    return false;
  }
}
