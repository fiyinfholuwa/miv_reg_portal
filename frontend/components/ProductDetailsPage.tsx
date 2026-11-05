'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import RegistrationModal from './conference/RegistrationModal';
import { HubFooter, HubNav } from './landing/HubChrome';
import { naira } from './landing/hub-data';
import CartButton from './shop/CartButton';
import { ColorPicker, SizePicker, Swatch } from './shop/VariantPicker';
import { useShopCart } from './shop/useShopCart';
import { cartKey, colorHex, productColors, productImage, productSizes, productSlug } from '../lib/shop';
import { toast } from '../lib/toast';

export default function ProductDetailsPage({ slug }: { slug: string }) {
  const { products, productsLoaded, setCart, count, quantityOf } = useShopCart();
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
    window.history.replaceState({}, '', url);
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

  return <main className="miv-hub">
    <RegistrationModal />
    <div className="p-2.5 sm:p-4"><HubNav variant="solid" /></div>
    <CartButton count={count} />
    <section className="flex flex-col gap-8 px-5 py-10 sm:px-10 sm:py-14 lg:px-[72px]">
      <nav className="flex items-center gap-2 text-sm font-semibold text-[#6b7280]" aria-label="Breadcrumb">
        <Link href="/shop" className="text-[#a82e26] hover:text-[#8c1f1c]">Shop</Link><span aria-hidden="true">/</span><span className="truncate text-[#0c0d10]">{product?.name ?? 'Product'}</span>
      </nav>
      {product ? <div className="grid gap-6 lg:grid-cols-2 lg:items-start lg:gap-10">
        <div className="flex flex-col gap-3 lg:sticky lg:top-32">
          <div className="relative aspect-square overflow-hidden rounded-[28px] bg-[#f4eddc]">
            <img key={color} src={productImage(product, color)} alt={`${product.name}${color ? ` in ${color}` : ''}`} className="miv-fade h-full w-full object-cover" />
            {color && hex && <span className="absolute bottom-4 left-4 flex items-center gap-2 rounded-full bg-white/95 px-3 py-1.5 text-xs font-bold text-[#0c0d10] shadow"><Swatch hex={hex} size={12} />{color}</span>}
          </div>
          {colors.length > 1 && (
            <div className="flex gap-3">
              {colors.map((option) => (
                <button key={option.name} type="button" onClick={() => chooseColor(option.name)} aria-label={`Show ${option.name}`} className={`h-20 w-20 overflow-hidden rounded-2xl bg-[#f4eddc] transition ${option.name === color ? 'ring-2 ring-[#0c0d10] ring-offset-2' : 'opacity-70 hover:opacity-100'}`}>
                  <img src={productImage(product, option.name)} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-col rounded-[28px] border border-[#e4e7ec] bg-white p-6 sm:p-10">
          <span className="text-sm font-semibold text-[#a82e26] sm:text-[15px]">{product.tag || 'Official merchandise'}</span>
          <h1 className="m-0 mt-3 text-[36px] font-semibold leading-[1.02] tracking-[-0.025em] text-[#0c0d10] sm:text-[52px]">{product.name}</h1>
          <p className="m-0 mt-4 text-2xl font-bold text-[#a82e26]">{naira(product.price)}</p>
          <p className="m-0 mt-5 max-w-xl text-base leading-[1.65] text-[#4d5460]">{product.description || 'Official MIV merchandise.'}</p>

          <div className="mt-8 flex flex-col gap-7 border-t border-[#e4e7ec] pt-7">
            {colors.length > 0 && <ColorPicker colors={colors} value={color} onChange={chooseColor} />}
            {sizes.length > 0 && <div key={missingSize}><SizePicker sizes={sizes} value={size} onChange={setSize} invalid={missingSize > 0} /></div>}
            <div>
              <span className="mb-3 block text-sm font-semibold text-[#22262e]">Quantity</span>
              <div className="flex items-center gap-3">
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
          {inCart > 0 && <Link href="/shop/cart" className="mt-4 text-center text-sm font-bold text-[#a82e26]">{inCart} in your cart · View cart →</Link>}
          <ul className="m-0 mt-7 grid gap-2 border-t border-[#e4e7ec] p-0 pt-6 text-sm text-[#4d5460]">
            <li className="flex gap-2"><span aria-hidden="true">💳</span>Pay securely online with Paystack.</li>
            <li className="flex gap-2"><span aria-hidden="true">📦</span>Collect at the conference store with your pickup barcode.</li>
          </ul>
        </div>
      </div> : productsLoaded ? <div className="flex flex-col items-center gap-4 rounded-[28px] border border-[#e4e7ec] bg-white p-10 text-center">
        <h1 className="m-0 text-[36px] font-semibold text-[#0c0d10]">Product not found</h1>
        <p className="m-0 text-[#4d5460]">This product may have been removed or renamed.</p>
        <Link href="/shop" className="rounded-full bg-[#00203f] px-7 py-[15px] text-[15px] font-bold text-white">Return to shop</Link>
      </div> : <div className="h-[420px] animate-pulse rounded-[28px] bg-[#f4eddc]" aria-label="Loading product" />}
    </section>
    <HubFooter />
  </main>;
}
