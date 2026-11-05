'use client';

import { useEffect, useState } from 'react';
import { API_URL } from '../../lib/api';
import { SESSION_KEY } from '../../lib/events';

/** Authenticated JSON call used by the dashboard panels. */
export async function api(path: string, options: RequestInit = {}) {
  const token = window.localStorage.getItem(SESSION_KEY);
  const response = await fetch(API_URL + path, { ...options, headers: { Accept: 'application/json', ...(options.body ? { 'Content-Type': 'application/json' } : {}), Authorization: 'Bearer ' + token, ...options.headers } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const firstError = data.errors ? (Object.values(data.errors as Record<string, string[]>)[0]?.[0]) : undefined;
    throw new Error(firstError || data.message || 'Request failed.');
  }
  return data;
}

export function Countdown({ startsAt, compact = false }: { startsAt: string; compact?: boolean }) {
  const target = new Date(startsAt).getTime();
  const [remaining, setRemaining] = useState(Math.max(target - Date.now(), 0));
  useEffect(() => {
    const timer = window.setInterval(() => setRemaining(Math.max(target - Date.now(), 0)), 1000);
    return () => window.clearInterval(timer);
  }, [target]);
  const total = Math.floor(remaining / 1000);
  const values: [string, number][] = [['days', Math.floor(total / 86400)], ['hrs', Math.floor((total % 86400) / 3600)], ['min', Math.floor((total % 3600) / 60)], ['sec', total % 60]];
  return <div className="flex gap-4 sm:gap-6">{values.map(([label, value]) => <div key={label}><strong className={`font-display text-[#fffaf0] ${compact ? 'text-4xl' : 'text-5xl sm:text-7xl'}`}>{String(value).padStart(2, '0')}</strong><span className="block text-[10px] font-bold uppercase tracking-[.14em] text-[#9bc4e5]">{label}</span></div>)}</div>;
}



