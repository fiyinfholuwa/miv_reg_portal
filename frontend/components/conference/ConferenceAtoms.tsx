'use client';

import { useEffect, useMemo, useState } from 'react';

export function Mark() {
  return <img src="/images/miv-logo.png" alt="MIV" className="h-9 w-9 shrink-0 rounded-full object-contain" />;
}

export function Arrow() {
  return <span aria-hidden="true" className="text-lg">↗</span>;
}

export function Countdown() {
  const target = useMemo(() => new Date('2027-01-19T09:00:00+01:00').getTime(), []);
  const [remaining, setRemaining] = useState(target - Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setRemaining(Math.max(target - Date.now(), 0)), 1000);
    return () => window.clearInterval(timer);
  }, [target]);

  const totalSeconds = Math.floor(remaining / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const units = [['days', days], ['hrs', hours], ['min', minutes], ['sec', seconds]] as const;

  return (
    <div className="flex flex-wrap gap-2 sm:gap-3">
      {units.map(([label, value]) => (
        <div key={label} className="min-w-[60px] rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-center backdrop-blur sm:min-w-[70px]">
          <strong className="block font-display text-3xl leading-none text-white">{String(value).padStart(2, '0')}</strong>
          <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-sky/75">{label}</span>
        </div>
      ))}
    </div>
  );
}

export function Stat({ number, label }: { number: string; label: string }) {
  return <div className="py-2"><strong className="font-display text-3xl text-ink sm:text-4xl">{number}</strong><span className="mt-1 block max-w-[130px] text-xs font-semibold uppercase tracking-[0.08em] text-ink/50">{label}</span></div>;
}

export function ImageCard({ src, label, className = '' }: { src: string; label: string; className?: string }) {
  return <div className={`group relative overflow-hidden rounded-[1.6rem] bg-sky ${className}`}><div className="aspect-[1.3] bg-cover bg-center transition duration-700 group-hover:scale-105" style={{ backgroundImage: `linear-gradient(180deg, transparent 45%, rgba(7,29,54,.82)), url(${src})` }} /><p className="absolute bottom-5 left-5 right-5 font-display text-2xl uppercase leading-none text-white">{label}</p></div>;
}

export function ExperienceCard({ number, title, text }: { number: string; title: string; text: string }) {
  return <article className="rounded-[1.6rem] border border-white/15 bg-white/[.06] p-7 transition hover:-translate-y-1 hover:bg-white/[.1]"><span className="font-display text-6xl text-white/15">{number}</span><h3 className="mt-8 max-w-xs font-display text-3xl uppercase leading-[.9]">{title}</h3><p className="mt-5 leading-7 text-sky/70">{text}</p></article>;
}
