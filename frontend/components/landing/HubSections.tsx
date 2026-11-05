'use client';

import Link from 'next/link';
import { EventCard, EventCardCompact } from './EventCard';
import { openPartner } from './HubChrome';
import { naira, useHubProducts, type HubEvent } from './hub-data';
import type { SiteContent } from '../../lib/site-content';

const eyebrow = 'text-sm font-semibold text-[#a82e26] sm:text-[15px]';
const sectionTitle = 'm-0 text-[32px] font-semibold leading-[1.05] tracking-[-0.025em] [text-wrap:balance] sm:text-[44px] lg:text-[56px] lg:leading-[1.02]';
const isExternal = (url: string) => /^https?:\/\//.test(url);

function SmartLink({ href, className, children }: { href: string; className: string; children: React.ReactNode }) {
  return isExternal(href)
    ? <a href={href} target="_blank" rel="noopener noreferrer" className={className}>{children} <span aria-hidden="true">↗</span></a>
    : <Link href={href} className={className}>{children}</Link>;
}

export function AboutSection({ content }: { content: SiteContent['about'] }) {
  return (
    <section id="about" className="grid scroll-mt-28 gap-6 px-5 py-16 sm:px-10 sm:py-20 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-12 lg:px-[72px] lg:py-[88px]">
      <span className={eyebrow}>{content.eyebrow}</span>
      <div className="flex flex-col gap-8 lg:gap-12">
        <p className="m-0 text-[22px] font-medium leading-[1.35] text-[#0c0d10] [text-wrap:pretty] sm:text-[28px] lg:text-[32px]">
          {content.lead}{content.body && <>{' '}<span className="text-[#6b7280]">{content.body}</span></>}
        </p>
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
          {[content.image_1, content.image_2].filter(Boolean).map((image, index) => <div key={index} className="h-[260px] overflow-hidden rounded-[24px] bg-[#f4eddc] sm:h-[380px]"><img src={image} alt="" className="h-full w-full object-cover" loading="lazy" /></div>)}
        </div>
        {content.link_url && <SmartLink href={content.link_url} className="self-start rounded-full bg-[#a82e26] px-[22px] py-[13px] text-sm font-bold text-white transition hover:bg-[#8c1f1c]">{content.link_label || 'Learn more'}</SmartLink>}
      </div>
    </section>
  );
}

export function StatsSection({ content }: { content: SiteContent['stats'] }) {
  const stats = content.items;
  return (
    <section className="mx-2.5 flex flex-col gap-10 rounded-[26px] bg-[#001428] px-6 py-12 text-[#faf6ec] sm:mx-4 sm:gap-11 sm:rounded-[28px] sm:px-14 sm:py-[72px]">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between md:gap-6">
        <h2 className="m-0 max-w-[620px] text-[30px] font-semibold leading-[1.05] tracking-[-0.02em] [text-wrap:balance] sm:text-[44px]">{content.heading}</h2>
        {content.subheading && <span className="max-w-[320px] text-[15px] leading-[1.55] text-[#bcd6ec]">{content.subheading}</span>}
      </div>
      {stats.length > 0 && (
        <div className={`grid gap-8 sm:gap-0 ${stats.length >= 4 ? 'sm:grid-cols-2 lg:grid-cols-4' : stats.length === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-3'}`}>
          {stats.map((stat, index) => (
            <div key={`${stat.label}-${index}`} className={`flex flex-col gap-2.5 sm:mr-8 sm:py-2 sm:pr-8 ${index < stats.length - 1 ? 'border-b border-white/[.16] pb-8 sm:border-b-0 sm:border-r sm:pb-2' : ''}`}>
              <span className="text-[64px] font-semibold leading-[0.9] tracking-[-0.04em] tabular-nums lg:text-[96px]">{stat.value}</span>
              <span className="text-base font-medium text-[#bcd6ec]">{stat.label}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export function EventsSection({ events, content }: { events: HubEvent[]; content: SiteContent['events'] }) {
  const featured = events.filter((event) => event.is_featured).slice(0, 6);
  const list = featured.length ? featured : events.slice(0, 6);
  return (
    <section id="events" className="flex scroll-mt-28 flex-col gap-6 py-16 sm:gap-10 sm:px-10 sm:py-24 lg:px-[72px]">
      <div className="flex flex-col gap-4 px-5 sm:px-0 md:flex-row md:items-end md:justify-between md:gap-10">
        <div className="flex flex-col gap-3"><span className={eyebrow}>{content.eyebrow}</span><h2 className={`${sectionTitle} max-w-[720px] text-[#0c0d10]`}>{content.heading}</h2></div>
        {content.subheading && <span className="max-w-[300px] text-[15px] leading-[1.55] text-[#4d5460]">{content.subheading}</span>}
      </div>
      {/* Phones: horizontal scroller (19c). */}
      <div className="flex snap-x gap-3 overflow-x-auto px-5 pb-2 sm:hidden">{list.map((event, index) => <EventCardCompact key={event.slug} event={event} index={index} />)}</div>
      <div className="hidden gap-[18px] sm:grid sm:grid-cols-2 lg:grid-cols-3">{list.map((event, index) => <EventCard key={event.slug} event={event} index={index} />)}</div>
      <div className="flex justify-center px-5 sm:px-0"><Link href="/events" className="rounded-full bg-[#00203f] px-7 py-[15px] text-[15px] font-bold text-white transition hover:bg-[#003070]">More events →</Link></div>
    </section>
  );
}

export function HostsSection({ content }: { content: SiteContent['hosts'] }) {
  return (
    <section className="mx-2.5 grid items-center gap-10 rounded-[26px] bg-[#001428] px-6 py-12 text-[#faf6ec] sm:mx-4 sm:rounded-[28px] sm:px-14 sm:py-[88px] lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-16">
      {content.image && <div className="mx-auto aspect-[4/5] w-full max-w-[460px] overflow-hidden rounded-[24px] bg-white lg:max-w-none"><img src={content.image} alt={content.name} className="h-full w-full object-cover object-top" loading="lazy" /></div>}
      <div className="flex flex-col gap-[18px]">
        {content.eyebrow && <span className="text-sm font-semibold text-[#d4574b] sm:text-[15px]">{content.eyebrow}</span>}
        <h2 className={sectionTitle}>{content.name}</h2>
        {content.paragraphs.map((paragraph, index) => <p key={index} className="m-0 text-base leading-[1.7] text-[#dceaf5] [text-wrap:pretty] sm:text-[17px]">{paragraph}</p>)}
        {content.link_url && <SmartLink href={content.link_url} className="mt-1.5 self-start rounded-full bg-white px-6 py-3.5 text-sm font-bold text-[#00203f] transition hover:bg-[#faf6ec]">{content.link_label || 'Read more'}</SmartLink>}
      </div>
    </section>
  );
}

export function ShopSection({ content }: { content: SiteContent['shop'] }) {
  const products = useHubProducts();
  return (
    <section id="shop" className="flex scroll-mt-28 flex-col gap-8 px-5 pb-16 sm:px-10 sm:pb-24 lg:px-[72px]">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-3"><span className={eyebrow}>{content.eyebrow}</span><h2 className={`${sectionTitle} text-[#0c0d10]`}>{content.heading}</h2></div>
        <Link href="/shop" className="rounded-full border-[1.5px] border-[#c9ced6] px-6 py-3.5 text-sm font-bold text-[#0c0d10] transition hover:border-[#0c0d10]">Visit the shop</Link>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {products.map((product) => (
          <Link key={product.id ?? product.name} href={product.href} className="group flex flex-col gap-3 rounded-[22px] border border-[#e4e7ec] bg-white px-2.5 pb-[18px] pt-2.5 transition hover:-translate-y-1 hover:shadow-lg">
            <div className="aspect-square overflow-hidden rounded-2xl bg-[#f4eddc]"><img src={product.image || '/images/miv-logo.png'} alt={product.name} className="block h-full w-full object-cover transition duration-500 group-hover:scale-105" loading="lazy" /></div>
            <div className="flex flex-col gap-1 px-2 sm:flex-row sm:items-baseline sm:justify-between sm:gap-2">
              <span className="text-[15px] font-semibold text-[#0c0d10] sm:text-base">{product.name}</span>
              <span className="text-[15px] font-bold text-[#a82e26] sm:text-base">{naira(product.price)}</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function PartnerSection({ content }: { content: SiteContent['partner'] }) {
  return (
    <section id="partner" className="mx-2.5 mb-2.5 grid scroll-mt-28 overflow-hidden rounded-[26px] bg-[#8c1f1c] text-[#faf6ec] sm:mx-4 sm:mb-4 sm:rounded-[28px] lg:min-h-[560px] lg:grid-cols-2">
      <div className="flex flex-col justify-center gap-5 px-6 py-12 sm:px-14 sm:py-[72px]">
        <span className="text-sm font-semibold text-[#f0bdb6] sm:text-[15px]">Partnership</span>
        <h2 className={sectionTitle}>{content.heading}</h2>
        {content.body && <p className="m-0 max-w-[480px] text-base leading-[1.65] text-[#f8e0dc] sm:text-[17px]">{content.body}</p>}
        <button type="button" onClick={openPartner} className="mt-2 self-start rounded-full bg-white px-8 py-[18px] text-base font-bold text-[#8c1f1c] transition hover:bg-[#faf6ec]">{content.button_label || 'Partner with us →'}</button>
      </div>
      {content.image && <div className="relative min-h-[300px]"><img src={content.image} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" /></div>}
    </section>
  );
}
