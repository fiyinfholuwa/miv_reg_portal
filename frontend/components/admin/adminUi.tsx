'use client';

import { useRef, useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { errorMessage, toast } from '../../lib/toast';
import { uploadImage } from './adminApi';

export const input = 'w-full rounded-xl border border-ink/15 bg-white px-3.5 py-2.5 text-sm text-ink outline-none focus:border-[#1469a9]';
export const label = 'block text-xs font-bold uppercase tracking-[.08em] text-ink/50';
export const card = 'rounded-[1.25rem] border border-ink/10 bg-white p-4 sm:p-5';

export function Field({ title, children, className = '' }: { title: string; children: ReactNode; className?: string }) {
  return <label className={`grid gap-1.5 ${className}`}><span className={label}>{title}</span>{children}</label>;
}

export function SaveBar({ saving, onSave, note }: { saving: boolean; onSave: () => void; note?: string }) {
  return (
    <div className="sticky bottom-0 z-10 -mx-1 mt-6 flex items-center justify-between gap-3 rounded-2xl bg-[#03284a] px-4 py-3 text-white shadow-lg">
      <span className="text-xs text-[#9bc4e5]">{note ?? 'Changes show on delegates’ dashboards as soon as you save.'}</span>
      <button type="button" onClick={onSave} disabled={saving} className="shrink-0 rounded-full bg-white px-6 py-2.5 text-sm font-bold text-[#03284a] disabled:opacity-60">{saving ? 'Saving…' : 'Save changes'}</button>
    </div>
  );
}

/** Image preview with upload and paste-a-link options. */
export function ImageInput({ value, onChange, aspect = 'aspect-square' }: { value: string; onChange: (url: string) => void; aspect?: string }) {
  const file = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const upload = async (chosen?: File) => {
    if (!chosen) return;
    setUploading(true);
    try { onChange(await uploadImage(chosen)); toast.success('Image uploaded.'); } catch (error) { toast.error(errorMessage(error, 'Upload failed.')); } finally { setUploading(false); }
  };
  return (
    <div className="grid gap-2">
      <button type="button" onClick={() => file.current?.click()} className={`relative grid ${aspect} w-full place-items-center overflow-hidden rounded-xl border-2 border-dashed border-ink/15 bg-[#f6f2e9] text-xs font-bold text-ink/50 hover:border-[#1469a9]`}>
        {value ? <img src={value} alt="" className="absolute inset-0 h-full w-full object-cover" /> : <span>{uploading ? 'Uploading…' : '+ Upload image'}</span>}
        {value && <span className="absolute bottom-2 right-2 rounded-full bg-white/95 px-2.5 py-1 text-[11px] text-ink shadow">{uploading ? 'Uploading…' : 'Replace'}</span>}
      </button>
      <input ref={file} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => { void upload(event.target.files?.[0]); event.target.value = ''; }} />
      <input value={value} onChange={(event) => onChange(event.target.value)} className={`${input} text-xs`} placeholder="…or paste an image link" />
    </div>
  );
}


/** Password field with a show/hide (eye) toggle. Extra props go to the <input>. */
export function PasswordInput({ className = input, ...props }: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input {...props} type={visible ? 'text' : 'password'} className={`${className} pr-12`} />
      <button type="button" onClick={() => setVisible((value) => !value)} className="absolute inset-y-0 right-1 my-auto grid h-9 w-9 place-items-center rounded-full text-ink/45 transition hover:bg-ink/5 hover:text-ink" aria-label={visible ? 'Hide password' : 'Show password'} aria-pressed={visible} title={visible ? 'Hide password' : 'Show password'}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          {visible
            ? <><path d="M3 3l18 18" /><path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" /><path d="M9.9 5.1A9.8 9.8 0 0 1 12 5c5 0 9 4.5 10 7a12.4 12.4 0 0 1-3 4.2M6.1 6.1A12.5 12.5 0 0 0 2 12c1 2.5 5 7 10 7a9.9 9.9 0 0 0 4.9-1.3" /></>
            : <><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></>}
        </svg>
      </button>
    </div>
  );
}
