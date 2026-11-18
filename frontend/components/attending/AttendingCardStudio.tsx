'use client';

import { toast } from '../../lib/toast';
import { ChangeEvent, useEffect, useRef, useState } from 'react';
import { MivEvent, eventPageUrl, fetchPhotoUrl, publishCard, uploadPhoto } from '../../lib/events';
import { renderAttendingCard } from './attending-card';

type Props = {
  event: MivEvent;
  name: string;
  hasSavedPhoto: boolean;
  /** Compact layout for the registration modal. */
  compact?: boolean;
  onPhotoSaved?: () => void;
};

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

/**
 * Upload a photo, preview the "I will be attending" card for one event, and
 * share it. The preview is the exact PNG that gets shared or downloaded.
 */
export default function AttendingCardStudio({ event, name: initialName, hasSavedPhoto, compact = false, onPhotoSaved }: Props) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [name, setName] = useState(initialName);
  const [cardUrl, setCardUrl] = useState<string | null>(null);
  const [cardBlob, setCardBlob] = useState<Blob | null>(null);
  const [uploading, setUploading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const captionIntro = `I'll be at ${event.short_name}${event.date_label !== 'Date TBA' ? `, ${event.date_label}` : ''}.`;

  // Load a previously saved photo once.
  useEffect(() => {
    if (!hasSavedPhoto) return;
    let cancelled = false;
    void fetchPhotoUrl().then((url) => {
      if (cancelled) { if (url) URL.revokeObjectURL(url); return; }
      setPhotoUrl((current) => current ?? url);
    });
    return () => { cancelled = true; };
  }, [hasSavedPhoto]);

  // Re-render the card when inputs change (debounced for typing).
  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void renderAttendingCard({ name, eventTitle: event.title, dateLabel: event.date_label, startsAt: event.starts_at, location: event.location, eventUrl: eventPageUrl(event.slug), photoUrl })
        .then((blob) => {
          if (cancelled) return;
          setCardBlob(blob);
          setCardUrl((previous) => { if (previous) URL.revokeObjectURL(previous); return URL.createObjectURL(blob); });
        })
        .catch((renderError) => !cancelled && toast.error(renderError instanceof Error ? renderError.message : 'Could not draw the card.'));
    }, 250);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [name, photoUrl, event.slug, event.title, event.date_label, event.starts_at, event.location]);

  const choosePhoto = async (changeEvent: ChangeEvent<HTMLInputElement>) => {
    const file = changeEvent.target.files?.[0];
    changeEvent.target.value = '';
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) { toast.error('Choose a JPG, PNG or WebP photo.'); return; }
    if (file.size > MAX_PHOTO_BYTES) { toast.error('Your photo must be 5 MB or smaller.'); return; }

    setPhotoUrl(URL.createObjectURL(file));
    setUploading(true);
    toast.info('Saving your photo…', { id: 'attending-photo' });
    try {
      await uploadPhoto(file);
      toast.success('Photo saved. It will be used on all your event cards.', { id: 'attending-photo' });
      onPhotoSaved?.();
    } catch (uploadError) {
      toast.error(`${uploadError instanceof Error ? uploadError.message : 'Upload failed.'} Your card still works on this device.`, { id: 'attending-photo' });
    } finally {
      setUploading(false);
    }
  };

  const fileName = `${event.short_name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-attending-card.png`;

  const cardFile = () => cardBlob ? new File([cardBlob], fileName, { type: 'image/png' }) : null;

  /**
   * Upload the current card once and reuse the link until the card changes.
   * The link's preview is the card image, so it travels with every share.
   * Falls back to the plain event page if publishing fails.
   */
  const publishedFor = useRef<{ blob: Blob; url: string } | null>(null);
  const shareLink = async () => {
    if (!cardBlob) return eventPageUrl(event.slug);
    if (publishedFor.current?.blob === cardBlob) return publishedFor.current.url;
    try {
      const { share_url: url } = await publishCard(event.slug, cardBlob);
      publishedFor.current = { blob: cardBlob, url };
      return url;
    } catch (publishError) {
      toast.error(`${publishError instanceof Error ? publishError.message : 'Could not publish your card.'} Sharing the event link instead.`);
      return eventPageUrl(event.slug);
    }
  };
  const captionFor = (link: string) => `${captionIntro} Join me 👉 ${link}`;

  const download = () => {
    if (!cardUrl) return;
    const link = document.createElement('a');
    link.href = cardUrl;
    link.download = fileName;
    link.click();
    toast.success('Card downloaded.');
  };

  /** Phones: send the image file itself plus the caption. Returns false if unsupported. */
  const shareFile = async (link: string) => {
    const file = cardFile();
    if (!file || !navigator.share || (navigator.canShare && !navigator.canShare({ files: [file] }))) return false;
    try {
      await navigator.share({ title: `I will be attending ${event.short_name}`, text: captionFor(link), files: [file] });
    } catch (shareError) {
      if (!(shareError instanceof DOMException && shareError.name === 'AbortError')) return false;
    }
    return true;
  };

  const shareNative = async () => {
    setSharing(true);
    try {
      const link = await shareLink();
      if (await shareFile(link)) return;
      await copyText(captionFor(link), 'Card link copied. Paste it anywhere and the card shows as the preview.');
    } finally {
      setSharing(false);
    }
  };

  const copyText = async (text: string, message: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(message);
    } catch {
      toast.error('Copy is blocked in this browser.');
    }
  };

  const copyCaption = async () => {
    setSharing(true);
    try {
      await copyText(captionFor(await shareLink()), 'Caption and card link copied.');
    } finally {
      setSharing(false);
    }
  };

  // Open the window first (popup blockers allow it only during the click), then
  // point it at the network's share page once the card link is ready.
  const shareTo = async (build: (link: string) => string) => {
    const popup = window.open('', '_blank');
    setSharing(true);
    try {
      const target = build(await shareLink());
      if (popup) {
        popup.opener = null;
        popup.location.href = target;
      } else {
        window.location.href = target;
      }
    } finally {
      setSharing(false);
    }
  };

  const shareWhatsApp = async () => {
    // On phones send the actual image; elsewhere the link preview shows the card.
    if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
      setSharing(true);
      try {
        if (await shareFile(await shareLink())) return;
      } finally {
        setSharing(false);
      }
    }
    await shareTo((link) => `https://wa.me/?text=${encodeURIComponent(captionFor(link))}`);
  };

  const socials: { label: string; share: () => Promise<void> }[] = [
    { label: 'WhatsApp', share: shareWhatsApp },
    { label: 'Facebook', share: () => shareTo((link) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`) },
    { label: 'X', share: () => shareTo((link) => `https://twitter.com/intent/tweet?text=${encodeURIComponent(captionFor(link))}`) },
    { label: 'LinkedIn', share: () => shareTo((link) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(link)}`) },
  ];

  return (
    <div className={`grid gap-6 ${compact ? 'sm:grid-cols-[220px_minmax(0,1fr)]' : 'lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]'}`}>
      <div className={compact ? 'mx-auto w-full max-w-[220px]' : 'mx-auto w-full max-w-[420px]'}>
        <div className="aspect-[4/5] overflow-hidden rounded-2xl bg-[#e9ddc4] shadow-[0_14px_34px_rgba(0,32,63,.18)]">
          {cardUrl ? <img src={cardUrl} alt={`Your I will be attending card for ${event.title}`} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-sm text-[#4d5460]">Drawing your card…</div>}
        </div>
      </div>

      <div className="min-w-0">
        <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(changeEvent) => void choosePhoto(changeEvent)} aria-label="Upload your photo" />
        <button type="button" onClick={() => fileInput.current?.click()} disabled={uploading} className="flex w-full items-center gap-4 rounded-2xl border-2 border-dashed border-[#8db9dd] bg-[#eef5fb] p-4 text-left transition hover:border-[#1460a1] disabled:opacity-60">
          <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full bg-[#1460a1] text-xl text-white">{photoUrl ? <img src={photoUrl} alt="" className="h-full w-full object-cover" /> : '+'}</span>
          <span><strong className="block text-[#0c0d10]">{photoUrl ? 'Change your photo' : 'Upload your photo'}</strong><small className="block text-[#4d5460]">A clear, front-facing photo works best. JPG, PNG or WebP, up to 5 MB.</small></span>
        </button>

        {!compact && (
          <label className="mt-5 block max-w-md text-sm font-semibold text-[#22262e]">Name on card<input value={name} onChange={(changeEvent) => setName(changeEvent.target.value)} maxLength={60} className="mt-2 w-full rounded-xl border-[1.5px] border-[#c9ced6] bg-white px-4 py-3 outline-none focus:border-[#1460a1]" /></label>
        )}

        <div className="mt-5 flex flex-wrap gap-2">
          <button type="button" onClick={() => void shareNative()} disabled={!cardBlob || sharing} className="rounded-full bg-[#a82e26] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#8c1f1c] disabled:opacity-50">Share card</button>
          <button type="button" onClick={download} disabled={!cardUrl} className="rounded-full border-[1.5px] border-[#c9ced6] bg-white px-5 py-3 text-sm font-bold text-[#0c0d10] disabled:opacity-50">Download</button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2" aria-label="Share to social media">
          {socials.map((social) => <button key={social.label} type="button" onClick={() => void social.share()} disabled={!cardBlob || sharing} className="rounded-full bg-[#dceaf5] px-4 py-2 text-xs font-bold text-[#0c4c8a] hover:bg-[#bcd6ec] disabled:opacity-50">{social.label}</button>)}
          <button type="button" onClick={() => void copyCaption()} disabled={!cardBlob || sharing} className="rounded-full bg-[#f4eddc] px-4 py-2 text-xs font-bold text-[#22262e] disabled:opacity-50">Copy caption</button>
        </div>
        <p className="mt-3 text-xs text-[#6b7280]">{sharing ? 'Preparing your card link…' : 'Every share includes your card: on your phone the image itself is sent, and shared links show the card as their preview.'}</p>
      </div>
    </div>
  );
}
