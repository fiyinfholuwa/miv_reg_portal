'use client';

import { useState } from 'react';
import Link from 'next/link';
import RegistrationModal from './conference/RegistrationModal';
import { HubFooter, HubNav } from './landing/HubChrome';
import { naira } from './landing/hub-data';
import { Swatch } from './shop/VariantPicker';
import { useShopCart } from './shop/useShopCart';
import { apiUrl } from '../lib/api';
import { cartKey, cartPayload, colorHex, lineNeedsOptions, productImage, productSizes, productSlug, variantLabel, type CartLine } from '../lib/shop';
import { errorMessage, toast } from '../lib/toast';

const steps = ['Cart', 'Sign in', 'Pay', 'Collect'];

export default function CartPage() {
  const { setCart, lines, total, count, quantityOf } = useShopCart();
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
      window.dispatchEvent(new CustomEvent('open-registration-modal', { detail: { returnTo: '/shop/cart' } }));
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
      window.location.assign(data.authorization_url);
    } catch (error) {
      toast.error(errorMessage(error, 'Could not start payment.'), { id: 'checkout', title: 'Payment could not start' });
      setCheckingOut(false);
    }
  };

  return (
    <main className="miv-hub">
      <RegistrationModal />
      <div className="p-2.5 sm:p-4"><HubNav variant="solid" /></div>

      <section className="px-5 py-10 sm:px-10 sm:py-14 lg:px-[72px]">
        <Link href="/shop" className="text-sm font-bold text-[#a82e26] hover:text-[#8c1f1c]">← Keep shopping</Link>

        <ol className="m-0 mt-6 flex list-none flex-wrap items-center gap-2 p-0 text-xs font-bold sm:text-sm" aria-label="Checkout steps">
          {steps.map((step, index) => (
            <li key={step} className="flex items-center gap-2">
              <span className={`flex items-center gap-2 rounded-full px-3 py-1.5 ${index === 0 ? 'bg-[#00203f] text-white' : 'bg-white text-[#6b7280] ring-1 ring-[#e4e7ec]'}`} aria-current={index === 0 ? 'step' : undefined}>
                <span className={`grid h-5 w-5 place-items-center rounded-full text-[11px] ${index === 0 ? 'bg-white text-[#00203f]' : 'bg-[#f4f5f7]'}`}>{index + 1}</span>{step}
              </span>
              {index < steps.length - 1 && <span className="h-px w-4 bg-[#c9ced6]" aria-hidden="true" />}
            </li>
          ))}
        </ol>

        <div className="mt-8 grid gap-7 lg:grid-cols-[1fr_360px]">
          <div>
            <div className="flex items-end justify-between gap-4">
              <div>
                <span className="text-sm font-semibold text-[#a82e26] sm:text-[15px]">Ready for collection</span>
                <h1 className="m-0 mt-3 text-[36px] font-semibold leading-[1.02] tracking-[-0.025em] text-[#0c0d10] sm:text-[56px]">Your cart.</h1>
              </div>
              <span className="text-sm font-bold text-[#6b7280]">{count} item{count === 1 ? '' : 's'}</span>
            </div>

            <div className="mt-8 grid gap-4">
              {lines.length === 0 && (
                <div className="flex flex-col items-center gap-4 rounded-[22px] border border-dashed border-[#c9ced6] bg-white p-10 text-center">
                  <p className="m-0 text-lg font-semibold text-[#0c0d10]">Your cart is empty.</p>
                  <p className="m-0 text-sm text-[#4d5460]">Pick a colour and size from the Revival collection to get started.</p>
                  <Link href="/shop" className="rounded-full bg-[#00203f] px-7 py-[15px] text-[15px] font-bold text-white">Browse the shop</Link>
                </div>
              )}

              {lines.map((line) => {
                const { product } = line;
                const href = `/shop/${productSlug(product.name)}${line.color ? `?color=${encodeURIComponent(line.color)}` : ''}`;
                const sizes = productSizes(product);
                const hex = line.color ? colorHex(product, line.color) : undefined;
                const needsOptions = lineNeedsOptions(line);

                return (
                  <article key={line.key} className={`flex gap-4 rounded-[22px] border bg-white p-4 sm:p-5 ${needsOptions ? 'border-[#e8c48a]' : 'border-[#e4e7ec]'}`}>
                    <Link href={href} className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-[#f4eddc] sm:h-32 sm:w-32">
                      <img src={productImage(product, line.color)} alt={product.name} className="h-full w-full object-cover" />
                    </Link>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <Link href={href} className="text-lg font-semibold leading-tight text-[#0c0d10] hover:text-[#a82e26]">{product.name}</Link>
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-[#4d5460]">
                            {line.color && <span className="flex items-center gap-1.5 rounded-full bg-[#f4f5f7] px-2.5 py-1 font-semibold text-[#22262e]">{hex && <Swatch hex={hex} size={12} />}{line.color}</span>}
                            {sizes.length > 0 && (
                              <label className="flex items-center gap-1.5 rounded-full bg-[#f4f5f7] py-1 pl-2.5 pr-1 font-semibold text-[#22262e]">
                                Size
                                <select value={sizes.includes(line.size) ? line.size : ''} onChange={(event) => changeSize(line, event.target.value)} className="rounded-full border-0 bg-white px-2 py-0.5 text-sm font-bold outline-none" aria-label={`Size for ${product.name}`}>
                                  {!sizes.includes(line.size) && <option value="" disabled>Choose</option>}
                                  {sizes.map((size) => <option key={size}>{size}</option>)}
                                </select>
                              </label>
                            )}
                            <span>{naira(product.price)} each</span>
                          </div>
                          {needsOptions && <Link href={href} className="mt-2 inline-block text-sm font-bold text-[#b7791f]">Choose colour and size →</Link>}
                        </div>
                        <button type="button" onClick={() => remove(line)} className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[#6b7280] transition hover:bg-[#fff0ee] hover:text-[#a82e26]" aria-label={`Remove ${product.name}`}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg>
                        </button>
                      </div>
                      <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-4">
                        <div className="flex items-center gap-1 rounded-full border border-[#e4e7ec] p-1">
                          <button type="button" onClick={() => setQuantity(line, line.quantity - 1)} className="grid h-8 w-8 place-items-center rounded-full text-lg leading-none hover:bg-[#f4f5f7]" aria-label={`Decrease ${product.name}`}>−</button>
                          <span className="w-8 text-center text-sm font-bold tabular-nums">{line.quantity}</span>
                          <button type="button" onClick={() => setQuantity(line, line.quantity + 1)} className="grid h-8 w-8 place-items-center rounded-full text-lg leading-none hover:bg-[#f4f5f7]" aria-label={`Increase ${product.name}`}>+</button>
                        </div>
                        <strong className="tabular-nums">{naira(product.price * line.quantity)}</strong>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>

          <aside className="h-fit rounded-[24px] bg-[#001428] p-6 text-[#faf6ec] lg:sticky lg:top-32">
            <span className="text-sm font-semibold text-[#bcd6ec]">Order summary</span>
            <div className="mt-4 grid gap-2 border-b border-white/10 pb-4 text-sm">
              {lines.length === 0 && <span className="text-[#bcd6ec]">No items yet.</span>}
              {lines.map((line) => <div key={line.key} className="flex justify-between gap-3"><span className="min-w-0 truncate text-[#dceaf5]">{line.product.name}{variantLabel(line) ? ` · ${variantLabel(line)}` : ''} × {line.quantity}</span><span className="shrink-0 tabular-nums">{naira(line.product.price * line.quantity)}</span></div>)}
            </div>
            <div className="mt-4 flex items-end justify-between gap-3">
              <span className="text-sm text-[#bcd6ec]">Total</span>
              <strong className="text-4xl font-semibold tabular-nums">{naira(total)}</strong>
            </div>
            <p className="mt-4 text-sm leading-6 text-[#bcd6ec]">Payment is handled securely by Paystack. Collect your order at the conference store with your pickup barcode.</p>
            <button type="button" disabled={!total || checkingOut} onClick={() => void checkout()} className="mt-6 w-full rounded-full bg-[#a82e26] px-5 py-4 text-[15px] font-bold text-white transition hover:bg-[#8c1f1c] disabled:cursor-not-allowed disabled:opacity-40">
              {checkingOut ? 'Opening payment…' : `Checkout · ${naira(total)}`}
            </button>
          </aside>
        </div>
      </section>
      <HubFooter />
    </main>
  );
}
