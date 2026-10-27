'use client';

import { useState } from 'react';
import { schedule, type ScheduleKey } from './conference-data';

const dayNumbers: Record<ScheduleKey, string> = { Tue: '19', Wed: '20', Thu: '21', Fri: '22', Sat: '23' };

export default function ScheduleSection() {
  const [day, setDay] = useState<ScheduleKey>('Wed');

  return <section id="schedule" className="bg-[#e7edf3] py-20 sm:py-24 lg:py-32"><div className="container-shell"><div className="mb-10 flex flex-wrap items-end justify-between gap-6"><div><p className="eyebrow mb-5">Six-day comprehensive syllabus</p><h2 className="section-title">Session<br /><span className="text-coral">breakdown</span></h2></div><a className="button-light border border-ink/10" href="#register">Download syllabus ↓</a></div><div className="mb-5 flex max-w-full gap-2 overflow-x-auto pb-2" role="tablist" aria-label="Conference days">{Object.keys(schedule).map((item) => { const key = item as ScheduleKey; return <button key={key} className={`shrink-0 rounded-full border px-5 py-3 text-sm font-bold transition ${day === key ? 'border-ink bg-ink text-white' : 'border-ink/15 bg-white text-ink/70 hover:border-ink/40'}`} onClick={() => setDay(key)} role="tab" aria-selected={day === key}>{key} <span className="text-xs opacity-60">{dayNumbers[key]}</span></button>; })}</div><div className="card overflow-hidden">{schedule[day].map(([time, title, place, description]) => <div key={title} className="grid gap-3 border-b border-ink/10 px-5 py-6 last:border-0 sm:grid-cols-[150px_1fr_200px] sm:items-center sm:px-8"><span className="font-display text-3xl uppercase text-coral">{time}</span><div><strong className="font-display text-2xl uppercase tracking-wide">{title}</strong><p className="mt-1 text-sm leading-6 text-ink/55">{description}</p></div><span className="text-sm font-medium text-ink/50 sm:text-right">{place}</span></div>)}</div></div></section>;
}
