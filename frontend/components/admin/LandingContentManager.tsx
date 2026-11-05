'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { defaultSiteContent, loadSiteContent, type GalleryItem, type SiteContent, type SiteSection } from '../../lib/site-content';
import { errorMessage, toast } from '../../lib/toast';
import { api } from './adminApi';
import { Field, ImageInput, SaveBar, card, input } from './adminUi';

const SECTIONS: { key: SiteSection; label: string; hint: string }[] = [
  { key: 'hero', label: 'Hero', hint: 'The first screen: headline, photo and buttons. The “Next event” cards update automatically from your events.' },
  { key: 'about', label: 'About', hint: 'Who MIV is, with two photos and a link.' },
  { key: 'stats', label: 'Stats', hint: 'The dark band of big numbers. Up to 6.' },
  { key: 'events', label: 'Events heading', hint: 'Heading above the featured events. Choose which events are featured on the Events page.' },
  { key: 'hosts', label: 'Leadership', hint: 'The President & Vice-President section.' },
  { key: 'gallery', label: 'Gallery', hint: 'Photos and videos in the curved reel. Link a tile to a video to make it playable.' },
  { key: 'shop', label: 'Shop heading', hint: 'Heading above the products. Products themselves are managed under Shop products.' },
  { key: 'partner', label: 'Partner', hint: 'The partnership band and the options in the partner form.' },
  { key: 'contact', label: 'Contact & footer', hint: 'Shown in the footer on every public page.' },
];

const textarea = `${input} min-h-24`;

/** Text list editor used for paragraphs and partner types. */
function ListEditor({ items, onChange, placeholder, multiline = false, max }: { items: string[]; onChange: (items: string[]) => void; placeholder: string; multiline?: boolean; max: number }) {
  return (
    <div className="grid gap-2">
      {items.map((item, index) => (
        <div key={index} className="flex items-start gap-2">
          {multiline
            ? <textarea value={item} onChange={(event) => onChange(items.map((value, position) => position === index ? event.target.value : value))} className={textarea} placeholder={placeholder} />
            : <input value={item} onChange={(event) => onChange(items.map((value, position) => position === index ? event.target.value : value))} className={input} placeholder={placeholder} />}
          <button type="button" onClick={() => onChange(items.filter((_, position) => position !== index))} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#fff0ee] text-lg text-coral" aria-label="Remove">×</button>
        </div>
      ))}
      {items.length < max && <button type="button" onClick={() => onChange([...items, ''])} className="justify-self-start rounded-full border border-ink/15 px-4 py-2 text-xs font-bold text-[#0b4779]">+ Add</button>}
    </div>
  );
}

function Grid({ children }: { children: ReactNode }) {
  return <div className={`${card} grid gap-4 md:grid-cols-2`}>{children}</div>;
}

export default function LandingContentManager() {
  const [content, setContent] = useState<SiteContent>(defaultSiteContent);
  const [section, setSection] = useState<SiteSection>('hero');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [events, setEvents] = useState<{ slug: string; short_name: string }[]>([]);

  useEffect(() => {
    void loadSiteContent(true).then(setContent).finally(() => setLoading(false));
    void api('/admin/events').then((data) => setEvents(data.events)).catch(() => undefined);
  }, []);

  // Typed helpers to edit the current section.
  const value = content[section] as Record<string, unknown>;
  const set = (field: string, next: unknown) => setContent((current) => ({ ...current, [section]: { ...current[section], [field]: next } }));
  const text = (field: string) => (value[field] as string | null | undefined) ?? '';
  const textInput = (field: string, title: string, placeholder = '', wide = false) => <Field title={title} className={wide ? 'md:col-span-2' : ''}><input value={text(field)} onChange={(event) => set(field, event.target.value)} className={input} placeholder={placeholder} /></Field>;
  const textArea = (field: string, title: string, wide = true) => <Field title={title} className={wide ? 'md:col-span-2' : ''}><textarea value={text(field)} onChange={(event) => set(field, event.target.value)} className={textarea} /></Field>;
  const image = (field: string, title: string, aspect = 'aspect-video') => <Field title={title}><ImageInput value={text(field)} onChange={(url) => set(field, url)} aspect={aspect} /></Field>;

  const save = async () => {
    setSaving(true);
    try {
      // Drop blank list entries (empty paragraphs, partner types) before saving.
      const payload = Object.fromEntries(Object.entries(content[section]).map(([key, item]) => [key, Array.isArray(item) && item.every((entry) => typeof entry === 'string') ? (item as string[]).map((entry) => entry.trim()).filter(Boolean) : item]));
      await api(`/admin/site-content/${section}`, { method: 'PUT', body: JSON.stringify(payload) });
      void loadSiteContent(true);
      toast.success(`${SECTIONS.find((item) => item.key === section)?.label} updated on the website.`);
    } catch (error) { toast.error(errorMessage(error, 'Could not save this section.')); } finally { setSaving(false); }
  };

  const reset = () => {
    setContent((current) => ({ ...current, [section]: defaultSiteContent[section] }));
    toast.info('Restored the original content. Save to publish it.');
  };

  if (loading) return <div className="h-64 animate-pulse rounded-[1.5rem] bg-white" />;
  const meta = SECTIONS.find((item) => item.key === section)!;

  return (
    <div className="grid gap-5 xl:grid-cols-[220px_minmax(0,1fr)]">
      <nav className="no-scrollbar flex gap-1.5 overflow-x-auto xl:flex-col xl:overflow-visible" aria-label="Landing page sections">
        {SECTIONS.map((item) => <button key={item.key} type="button" onClick={() => setSection(item.key)} aria-current={section === item.key ? 'page' : undefined} className={`shrink-0 rounded-xl px-4 py-2.5 text-left text-sm font-bold transition ${section === item.key ? 'bg-[#03284a] text-white' : 'bg-white text-ink/70 ring-1 ring-ink/10 hover:text-ink'}`}>{item.label}</button>)}
        <a href="/" target="_blank" rel="noreferrer" className="shrink-0 rounded-xl px-4 py-2.5 text-sm font-bold text-[#1469a9]">View website ↗</a>
      </nav>

      <div className="grid content-start gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <p className="max-w-2xl text-sm text-ink/60">{meta.hint}</p>
          <button type="button" onClick={reset} className="rounded-full border border-ink/15 px-4 py-2 text-xs font-bold text-ink/60">Restore original</button>
        </div>

        {section === 'hero' && <Grid>
          {textInput('title', 'Headline', '', true)}
          {textInput('eyebrow', 'Small line above headline', '', true)}
          {textArea('subtitle', 'Intro text (desktop)')}
          {textInput('primary_label', 'Main button')}
          {textInput('secondary_label', 'Second button')}
          {image('image', 'Background photo (desktop)')}
          {image('image_mobile', 'Background photo (phones)', 'aspect-[3/4]')}
        </Grid>}

        {section === 'about' && <Grid>
          {textInput('eyebrow', 'Label')}
          <div />
          {textArea('lead', 'Opening sentence (dark text)')}
          {textArea('body', 'Continuation (grey text)')}
          {image('image_1', 'Photo 1')}
          {image('image_2', 'Photo 2')}
          {textInput('link_label', 'Button text')}
          {textInput('link_url', 'Button link', 'https://… or /events')}
        </Grid>}

        {section === 'stats' && <div className="grid gap-4">
          <Grid>{textInput('heading', 'Heading', '', true)}{textArea('subheading', 'Text beside the heading')}</Grid>
          <div className={`${card} grid gap-2`}>
            {content.stats.items.map((item, index) => (
              <div key={index} className="grid grid-cols-[120px_minmax(0,1fr)_auto] gap-2">
                <input value={item.value} onChange={(event) => set('items', content.stats.items.map((stat, position) => position === index ? { ...stat, value: event.target.value } : stat))} className={`${input} font-bold`} placeholder="37th" aria-label="Number" />
                <input value={item.label} onChange={(event) => set('items', content.stats.items.map((stat, position) => position === index ? { ...stat, label: event.target.value } : stat))} className={input} placeholder="What it means" aria-label="Label" />
                <button type="button" onClick={() => set('items', content.stats.items.filter((_, position) => position !== index))} className="grid h-10 w-10 place-items-center rounded-full bg-[#fff0ee] text-lg text-coral" aria-label="Remove stat">×</button>
              </div>
            ))}
            {content.stats.items.length < 6 && <button type="button" onClick={() => set('items', [...content.stats.items, { value: '', label: '' }])} className="justify-self-start rounded-full border border-ink/15 px-4 py-2 text-xs font-bold text-[#0b4779]">+ Add stat</button>}
          </div>
        </div>}

        {section === 'events' && <Grid>{textInput('eyebrow', 'Label')}{textInput('heading', 'Heading')}{textArea('subheading', 'Text beside the heading')}</Grid>}

        {section === 'hosts' && <div className="grid gap-4">
          <Grid>
            {textInput('name', 'Name(s)', '', true)}
            {textInput('eyebrow', 'Title / role', '', true)}
            {image('image', 'Photo', 'aspect-[4/5]')}
            <div className="grid content-start gap-4">{textInput('link_label', 'Button text')}{textInput('link_url', 'Button link', 'https://…')}</div>
          </Grid>
          <div className={card}><span className="mb-2 block text-xs font-bold uppercase tracking-[.08em] text-ink/50">Biography paragraphs</span><ListEditor items={content.hosts.paragraphs} onChange={(items) => set('paragraphs', items)} placeholder="Paragraph" multiline max={5} /></div>
        </div>}

        {section === 'gallery' && <div className="grid gap-4">
          <Grid>{textInput('heading', 'Heading', '', true)}{textArea('subheading', 'Text under heading')}</Grid>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {content.gallery.items.map((item, index) => {
              const update = (patch: Partial<GalleryItem>) => set('items', content.gallery.items.map((tile, position) => position === index ? { ...tile, ...patch } : tile));
              return (
                <div key={index} className={`${card} grid gap-2.5`}>
                  <ImageInput value={item.image} onChange={(url) => update({ image: url })} aspect="aspect-[4/5]" />
                  <input value={item.caption} onChange={(event) => update({ caption: event.target.value })} className={input} placeholder="Caption" />
                  <select value={item.event ?? ''} onChange={(event) => update({ event: event.target.value || null })} className={input} aria-label="Event"><option value="">No event</option>{events.map((event) => <option key={event.slug} value={event.slug}>{event.short_name}</option>)}</select>
                  <input value={item.video_url ?? ''} onChange={(event) => update({ video_url: event.target.value || null })} className={input} placeholder="Video link (optional)" />
                  {item.video_url && <input value={item.duration ?? ''} onChange={(event) => update({ duration: event.target.value || null })} className={input} placeholder="Length, e.g. 1:48" />}
                  <div className="flex gap-2">
                    <button type="button" disabled={index === 0} onClick={() => { const items = [...content.gallery.items]; [items[index - 1], items[index]] = [items[index], items[index - 1]]; set('items', items); }} className="flex-1 rounded-full border border-ink/15 py-2 text-xs font-bold disabled:opacity-30" aria-label="Move earlier">←</button>
                    <button type="button" disabled={index === content.gallery.items.length - 1} onClick={() => { const items = [...content.gallery.items]; [items[index + 1], items[index]] = [items[index], items[index + 1]]; set('items', items); }} className="flex-1 rounded-full border border-ink/15 py-2 text-xs font-bold disabled:opacity-30" aria-label="Move later">→</button>
                    <button type="button" onClick={() => set('items', content.gallery.items.filter((_, position) => position !== index))} className="flex-1 rounded-full bg-[#fff0ee] py-2 text-xs font-bold text-coral">Remove</button>
                  </div>
                </div>
              );
            })}
            <button type="button" onClick={() => set('items', [...content.gallery.items, { image: '', caption: '', event: null, video_url: null, duration: null }])} className="grid min-h-[220px] place-items-center rounded-[1.25rem] border-2 border-dashed border-ink/15 text-sm font-bold text-[#0b4779] hover:border-[#1469a9]">+ Add photo or video</button>
          </div>
        </div>}

        {section === 'shop' && <Grid>{textInput('eyebrow', 'Label')}{textInput('heading', 'Heading')}</Grid>}

        {section === 'partner' && <div className="grid gap-4">
          <Grid>{textInput('heading', 'Heading', '', true)}{textArea('body', 'Text')}{textInput('button_label', 'Button text')}<div />{image('image', 'Photo')}</Grid>
          <div className={card}><span className="mb-2 block text-xs font-bold uppercase tracking-[.08em] text-ink/50">Partnership types in the form</span><ListEditor items={content.partner.types} onChange={(items) => set('types', items)} placeholder="e.g. Prayer partner" max={10} /></div>
        </div>}

        {section === 'contact' && <Grid>{textInput('email', 'Email')}{textInput('phone', 'Phone')}{textArea('address', 'Address')}{textInput('copyright', 'Copyright line', '', true)}</Grid>}

        <SaveBar saving={saving} onSave={() => void save()} note="Saving publishes this section on the website immediately." />
      </div>
    </div>
  );
}
