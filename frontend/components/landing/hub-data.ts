'use client';

import { useEffect, useState } from 'react';
import { apiUrl } from '../../lib/api';
import { productSlug } from '../../lib/shop';

export type HubEvent = {
  id: number;
  slug: string;
  title: string;
  short_name: string;
  summary: string;
  date_label: string;
  starts_at: string | null;
  location: string | null;
  image: string | null;
  is_featured: boolean;
  registration_open: boolean;
};

export type HubProduct = { id?: number; name: string; price: number; image?: string | null; href: string };

const photo = (name: string) => `/images/photos/${name}.webp`;

export const COUNTDOWN_TARGET = Date.parse('2027-01-19T17:00:00+01:00');

export const fallbackEvents: HubEvent[] = [
  { slug: 'imlc', title: "International Ministers' & Leadership Conference", short_name: 'IMLC', summary: 'For ministers and leaders in every sphere of influence.', date_label: '19–24 Jan 2027', starts_at: '2027-01-19T17:00:00+01:00', location: 'Olororo, Ojoo, Ibadan', image: photo('lp-hero'), is_featured: true, registration_open: true },
  { slug: 'bbr', title: 'Back to Bethel Retreat (BBR)', short_name: 'BBR', summary: "A retreat for ministers' wives, elect ladies and female leaders.", date_label: 'Date TBA', starts_at: null, location: null, image: photo('lp-about-2'), is_featured: true, registration_open: true },
  { slug: 'royal', title: "Royal Fathers' Conference", short_name: 'Royal Fathers', summary: 'For traditional rulers committed to kingdom-minded leadership.', date_label: 'Sat 23 Jan 2027', starts_at: '2027-01-23T10:00:00+01:00', location: 'Olororo, Ojoo, Ibadan', image: photo('lp-reg'), is_featured: true, registration_open: true },
  { slug: 'iylc', title: 'International Young Leaders Conference', short_name: 'IYLC', summary: 'Equipping emerging leaders aged 16–45.', date_label: 'Sat 23 Jan 2027', starts_at: '2027-01-23T10:00:00+01:00', location: 'Olororo, Ojoo, Ibadan', image: photo('lp-about-1'), is_featured: true, registration_open: true },
  { slug: 'family', title: 'Family Life Conference', short_name: 'Family Life', summary: 'Helping believers lead their homes as God intends.', date_label: 'Date TBA', starts_at: null, location: null, image: photo('lp-hotel'), is_featured: true, registration_open: true },
  { slug: 'awg', title: 'Alone With God Prayer Retreat (AWG)', short_name: 'AWG', summary: 'Days set apart for prayer, fasting and seeking God.', date_label: 'Date TBA', starts_at: null, location: null, image: photo('lp-hero-m'), is_featured: true, registration_open: true },
  { slug: 'armed', title: 'Armed Forces Outreach', short_name: 'Armed Forces', summary: 'Ministering to men and women in uniform and their families.', date_label: 'Date TBA', starts_at: null, location: null, image: photo('lp-host-1'), is_featured: false, registration_open: true },
  { slug: 'academic', title: 'Academic Banquet & Summit', short_name: 'Academic', summary: 'Bringing kingdom-minded leadership to campuses and academia.', date_label: 'Date TBA', starts_at: null, location: null, image: photo('lp-reg'), is_featured: false, registration_open: true },
  { slug: 'fire', title: 'Let The Fire Fall', short_name: 'Fire Fall', summary: 'A night of worship, prayer and revival.', date_label: 'Date TBA', starts_at: null, location: null, image: photo('lp-hero'), is_featured: false, registration_open: true },
  { slug: 'singles', title: "Singles' Connect", short_name: 'Singles', summary: 'Fellowship and teaching for single believers preparing for purpose.', date_label: 'Date TBA', starts_at: null, location: null, image: photo('lp-about-2'), is_featured: false, registration_open: true },
  { slug: 'lu', title: 'Leadership Update', short_name: 'Leadership Update', summary: 'Practical sessions that keep leaders sharp and current.', date_label: 'Date TBA', starts_at: null, location: null, image: photo('lp-host-2'), is_featured: false, registration_open: true },
  { slug: 'missions', title: 'Missions Conferences', short_name: 'Missions', summary: 'Mobilising the church to reach the unreached.', date_label: 'Date TBA', starts_at: null, location: null, image: photo('lp-about-1'), is_featured: false, registration_open: true },
].map((event, index) => ({ ...event, id: index + 1 }));

const fallbackImage = Object.fromEntries(fallbackEvents.map((event) => [event.slug, event.image]));

// Card colour themes cycle exactly as in the design.
export const cardThemes = [
  { bg: '#ffffff', fg: '#0c0d10' },
  { bg: '#1460a1', fg: '#ffffff' },
  { bg: '#f4eddc', fg: '#0c0d10' },
  { bg: '#a82e26', fg: '#ffffff' },
  { bg: '#00203f', fg: '#ffffff' },
  { bg: '#ffffff', fg: '#0c0d10' },
];


export const fallbackProducts: HubProduct[] = [
  { name: 'Revival hoodie', price: 20000, image: '/images/merch/revival-hoodie.jpg', href: '/shop/revival-hoodie' },
  { name: 'Revival polo', price: 13000, image: '/images/merch/revival-polo-navy.jpg', href: '/shop/revival-polo' },
  { name: 'Revival baseball shirt', price: 16000, image: '/images/merch/revival-baseball.jpg', href: '/shop/revival-baseball-shirt' },
  { name: 'Revival T-shirt', price: 13000, image: '/images/merch/revival-tee.jpg', href: '/shop/revival-t-shirt' },
];

export const MIV_SITE_URL = 'https://menofissacharvision.com/';
export const MIV_ABOUT_URL = 'https://menofissacharvision.com/about.html';

export const naira =(value: number) => `₦${Math.round(value).toLocaleString('en-NG')}`;

export function openRegistration(detail: { event?: string; mode?: 'login' }) {
  window.dispatchEvent(new CustomEvent('open-registration-modal', { detail }));
}

/** Events from the API, falling back to the static list when the API is unavailable. */
export function useHubEvents() {
  const [events, setEvents] = useState<HubEvent[]>(fallbackEvents);

  useEffect(() => {
    const controller = new AbortController();
    fetch(apiUrl('/events'), { headers: { Accept: 'application/json' }, signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { events?: HubEvent[] } | null) => {
        if (data?.events?.length) {
          setEvents(data.events.map((event) => ({ ...event, image: event.image || fallbackImage[event.slug] || photo('lp-hero') })));
        }
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  return events;
}

/** The next upcoming event open for registration, if any has a date. */
export function nextEvent(events: HubEvent[]) {
  const now = Date.now();
  return events
    .filter((event) => event.registration_open && event.starts_at && Date.parse(event.starts_at) > now)
    .sort((a, b) => Date.parse(a.starts_at as string) - Date.parse(b.starts_at as string))[0];
}

/** Slug of the next upcoming event that is open for registration. */
export function nextEventSlug(events: HubEvent[]) {
  const now = Date.now();
  const upcoming = events
    .filter((event) => event.registration_open && event.starts_at && Date.parse(event.starts_at) > now)
    .sort((a, b) => Date.parse(a.starts_at as string) - Date.parse(b.starts_at as string));
  return upcoming[0]?.slug ?? 'imlc';
}

export function useHasSession() {
  const [hasSession, setHasSession] = useState(false);
  useEffect(() => {
    try {
      setHasSession(Boolean(window.localStorage.getItem('jan-conf-session')));
    } catch {
      setHasSession(false);
    }
  }, []);
  return hasSession;
}

export function useCountdown(target = COUNTDOWN_TARGET) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  if (now === null) return '—';
  const seconds = Math.max(0, Math.floor((target - now) / 1000));
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${Math.floor(seconds / 86400)}d ${pad(Math.floor((seconds % 86400) / 3600))}h ${pad(Math.floor((seconds % 3600) / 60))}m`;
}

export function useHubProducts() {
  const [products, setProducts] = useState<HubProduct[]>(fallbackProducts);
  useEffect(() => {
    const controller = new AbortController();
    fetch(apiUrl('/shop/products'), { headers: { Accept: 'application/json' }, signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { products?: { id?: number; name: string; price: number | string; image?: string | null }[] } | null) => {
        if (data?.products?.length) {
          setProducts(data.products.slice(0, 4).map((product) => ({
            id: product.id,
            name: product.name,
            price: Number(product.price) || 0,
            image: product.image,
            href: `/shop/${productSlug(product.name)}`,
          })));
        }
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, []);
  return products;
}
