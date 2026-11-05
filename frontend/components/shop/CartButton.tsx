import Link from 'next/link';

/** Floating cart shortcut that sits just below the fixed hub navigation. */
export default function CartButton({ count }: { count: number }) {
  return (
    <Link href="/shop/cart" className="fixed right-4 top-[104px] z-40 grid h-14 w-14 place-items-center rounded-full bg-white text-[#0c0d10] shadow-xl ring-4 ring-[#faf6ec] transition hover:scale-105 sm:right-6 lg:top-[128px]" aria-label={`Open cart, ${count} item${count === 1 ? '' : 's'}`}>
      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="9" cy="20" r="1" /><circle cx="18" cy="20" r="1" /><path d="M3 4h2l2.4 10.2a2 2 0 0 0 2 1.5h7.8a2 2 0 0 0 1.9-1.4L21 8H6" /></svg>
      {count > 0 && <span className="absolute -right-1 -top-1 grid h-6 min-w-6 place-items-center rounded-full bg-[#a82e26] px-1 text-xs font-bold text-white">{count}</span>}
    </Link>
  );
}
