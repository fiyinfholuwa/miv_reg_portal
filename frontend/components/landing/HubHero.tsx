'use client';

import Link from 'next/link';
import { HubNav } from './HubChrome';
import { openRegistration, useCountdown } from './hub-data';

const glass = 'rounded-[14px] border border-white/[.18] bg-white/10 backdrop-blur-[14px] lg:rounded-[18px]';

export default function HubHero({ registerSlug }: { registerSlug: string }) {
  const countdown = useCountdown();
  return (
    <div id="top" className="p-2.5 sm:p-4">
      <section className="relative h-[calc(100svh-20px)] min-h-[620px] overflow-hidden rounded-[26px] bg-[#001428] text-[#faf6ec] sm:h-[680px] sm:min-h-0 lg:rounded-[28px]">
        <picture>
          <source media="(min-width: 640px)" srcSet="/images/photos/lp-hero.webp" />
          <img src="/images/photos/lp-hero-m.webp" alt="" className="absolute inset-0 h-full w-full object-cover" />
        </picture>
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(0,20,40,.55),rgba(0,20,40,.1)_30%,rgba(0,20,40,.95)_75%)] sm:bg-[linear-gradient(90deg,rgba(0,20,40,.92)_0%,rgba(0,20,40,.6)_45%,rgba(0,20,40,.1)_100%),linear-gradient(180deg,rgba(0,20,40,.5)_0%,transparent_25%,transparent_60%,rgba(0,20,40,.7)_100%)]" />
        <HubNav registerSlug={registerSlug} />

        <div className="absolute inset-x-5 bottom-[22px] flex flex-col gap-3.5 sm:inset-x-auto sm:left-11 sm:bottom-12 sm:w-[min(620px,calc(100%-88px))] sm:gap-5 xl:w-[620px]">
          <span className="text-[13px] font-semibold text-[#dceaf5] sm:text-base">Conferences, retreats &amp; gatherings of MIV</span>
          <h1 className="m-0 text-[46px] font-semibold leading-[0.98] tracking-[-0.03em] sm:text-[64px] sm:leading-[0.95] lg:text-[92px]">Raising kingdom&#8209;minded leaders</h1>
          <p className="m-0 hidden max-w-[460px] text-[17px] leading-[1.55] text-[#dceaf5] sm:block">Every MIV conference, retreat and leadership gathering in one place. Find your next event and register.</p>

          {/* Mobile countdown cards (19b) */}
          <div className="grid grid-cols-2 gap-2 sm:max-w-[420px] xl:hidden">
            <div className={`${glass} p-3`}><span className="block text-[11px] font-medium text-[#bcd6ec]">Next event</span><span className="text-sm font-bold">37th IMLC · 19 Jan</span></div>
            <div className={`${glass} p-3`}><span className="block text-[11px] font-medium text-[#bcd6ec]">Starts in</span><span className="text-sm font-bold tabular-nums">{countdown}</span></div>
          </div>

          <div className="flex flex-col gap-3 sm:mt-1 sm:flex-row">
            <button type="button" onClick={() => openRegistration({ event: registerSlug })} className="rounded-full bg-[#a82e26] py-[15px] text-[15px] font-bold text-white transition hover:bg-[#8c1f1c] sm:px-[26px]">Register Now</button>
            <Link href="/events" className="rounded-full bg-white py-[15px] text-center text-[15px] font-bold text-[#00203f] transition hover:bg-[#faf6ec] sm:px-[26px]">View all events</Link>
          </div>
        </div>

        {/* Desktop countdown cards (19a) */}
        <div className="absolute bottom-12 right-9 hidden gap-3 xl:flex">
          <div className={`${glass} flex w-[190px] flex-col gap-1.5 p-[18px]`}><span className="text-[13px] font-medium text-[#bcd6ec]">Next event</span><span className="text-[17px] font-bold leading-[1.25]">37th IMLC &amp; IYLC</span><span className="text-sm font-medium text-[#dceaf5]">19–24 Jan 2027</span></div>
          <div className={`${glass} flex w-[200px] flex-col gap-1.5 p-[18px]`}><span className="text-[13px] font-medium text-[#bcd6ec]">Starts in</span><span className="text-[26px] font-bold leading-none tabular-nums">{countdown}</span><span className="text-sm font-medium text-[#dceaf5]">Olororo, Ojoo, Ibadan</span></div>
        </div>
      </section>
    </div>
  );
}
