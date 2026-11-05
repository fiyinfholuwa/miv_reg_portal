'use client';

import { toast } from '../../lib/toast';
import { ChangeEvent, useEffect, useRef, useState } from 'react';
import { MivEvent, eventPageUrl, fetchPhotoUrl, uploadPhoto } from '../../lib/events';
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
  const fileInput = useRef<HTMLInputElement>(null);
  const caption = `I'll be at ${event.short_name}${event.date_label !== 'Date TBA' ? `, ${event.date_label}` : ''}. Join me 👉 ${eventPageUrl(event.slug)}`;

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
      void renderAttendingCard({ name, eventTitle: event.title, dateLabel: event.date_label, location: event.location, photoUrl })
        .then((blob) => {
          if (cancelled) return;
          setCardBlob(blob);
          setCardUrl((previous) => { if (previous) URL.revokeObjectURL(previous); return URL.createObjectURL(blob); });
        })
        .catch((renderError) => !cancelled && toast.error(renderError instanceof Error ? renderError.message : 'Could not draw the card.'));
    }, 250);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [name, photoUrl, event.title, event.date_label, event.location]);

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

  const download = () => {
    if (!cardUrl) return;
    const link = document.createElement('a');
    link.href = cardUrl;
    link.download = fileName;
    link.click();
    toast.success('Card downloaded. Attach it to your post or status.');
  };

  const shareNative = async () => {
    if (!cardBlob) return;
    const file = new File([cardBlob], fileName, { type: 'image/png' });
    if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
      try {
        await navigator.share({ title: `I will be attending ${event.short_name}`, text: caption, files: [file] });
        return;
      } catch (shareError) {
        if (shareError instanceof DOMException && shareError.name === 'AbortError') return;
      }
    }
    download();
  };

  const copyCaption = async () => {
    try {
      await navigator.clipboard.writeText(caption);
      toast.success('Caption copied.');
    } catch {
      toast.error('Copy is blocked in this browser. Select the caption text instead.');
    }
  };

  // Social links can't carry an image, so download it alongside opening the share page.
  const openSocial = (url: string) => {
    download();
    window.open(url, '_blank', 'noopener,noreferrer');
  };
  const encodedCaption = encodeURIComponent(caption);
  const encodedUrl = encodeURIComponent(eventPageUrl(event.slug));
  const socials = [
    { label: 'WhatsApp', url: `https://wa.me/?text=${encodedCaption}` },
    { label: 'Facebook', url: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}` },
    { label: 'X', url: `https://twitter.com/intent/tweet?text=${encodedCaption}` },
    { label: 'LinkedIn', url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}` },
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
          <button type="button" onClick={() => void shareNative()} disabled={!cardBlob} className="rounded-full bg-[#a82e26] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#8c1f1c] disabled:opacity-50">Share card</button>
          <button type="button" onClick={download} disabled={!cardUrl} className="rounded-full border-[1.5px] border-[#c9ced6] bg-white px-5 py-3 text-sm font-bold text-[#0c0d10] disabled:opacity-50">Download</button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2" aria-label="Share to social media">
          {socials.map((social) => <button key={social.label} type="button" onClick={() => openSocial(social.url)} disabled={!cardUrl} className="rounded-full bg-[#dceaf5] px-4 py-2 text-xs font-bold text-[#0c4c8a] hover:bg-[#bcd6ec] disabled:opacity-50">{social.label}</button>)}
          <button type="button" onClick={() => void copyCaption()} className="rounded-full bg-[#f4eddc] px-4 py-2 text-xs font-bold text-[#22262e]">Copy caption</button>
        </div>
        <p className="mt-3 text-xs text-[#6b7280]">On your phone, “Share card” sends the image straight to WhatsApp, Instagram and more. On a computer the card downloads so you can attach it.</p>
              </div>
    </div>
  );
}
