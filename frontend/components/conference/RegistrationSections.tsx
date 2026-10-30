'use client';

import { FormEvent, useState } from 'react';
import { Arrow, Mark } from './ConferenceAtoms';
import RegistrationForm from './RegistrationForm';
import { apiUrl } from '../../lib/api';

export function RegistrationSection() {
  return <section id="register" className="bg-[#e7edf3] py-20 sm:py-24 lg:py-32"><div className="container-shell grid gap-10 lg:grid-cols-[.9fr_1.1fr] lg:items-center"><div><p className="eyebrow mb-5">Join Jan. Conf 2027</p><h2 className="section-title">Get your<br /><span className="text-coral">delegate pass.</span></h2><p className="mt-7 max-w-md text-base leading-7 text-ink/65 sm:text-lg sm:leading-8">Registration is free. Start with your email and we’ll recognize returning delegates automatically or help new delegates complete their pass.</p><div className="mt-8 space-y-3 text-sm font-semibold text-ink/70"><p>✓ One simple registration flow</p><p>✓ Attend onsite or online</p><p>✓ Update your details later</p></div></div><div className="rounded-[2rem] bg-ink p-5 text-white shadow-soft sm:p-8"><div className="mb-7"><p className="eyebrow text-[#ff7565]">Start here</p><h3 className="mt-2 font-display text-4xl uppercase">Enter your email</h3></div><RegistrationForm /></div></div></section>;
}

export function PartnershipSection() {
  const [open, setOpen] = useState(false);
  return <><section className="bg-coral py-16 text-white sm:py-20"><div className="container-shell flex flex-col gap-8 rounded-[2rem] border border-white/20 bg-white/5 p-7 sm:p-10 lg:flex-row lg:items-center lg:justify-between"><div><p className="eyebrow mb-4 text-white/70">Partner with us</p><h2 className="font-display text-4xl uppercase leading-[.86] sm:text-6xl">Want to<br />partner with us?</h2><p className="mt-5 max-w-xl text-base text-white/80">Support the conference and the work of The Men of Issachar Vision.</p></div><button type="button" className="button-light shrink-0" onClick={() => setOpen(true)}>Partner <Arrow /></button></div></section>{open && <PartnerModal close={() => setOpen(false)} />}</>;
}

function PartnerModal({ close }: { close: () => void }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', organization: '', message: '' });
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const update = (field: keyof typeof form, value: string) => setForm((current) => ({ ...current, [field]: value }));
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setStatus('');
    try {
      const response = await fetch(apiUrl('/partner-inquiries'), { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'We could not send your enquiry.');
      setStatus(data.message || 'Thanks. The partnership team will contact you.');
      setForm({ name: '', email: '', phone: '', organization: '', message: '' });
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'We could not send your enquiry.');
    } finally {
      setSaving(false);
    }
  };
  return <div className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-ink/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="partner-title"><form onSubmit={submit} className="relative w-full max-w-2xl rounded-[1.5rem] bg-cream p-6 text-ink shadow-2xl sm:p-9"><button type="button" onClick={close} className="absolute right-5 top-5 grid h-10 w-10 place-items-center rounded-full border border-ink/15 text-xl" aria-label="Close partner form">×</button><p className="eyebrow">Partner with us</p><h2 id="partner-title" className="mt-3 font-display text-5xl uppercase leading-none text-ink">Start a conversation.</h2><p className="mt-4 max-w-xl text-sm leading-6 text-ink/60">Tell us how you would like to support Jan. Conf 2027 and our team will follow up.</p><div className="mt-7 grid gap-4 sm:grid-cols-2"><label className="form-label">Name<input required value={form.name} onChange={(event) => update('name', event.target.value)} className="form-control" /></label><label className="form-label">Email<input required type="email" value={form.email} onChange={(event) => update('email', event.target.value)} className="form-control" /></label><label className="form-label">Phone<input value={form.phone} onChange={(event) => update('phone', event.target.value)} className="form-control" /></label><label className="form-label">Organization<input value={form.organization} onChange={(event) => update('organization', event.target.value)} className="form-control" /></label><label className="form-label sm:col-span-2">How would you like to partner?<textarea required value={form.message} onChange={(event) => update('message', event.target.value)} className="form-control min-h-32" /></label></div>{status && <p className="mt-5 rounded-lg bg-[#eaf3fb] px-4 py-3 text-sm font-semibold text-[#0b4779]" role="status">{status}</p>}<div className="mt-6 flex justify-end"><button type="submit" disabled={saving} className="button-primary disabled:opacity-60">{saving ? 'Sending…' : 'Send enquiry'} <Arrow /></button></div></form></div>;
}

export function FooterSection() {
  return <footer className="bg-ink py-12 text-white"><div className="container-shell grid gap-10 sm:grid-cols-3"><div><div className="flex items-center gap-3"><Mark /><span className="font-display text-xl uppercase leading-none">Jan Conf <span className="text-coral">2027</span></span></div><p className="mt-5 max-w-xs text-sm leading-6 text-sky/65">Understanding the times. Knowing what to do.</p></div><div><p className="eyebrow text-sky/70">Quick links</p><div className="mt-4 grid gap-3 text-sm font-semibold text-sky/75"><a href="#about" className="hover:text-white">About</a><a href="#speakers" className="hover:text-white">Speakers</a><a href="#schedule" className="hover:text-white">Schedule</a><a href="#register" className="hover:text-white">Register</a></div></div><div><p className="eyebrow text-sky/70">Contact</p><div className="mt-4 grid gap-3 text-sm leading-6 text-sky/75"><a href="mailto:mivmandate2010@gmail.com" className="hover:text-white">mivmandate2010@gmail.com</a><a href="tel:+2348080854818" className="hover:text-white">0808 085 4818</a><span>Leadership & Missions Conference Centre<br />Olororo, Ojoo, Ibadan, Nigeria</span></div></div></div><div className="container-shell mt-10 border-t border-white/10 pt-5 text-xs text-sky/50">© 2027 International Ministers & Leadership Conference.</div></footer>;
}
