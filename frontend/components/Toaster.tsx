'use client';

import { useEffect, useRef, useState } from 'react';
import { toast, type ToastItem, type ToastTone } from '../lib/toast';

const tones: Record<ToastTone, { accent: string; soft: string; icon: React.ReactNode }> = {
  success: {
    accent: '#2f7d4f',
    soft: '#dcefe2',
    icon: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  },
  error: {
    accent: '#c0362c',
    soft: '#f8e0dc',
    icon: <><circle cx="12" cy="12" r="9" /><path d="M12 7.5v5.5M12 16.5h.01" /></>,
  },
  warning: {
    accent: '#b7791f',
    soft: '#fbefd5',
    icon: <><path d="M10.3 4.2 2.6 17.5A2 2 0 0 0 4.3 20.5h15.4a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0Z" /><path d="M12 9.5v4M12 17h.01" /></>,
  },
  info: {
    accent: '#1460a1',
    soft: '#dceaf5',
    icon: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5.5M12 7.5h.01" /></>,
  },
};

function ToastCard({ item }: { item: ToastItem }) {
  const [paused, setPaused] = useState(false);
  const remaining = useRef(item.duration);
  const startedAt = useRef(0);
  const theme = tones[item.tone];

  // A new version (message updated in place) restarts the countdown.
  useEffect(() => { remaining.current = item.duration; }, [item.version, item.duration]);

  useEffect(() => {
    if (paused) return;
    startedAt.current = Date.now();
    const timer = window.setTimeout(() => toast.dismiss(item.id), remaining.current);
    return () => {
      window.clearTimeout(timer);
      remaining.current -= Date.now() - startedAt.current;
    };
  }, [paused, item.id, item.version]);

  return (
    <div
      role={item.tone === 'error' ? 'alert' : 'status'}
      aria-live={item.tone === 'error' ? 'assertive' : 'polite'}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className="miv-toast pointer-events-auto relative flex w-full items-start gap-3 overflow-hidden rounded-2xl bg-white py-3.5 pl-4 pr-11 text-left shadow-[0_18px_40px_rgba(0,20,40,.18)] ring-1 ring-[#e4e7ec]"
    >
      <span className="absolute inset-y-0 left-0 w-1" style={{ background: theme.accent }} aria-hidden="true" />
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full" style={{ background: theme.soft, color: theme.accent }} aria-hidden="true">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">{theme.icon}</svg>
      </span>
      <div className="min-w-0 flex-1 pt-0.5">
        <p className="m-0 text-sm font-bold leading-5" style={{ color: theme.accent }}>{item.title}</p>
        <p className="m-0 mt-0.5 break-words text-sm leading-5 text-[#22262e]">{item.message}</p>
      </div>
      <button type="button" onClick={() => toast.dismiss(item.id)} className="absolute right-2.5 top-2.5 grid h-7 w-7 place-items-center rounded-full text-lg leading-none text-[#6b7280] transition hover:bg-[#f4f5f7] hover:text-[#0c0d10]" aria-label="Dismiss notification">×</button>
      <span
        key={item.version}
        className="miv-toast-progress absolute bottom-0 left-0 h-[3px] w-full origin-left"
        style={{ background: theme.accent, opacity: 0.35, animationDuration: `${item.duration}ms`, animationPlayState: paused ? 'paused' : 'running' }}
        aria-hidden="true"
      />
    </div>
  );
}

/** Renders every toast in the top-right corner. Mounted once in the root layout. */
export default function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);
  useEffect(() => toast.subscribe(setItems), []);
  if (!items.length) return null;
  return (
    <div className="miv-hub-font pointer-events-none fixed inset-x-3 top-3 z-[300] flex flex-col items-end gap-2.5 sm:inset-x-auto sm:right-5 sm:top-5 sm:w-[380px]">
      {items.map((item) => <ToastCard key={item.id} item={item} />)}
    </div>
  );
}
