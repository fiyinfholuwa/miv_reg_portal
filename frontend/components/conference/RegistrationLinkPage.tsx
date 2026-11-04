'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import RegistrationModal from './RegistrationModal';
import { apiRequest, saveSession } from '../../lib/events';

const PENDING_EVENT_KEY = 'miv-pending-event';

/**
 * Landing page for the "verify email" link. It signs the person in, then hands
 * over to the registration modal so they finish their profile and the event
 * they started registering for (remembered in localStorage).
 */
export default function RegistrationLinkPage() {
  const router = useRouter();
  const params = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'continue' | 'error'>('loading');
  const [error, setError] = useState('');
  const [pendingEvent, setPendingEvent] = useState<string | null>(null);

  useEffect(() => {
    const verificationToken = params.get('token');
    if (!verificationToken) {
      setError('This verification link is missing its token. Please request a new code.');
      setStatus('error');
      return;
    }

    void (async () => {
      try {
        const data = await apiRequest<{ token: string; profile_required: boolean }>('/auth/verify-link', { body: { token: verificationToken, device_name: 'miv-hub-web-link' } });
        saveSession(data.token);
        let eventSlug: string | null = null;
        try { eventSlug = window.localStorage.getItem(PENDING_EVENT_KEY); } catch { /* storage unavailable */ }

        if (!data.profile_required && !eventSlug) {
          router.replace('/dashboard');
          return;
        }
        setPendingEvent(eventSlug);
        setStatus('continue');
      } catch (verificationError) {
        setError(verificationError instanceof Error ? verificationError.message : 'We could not verify this link.');
        setStatus('error');
      }
    })();
  }, [params, router]);

  useEffect(() => {
    if (status !== 'continue') return;
    window.dispatchEvent(new CustomEvent('open-registration-modal', { detail: { event: pendingEvent ?? undefined, closeTo: '/' } }));
  }, [status, pendingEvent]);

  if (status === 'loading') return <StatusCard title="Verifying your email" description="One moment while we secure your account." />;
  if (status === 'error') return <StatusCard title="Link unavailable" description={error} action="Back to the homepage" onAction={() => router.replace('/')} />;

  return <><StatusCard title="Email verified" description="Finish your registration in the window that just opened." /><RegistrationModal /></>;
}

function StatusCard({ title, description, action, onAction }: { title: string; description: string; action?: string; onAction?: () => void }) {
  return (
    <main className="grid min-h-screen place-items-center bg-[#faf6ec] px-5 text-center text-[#0c0d10]" style={{ fontFamily: "'Barlow', var(--font-inter), system-ui, sans-serif" }}>
      <div className="w-full max-w-md rounded-[28px] bg-white p-8 shadow-[0_14px_34px_rgba(0,32,63,.18)] sm:p-12">
        <img src="/images/miv-logo.png" alt="The Men of Issachar Vision" className="mx-auto h-14 w-14 object-contain" />
        <h1 className="mt-6 text-3xl font-semibold tracking-[-0.02em]">{title}</h1>
        <p className="mt-4 text-[#4d5460]">{description}</p>
        {action && onAction && <button type="button" onClick={onAction} className="mt-7 rounded-full bg-[#a82e26] px-6 py-3 text-sm font-bold text-white">{action}</button>}
      </div>
    </main>
  );
}
