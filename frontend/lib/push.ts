import { apiUrl } from './api';
import { readSession } from './events';

/**
 * Browser Web Push (standard VAPID, no Firebase): register the service worker,
 * subscribe on a user click, and keep the backend's subscription list in sync.
 */
export type PushStatus = 'unsupported' | 'ios-needs-install' | 'not-configured' | 'denied' | 'off' | 'on';

const isIos = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isStandalone = () => window.matchMedia?.('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

export function pushSupported() {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export function registerServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return Promise.resolve(null);
  return navigator.serviceWorker.register('/sw.js').catch(() => null);
}

/**
 * Built-in VAPID public key. Must match PushSettingsService::PUBLIC_KEY in the
 * backend. Kept in code so subscribing needs no network call before the
 * permission prompt (Safari only allows the prompt straight from a tap).
 */
export const VAPID_PUBLIC_KEY = 'BMBiwYmq1onmrpgjFt5_C1D3YQR_LO2dTEMBM_Ym7kmMUHt2wCU79w4L4MTpKJ8imugMWjQsQ01--DNP1hVZ0hU';

function keyBytes(base64: string) {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(padded);
  return Uint8Array.from(raw, (character) => character.charCodeAt(0));
}

function sameKey(current: ArrayBuffer | null, expected: string) {
  if (!current) return false;
  const a = new Uint8Array(current);
  const b = keyBytes(expected);
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

async function currentSubscription() {
  const registration = await navigator.serviceWorker.getRegistration();
  return registration ? registration.pushManager.getSubscription() : null;
}

async function send(method: 'POST' | 'DELETE', body: unknown) {
  const response = await fetch(apiUrl('/auth/push-subscriptions'), {
    method,
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: `Bearer ${readSession()}` },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error('We could not update push notifications on the server.');
}

export async function pushStatus(): Promise<PushStatus> {
  if (typeof window === 'undefined') return 'unsupported';
  if (isIos() && !isStandalone()) return 'ios-needs-install';
  if (!pushSupported()) return 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  const subscription = await currentSubscription().catch(() => null);
  if (subscription && Notification.permission === 'granted') {
    // Re-send so the server still has it (cheap, idempotent).
    void send('POST', { ...subscription.toJSON(), content_encoding: contentEncoding() }).catch(() => undefined);
    return 'on';
  }
  return 'off';
}

function contentEncoding() {
  const supported = (PushManager as unknown as { supportedContentEncodings?: string[] }).supportedContentEncodings;
  return supported?.includes('aes128gcm') || !supported ? 'aes128gcm' : 'aesgcm';
}

/** Must be called from a click handler: asks permission and subscribes. */
export async function enablePush(): Promise<PushStatus> {
  if (!pushSupported()) return isIos() && !isStandalone() ? 'ios-needs-install' : 'unsupported';
  // Ask first, directly from the tap, before any await.
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return permission === 'denied' ? 'denied' : 'off';

  await registerServiceWorker();
  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();
  // A subscription made with an older key can't receive pushes; replace it.
  if (subscription && !sameKey(subscription.options.applicationServerKey, VAPID_PUBLIC_KEY)) {
    await subscription.unsubscribe().catch(() => undefined);
    subscription = null;
  }
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(VAPID_PUBLIC_KEY) });
  }
  await send('POST', { ...subscription.toJSON(), content_encoding: contentEncoding() });
  return 'on';
}

export async function disablePush(): Promise<PushStatus> {
  const subscription = await currentSubscription();
  if (subscription) {
    await send('DELETE', { endpoint: subscription.endpoint }).catch(() => undefined);
    await subscription.unsubscribe().catch(() => undefined);
  }
  return 'off';
}
