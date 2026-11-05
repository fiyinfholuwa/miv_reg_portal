'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { errorMessage, toast } from '../../lib/toast';
import { api } from './adminApi';
import { Field, card, input } from './adminUi';
import { Modal, formatDate, primaryButton, secondaryButton } from './table';

type Profile = { id: number; name: string; email: string; phone: string | null; sessions: number; created_at: string | null };
type AdminUser = { id: number; name: string; email: string; created_at: string | null };

const PASSWORD_HINT = 'At least 10 characters with letters and numbers.';

function Section({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className={`${card} grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]`}>
      <div><h2 className="text-base font-bold">{title}</h2><p className="mt-1 text-sm text-ink/55">{description}</p></div>
      <div>{children}</div>
    </section>
  );
}

/** The signed-in admin's profile, password, sessions and the admin team. */
export function SettingsView({ onProfileChange }: { onProfileChange?: (profile: Profile) => void }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [details, setDetails] = useState({ name: '', email: '', phone: '' });
  const [passwords, setPasswords] = useState({ current_password: '', password: '', password_confirmation: '' });
  const [showPasswords, setShowPasswords] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newAdmin, setNewAdmin] = useState({ name: '', email: '', password: '' });
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await api('/admin/account');
      setProfile(data.admin); setAdmins(data.admins);
      setDetails({ name: data.admin.name, email: data.admin.email, phone: data.admin.phone ?? '' });
    } catch (error) { toast.error(errorMessage(error, 'Could not load your account.')); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const run = async (key: string, action: () => Promise<void>) => { setBusy(key); try { await action(); } finally { setBusy(null); } };

  const saveProfile = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); void run('profile', async () => {
    try { const data = await api('/admin/account', { method: 'PUT', body: JSON.stringify({ ...details, phone: details.phone || null }) }); setProfile(data.admin); onProfileChange?.(data.admin); toast.success(data.message); } catch (error) { toast.error(errorMessage(error, 'Could not save your profile.')); }
  }); };

  const savePassword = (event: FormEvent<HTMLFormElement>) => { event.preventDefault();
    if (passwords.password !== passwords.password_confirmation) { toast.warning('The new passwords do not match.'); return; }
    void run('password', async () => {
      try { const data = await api('/admin/account/password', { method: 'PUT', body: JSON.stringify(passwords) }); setPasswords({ current_password: '', password: '', password_confirmation: '' }); toast.success(data.message); await load(); } catch (error) { toast.error(errorMessage(error, 'Could not change your password.')); }
    });
  };

  const signOutOthers = () => void run('sessions', async () => {
    try { const data = await api('/admin/account/sign-out-others', { method: 'POST' }); toast.success(data.message); await load(); } catch (error) { toast.error(errorMessage(error, 'Could not sign out other sessions.')); }
  });

  const addAdmin = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); void run('admin', async () => {
    try { const data = await api('/admin/admins', { method: 'POST', body: JSON.stringify(newAdmin) }); toast.success(data.message); setNewAdmin({ name: '', email: '', password: '' }); setAdding(false); await load(); } catch (error) { toast.error(errorMessage(error, 'Could not add the admin.')); }
  }); };

  const removeAdmin = (admin: AdminUser) => {
    if (!window.confirm(`Remove admin access for ${admin.name}? They will be signed out.`)) return;
    void run(`remove-${admin.id}`, async () => {
      try { const data = await api(`/admin/admins/${admin.id}`, { method: 'DELETE' }); toast.success(data.message); await load(); } catch (error) { toast.error(errorMessage(error, 'Could not remove admin access.')); }
    });
  };

  if (!profile) return <div className="h-64 animate-pulse rounded-[1.5rem] bg-white" />;
  const passwordType = showPasswords ? 'text' : 'password';

  return (
    <div className="grid gap-5">
      <Section title="Profile" description="Your name and the email you sign in with.">
        <form onSubmit={saveProfile} className="grid gap-4 sm:grid-cols-2">
          <Field title="Full name"><input required value={details.name} onChange={(event) => setDetails({ ...details, name: event.target.value })} className={input} /></Field>
          <Field title="Phone"><input value={details.phone} onChange={(event) => setDetails({ ...details, phone: event.target.value })} className={input} /></Field>
          <Field title="Email (sign-in)" className="sm:col-span-2"><input required type="email" value={details.email} onChange={(event) => setDetails({ ...details, email: event.target.value })} className={input} /></Field>
          <div className="sm:col-span-2"><button type="submit" disabled={busy === 'profile'} className={primaryButton}>{busy === 'profile' ? 'Saving…' : 'Save profile'}</button></div>
        </form>
      </Section>

      <Section title="Password" description={`${PASSWORD_HINT} Changing it signs you out everywhere else.`}>
        <form onSubmit={savePassword} className="grid gap-4 sm:grid-cols-2">
          <Field title="Current password" className="sm:col-span-2"><input required type={passwordType} autoComplete="current-password" value={passwords.current_password} onChange={(event) => setPasswords({ ...passwords, current_password: event.target.value })} className={input} /></Field>
          <Field title="New password"><input required minLength={10} type={passwordType} autoComplete="new-password" value={passwords.password} onChange={(event) => setPasswords({ ...passwords, password: event.target.value })} className={input} /></Field>
          <Field title="Confirm new password"><input required minLength={10} type={passwordType} autoComplete="new-password" value={passwords.password_confirmation} onChange={(event) => setPasswords({ ...passwords, password_confirmation: event.target.value })} className={input} /></Field>
          <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" checked={showPasswords} onChange={(event) => setShowPasswords(event.target.checked)} className="h-4 w-4" />Show passwords</label>
          <div className="sm:col-span-2"><button type="submit" disabled={busy === 'password'} className={primaryButton}>{busy === 'password' ? 'Changing…' : 'Change password'}</button></div>
        </form>
      </Section>

      <Section title="Sessions" description="Devices currently signed in to admin with your account.">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#fafaf8] p-4">
          <span className="text-sm"><strong>{profile.sessions}</strong> active session{profile.sessions === 1 ? '' : 's'} (including this one)</span>
          <button type="button" onClick={signOutOthers} disabled={busy === 'sessions' || profile.sessions <= 1} className={secondaryButton}>{busy === 'sessions' ? 'Signing out…' : 'Sign out other sessions'}</button>
        </div>
      </Section>

      <Section title="Admin team" description="People who can sign in to this admin dashboard.">
        <ul className="m-0 grid list-none gap-2 p-0">
          {admins.map((admin) => (
            <li key={admin.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-[#fafaf8] p-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#03284a] text-xs font-bold text-white">{admin.name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()}</span>
              <span className="min-w-0 flex-1"><strong className="block truncate text-sm">{admin.name}{admin.id === profile.id && <span className="ml-2 text-xs font-normal text-ink/45">(you)</span>}</strong><span className="block truncate text-xs text-ink/50">{admin.email} · since {formatDate(admin.created_at)}</span></span>
              {admin.id !== profile.id && <button type="button" onClick={() => removeAdmin(admin)} disabled={busy === `remove-${admin.id}`} className="text-xs font-bold text-coral">Remove access</button>}
            </li>
          ))}
        </ul>
        <button type="button" onClick={() => setAdding(true)} className={`${secondaryButton} mt-3`}>+ Add admin</button>
      </Section>

      {adding && (
        <Modal title="Add an admin" subtitle="They can sign in at /admin with this email and password." onClose={() => setAdding(false)} size="sm" footer={<><button type="button" onClick={() => setAdding(false)} className={secondaryButton}>Cancel</button><button type="submit" form="admin-form" disabled={busy === 'admin'} className={primaryButton}>{busy === 'admin' ? 'Adding…' : 'Add admin'}</button></>}>
          <form id="admin-form" onSubmit={addAdmin} className="grid gap-4">
            <Field title="Full name"><input required value={newAdmin.name} onChange={(event) => setNewAdmin({ ...newAdmin, name: event.target.value })} className={input} /></Field>
            <Field title="Email"><input required type="email" value={newAdmin.email} onChange={(event) => setNewAdmin({ ...newAdmin, email: event.target.value })} className={input} /></Field>
            <Field title="Temporary password"><input required minLength={10} type="text" value={newAdmin.password} onChange={(event) => setNewAdmin({ ...newAdmin, password: event.target.value })} className={input} /><span className="text-xs text-ink/50">{PASSWORD_HINT} Ask them to change it in Settings.</span></Field>
          </form>
        </Modal>
      )}
    </div>
  );
}
