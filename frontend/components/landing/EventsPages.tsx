'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import RegistrationModal from '../conference/RegistrationModal';
import { fetchAccount, readSession } from '../../lib/events';
import { EventCard } from './EventCard';
import { HubFooter, HubNav } from './HubChrome';
import { nextEventSlug, openRegistration, useHubEvents } from './hub-data';

const PAGE_SIZE = 9;

function Pagination({ page, pages, onChange }: { page: number; pages: number; onChange: (page: number) => void }) {
  if (pages <= 1) return null;
  const button = 'grid h-11 min-w-11 place-items-center rounded-full px-3 text-[15px] font-bold transition disabled:cursor-not-allowed disabled:opacity-35';
  return (
    <nav className="flex flex-wrap items-center justify-center gap-2" aria-label="Events pages">
      <button type="button" onClick={() => onChange(page - 1)} disabled={page === 1} className={`${button} border-[1.5px] border-[#c9ced6] text-[#0c0d10] hover:border-[#0c0d10]`}>← Prev</button>
      {Array.from({ length: pages }, (_, index) => index + 1).map((number) => (
        <button key={number} type="button" onClick={() => onChange(number)} aria-current={number === page ? 'page' : undefined} className={`${button} ${number === page ? 'bg-[#00203f] text-white' : 'text-[#0c0d10] hover:bg-[#f4eddc]'}`}>{number}</button>
      ))}
      <button type="button" onClick={() => onChange(page + 1)} disabled={page === pages} className={`${button} border-[1.5px] border-[#c9ced6] text-[#0c0d10] hover:border-[#0c0d10]`}>Next →</button>
    </nav>
  );
}

export function EventsIndexPage() {
  const events = useHubEvents();
  const [page, setPage] = useState(1);
  const pages = Math.max(1, Math.ceil(events.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const shown = events.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  useEffect(() => {
    const requested = Number(new URLSearchParams(window.location.search).get('page'));
    if (Number.isInteger(requested) && requested > 1) setPage(requested);
  }, []);

  const changePage = (next: number) => {
    setPage(next);
    const url = new URL(window.location.href);
    if (next > 1) url.searchParams.set('page', String(next)); else url.searchParams.delete('page');
    window.history.replaceState({}, '', url);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <main className="miv-hub">
      <RegistrationModal />
      <div className="p-2.5 sm:p-4"><HubNav registerSlug={nextEventSlug(events)} variant="solid" /></div>
      <section className="flex flex-col gap-8 px-5 py-12 sm:gap-10 sm:px-10 sm:py-16 lg:px-[72px]">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-3">
            <span className="text-sm font-semibold text-[#a82e26] sm:text-[15px]">All events</span>
            <h1 className="m-0 text-[36px] font-semibold leading-[1.02] tracking-[-0.025em] text-[#0c0d10] sm:text-[56px]">Every MIV gathering.</h1>
          </div>
          <span className="max-w-[340px] text-[15px] leading-[1.55] text-[#4d5460]">Conferences, retreats and outreaches across the year. Register once and your events appear on your dashboard.</span>
        </div>
        <div className="grid gap-[18px] sm:grid-cols-2 lg:grid-cols-3">{shown.map((event, index) => <EventCard key={event.slug} event={event} index={(current - 1) * PAGE_SIZE + index} />)}</div>
        <div className="flex flex-col items-center gap-3">
          <Pagination page={current} pages={pages} onChange={changePage} />
          <span className="text-sm text-[#4d5460]">Showing {shown.length ? (current - 1) * PAGE_SIZE + 1 : 0}–{(current - 1) * PAGE_SIZE + shown.length} of {events.length} events</span>
        </div>
      </section>
      <HubFooter />
    </main>
  );
}

export function EventDetailPage({ slug }: { slug: string }) {
  const events = useHubEvents();
  const index = events.findIndex((item) => item.slug === slug);
  const event = events[index];
  const [registered, setRegistered] = useState(false);

  useEffect(() => {
    if (!readSession()) return;
    void fetchAccount().then((account) => setRegistered(account.registered_events.includes(slug))).catch(() => undefined);
  }, [slug]);

  return (
    <main className="miv-hub">
      <RegistrationModal defaultEvent={slug} />
      {event ? (
        <div className="p-2.5 sm:p-4">
          <section className="relative min-h-[560px] overflow-hidden rounded-[26px] bg-[#001428] text-[#faf6ec] sm:min-h-[620px] sm:rounded-[28px]">
            {event.image && <img src={event.image} alt="" className="absolute inset-0 h-full w-full object-cover" />}
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(0,20,40,.55),rgba(0,20,40,.2)_30%,rgba(0,20,40,.95)_80%)] sm:bg-[linear-gradient(90deg,rgba(0,20,40,.92)_0%,rgba(0,20,40,.6)_50%,rgba(0,20,40,.15)_100%)]" />
            <HubNav registerSlug={event.registration_open ? event.slug : nextEventSlug(events)} />
            <div className="absolute inset-x-5 bottom-6 flex flex-col gap-4 sm:inset-x-auto sm:bottom-12 sm:left-11 sm:max-w-[640px]">
              <Link href="/events" className="text-sm font-semibold text-[#bcd6ec] hover:text-white">← All events</Link>
              <span className="self-start rounded-full bg-white px-3 py-[5px] text-xs font-bold text-[#0c0d10]">{event.date_label}</span>
              <h1 className="m-0 text-[40px] font-semibold leading-[0.98] tracking-[-0.03em] sm:text-[64px]">{event.title}</h1>
              <p className="m-0 max-w-[520px] text-base leading-[1.55] text-[#dceaf5] sm:text-[17px]">{event.summary}</p>
              {event.location && <p className="m-0 text-sm font-medium text-[#bcd6ec]">{event.location}</p>}
              <div className="mt-1 flex flex-col gap-3 sm:flex-row">
                {registered
                  ? <Link href={`/dashboard/events/${event.slug}`} className="rounded-full bg-[#a82e26] px-[26px] py-[15px] text-center text-[15px] font-bold text-white transition hover:bg-[#8c1f1c]">You’re registered · Manage event</Link>
                  : event.registration_open
                  ? <button type="button" onClick={() => openRegistration({ event: event.slug })} className="rounded-full bg-[#a82e26] px-[26px] py-[15px] text-[15px] font-bold text-white transition hover:bg-[#8c1f1c]">Register for {event.short_name}</button>
                  : <span className="rounded-full bg-white/15 px-[26px] py-[15px] text-center text-[15px] font-bold">Registration opens soon</span>}
                <Link href="/events" className="rounded-full bg-white px-[26px] py-[15px] text-center text-[15px] font-bold text-[#00203f]">View all events</Link>
              </div>
            </div>
          </section>
        </div>
      ) : (
        <>
          <div className="p-2.5 sm:p-4"><HubNav registerSlug={nextEventSlug(events)} variant="solid" /></div>
          <section className="flex flex-col items-center gap-4 px-5 py-24 text-center">
            <h1 className="m-0 text-[36px] font-semibold text-[#0c0d10]">Event not found</h1>
            <p className="m-0 text-[#4d5460]">We couldn’t find that gathering. It may have moved or been renamed.</p>
            <Link href="/events" className="rounded-full bg-[#00203f] px-7 py-[15px] text-[15px] font-bold text-white">View all events</Link>
          </section>
        </>
      )}
      <HubFooter />
    </main>
  );
}
