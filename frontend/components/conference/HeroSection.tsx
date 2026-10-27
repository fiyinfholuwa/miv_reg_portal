'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { Arrow, Countdown, Mark } from './ConferenceAtoms';
import { images } from './conference-data';

const ConferenceScene = dynamic(
  () => import('../ConferenceScene').then((module) => module.ConferenceScene),
  { ssr: false },
);

export default function HeroSection() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const closeMenu = () => setIsMenuOpen(false);

  return (
    <section className="relative min-h-[790px] bg-ink text-white sm:min-h-[820px] lg:min-h-[760px]">
      <div className="absolute inset-0 bg-cover bg-[68%_center]" style={{ backgroundImage: `linear-gradient(90deg, rgba(4,23,45,.98) 0%, rgba(4,23,45,.9) 32%, rgba(4,23,45,.52) 64%, rgba(4,23,45,.26) 100%), url(${images.church})` }} />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_52%,rgba(207,68,55,.24),transparent_30%),linear-gradient(180deg,rgba(7,29,54,.16),#071d36f5_96%)]" />
      <ConferenceScene className="inset-x-0 top-[570px] h-[300px] w-full opacity-30 sm:top-[650px] sm:h-[350px] lg:left-auto lg:right-0 lg:top-1/2 lg:h-[520px] lg:w-[44%] lg:-translate-y-1/2 lg:opacity-60" />

      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-ink/90 py-3 text-white shadow-lg backdrop-blur-md sm:py-4">
        <div className="container-shell flex items-center justify-between">
          <a href="#top" className="flex items-center gap-3" aria-label="Jan Conf home"><Mark /><span className="font-display text-xl uppercase leading-none tracking-wide">Jan Conf<br /><span className="text-coral">2027</span></span></a>
          <nav className="hidden items-center gap-8 text-sm font-semibold text-white/80 lg:flex" aria-label="Main navigation">
          <a className="transition hover:text-white" href="#about">About</a>
          <a className="transition hover:text-white" href="#speakers">Speakers</a>
          <a className="transition hover:text-white" href="#schedule">Schedule</a>
          <a className="transition hover:text-white" href="#venue">Venue</a>
          <a className="transition hover:text-white" href="#media">Media</a>
          </nav>
          <div className="flex items-center gap-2">
            <button type="button" className="grid h-11 w-11 place-items-center rounded-full border border-white/20 bg-white/10 text-xl transition hover:bg-white/20 lg:hidden" onClick={() => setIsMenuOpen((open) => !open)} aria-expanded={isMenuOpen} aria-controls="mobile-navigation" aria-label={isMenuOpen ? 'Close navigation' : 'Open navigation'}>{isMenuOpen ? '×' : '☰'}</button>
            <a className="button-primary px-4 py-3 text-[11px] sm:px-6 sm:text-sm" href="#register">Register free <Arrow /></a>
          </div>
        </div>
        {isMenuOpen && <nav id="mobile-navigation" className="absolute left-4 right-4 top-full mt-3 rounded-2xl border border-white/10 bg-ink p-3 shadow-2xl lg:hidden" aria-label="Mobile navigation">
          <a onClick={closeMenu} className="block rounded-xl px-4 py-3 text-sm font-semibold transition hover:bg-white/10" href="#about">About</a>
          <a onClick={closeMenu} className="block rounded-xl px-4 py-3 text-sm font-semibold transition hover:bg-white/10" href="#speakers">Speakers</a>
          <a onClick={closeMenu} className="block rounded-xl px-4 py-3 text-sm font-semibold transition hover:bg-white/10" href="#schedule">Schedule</a>
          <a onClick={closeMenu} className="block rounded-xl px-4 py-3 text-sm font-semibold transition hover:bg-white/10" href="#venue">Venue</a>
          <a onClick={closeMenu} className="block rounded-xl px-4 py-3 text-sm font-semibold transition hover:bg-white/10" href="#media">Media</a>
        </nav>}
      </header>

      <div id="top" className="relative z-10 container-shell grid min-h-[685px] grid-cols-1 gap-10 pb-16 pt-20 sm:pt-24 lg:min-h-[650px] lg:grid-cols-[58%_42%] lg:items-center lg:gap-0 lg:pb-20 lg:pt-16">
        <div className="max-w-3xl lg:max-w-[610px]">
          <p className="eyebrow mb-6 text-[#ff7565]">37th edition · ministers & leadership conference</p>
          <h1 className="display-title max-w-3xl text-[clamp(3.5rem,13vw,6.8rem)] sm:text-[clamp(4.5rem,9vw,6.8rem)] lg:max-w-[600px]"><span className="block">See you on</span><span className="block text-[#ffcf96]">19th — 24th</span><span className="block">Jan, 2027</span></h1>
          <p className="mt-7 max-w-xl text-base leading-7 text-sky/85 sm:text-lg sm:leading-8">A six-day gathering for ministry, leadership, and the next generation. Come ready to be strengthened, equipped, and sent.</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row"><a className="button-light w-full sm:w-auto" href="#register">Register now <Arrow /></a><a className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/25 px-6 py-3 text-sm font-bold uppercase tracking-[0.08em] text-white transition hover:bg-white/10 sm:w-auto" href="#schedule">View schedule <span>↓</span></a></div>
          <p className="mt-6 max-w-md text-sm font-medium leading-6 text-white/60">Leadership & Missions Conference Centre · Olororo, Ojoo, Ibadan</p>
          <div className="mt-8 sm:mt-10"><p className="mb-3 text-[10px] font-bold uppercase tracking-[0.24em] text-sky/65">Conference begins in</p><Countdown /></div>
        </div>
        <div className="relative flex h-[230px] w-full items-end justify-start sm:h-[280px] lg:h-[520px] lg:items-end lg:justify-end">
          <div className="max-w-sm rounded-[1.5rem] border border-white/20 bg-ink/55 p-6 backdrop-blur-md sm:p-7 lg:mb-6 lg:mr-2"><p className="eyebrow text-[#ffcf96]">Host venue</p><p className="mt-3 font-display text-3xl uppercase leading-[.9] text-white sm:text-4xl">Leadership & Missions Conference Centre</p><p className="mt-4 text-sm leading-6 text-sky/75">Olororo, Ojoo, Ibadan · Nigeria</p></div>
        </div>
      </div>
    </section>
  );
}
