'use client';

export default function ShopToast({ message }: { message: string }) {
  if (!message) return null;

  return (
    <div
      className="fixed bottom-6 left-1/2 z-[80] flex max-w-[calc(100%-2rem)] -translate-x-1/2 items-center gap-3 rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white shadow-2xl ring-1 ring-white/15"
      role="status"
      aria-live="polite"
    >
      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#34865e] text-xs text-white" aria-hidden="true">✓</span>
      <span>{message}</span>
    </div>
  );
}
