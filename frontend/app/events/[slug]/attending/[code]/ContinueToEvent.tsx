'use client';

import { useEffect } from 'react';

/**
 * Sends visitors on to the event page after a moment. Done in the browser
 * (not a server redirect) so link-preview crawlers still read this page's card.
 */
export default function ContinueToEvent({ href }: { href: string }) {
  useEffect(() => {
    const timer = window.setTimeout(() => window.location.replace(href), 1500);
    return () => window.clearTimeout(timer);
  }, [href]);
  return <p className="mt-4 text-xs text-white/60">Taking you to the event page…</p>;
}
