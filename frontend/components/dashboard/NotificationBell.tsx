'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { PushStatus, disablePush, enablePush, pushStatus, registerServiceWorker } from '../../lib/push';
import { toast } from '../../lib/toast';
import { Icon } from './DashboardChrome';
import { api } from './ui';

type Notice = { id: string; kind: string; title: string; body: string; link: string | null; read: boolean; created_at: string | null };
type Feed = { notifications: Notice[]; unread_count: number };

const KIND_ICON: Record<string, Parameters<typeof Icon>[0]['name']> = { announcement: 'megaphone', order: 'bag', testimony: 'heart', event: 'ticket', team: 'users' };
const POLL_MS = 60_000;

function timeAgo(value: string | null) {
  if (!value) return '';
  const seconds = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(value).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' });
}

const PUSH_HELP: Record<PushStatus, string> = {
  unsupported: 'This browser does not support push notifications.',
  'ios-needs-install': 'On iPhone and iPad, push only works after you add this site to your Home Screen (Share → Add to Home Screen), then open it from there.',
  'not-configured': 'Push notifications are not set up on the server yet.',
  denied: 'Notifications are blocked for this site. Allow them in your browser settings, then try again.',
  off: 'Get updates on this device even when the site is closed.',
  on: 'You’ll get updates on this device even when the site is closed.',
};

/**
 * Bell with unread badge. Opens a dropdown on desktop and a bottom sheet on
 * phones. Polls every minute while the tab is visible.
 */
export default function NotificationBell({ go }: { go: (href: string) => void }) {
  const [feed, setFeed] = useState<Feed>({ notifications: [], unread_count: 0 });
  const [open, setOpen] = useState(false);
  const [push, setPush] = useState<PushStatus>('off');
  const [pushBusy, setPushBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(() => api('/auth/notifications').then((data: Feed) => setFeed(data)).catch(() => undefined), []);

  useEffect(() => {
    void load();
    void registerServiceWorker().then(() => pushStatus()).then(setPush);
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') void load(); }, POLL_MS);
    const onVisible = () => { if (document.visibilityState === 'visible') void load(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', onVisible); };
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => { if (window.innerWidth >= 640 && !ref.current?.contains(event.target as Node)) setOpen(false); };
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onPointer); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const markRead = async (ids?: string[]) => {
    try {
      setFeed(await api('/auth/notifications/read', { method: 'POST', body: JSON.stringify(ids ? { ids } : {}) }));
    } catch {
      // Read state is a convenience; the next poll retries.
    }
  };

  const openNotice = (notice: Notice) => {
    if (!notice.read) void markRead([notice.id]);
    setOpen(false);
    if (notice.link) go(notice.link);
  };

  const togglePush = async () => {
    setPushBusy(true);
    try {
      const next = push === 'on' ? await disablePush() : await enablePush();
      setPush(next);
      if (next === 'on') toast.success('Push notifications are on for this device.');
      else if (push === 'on') toast.info('Push notifications are off for this device.');
      else toast.warning(PUSH_HELP[next]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not change push notifications.');
    } finally {
      setPushBusy(false);
    }
  };

  const unread = feed.unread_count;
  const canToggle = push === 'on' || push === 'off' || push === 'denied';

  const panel = (
    <>
      <div className="flex items-center justify-between gap-3 border-b border-ink/5 px-4 py-3">
        <h2 className="text-base font-bold">Notifications</h2>
        <div className="flex items-center gap-1">
          {unread > 0 && <button type="button" onClick={() => void markRead()} className="min-h-10 rounded-full px-3 text-xs font-bold text-[#1469a9] hover:bg-ink/5">Mark all as read</button>}
          <button type="button" onClick={() => setOpen(false)} className="grid h-10 w-10 place-items-center rounded-full text-lg sm:hidden" aria-label="Close">×</button>
        </div>
      </div>
      <ul className="m-0 max-h-[min(60dvh,420px)] list-none overflow-y-auto p-1.5">
        {feed.notifications.length === 0 && <li className="px-4 py-10 text-center text-sm text-ink/50">You’re all caught up.</li>}
        {feed.notifications.map((notice) => (
          <li key={notice.id}>
            <button type="button" onClick={() => openNotice(notice)} className={`flex w-full gap-3 rounded-xl p-3 text-left transition hover:bg-ink/5 ${notice.read ? '' : 'bg-[#eef5fb]'}`}>
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-[#1469a9] ring-1 ring-ink/10"><Icon name={KIND_ICON[notice.kind] ?? 'bell'} size={17} /></span>
              <span className="min-w-0 flex-1">
                <span className="flex items-start justify-between gap-2"><strong className="text-sm leading-snug">{notice.title}</strong><span className="shrink-0 pt-0.5 text-[11px] text-ink/45">{timeAgo(notice.created_at)}</span></span>
                <span className="mt-0.5 line-clamp-2 block text-[13px] leading-5 text-ink/65">{notice.body}</span>
              </span>
              {!notice.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-coral" aria-label="Unread" />}
            </button>
          </li>
        ))}
      </ul>
      <div className="border-t border-ink/5 p-3">
        <div className="flex items-center justify-between gap-3">
          <span className="min-w-0"><strong className="block text-sm">Push notifications</strong><span className="block text-xs leading-5 text-ink/55">{PUSH_HELP[push]}</span></span>
          {canToggle && (
            <button type="button" role="switch" aria-checked={push === 'on'} aria-label="Enable push notifications" disabled={pushBusy} onClick={() => void togglePush()} className={`relative h-7 w-12 shrink-0 rounded-full transition disabled:opacity-50 ${push === 'on' ? 'bg-[#1469a9]' : 'bg-ink/20'}`}>
              <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${push === 'on' ? 'left-6' : 'left-1'}`} />
            </button>
          )}
        </div>
      </div>
    </>
  );

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'} className="relative grid h-10 w-10 place-items-center rounded-full text-[#0b4779] transition hover:bg-ink/5">
        <Icon name="bell" size={22} />
        {unread > 0 && <span className="absolute right-0.5 top-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-coral px-1 text-[10px] font-bold text-white ring-2 ring-white">{unread > 9 ? '9+' : unread}</span>}
      </button>
      {open && (
        <>
          {/* Desktop dropdown */}
          <div className="absolute right-0 z-50 mt-2 hidden w-[380px] overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-[0_20px_50px_rgba(3,40,74,.18)] sm:block">{panel}</div>
          {/* Phone bottom sheet */}
          <div className="fixed inset-0 z-[120] flex items-end bg-[#001428]/50 sm:hidden" role="dialog" aria-modal="true" aria-label="Notifications" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
            <div className="miv-sheet w-full overflow-hidden rounded-t-[1.75rem] bg-white pb-[env(safe-area-inset-bottom)]">{panel}</div>
          </div>
        </>
      )}
    </div>
  );
}
