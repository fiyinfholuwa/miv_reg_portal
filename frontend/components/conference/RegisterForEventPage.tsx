'use client';

import { useEffect, useState } from 'react';
import RegistrationModal from './RegistrationModal';
import { MivEvent, fetchEvent } from '../../lib/events';

/**
 * The page behind shared "register" links. It opens the registration form for
 * the event straight away, on a plain branded background, instead of the
 * event's full landing page.
 */
export default function RegisterForEventPage({ slug }: { slug: string }) {
  const [event, setEvent] = useState<MivEvent | null>(null);
  const [missing, setMissing] = useState(false);

  const open = () => window.dispatchEvent(new CustomEvent('open-registration-modal', { detail: { event: slug } }));

  useEffect(() => {
    void fetchEvent(slug).then(setEvent).catch(() => setMissing(true));
    // Let the modal attach its listener first.
    const timer = window.setTimeout(open, 50);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden bg-[#06124a] px-4 py-10 text-center text-white">
      <RegistrationModal defaultEvent={slug} />
      {event?.image && <img src={event.image} alt="" className="absolute inset-0 h-full w-full object-cover opacity-20" />}
      <div className="relative w-full max-w-md">
        <img src="/images/miv-logo.png" alt="MIV" className="mx-auto h-16 w-16 rounded-full bg-white object-contain p-1" />
        {missing ? (
          <>
            <h1 className="mt-6 text-2xl font-bold">Event not found</h1>
            <a href="/events" className="mt-6 inline-flex min-h-11 items-center rounded-full bg-white px-6 text-sm font-bold text-[#06124a]">See all events</a>
          </>
        ) : (
          <>
            <p className="mt-6 text-xs font-bold uppercase tracking-[.16em] text-[#f2e22c]">{event?.date_label ?? 'Registration'}</p>
            <h1 className="mt-2 text-3xl font-bold leading-tight sm:text-4xl">{event?.title ?? 'Loading…'}</h1>
            {event?.location && <p className="mt-2 text-sm text-white/70">{event.location}</p>}
            <button type="button" onClick={open} className="mt-7 inline-flex min-h-12 items-center rounded-full bg-[#f2e22c] px-8 text-sm font-bold text-[#07124d]">Register free</button>
          </>
        )}
      </div>
    </main>
  );
}
