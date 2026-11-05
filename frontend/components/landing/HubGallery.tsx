'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { HubEvent } from './hub-data';
import type { GalleryItem, SiteContent } from '../../lib/site-content';

function PlayIcon({ size }: { size: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="#00203f" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>;
}

/**
 * Curved 3D reel ported from the design: tiles sit on a ring, drift slowly,
 * and pause while hovered. Transforms are written directly to the DOM each
 * frame so React does not re-render 60 times a second.
 */
type GalleryTile = GalleryItem & { tag: string };

function CurveReel({ items, step, tileW, tileH, perspective, compact }: { items: GalleryTile[]; step: number; tileW: number; tileH: number; perspective: number; compact?: boolean }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const offset = useRef(0);
  const paused = useRef(false);

  const reel = useMemo(() => {
    let list = items.slice();
    while (list.length && list.length < 10) list = list.concat(items);
    return list;
  }, [items]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;
    let last = performance.now();

    const layout = (dt: number) => {
      const tiles = track.querySelectorAll<HTMLElement>('[data-tile]');
      const count = tiles.length;
      if (!count) return;
      if (!reduce && !paused.current) offset.current += dt * (step / 7000);
      const width = count * step;
      const half = track.clientWidth / 2 || 1;
      tiles.forEach((tile, index) => {
        let x = (((index * step - offset.current) % width) + width) % width;
        if (x > width / 2) x -= width;
        const n = Math.max(-1.6, Math.min(1.6, x / half));
        tile.style.transform = `translateX(${x.toFixed(1)}px) translateZ(${(n * n * step * 0.42).toFixed(1)}px) rotateY(${(-n * 26).toFixed(2)}deg)`;
      });
    };

    const frame = (now: number) => {
      layout(Math.min(64, now - last));
      last = now;
      raf = requestAnimationFrame(frame);
    };
    layout(0);
    if (!reduce) raf = requestAnimationFrame(frame);
    const onResize = () => layout(0);
    window.addEventListener('resize', onResize);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', onResize); };
  }, [reel, step]);

  return (
    <div
      ref={trackRef}
      onMouseEnter={() => { paused.current = true; }}
      onMouseLeave={() => { paused.current = false; }}
      className="relative overflow-hidden"
      style={{ height: compact ? 260 : 440, perspective, perspectiveOrigin: '50% 50%' }}
    >
      {reel.map((item, index) => (
        <figure
          key={`${item.caption}-${index}`}
          data-tile="1"
          className="absolute left-1/2 top-1/2 m-0 overflow-hidden bg-[#003070] will-change-transform"
          style={{ width: tileW, height: tileH, marginLeft: -tileW / 2, marginTop: -tileH / 2, borderRadius: compact ? 12 : 14, boxShadow: compact ? '0 20px 50px rgba(0,0,0,.45)' : '0 18px 40px rgba(0,32,63,.22)' }}
        >
          <img src={item.image} alt={item.caption} className="block h-full w-full object-cover" loading="lazy" />
          {item.video_url && <a href={item.video_url} target="_blank" rel="noopener noreferrer" className="absolute inset-0 z-10" aria-label={`Watch ${item.caption}`} />}
          <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_55%,rgba(0,12,26,.88))]" />
          {(item.duration || item.video_url) && (
            <>
              <div className="absolute left-1/2 top-[44%] flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/95" style={{ width: compact ? 33 : 58, height: compact ? 33 : 58 }}><PlayIcon size={compact ? 13 : 22} /></div>
              {item.duration && <span className="absolute right-2.5 top-2.5 rounded-full bg-black/60 px-[9px] py-[3px] font-semibold text-white" style={{ fontSize: compact ? 10 : 13 }}>{item.duration}</span>}
            </>
          )}
          <figcaption className="absolute inset-x-3.5 bottom-3 flex flex-col gap-0.5 text-white">
            <span className="font-bold leading-[1.2]" style={{ fontSize: compact ? 12 : 15 }}>{item.caption}</span>
            <span className="font-medium text-[#bcd6ec]" style={{ fontSize: compact ? 10 : 13 }}>{item.tag}</span>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}

export default function HubGallery({ events, content }: { events: HubEvent[]; content: SiteContent['gallery'] }) {
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 639px)');
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  const shortNames = useMemo(() => Object.fromEntries(events.map((event) => [event.slug, event.short_name])), [events]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return content.items
      .filter((item) => (filter === 'all' || item.event === filter) && (!q || `${item.caption} ${item.event ? shortNames[item.event] ?? '' : ''}`.toLowerCase().includes(q)))
      .map((item) => ({ ...item, tag: item.event ? shortNames[item.event] ?? item.event.toUpperCase() : 'MIV' }));
  }, [content.items, filter, query, shortNames]);

  return (
    <section id="gallery" className="flex scroll-mt-28 flex-col gap-6 overflow-hidden pb-16 pt-16 text-[#0c0d10] sm:gap-9 sm:pb-20 sm:pt-24">
      <div className="flex flex-col gap-4 px-5 sm:items-center sm:px-10 sm:text-center lg:px-[72px]">
        <span className="text-sm font-semibold text-[#a82e26] sm:text-[15px]">Gallery</span>
        <h2 className="m-0 max-w-[720px] text-[32px] font-medium leading-[1.1] tracking-[-0.02em] [text-wrap:balance] sm:text-[44px] lg:text-[52px]">{content.heading}</h2>
        <p className="m-0 text-base leading-[1.55] text-[#4d5460] sm:text-[17px]">{content.subheading}</p>
        <div className="mt-2 grid w-full grid-cols-2 gap-2 sm:max-w-[480px] sm:gap-3">
          <div className="relative">
            <label htmlFor="gallery-filter" className="sr-only">Filter by event</label>
            <select id="gallery-filter" value={filter} onChange={(event) => setFilter(event.target.value)} className="h-[46px] w-full appearance-none rounded-full border-[1.5px] border-[#c9ced6] bg-white pl-3.5 pr-9 text-[13px] font-semibold text-[#0c0d10] outline-none focus:border-[#1460a1] sm:text-sm">
              <option value="all">All events</option>
              {events.map((event) => <option key={event.slug} value={event.slug}>{event.short_name}</option>)}
            </select>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4d5460" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
          </div>
          <label className="flex h-[46px] items-center gap-2 rounded-full border-[1.5px] border-[#c9ced6] bg-white px-3.5 focus-within:border-[#1460a1]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
            <span className="sr-only">Search gallery</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search" className="min-w-0 flex-1 border-0 bg-transparent text-[13px] font-medium outline-none sm:text-sm" />
          </label>
        </div>
      </div>
      {shown.length > 0 ? (
        isMobile
          ? <CurveReel items={shown} step={164} tileW={150} tileH={200} perspective={600} compact />
          : <CurveReel items={shown} step={292} tileW={268} tileH={340} perspective={1100} />
      ) : (
        <div className="mx-5 rounded-[20px] border-[1.5px] border-dashed border-[#c9ced6] p-10 text-center text-base font-medium text-[#4d5460] sm:mx-10 sm:p-14 lg:mx-[72px]">No photos or videos match. Try another event or search term.</div>
      )}
    </section>
  );
}
