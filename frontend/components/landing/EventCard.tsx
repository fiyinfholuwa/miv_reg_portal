'use client';

import Link from 'next/link';
import { cardThemes, openRegistration, type HubEvent } from './hub-data';

export function EventCard({ event, index }: { event: HubEvent; index: number }) {
  const theme = cardThemes[index % cardThemes.length];
  const dark = theme.fg === '#ffffff';
  return (
    <article className="flex min-h-[440px] flex-col overflow-hidden rounded-[24px]" style={{ background: theme.bg, color: theme.fg, boxShadow: theme.bg === '#ffffff' ? '0 0 0 1px #e4e7ec inset' : undefined }}>
      <div className="relative mx-2.5 mt-2.5 h-[200px] overflow-hidden rounded-[18px] bg-[#003070]">
        {event.image && <img src={event.image} alt="" className="block h-full w-full object-cover" loading="lazy" />}
        <span className="absolute left-3 top-3 rounded-full bg-white px-3 py-[5px] text-xs font-bold text-[#0c0d10]">{event.date_label}</span>
      </div>
      <div className="flex flex-1 flex-col gap-3 px-6 pb-6 pt-[22px]">
        <span className="text-[26px] font-semibold opacity-55">{String(index + 1).padStart(2, '0')}</span>
        <h3 className="text-2xl font-semibold leading-[1.15] tracking-[-0.01em]">{event.title}</h3>
        <p className="flex-1 text-[15px] leading-normal opacity-80">{event.summary}</p>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href={`/events/${event.slug}`} className="flex items-center gap-2 text-sm font-bold" style={{ color: 'inherit' }}>Learn more <span aria-hidden="true">→</span></Link>
          {event.registration_open && (
            <button type="button" onClick={() => openRegistration({ event: event.slug })} className={`rounded-full px-4 py-2 text-[13px] font-bold transition ${dark ? 'bg-white/15 text-white hover:bg-white/25' : 'bg-[#00203f] text-white hover:bg-[#003070]'}`}>Register</button>
          )}
        </div>
      </div>
    </article>
  );
}

/** Compact horizontally scrolling card used on phones (design 19c). */
export function EventCardCompact({ event, index }: { event: HubEvent; index: number }) {
  const theme = cardThemes[index % cardThemes.length];
  const dark = theme.fg === '#ffffff';
  return (
    <article className="flex w-[250px] flex-none snap-start flex-col overflow-hidden rounded-[22px]" style={{ background: theme.bg, color: theme.fg, boxShadow: theme.bg === '#ffffff' ? '0 0 0 1px #e4e7ec inset' : undefined }}>
      <div className="mx-2 mt-2 h-[140px] overflow-hidden rounded-2xl bg-[#003070]">{event.image && <img src={event.image} alt="" className="block h-full w-full object-cover" loading="lazy" />}</div>
      <div className="flex flex-1 flex-col gap-1.5 px-4 pb-[18px] pt-3.5">
        <span className="text-xs font-semibold opacity-70">{event.date_label}</span>
        <h3 className="flex-1 text-lg font-bold leading-[1.2]">{event.title}</h3>
        <div className="mt-1 flex items-center justify-between gap-2">
          <Link href={`/events/${event.slug}`} className="text-[13px] font-bold" style={{ color: 'inherit' }}>Learn more →</Link>
          {event.registration_open && <button type="button" onClick={() => openRegistration({ event: event.slug })} className={`rounded-full px-3 py-1.5 text-xs font-bold ${dark ? 'bg-white/15 text-white' : 'bg-[#00203f] text-white'}`}>Register</button>}
        </div>
      </div>
    </article>
  );
}
