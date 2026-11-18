'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { errorMessage, toast } from '../../lib/toast';
import { api } from './adminApi';
import { Field, PasswordInput, card, input } from './adminUi';
import { Badge, Modal, formatDate, primaryButton, secondaryButton } from './table';
import { PermissionPicker, hasPermission, permissionSummary, type AdminPermissions } from './adminPermissions';

type Profile = { id: number; name: string; email: string; phone: string | null; permissions: AdminPermissions; sessions: number; created_at: string | null };
type AdminUser = { id: number; name: string; email: string; permissions: AdminPermissions; created_at: string | null };
type PaystackSettings = { public_key: string; secret_key: string; secret_key_set: boolean };
type PushSettings = { public_key: string; subject: string; private_key_set: boolean; private_key: string; new_public_key: string };
type SettingsTab = 'profile' | 'password' | 'paystack' | 'push' | 'sessions' | 'team';

const PASSWORD_HINT = 'At least 10 characters with letters and numbers.';
const SETTINGS_TABS: { id: SettingsTab; label: string }[] = [
  { id: 'profile', label: 'Profile' },
  { id: 'password', label: 'Password' },
  { id: 'paystack', label: 'Paystack' },
  { id: 'push', label: 'Push notifications' },
  { id: 'sessions', label: 'Sessions' },
  { id: 'team', label: 'Admin team' },
];

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
  const [paystack, setPaystack] = useState<PaystackSettings | null>(null);
  const [push, setPush] = useState<PushSettings | null>(null);
  const [adding, setAdding] = useState(false);
  const [newAdmin, setNewAdmin] = useState<{ name: string; email: string; password: string; permissions: AdminPermissions }>({ name: '', email: '', password: '', permissions: [] });
  const [editingAccess, setEditingAccess] = useState<{ admin: AdminUser; permissions: AdminPermissions } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');

  const load = useCallback(async () => {
    try {
      const data = await api('/admin/account');
      setProfile(data.admin); setAdmins(data.admins);
      setDetails({ name: data.admin.name, email: data.admin.email, phone: data.admin.phone ?? '' });
    } catch (error) { toast.error(errorMessage(error, 'Could not load your account.')); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const isSuper = profile?.permissions === null;
  const canPaystack = profile ? hasPermission(profile.permissions, 'finance') : false;
  const tabs = SETTINGS_TABS.filter((tab) => (tab.id !== 'paystack' || canPaystack) && (tab.id !== 'team' || isSuper) && (tab.id !== 'push' || isSuper));

  const loadPaystack = useCallback(async () => {
    try {
      const data = await api('/admin/settings/paystack');
      setPaystack({ ...data.settings, secret_key: '' });
    } catch (error) { toast.error(errorMessage(error, 'Could not load Paystack settings.')); }
  }, []);
  useEffect(() => { if (canPaystack) void loadPaystack(); }, [canPaystack, loadPaystack]);

  const loadPush = useCallback(async () => {
    try {
      const data = await api('/admin/settings/push');
      setPush({ ...data.settings, private_key: '', new_public_key: '' });
    } catch (error) { toast.error(errorMessage(error, 'Could not load push settings.')); }
  }, []);
  useEffect(() => { if (isSuper) void loadPush(); }, [isSuper, loadPush]);

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

  const savePaystack = (event: FormEvent<HTMLFormElement>) => { event.preventDefault();
    void run('paystack', async () => {
      try {
        const data = await api('/admin/settings/paystack', { method: 'PUT', body: JSON.stringify({ public_key: paystack?.public_key || null, secret_key: paystack?.secret_key || null }) });
        setPaystack({ ...data.settings, secret_key: '' });
        toast.success(data.message);
      } catch (error) { toast.error(errorMessage(error, 'Could not save Paystack settings.')); }
    });
  };

  const savePush = (event: FormEvent<HTMLFormElement>) => { event.preventDefault();
    if (!push) return;
    if (Boolean(push.new_public_key) !== Boolean(push.private_key)) { toast.warning('Enter both the public and private key, or leave both blank.'); return; }
    void run('push', async () => {
      try {
        const data = await api('/admin/settings/push', { method: 'PUT', body: JSON.stringify({ subject: push.subject || null, public_key: push.new_public_key || null, private_key: push.private_key || null }) });
        setPush({ ...data.settings, private_key: '', new_public_key: '' });
        toast.success(data.message);
      } catch (error) { toast.error(errorMessage(error, 'Could not save push settings.')); }
    });
  };

  const regeneratePush = () => {
    if (!window.confirm('Create new push keys? Everyone who turned on push notifications will need to turn them on again.')) return;
    void run('push-regenerate', async () => {
      try {
        const data = await api('/admin/settings/push/regenerate', { method: 'POST' });
        setPush({ ...data.settings, private_key: '', new_public_key: '' });
        toast.success(data.message);
      } catch (error) { toast.error(errorMessage(error, 'Could not create new keys.')); }
    });
  };

  const signOutOthers = () => void run('sessions', async () => {
    try { const data = await api('/admin/account/sign-out-others', { method: 'POST' }); toast.success(data.message); await load(); } catch (error) { toast.error(errorMessage(error, 'Could not sign out other sessions.')); }
  });

  const addAdmin = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); void run('admin', async () => {
    if (newAdmin.permissions !== null && newAdmin.permissions.length === 0) { toast.warning('Choose at least one area, or give full access.'); return; }
    try { const data = await api('/admin/admins', { method: 'POST', body: JSON.stringify(newAdmin) }); toast.success(data.message); setNewAdmin({ name: '', email: '', password: '', permissions: [] }); setAdding(false); await load(); } catch (error) { toast.error(errorMessage(error, 'Could not add the admin.')); }
  }); };

  const saveAccess = () => {
    if (!editingAccess) return;
    if (editingAccess.permissions !== null && editingAccess.permissions.length === 0) { toast.warning('Choose at least one area, or give full access.'); return; }
    void run('access', async () => {
      try { const data = await api(`/admin/admins/${editingAccess.admin.id}`, { method: 'PATCH', body: JSON.stringify({ permissions: editingAccess.permissions }) }); toast.success(data.message); setEditingAccess(null); await load(); } catch (error) { toast.error(errorMessage(error, 'Could not update access.')); }
    });
  };

  const removeAdmin = (admin: AdminUser) => {
    if (!window.confirm(`Remove admin access for ${admin.name}? They will be signed out.`)) return;
    void run(`remove-${admin.id}`, async () => {
      try { const data = await api(`/admin/admins/${admin.id}`, { method: 'DELETE' }); toast.success(data.message); await load(); } catch (error) { toast.error(errorMessage(error, 'Could not remove admin access.')); }
    });
  };

  if (!profile) return <div className="h-64 animate-pulse rounded-[1.5rem] bg-white" />;

  return (
    <div className="grid gap-5">
      <div role="tablist" aria-label="Settings sections" className="no-scrollbar flex gap-1.5 overflow-x-auto rounded-2xl bg-white p-1.5 shadow-sm">
        {tabs.map((tab) => <button key={tab.id} type="button" role="tab" aria-selected={activeTab === tab.id} onClick={() => setActiveTab(tab.id)} className={activeTab === tab.id ? 'shrink-0 rounded-xl bg-[#03284a] px-4 py-2.5 text-sm font-bold text-white transition' : 'shrink-0 rounded-xl px-4 py-2.5 text-sm font-bold text-ink/55 transition hover:bg-[#f4f5f7] hover:text-ink'}>{tab.label}</button>)}
      </div>

      {activeTab === 'profile' && <Section title="Profile" description="Your name and the email you sign in with.">
        <form onSubmit={saveProfile} className="grid gap-4 sm:grid-cols-2">
          <Field title="Full name"><input required value={details.name} onChange={(event) => setDetails({ ...details, name: event.target.value })} className={input} /></Field>
          <Field title="Phone"><input value={details.phone} onChange={(event) => setDetails({ ...details, phone: event.target.value })} className={input} /></Field>
          <Field title="Email (sign-in)" className="sm:col-span-2"><input required type="email" value={details.email} onChange={(event) => setDetails({ ...details, email: event.target.value })} className={input} /></Field>
          <div className="sm:col-span-2"><button type="submit" disabled={busy === 'profile'} className={primaryButton}>{busy === 'profile' ? 'Saving…' : 'Save profile'}</button></div>
        </form>
      </Section>}

      {activeTab === 'password' && <Section title="Password" description={`${PASSWORD_HINT} Changing it signs you out everywhere.`}>
        <form onSubmit={savePassword} className="grid gap-4 sm:grid-cols-2">
          <Field title="Current password" className="sm:col-span-2"><PasswordInput required autoComplete="current-password" value={passwords.current_password} onChange={(event) => setPasswords({ ...passwords, current_password: event.target.value })} className={input} /></Field>
          <Field title="New password"><PasswordInput required minLength={10} autoComplete="new-password" value={passwords.password} onChange={(event) => setPasswords({ ...passwords, password: event.target.value })} className={input} /></Field>
          <Field title="Confirm new password"><PasswordInput required minLength={10} autoComplete="new-password" value={passwords.password_confirmation} onChange={(event) => setPasswords({ ...passwords, password_confirmation: event.target.value })} className={input} /></Field>
          <div className="sm:col-span-2"><button type="submit" disabled={busy === 'password'} className={primaryButton}>{busy === 'password' ? 'Changing…' : 'Change password'}</button></div>
        </form>
      </Section>}

      {activeTab === 'paystack' && canPaystack && <Section title="Paystack" description="Set the keys used by the backend to initialize and verify shop payments.">
        {paystack ? (
          <form onSubmit={savePaystack} className="grid gap-4 sm:grid-cols-2">
            <Field title="Public key"><input value={paystack.public_key} onChange={(event) => setPaystack({ ...paystack, public_key: event.target.value })} className={input} placeholder="pk_live_…" autoComplete="off" /></Field>
            <Field title="Secret key"><PasswordInput value={paystack.secret_key} onChange={(event) => setPaystack({ ...paystack, secret_key: event.target.value })} className={input} placeholder={paystack.secret_key_set ? 'Leave blank to keep the current key' : 'sk_live_…'} autoComplete="new-password" /></Field>
            <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-3">
              <p className="m-0 text-xs text-ink/50">{paystack.secret_key_set ? 'Secret key is configured and stored securely. It is never displayed.' : 'No secret key is configured yet.'}</p>
              <button type="submit" disabled={busy === 'paystack'} className={primaryButton}>{busy === 'paystack' ? 'Saving…' : 'Save Paystack keys'}</button>
            </div>
          </form>
        ) : <div className="h-24 animate-pulse rounded-xl bg-[#fafaf8]" />}
      </Section>}

      {activeTab === 'push' && isSuper && <Section title="Push notifications" description="Keys that let the site send notifications to phones and computers (standard Web Push, no Firebase). They were created automatically and are stored encrypted in the database.">
        {push ? (
          <form onSubmit={savePush} className="grid gap-4 sm:grid-cols-2">
            <Field title="Contact (sent to browser push services)" className="sm:col-span-2"><input value={push.subject} onChange={(event) => setPush({ ...push, subject: event.target.value })} className={input} placeholder="mailto:you@example.com" autoComplete="off" /></Field>
            <Field title="Current public key" className="sm:col-span-2"><input readOnly value={push.public_key} className={`${input} font-mono text-xs`} onFocus={(event) => event.target.select()} /></Field>
            <details className="sm:col-span-2 rounded-xl bg-[#fafaf8] p-4 text-sm">
              <summary className="cursor-pointer font-bold">Use your own keys (optional)</summary>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <Field title="Public key"><input value={push.new_public_key} onChange={(event) => setPush({ ...push, new_public_key: event.target.value })} className={`${input} font-mono text-xs`} autoComplete="off" /></Field>
                <Field title="Private key"><PasswordInput value={push.private_key} onChange={(event) => setPush({ ...push, private_key: event.target.value })} className={`${input} font-mono text-xs`} autoComplete="new-password" /></Field>
              </div>
              <p className="mb-0 mt-2 text-xs text-ink/50">Leave both blank to keep the current keys. Changing keys means everyone must turn push on again.</p>
            </details>
            <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-3">
              <button type="button" onClick={regeneratePush} disabled={busy === 'push-regenerate'} className={secondaryButton}>{busy === 'push-regenerate' ? 'Creating…' : 'Create new keys'}</button>
              <button type="submit" disabled={busy === 'push'} className={primaryButton}>{busy === 'push' ? 'Saving…' : 'Save push settings'}</button>
            </div>
          </form>
        ) : <div className="h-24 animate-pulse rounded-xl bg-[#fafaf8]" />}
      </Section>}

      {activeTab === 'sessions' && <Section title="Sessions" description="Devices currently signed in to admin with your account.">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#fafaf8] p-4">
          <span className="text-sm"><strong>{profile.sessions}</strong> active session{profile.sessions === 1 ? '' : 's'} (including this one)</span>
          <button type="button" onClick={signOutOthers} disabled={busy === 'sessions' || profile.sessions <= 1} className={secondaryButton}>{busy === 'sessions' ? 'Signing out…' : 'Sign out other sessions'}</button>
        </div>
      </Section>}

      {activeTab === 'team' && isSuper && <Section title="Admin team" description="People who can sign in to this admin dashboard, and which pages each one can use.">
        <ul className="m-0 grid list-none gap-2 p-0">
          {admins.map((admin) => (
            <li key={admin.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-[#fafaf8] p-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#03284a] text-xs font-bold text-white">{admin.name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()}</span>
              <span className="min-w-0 flex-1"><strong className="block truncate text-sm">{admin.name}{admin.id === profile.id && <span className="ml-2 text-xs font-normal text-ink/45">(you)</span>}</strong><span className="block truncate text-xs text-ink/50">{admin.email} · since {formatDate(admin.created_at)}</span><span className="mt-1 flex flex-wrap gap-1">{admin.permissions === null ? <Badge tone="navy">Full access</Badge> : <Badge tone="blue">{permissionSummary(admin.permissions)}</Badge>}</span></span>
              {admin.id !== profile.id && <span className="flex w-full justify-end gap-3 sm:w-auto"><button type="button" onClick={() => setEditingAccess({ admin, permissions: admin.permissions })} className="text-xs font-bold text-[#1469a9]">Edit access</button><button type="button" onClick={() => removeAdmin(admin)} disabled={busy === `remove-${admin.id}`} className="text-xs font-bold text-coral">Remove</button></span>}
            </li>
          ))}
        </ul>
        <button type="button" onClick={() => setAdding(true)} className={`${secondaryButton} mt-3`}>+ Add admin</button>
      </Section>}

      {adding && (
        <Modal title="Add an admin" subtitle="They can sign in at /admin with this email and password." onClose={() => setAdding(false)} footer={<><button type="button" onClick={() => setAdding(false)} className={secondaryButton}>Cancel</button><button type="submit" form="admin-form" disabled={busy === 'admin'} className={primaryButton}>{busy === 'admin' ? 'Adding…' : 'Add admin'}</button></>}>
          <form id="admin-form" onSubmit={addAdmin} className="grid gap-4">
            <Field title="Full name"><input required value={newAdmin.name} onChange={(event) => setNewAdmin({ ...newAdmin, name: event.target.value })} className={input} /></Field>
            <Field title="Email"><input required type="email" value={newAdmin.email} onChange={(event) => setNewAdmin({ ...newAdmin, email: event.target.value })} className={input} /></Field>
            <Field title="Temporary password"><PasswordInput required minLength={10} autoComplete="new-password" value={newAdmin.password} onChange={(event) => setNewAdmin({ ...newAdmin, password: event.target.value })} className={input} /><span className="text-xs text-ink/50">{PASSWORD_HINT} Ask them to change it in Settings.</span></Field>
            <PermissionPicker value={newAdmin.permissions} onChange={(permissions) => setNewAdmin({ ...newAdmin, permissions })} />
          </form>
        </Modal>
      )}

      {editingAccess && (
        <Modal title={`${editingAccess.admin.name}'s access`} subtitle="They see only the pages for the areas you tick." onClose={() => setEditingAccess(null)} footer={<><button type="button" onClick={() => setEditingAccess(null)} className={secondaryButton}>Cancel</button><button type="button" onClick={saveAccess} disabled={busy === 'access'} className={primaryButton}>{busy === 'access' ? 'Saving…' : 'Save access'}</button></>}>
          <PermissionPicker value={editingAccess.permissions} onChange={(permissions) => setEditingAccess({ ...editingAccess, permissions })} />
        </Modal>
      )}
    </div>
  );
}
