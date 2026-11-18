'use client';

import { toast } from '../../lib/toast';
import { ChangeEvent, useCallback, useEffect, useRef, useState } from 'react';
import { MivEvent, cardShareUrl, eventPageUrl, fetchPhotoUrl, publishCard, uploadPhoto } from '../../lib/events';
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
   * The card is uploaded in the background as soon as it is drawn, so the
   * share link (on this website, never the API server) is ready before the
   * click. Phones need the share sheet opened straight from the tap, with no
   * network wait in between, or they refuse it.
   */
  const published = useRef<{ blob: Blob; link: Promise<string>; ready: string | null } | null>(null);
  const prepareLink = useCallback((blob: Blob) => {
    if (published.current?.blob === blob) return published.current.link;
    const entry: { blob: Blob; link: Promise<string>; ready: string | null } = { blob, ready: null, link: Promise.resolve('') };
    entry.link = publishCard(event.slug, blob)
      .then(({ code }) => { const link = cardShareUrl(event.slug, code); entry.ready = link; return link; })
      .catch(() => { published.current = null; return eventPageUrl(event.slug); });
    published.current = entry;
    return entry.link;
  }, [event.slug]);

  useEffect(() => {
    if (!cardBlob) return;
    const timer = window.setTimeout(() => void prepareLink(cardBlob), 1200);
    return () => window.clearTimeout(timer);
  }, [cardBlob, prepareLink]);

  /** The share link right now if ready (keeps the tap valid), otherwise wait for it. */
  const shareLink = async () => {
    if (!cardBlob) return eventPageUrl(event.slug);
    if (published.current?.blob === cardBlob && published.current.ready) return published.current.ready;
    return prepareLink(cardBlob);
  };
  const readyLink = () => (cardBlob && published.current?.blob === cardBlob ? published.current.ready : null);
  const captionFor = (link: string) => `${captionIntro} Join me 👉 ${link}`;

  const download = () => {
    if (!cardUrl) return;
    const link = document.createElement('a');
    link.href = cardUrl;
    link.download = fileName;
    link.click();
    toast.success('Card downloaded.');
  };

  const canShareFile = () => {
    const file = cardFile();
    return Boolean(file && typeof navigator.share === 'function' && (!navigator.canShare || navigator.canShare({ files: [file] })));
  };

  /** Opens the phone's share sheet with the card image and the caption + link. */
  const shareFile = async (link: string) => {
    const file = cardFile();
    if (!file) return false;
    try {
      await navigator.share({ title: `I will be attending ${event.short_name}`, text: captionFor(link), files: [file] });
    } catch (shareError) {
      if (!(shareError instanceof DOMException && shareError.name === 'AbortError')) return false;
    }
    return true;
  };

  const copyText = async (text: string, message: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(message);
    } catch {
      toast.error('Copy is blocked in this browser.');
    }
  };

  /** Desktop: put the card image on the clipboard so it can be pasted into the post. */
  const copyImage = async () => {
    if (!cardBlob || typeof ClipboardItem === 'undefined' || !navigator.clipboard?.write) return false;
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': cardBlob })]);
      return true;
    } catch {
      return false;
    }
  };

  const withSharing = async (action: () => Promise<void>) => {
    setSharing(true);
    try { await action(); } finally { setSharing(false); }
  };

  /** "Share card": image + link through the share sheet, or copy the link. */
  const shareNative = () => withSharing(async () => {
    if (canShareFile()) {
      if (await shareFile(readyLink() ?? await shareLink())) return;
    }
    await copyText(captionFor(await shareLink()), 'Card link copied. Paste it anywhere and your card shows as the preview.');
  });

  const copyCaption = () => withSharing(async () => {
    await copyText(captionFor(await shareLink()), 'Caption and card link copied.');
  });

  /**
   * A specific network. Phones: the share sheet with the image and link (pick
   * the app). Computers: open the network's share page with the link (its
   * preview is the card) and copy the image so it can be pasted in as well.
   */
  const shareTo = (network: string, build: (link: string) => string) => withSharing(async () => {
    if (canShareFile()) {
      if (await shareFile(readyLink() ?? await shareLink())) return;
    }
    const popup = window.open('', '_blank');
    const link = await shareLink();
    const target = build(link);
    if (popup) {
      popup.opener = null;
      popup.location.href = target;
    } else {
      window.location.href = target;
    }
    if (await copyImage()) toast.info(`Your card image is copied too. Paste it into the ${network} post if you want the picture attached as well as the link preview.`);
  });

  const socials: { label: string; share: () => Promise<void> }[] = [
    { label: 'WhatsApp', share: () => shareTo('WhatsApp', (link) => `https://wa.me/?text=${encodeURIComponent(captionFor(link))}`) },
    { label: 'Facebook', share: () => shareTo('Facebook', (link) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}&quote=${encodeURIComponent(captionIntro)}`) },
    { label: 'LinkedIn', share: () => shareTo('LinkedIn', (link) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(link)}`) },
    { label: 'X', share: () => shareTo('X', (link) => `https://twitter.com/intent/tweet?text=${encodeURIComponent(captionFor(link))}`) },
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
        <p className="mt-3 text-xs text-[#6b7280]">{sharing ? 'Preparing your card…' : 'Every share sends your card and your link. On a phone the image itself is attached; on a computer the link shows your card as its preview.'}</p>
      </div>
    </div>
  );
}
