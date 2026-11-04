'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { apiUrl } from '../../lib/api';
import { openRegistration, useHasSession } from './hub-data';

const navLinks = [
  { label: 'Home', href: '/#top' },
  { label: 'About MIV', href: '/#about' },
  { label: 'Events', href: '/#events' },
  { label: 'Gallery', href: '/#gallery' },
  { label: 'Shop', href: '/shop' },
  { label: 'Partner', href: '/#partner' },
];

function MenuIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>;
}

function AccountLink({ className }: { className: string }) {
  const hasSession = useHasSession();
  if (hasSession) return <Link href="/dashboard" className={className}>My dashboard</Link>;
  return <button type="button" onClick={() => openRegistration({ mode: 'login' })} className={className}>Log in</button>;
}

/**
 * Hub navigation. `overlay` sits on top of the hero photo; `solid` is a dark
 * bar for inner pages.
 */
export function HubNav({ registerSlug, variant = 'overlay' }: { registerSlug: string; variant?: 'overlay' | 'solid' }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <div className={variant === 'solid' ? 'rounded-[26px] bg-[#001428] text-[#faf6ec] md:rounded-[28px]' : 'relative'}>
      <nav className="relative flex items-center justify-between px-[18px] py-[18px] lg:px-9 lg:py-[26px]" aria-label="Main">
        <Link href="/" className="flex items-center gap-3 text-[#faf6ec]">
          <img src="/images/miv-logo.png" alt="MIV" className="h-[38px] w-[38px] object-contain lg:h-11 lg:w-11" />
          <span className="hidden text-[17px] font-bold leading-[1.1] sm:block">The Men of<br />Issachar Vision</span>
        </Link>
        <div className="hidden items-center gap-8 text-[15px] font-medium text-[#dceaf5] lg:flex">
          {navLinks.map((link) => <Link key={link.label} href={link.href} className="transition hover:text-white">{link.label}</Link>)}
        </div>
        <div className="flex items-center gap-3">
          <AccountLink className="hidden text-[15px] font-semibold text-[#dceaf5] transition hover:text-white lg:inline" />
          <button type="button" onClick={() => openRegistration({ event: registerSlug })} className="hidden rounded-full bg-[#a82e26] px-[22px] py-3 text-sm font-bold text-white transition hover:bg-[#8c1f1c] sm:inline-flex">Register Now</button>
          <button type="button" onClick={() => setOpen(true)} className="grid h-[42px] w-[42px] place-items-center rounded-full bg-white/[.14] text-[#faf6ec] lg:hidden" aria-label="Open menu" aria-expanded={open}><MenuIcon /></button>
        </div>
      </nav>
      {open && (
        <div className="fixed inset-0 z-[90] bg-[#001428]/70 backdrop-blur-sm lg:hidden" onClick={() => setOpen(false)}>
          <div className="ml-auto flex h-full w-[min(100%,340px)] flex-col gap-2 bg-[#001428] p-6 text-[#faf6ec]" role="dialog" aria-modal="true" aria-label="Menu" onClick={(event) => event.stopPropagation()}>
            <header className="mb-6 flex items-center justify-between">
              <img src="/images/miv-logo.png" alt="MIV" className="h-10 w-10 object-contain" />
              <button type="button" onClick={() => setOpen(false)} className="grid h-[42px] w-[42px] place-items-center rounded-full bg-white/[.14] text-2xl leading-none" aria-label="Close menu">×</button>
            </header>
            {navLinks.map((link) => <Link key={link.label} href={link.href} onClick={() => setOpen(false)} className="border-b border-white/10 py-3 text-lg font-semibold">{link.label}</Link>)}
            <AccountLink className="border-b border-white/10 py-3 text-left text-lg font-semibold" />
            <button type="button" onClick={() => { setOpen(false); openRegistration({ event: registerSlug }); }} className="mt-6 rounded-full bg-[#a82e26] py-[15px] text-[15px] font-bold text-white">Register Now</button>
          </div>
        </div>
      )}
    </div>
  );
}

export function HubFooter() {
  return (
    <footer className="grid gap-10 border-t border-[#e4e7ec] px-5 py-12 sm:px-10 md:grid-cols-[2fr_1fr_2fr] md:gap-12 lg:px-[72px]">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3"><img src="/images/miv-logo.png" alt="MIV" className="h-12 w-12 object-contain" /><span className="text-[17px] font-bold leading-[1.15] text-[#0c0d10]">The Men of<br />Issachar Vision Inc.</span></div>
        <span className="text-sm text-[#4d5460]">© 2027 The Men of Issachar Vision Inc.</span>
      </div>
      <div className="flex flex-col gap-2.5 text-[15px] font-medium text-[#22262e]">
        <span className="text-sm font-bold text-[#0c0d10]">Explore</span>
        <Link href="/events" className="hover:text-[#a82e26]">Events</Link>
        <Link href="/#gallery" className="hover:text-[#a82e26]">Gallery</Link>
        <Link href="/shop" className="hover:text-[#a82e26]">Shop</Link>
        <Link href="/#partner" className="hover:text-[#a82e26]">Partner</Link>
      </div>
      <div className="flex flex-col gap-2.5 text-[15px] leading-normal text-[#22262e]">
        <span className="text-sm font-bold text-[#0c0d10]">Contact</span>
        <a href="mailto:mivmandate2010@gmail.com" className="break-all hover:text-[#a82e26]">mivmandate2010@gmail.com</a>
        <a href="tel:+2348080854818" className="hover:text-[#a82e26]">0808 085 4818</a>
        <span>Leadership and Missions Conference Centre Olororo, Ojoo Ibadan, Nigeria</span>
      </div>
    </footer>
  );
}

const partnerTypes = ['Prayer partner', 'Financial partner', 'Conference sponsor', 'Volunteer & media'];

export function PartnerModal({ close }: { close: () => void }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', organization: '', type: partnerTypes[1], message: '' });
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const update = (field: keyof typeof form, value: string) => setForm((current) => ({ ...current, [field]: value }));

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [close]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setStatus(null);
    try {
      const { type, message, ...rest } = form;
      const response = await fetch(apiUrl('/partner-inquiries'), {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...rest, message: `${type}: ${message}` }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'We could not send your enquiry.');
      setStatus({ ok: true, text: data.message || 'Thank you. The partnership team will contact you shortly.' });
      setForm({ name: '', email: '', phone: '', organization: '', type: partnerTypes[1], message: '' });
    } catch (error) {
      setStatus({ ok: false, text: error instanceof TypeError ? 'We could not reach the server. Please try again shortly.' : error instanceof Error ? error.message : 'We could not send your enquiry.' });
    } finally {
      setSaving(false);
    }
  };

  const field = 'mt-2 w-full rounded-xl border-[1.5px] border-[#c9ced6] bg-white px-4 py-3 text-base font-normal normal-case tracking-normal text-[#0c0d10] outline-none focus:border-[#1460a1]';
  const label = 'text-sm font-semibold text-[#22262e]';

  return (
    <div className="miv-hub fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-[#001428]/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="partner-title" onClick={close}>
      <form onSubmit={submit} onClick={(event) => event.stopPropagation()} className="relative w-full max-w-2xl rounded-[24px] bg-[#faf6ec] p-6 shadow-2xl sm:p-9">
        <button type="button" onClick={close} className="absolute right-5 top-5 grid h-10 w-10 place-items-center rounded-full border border-[#c9ced6] text-xl text-[#4d5460]" aria-label="Close partner form">×</button>
        <span className="text-[15px] font-semibold text-[#a82e26]">Partnership</span>
        <h2 id="partner-title" className="mt-2 pr-10 text-[32px] font-semibold leading-[1.05] tracking-[-0.02em] text-[#0c0d10] sm:text-[40px]">Partner with the vision</h2>
        <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-[#4d5460]">Tell us how you would like to stand with MIV and the partnership team will follow up.</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className={label}>Full name<input required value={form.name} onChange={(event) => update('name', event.target.value)} className={field} placeholder="Your name" /></label>
          <label className={label}>Phone / WhatsApp<input value={form.phone} onChange={(event) => update('phone', event.target.value)} className={field} placeholder="+234 …" /></label>
          <label className={label}>Email<input required type="email" value={form.email} onChange={(event) => update('email', event.target.value)} className={field} placeholder="you@example.com" /></label>
          <label className={label}>Partnership type<select value={form.type} onChange={(event) => update('type', event.target.value)} className={field}>{partnerTypes.map((type) => <option key={type}>{type}</option>)}</select></label>
          <label className={`${label} sm:col-span-2`}>Organization (optional)<input value={form.organization} onChange={(event) => update('organization', event.target.value)} className={field} /></label>
          <label className={`${label} sm:col-span-2`}>Message<textarea required value={form.message} onChange={(event) => update('message', event.target.value)} className={`${field} min-h-28`} placeholder="How would you like to partner?" /></label>
        </div>
        {status && <p className={`mt-5 rounded-xl px-4 py-3 text-sm font-semibold ${status.ok ? 'bg-[#dcefe2] text-[#2f7d4f]' : 'bg-[#f8e0dc] text-[#a82e26]'}`} role={status.ok ? 'status' : 'alert'}>{status.text}</p>}
        <div className="mt-6 flex justify-end">
          <button type="submit" disabled={saving} className="rounded-full bg-[#8c1f1c] px-7 py-4 text-[15px] font-bold text-white transition hover:bg-[#6f0000] disabled:opacity-60">{saving ? 'Sending…' : 'Send enquiry →'}</button>
        </div>
      </form>
    </div>
  );
}
