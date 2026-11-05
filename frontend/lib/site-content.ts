'use client';

import { useEffect, useState } from 'react';
import { apiUrl } from './api';

/**
 * Landing page copy and media. Admins edit each section in the admin
 * dashboard (Landing page); anything never saved falls back to these
 * defaults, so the site always renders.
 */
const photo = (name: string) => `/images/photos/${name}.webp`;

export const defaultSiteContent = {
  hero: {
    eyebrow: 'Conferences, retreats & gatherings of MIV',
    title: 'Raising kingdom‑minded leaders',
    subtitle: 'Every MIV conference, retreat and leadership gathering in one place. Find your next event and register.',
    image: photo('lp-hero'),
    image_mobile: photo('lp-hero-m'),
    primary_label: 'Register Now',
    secondary_label: 'View all events',
  },
  about: {
    eyebrow: 'About MIV',
    lead: 'MIV organizes interdenominational leadership conferences for Christian leaders in all spheres of influence',
    body: 'including government executives, captains of industries, religious leaders, traditional rulers, and emerging leaders to equip them for kingdom-minded leadership.',
    image_1: photo('lp-about-1'),
    image_2: photo('lp-about-2'),
    link_label: 'More about MIV',
    link_url: 'https://menofissacharvision.com/about.html',
  },
  stats: {
    heading: 'A ministry raising leaders since 1989.',
    subheading: 'Ministers, young leaders, royal fathers and families gather with MIV every year.',
    items: [
      { value: '1989', label: 'Year MIV commenced' },
      { value: '37th', label: 'Edition of IMLC' },
      { value: '2,000+', label: 'Attendees yearly' },
    ],
  },
  events: {
    eyebrow: 'Events',
    heading: 'Gatherings for every leader and home.',
    subheading: 'Featured gatherings. See the full calendar of conferences, retreats and outreaches on the events page.',
  },
  hosts: {
    eyebrow: 'The President & vice-President',
    name: 'Rev. Samson & Stella Ajetomobi',
    paragraphs: [
      'Rev. Samson and Rev. Stella Ajetomobi are dedicated ministers of the Gospel and visionary leaders with a shared passion for advancing God’s Kingdom, developing leaders, and strengthening families. Rev. Samson is the President of The Men of Issachar Vision Incorporated (MIV), founded in 1989, and Overseer of the Redemption Faith Churches.',
      'Rev. Stella Ajetomobi, Vice President of MIV, is a gifted teacher and prophetic minister with a passion for Christian character, discipleship, and missions, and host of Back to Bethel Retreats. Together, they have devoted their lives to ministry, leadership development, and building godly homes.',
    ],
    image: '/images/mummy-and-daddy.png',
    link_label: 'Read full profiles',
    link_url: 'https://menofissacharvision.com/',
  },
  gallery: {
    heading: 'Moments from past events, in pictures and video',
    subheading: 'Worship, teaching and fellowship from across MIV gatherings.',
    items: [
      { image: photo('lp-hero'), event: 'imlc', caption: 'Opening plenary' },
      { image: photo('lp-about-1'), event: 'iylc', caption: 'IYLC breakout' },
      { image: photo('lp-about-2'), event: 'bbr', caption: 'Worship at Bethel' },
      { image: photo('lp-reg'), event: 'royal', caption: 'Royal Fathers arrive' },
      { image: photo('lp-hotel'), event: 'family', caption: 'Family Life Day 2' },
      { image: photo('lp-hero-m'), event: 'imlc', caption: 'Evening worship' },
      { image: photo('lp-host-1'), event: 'imlc', caption: 'Rev. Samson ministering' },
      { image: photo('lp-host-2'), event: 'bbr', caption: 'Rev. Stella teaching' },
      { image: photo('lp-about-1'), event: 'awg', caption: 'Night of prayer' },
      { image: photo('lp-reg'), event: 'academic', caption: 'Academic Banquet' },
      { image: photo('lp-hero'), event: 'fire', caption: 'Let The Fire Fall' },
      { image: photo('lp-about-2'), event: 'singles', caption: "Singles' Connect" },
      { image: photo('lp-hero-m'), event: 'imlc', caption: 'IMLC 2026 highlights', duration: '1:48', video_url: null },
      { image: photo('lp-about-2'), event: 'bbr', caption: 'Bethel worship moment', duration: '0:52', video_url: null },
      { image: photo('lp-about-1'), event: 'iylc', caption: 'IYLC recap', duration: '1:12', video_url: null },
      { image: photo('lp-hotel'), event: 'family', caption: 'Family Life testimonies', duration: '2:05', video_url: null },
    ] as GalleryItem[],
  },
  shop: {
    eyebrow: 'Shop',
    heading: 'Wear the vision',
  },
  partner: {
    heading: 'Partner with the vision',
    body: 'Stand with MIV to train leaders, host conferences and reach the unreached. Give once or partner monthly, and you share in every life touched through the vision.',
    image: '/images/partner-donations.png',
    button_label: 'Partner with us →',
    types: ['Prayer partner', 'Financial partner', 'Conference sponsor', 'Volunteer & media'],
  },
  contact: {
    email: 'mivmandate2010@gmail.com',
    phone: '0808 085 4818',
    address: 'Leadership and Missions Conference Centre Olororo, Ojoo Ibadan, Nigeria',
    copyright: '© 2027 The Men of Issachar Vision Inc.',
  },
};

export type GalleryItem = { image: string; caption: string; event?: string | null; video_url?: string | null; duration?: string | null };
export type SiteContent = typeof defaultSiteContent;
export type SiteSection = keyof SiteContent;

/** Saved sections override defaults field by field; empty strings keep the default. */
export function mergeSiteContent(saved: Partial<Record<SiteSection, Record<string, unknown>>>): SiteContent {
  const merged = { ...defaultSiteContent } as Record<SiteSection, Record<string, unknown>>;
  (Object.keys(defaultSiteContent) as SiteSection[]).forEach((section) => {
    const values = saved[section];
    if (!values) return;
    const next = { ...merged[section] };
    Object.entries(values).forEach(([key, value]) => {
      if (value === null || value === '' || value === undefined) return;
      next[key] = value;
    });
    merged[section] = next;
  });
  return merged as unknown as SiteContent;
}

let cache: Promise<SiteContent> | null = null;

/** Saved content from the API, merged with defaults. Fetched once per page load. */
export function loadSiteContent(force = false): Promise<SiteContent> {
  if (!cache || force) {
    cache = fetch(apiUrl('/site-content'), { headers: { Accept: 'application/json' } })
      .then((response) => (response.ok ? response.json() : { content: {} }))
      .then((data) => mergeSiteContent(data.content ?? {}))
      .catch(() => defaultSiteContent);
  }
  return cache;
}

export function useSiteContent(): SiteContent {
  const [content, setContent] = useState<SiteContent>(defaultSiteContent);
  useEffect(() => {
    let active = true;
    void loadSiteContent().then((loaded) => { if (active) setContent(loaded); });
    return () => { active = false; };
  }, []);
  return content;
}
