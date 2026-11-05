'use client';

import Link from 'next/link';
import { HubNav } from './HubChrome';
import { openRegistration, useCountdown, type HubEvent } from './hub-data';
import type { SiteContent } from '../../lib/site-content';

const glass = 'rounded-[14px] border border-white/[.18] bg-white/10 backdrop-blur-[14px] lg:rounded-[18px]';

export default function HubHero({ registerSlug, next, content }: { registerSlug: string; next?: HubEvent; content: SiteContent['hero'] }) {
  const countdown = useCountdown(next?.starts_at ? Date.parse(next.starts_at) : undefined);
  const shortDate = next?.starts_at ? new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'Africa/Lagos' }).format(new Date(next.starts_at)) : null;

  return (
    <div id="top" className="p-2.5 sm:p-4">
      <section className="relative h-[calc(100svh-20px)] min-h-[620px] overflow-hidden rounded-[26px] bg-[#001428] text-[#faf6ec] sm:h-[680px] sm:min-h-0 lg:rounded-[28px]">
        <picture>
          <source media="(min-width: 640px)" srcSet={content.image} />
          <img src={content.image_mobile || content.image} alt="" className="absolute inset-0 h-full w-full object-cover" />
        </picture>
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(0,20,40,.55),rgba(0,20,40,.1)_30%,rgba(0,20,40,.95)_75%)] sm:bg-[linear-gradient(90deg,rgba(0,20,40,.92)_0%,rgba(0,20,40,.6)_45%,rgba(0,20,40,.1)_100%),linear-gradient(180deg,rgba(0,20,40,.5)_0%,transparent_25%,transparent_60%,rgba(0,20,40,.7)_100%)]" />
        <HubNav registerSlug={registerSlug} />

        <div className="absolute inset-x-5 bottom-[22px] flex flex-col gap-3.5 sm:inset-x-auto sm:left-11 sm:bottom-12 sm:w-[min(620px,calc(100%-88px))] sm:gap-5 xl:w-[620px]">
          {content.eyebrow && <span className="text-[13px] font-semibold text-[#dceaf5] sm:text-base">{content.eyebrow}</span>}
          <h1 className="m-0 text-[46px] font-semibold leading-[0.98] tracking-[-0.03em] [text-wrap:balance] sm:text-[64px] sm:leading-[0.95] lg:text-[92px]">{content.title}</h1>
          {content.subtitle && <p className="m-0 hidden max-w-[460px] text-[17px] leading-[1.55] text-[#dceaf5] sm:block">{content.subtitle}</p>}

          {/* Mobile countdown cards (19b) */}
          {next && (
            <div className="grid grid-cols-2 gap-2 sm:max-w-[420px] xl:hidden">
              <div className={`${glass} p-3`}><span className="block text-[11px] font-medium text-[#bcd6ec]">Next event</span><span className="block truncate text-sm font-bold">{next.short_name}{shortDate ? ` · ${shortDate}` : ''}</span></div>
              <div className={`${glass} p-3`}><span className="block text-[11px] font-medium text-[#bcd6ec]">Starts in</span><span className="text-sm font-bold tabular-nums">{countdown}</span></div>
            </div>
          )}

          <div className="flex flex-col gap-3 sm:mt-1 sm:flex-row">
            <button type="button" onClick={() => openRegistration({ event: registerSlug })} className="rounded-full bg-[#a82e26] py-[15px] text-[15px] font-bold text-white transition hover:bg-[#8c1f1c] sm:px-[26px]">{content.primary_label || 'Register Now'}</button>
            <Link href="/events" className="rounded-full bg-white py-[15px] text-center text-[15px] font-bold text-[#00203f] transition hover:bg-[#faf6ec] sm:px-[26px]">{content.secondary_label || 'View all events'}</Link>
          </div>
        </div>

        {/* Desktop countdown cards (19a) */}
        {next && (
          <div className="absolute bottom-12 right-9 hidden gap-3 xl:flex">
            <div className={`${glass} flex w-[200px] flex-col gap-1.5 p-[18px]`}><span className="text-[13px] font-medium text-[#bcd6ec]">Next event</span><span className="line-clamp-2 text-[17px] font-bold leading-[1.25]">{next.short_name}</span><span className="text-sm font-medium text-[#dceaf5]">{next.date_label}</span></div>
            <div className={`${glass} flex w-[200px] flex-col gap-1.5 p-[18px]`}><span className="text-[13px] font-medium text-[#bcd6ec]">Starts in</span><span className="text-[26px] font-bold leading-none tabular-nums">{countdown}</span>{next.location && <span className="truncate text-sm font-medium text-[#dceaf5]">{next.location}</span>}</div>
          </div>
        )}
      </section>
    </div>
  );
}
