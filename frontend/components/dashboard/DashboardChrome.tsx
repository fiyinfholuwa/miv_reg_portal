'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { EventRegistration } from '../../lib/events';

/** Small stroke icon set for the dashboard chrome. */
const paths: Record<string, ReactNode> = {
  home: <><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V20h5v-6h4v6h5V9.5" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M3 10h18M8 3v4M16 3v4" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></>,
  bag: <><path d="M5 8h14l-1.2 12.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8L5 8Z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></>,
  receipt: <><path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" /><path d="M9 8h6M9 12h6" /></>,
  logout: <><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" /><path d="M10 17l-5-5 5-5M5 12h11" /></>,
  chevron: <path d="m7 10 5 5 5-5" />,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  ticket: <><path d="M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2.5a2.5 2.5 0 0 0 0 5V17a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2.5a2.5 2.5 0 0 0 0-5V7Z" /><path d="M14 5v14" strokeDasharray="2 2" /></>,
  list: <><path d="M9 6h11M9 12h11M9 18h11" /><circle cx="4.5" cy="6" r="1" /><circle cx="4.5" cy="12" r="1" /><circle cx="4.5" cy="18" r="1" /></>,
  play: <><rect x="3" y="5" width="18" height="14" rx="3" /><path d="m10 9 5 3-5 3V9Z" /></>,
  badge: <><rect x="4" y="3" width="16" height="18" rx="3" /><circle cx="12" cy="10" r="3" /><path d="M8 17c1-2 2.4-3 4-3s3 1 4 3" /></>,
  users: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c1-3.5 3.5-5.5 6.5-5.5s5.5 2 6.5 5.5" /><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.8c1.8.7 3 2.4 3.5 5.2" /></>,
  megaphone: <><path d="M3 10v4a1 1 0 0 0 1 1h3l9 5V4L7 9H4a1 1 0 0 0-1 1Z" /><path d="M19.5 9a4 4 0 0 1 0 6" /></>,
  heart: <path d="M12 20s-7.5-4.5-7.5-10A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 7.5 3c0 5.5-7.5 10-7.5 10Z" />,
  bed: <><path d="M3 19V6M3 15h18v4M21 15v-3a3 3 0 0 0-3-3h-7v6" /><circle cx="7" cy="11" r="2" /></>,
  grid: <><rect x="4" y="4" width="6.5" height="6.5" rx="1.5" /><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5" /><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5" /><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5" /></>,
  external: <><path d="M14 4h6v6M20 4l-9 9" /><path d="M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5" /></>,
};

export function Icon({ name, size = 20, className = '' }: { name: keyof typeof paths; size?: number; className?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">{paths[name]}</svg>;
}

/** Closes a popover on outside click or Escape. */
function usePopover() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => { if (!ref.current?.contains(event.target as Node)) setOpen(false); };
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onPointer); document.removeEventListener('keydown', onKey); };
  }, [open]);
  return { open, setOpen, ref };
}

/**
 * Dropdown for jumping between registered events. The list scrolls inside
 * the popover, so the sidebar stays the same height however many events
 * someone joins.
 */
export function EventSwitcher({ registrations, activeSlug, go, compact = false }: { registrations: EventRegistration[]; activeSlug: string | null; go: (href: string) => void; compact?: boolean }) {
  const { open, setOpen, ref } = usePopover();
  const active = registrations.find((registration) => registration.event.slug === activeSlug);
  const choose = (href: string) => { setOpen(false); go(href); };

  return (
    <div ref={ref} className="relative min-w-0">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className={`flex w-full min-w-0 items-center gap-3 text-left transition ${compact ? 'rounded-full bg-[#f4f5f7] py-1.5 pl-1.5 pr-3' : 'rounded-2xl border border-ink/10 bg-white p-2 pr-3 hover:border-[#1469a9]/40'}`}
      >
        <span className={`grid shrink-0 place-items-center overflow-hidden bg-[#03284a] text-white ${compact ? 'h-8 w-8 rounded-full' : 'h-10 w-10 rounded-xl'}`}>
          {active?.event.image ? <img src={active.event.image} alt="" className="h-full w-full object-cover" /> : <Icon name="calendar" size={compact ? 16 : 18} />}
        </span>
        <span className="min-w-0 flex-1">
          <strong className="block truncate text-sm text-ink">{active ? active.event.short_name : 'Choose an event'}</strong>
          {!compact && <span className="block truncate text-xs text-ink/50">{active ? active.event.date_label : `${registrations.length} registered`}</span>}
        </span>
        <Icon name="chevron" size={16} className={`shrink-0 text-ink/50 transition ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className={`absolute z-40 mt-2 overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-[0_20px_50px_rgba(3,40,74,.18)] ${compact ? 'left-0 w-[min(88vw,320px)]' : 'inset-x-0'}`} role="listbox" aria-label="Your events">
          <p className="border-b border-ink/5 px-4 py-2.5 text-[11px] font-bold uppercase tracking-[.14em] text-ink/40">Your events · {registrations.length}</p>
          <div className="max-h-[min(50vh,320px)] overflow-y-auto p-1.5">
            {registrations.map((registration) => {
              const selected = registration.event.slug === activeSlug;
              return (
                <button key={registration.id} type="button" role="option" aria-selected={selected} onClick={() => choose(`/dashboard/events/${registration.event.slug}`)} className={`flex w-full items-center gap-3 rounded-xl p-2 text-left transition ${selected ? 'bg-[#e7f1fa]' : 'hover:bg-ink/5'}`}>
                  <span className="h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-[#03284a]">{registration.event.image && <img src={registration.event.image} alt="" className="h-full w-full object-cover" />}</span>
                  <span className="min-w-0 flex-1"><strong className="block truncate text-sm">{registration.event.short_name}</strong><span className="block truncate text-xs text-ink/50">{registration.event.date_label}</span></span>
                  {selected && <Icon name="check" size={16} className="shrink-0 text-[#1469a9]" />}
                </button>
              );
            })}
          </div>
          <div className="grid grid-cols-2 gap-1 border-t border-ink/5 p-1.5">
            <button type="button" onClick={() => choose('/dashboard')} className="rounded-xl px-3 py-2 text-xs font-bold text-[#0b4779] hover:bg-ink/5">All my events</button>
            <a href="/events" className="rounded-xl px-3 py-2 text-center text-xs font-bold text-[#1469a9] hover:bg-ink/5">+ Find more</a>
          </div>
        </div>
      )}
    </div>
  );
}

/** Avatar button with a profile / log out menu, used in the top bar. */
export function AccountMenu({ name, initials, photoUrl, onProfile, onLogout }: { name: string; initials: string; photoUrl: string | null; onProfile: () => void; onLogout: () => void }) {
  const { open, setOpen, ref } = usePopover();
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-label="Account menu" className="grid h-10 w-10 place-items-center overflow-hidden rounded-full bg-[#e2edf6] text-sm font-bold text-[#1469a9] ring-2 ring-white transition hover:ring-[#1469a9]/30">
        {photoUrl ? <img src={photoUrl} alt="" className="h-full w-full object-cover" /> : initials}
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-2 w-56 overflow-hidden rounded-2xl border border-ink/10 bg-white p-1.5 shadow-[0_20px_50px_rgba(3,40,74,.18)]">
          <p className="truncate px-3 py-2 text-sm font-bold">{name}</p>
          <button type="button" onClick={() => { setOpen(false); onProfile(); }} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-semibold hover:bg-ink/5"><Icon name="user" size={18} className="text-[#1469a9]" />Profile</button>
          <button type="button" onClick={() => { setOpen(false); onLogout(); }} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-coral hover:bg-[#fff0ee]"><Icon name="logout" size={18} />Log out</button>
        </div>
      )}
    </div>
  );
}
