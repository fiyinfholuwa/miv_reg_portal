'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { PushStatus, enablePush, pushStatus, registerServiceWorker } from '../lib/push';
import { readSession } from '../lib/events';
import { toast } from '../lib/toast';

const DISMISSED_KEY = 'miv-push-prompt-dismissed';
const ASK_AGAIN_MS = 3 * 24 * 3600 * 1000;

function dismissedRecently() {
  try {
    return Date.now() - Number(window.localStorage.getItem(DISMISSED_KEY) ?? 0) < ASK_AGAIN_MS;
  } catch {
    return false;
  }
}

/**
 * Asks signed-in people to turn on push notifications as soon as they arrive.
 * Browsers only show their permission prompt from a tap, so this card is the
 * tap: "Turn on" triggers the real browser prompt. On iPhone (not added to the
 * Home Screen) it explains how to enable notifications instead.
 */
export default function PushPrompt() {
  const pathname = usePathname();
  const [status, setStatus] = useState<PushStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    if (pathname.startsWith('/admin') || !readSession() || dismissedRecently()) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void registerServiceWorker().then(() => pushStatus()).then((next) => {
        if (cancelled) return;
        setStatus(next);
        setHidden(!(next === 'off' || next === 'ios-needs-install'));
      });
    }, 1500);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [pathname]);

  const dismiss = () => {
    try { window.localStorage.setItem(DISMISSED_KEY, String(Date.now())); } catch { /* best effort */ }
    setHidden(true);
  };

  const turnOn = async () => {
    setBusy(true);
    try {
      const next = await enablePush();
      setStatus(next);
      window.dispatchEvent(new CustomEvent('miv-push-changed', { detail: next }));
      if (next === 'on') {
        toast.success('You’ll get updates about your events, orders and announcements.', { title: 'Notifications on' });
        setHidden(true);
      } else if (next === 'denied') {
        toast.warning('Notifications are blocked. Allow them for this site in your browser settings.');
        dismiss();
      } else {
        dismiss();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not turn on notifications.');
    } finally {
      setBusy(false);
    }
  };

  if (hidden || !status) return null;
  const ios = status === 'ios-needs-install';

  return (
    <div className="fixed inset-x-3 bottom-[calc(5.75rem+env(safe-area-inset-bottom))] z-[90] mx-auto max-w-md rounded-2xl border border-ink/10 bg-white p-4 text-ink shadow-[0_20px_50px_rgba(3,40,74,.25)] sm:bottom-6 lg:bottom-8 lg:left-auto lg:right-8" role="dialog" aria-labelledby="push-prompt-title">
      <div className="flex items-start gap-3">
        <img src="/images/miv-logo.png" alt="" className="h-11 w-11 shrink-0 rounded-full object-contain" />
        <div className="min-w-0 flex-1">
          <strong id="push-prompt-title" className="block text-sm">Get notified</strong>
          <p className="mt-0.5 text-xs leading-5 text-ink/60">{ios
            ? 'To get notifications on iPhone, tap the Share button, choose “Add to Home Screen”, then open MIV from your Home Screen.'
            : 'Announcements, programme changes, order pickups and team updates, straight to this device.'}</p>
        </div>
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <button type="button" onClick={dismiss} className="min-h-10 rounded-full px-4 text-xs font-bold text-ink/60 hover:bg-ink/5">{ios ? 'Got it' : 'Not now'}</button>
        {!ios && <button type="button" onClick={() => void turnOn()} disabled={busy} className="min-h-10 rounded-full bg-[#1469a9] px-5 text-xs font-bold text-white disabled:opacity-60">{busy ? 'Turning on…' : 'Turn on'}</button>}
      </div>
    </div>
  );
}
