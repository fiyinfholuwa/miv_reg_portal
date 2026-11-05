import { apiUrl } from './api';

export function productSlug(name: string) {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export type ProductColor = { name: string; hex: string; image?: string | null };

export type ShopProduct = {
  id?: number;
  name: string;
  description?: string | null;
  price: number;
  image?: string | null;
  tag?: string | null;
  stock?: number | null;
  colors?: ProductColor[] | null;
  sizes?: string[] | null;
};

export const STANDARD_SIZES = ['S', 'M', 'L', 'XL', 'XXL', '3XL'];

const merch = (file: string) => `/images/merch/${file}`;

/** Shown until the API answers (and if it is unreachable). Mirrors the seeded collection. */
export const fallbackShopProducts: ShopProduct[] = [
  { id: 1, name: 'Revival hoodie', price: 20000, image: merch('revival-hoodie.jpg'), tag: 'Limited set', description: 'Heavyweight fleece hoodie with the Revival IMLC 37th print front and back.', colors: [{ name: 'Black', hex: '#16171b', image: merch('revival-hoodie.jpg') }], sizes: STANDARD_SIZES },
  { id: 2, name: 'Revival polo', price: 13000, image: merch('revival-polo-navy.jpg'), tag: 'Official merch', description: 'Breathable piqué polo with the MIV crest and Revival print.', colors: [{ name: 'Navy', hex: '#1b2a4e', image: merch('revival-polo-navy.jpg') }, { name: 'White', hex: '#f5f5f2', image: merch('revival-polo-white.jpg') }], sizes: STANDARD_SIZES },
  { id: 3, name: 'Revival baseball shirt', price: 16000, image: merch('revival-baseball.jpg'), tag: 'Faith collection', description: 'Button-up baseball jersey with navy piping and Revival script.', colors: [{ name: 'Cream', hex: '#efe6cf', image: merch('revival-baseball.jpg') }], sizes: STANDARD_SIZES },
  { id: 4, name: 'Revival T-shirt', price: 13000, image: merch('revival-tee.jpg'), tag: 'New', description: 'Acid-wash cotton tee with the Revival IMLC print.', colors: [{ name: 'Charcoal', hex: '#3a3b3f', image: merch('revival-tee.jpg') }], sizes: STANDARD_SIZES },
];

/** Active products from the API, or null when it is unreachable or empty (callers keep the fallback list). */
export async function loadShopProducts(): Promise<ShopProduct[] | null> {
  try {
    const response = await fetch(apiUrl('/shop/products'), { headers: { Accept: 'application/json' } });
    if (!response.ok) return null;
    const data = await response.json();
    if (!Array.isArray(data.products) || !data.products.length) return null;
    return (data.products as ShopProduct[]).map((product) => ({ ...product, price: Number(product.price) || 0 }));
  } catch {
    return null;
  }
}

export const productColors = (product: ShopProduct) => (product.colors ?? []).filter((color) => color.name);
export const productSizes = (product: ShopProduct) => (product.sizes ?? []).filter(Boolean);

/** Photo for a colour, falling back to the product's main image. */
export function productImage(product: ShopProduct, color?: string) {
  const match = productColors(product).find((option) => option.name === color);
  return match?.image || product.image || '/images/miv-logo.png';
}

export function colorHex(product: ShopProduct, color: string) {
  return productColors(product).find((option) => option.name === color)?.hex;
}

/** "Navy · L" style label for a chosen colour/size (empty when none). */
export function variantLabel(item: { color?: string | null; size?: string | null }) {
  return [item.color, item.size].filter(Boolean).join(' · ');
}

/**
 * Cart: line key → quantity. A line key is the product name, plus colour and
 * size when chosen ("Revival polo::Navy::L"). Plain product names from carts
 * saved before options existed still parse as option-less lines.
 */
export type Cart = Record<string, number>;
export type AccountCart = { accountId: number; cart: Cart };
export type CartLine<P extends ShopProduct = ShopProduct> = { key: string; product: P; color: string; size: string; quantity: number };

const SEPARATOR = '::';

export function cartKey(name: string, color = '', size = '') {
  return color || size ? [name, color, size].join(SEPARATOR) : name;
}

export function parseCartKey(key: string) {
  const [name, color = '', size = ''] = key.split(SEPARATOR);
  return { name, color, size };
}

/** Cart entries joined to their products; lines for unknown products are skipped. */
export function cartLines<P extends ShopProduct>(cart: Cart, products: P[]): CartLine<P>[] {
  const byName = new Map(products.map((product) => [product.name, product]));
  return Object.entries(cart).flatMap(([key, quantity]) => {
    const { name, color, size } = parseCartKey(key);
    const product = byName.get(name);
    return product && quantity > 0 ? [{ key, product, color, size, quantity }] : [];
  });
}

export const cartCount = (cart: Cart) => Object.values(cart).reduce((sum, quantity) => sum + quantity, 0);

/** Lines whose colour/size no longer match what the product offers. */
export function lineNeedsOptions(line: CartLine) {
  const colors = productColors(line.product).map((color) => color.name);
  const sizes = productSizes(line.product);
  return (colors.length > 0 && !colors.includes(line.color)) || (sizes.length > 0 && !sizes.includes(line.size));
}

/** API payload for cart sync and checkout. */
export function cartPayload(lines: CartLine[]) {
  return lines
    .filter((line) => Number.isInteger(line.product.id))
    .map((line) => ({ product_id: line.product.id as number, color: line.color || null, size: line.size || null, quantity: line.quantity }));
}

export function readCart(value: string | null): Cart {
  if (!value) return {};

  try {
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};

    return Object.entries(parsed as Record<string, unknown>).reduce<Cart>((cart, [key, quantity]) => {
      const normalizedQuantity = Number(quantity);
      if (key && Number.isFinite(normalizedQuantity) && normalizedQuantity > 0) {
        cart[key] = Math.floor(normalizedQuantity);
      }
      return cart;
    }, {});
  } catch {
    return {};
  }
}

export function mergeCart(...carts: Cart[]): Cart {
  return carts.reduce<Cart>((merged, cart) => {
    Object.entries(cart).forEach(([key, quantity]) => {
      merged[key] = (merged[key] || 0) + quantity;
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

    const items = (Array.isArray(data.items) ? data.items : []) as Array<{ name?: string; color?: string | null; size?: string | null; quantity?: number }>;
    const cart = items.reduce((result: Cart, item) => {
      const quantity = Number(item.quantity);
      if (item.name && Number.isFinite(quantity) && quantity > 0) result[cartKey(item.name, item.color ?? '', item.size ?? '')] = Math.floor(quantity);
      return result;
    }, {});
    return { accountId, cart };
  } catch {
    return null;
  }
}

/**
 * Replaces the signed-in account's server cart. Pass the full product list:
 * lines whose product is missing from it are left out of the saved cart.
 * Lines still waiting for a colour/size choice are kept locally only.
 */
export async function persistAccountCart(cart: Cart, products: ShopProduct[], accountId?: number): Promise<boolean> {
  const token = typeof window === 'undefined' ? null : window.localStorage.getItem('jan-conf-session');
  if (!token) return false;

  const items = cartPayload(cartLines(cart, products).filter((line) => !lineNeedsOptions(line)));

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
