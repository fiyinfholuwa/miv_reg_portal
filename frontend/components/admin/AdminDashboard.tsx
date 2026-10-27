'use client';

import { useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:8000/api';

const navigation = [
  { label: 'Overview', icon: '⌂' },
  { label: 'Registrants', icon: '◌' },
  { label: 'Approvals', icon: '✓', badge: '18' },
  { label: 'Teams', icon: '♧' },
  { label: 'Broadcasts', icon: '◉' },
  { label: 'Testimonies', icon: '✦', badge: '7' },
  { label: 'Publicity kit', icon: '▣' },
  { label: 'Store orders', icon: '□' },
  { label: 'Check-in & meals', icon: '⌁' },
  { label: 'Settings', icon: '⚙' },
];

const registrations = [38, 46, 42, 57, 71, 52, 44, 62, 79, 91, 84, 97, 122, 148];

const capacityBreakdown = [
  { label: 'Delegates', value: '3,804', color: 'bg-[#1469a9]' },
  { label: 'Ministers', value: '612', color: 'bg-[#9bc4e5]' },
  { label: 'International', value: '238', color: 'bg-[#b52e28]' },
  { label: 'IYLC (16–45)', value: '1,410', color: 'bg-[#d75549]' },
  { label: 'VIP · Speaker · Vendor · Media', value: '64', color: 'bg-[#a3aab5]' },
];

function BrandMark() {
  return <span className="grid h-10 w-10 place-items-center rounded-full border border-[#9bc4e5]/40 bg-[#0a3557] text-xs font-bold text-[#dbe9f8]">M</span>;
}

function NavContent({ active, onSelect }: { active: string; onSelect: (label: string) => void }) {
  return <nav className="grid gap-1" aria-label="Admin navigation">{navigation.map((item) => <button key={item.label} type="button" onClick={() => onSelect(item.label)} className={`group flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-bold transition ${active === item.label ? 'bg-[#304457] text-[#fffaf0]' : 'text-[#b9cee1] hover:bg-white/10 hover:text-white'}`}><span className={`grid h-6 w-6 place-items-center text-base ${active === item.label ? 'text-white' : 'text-[#87a7c2]'}`}>{item.icon}</span><span className="flex-1">{item.label}</span>{item.badge && <span className="grid min-w-8 place-items-center rounded-full bg-[#c9362e] px-2 py-1 text-[11px] font-bold text-white">{item.badge}</span>}</button>)}</nav>;
}

export default function AdminDashboard() {
  const [active, setActive] = useState('Overview');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [broadcastOpen, setBroadcastOpen] = useState(false);

  const logout = async () => {
    const token = window.localStorage.getItem('jan-conf-session');
    if (token) {
      await fetch(`${API_URL}/auth/logout`, { method: 'POST', headers: { Accept: 'application/json', Authorization: `Bearer ${token}` } }).catch(() => undefined);
    }
    window.localStorage.removeItem('jan-conf-session');
    window.location.assign('/');
  };

  const selectNav = (label: string) => {
    setActive(label);
    setMobileNavOpen(false);
  };

  return (
    <main className="min-h-screen bg-cream text-ink">
      <div className="flex min-h-screen w-full overflow-hidden bg-cream">
        <aside className="hidden min-h-screen w-[295px] shrink-0 bg-[#001a2d] p-5 text-white lg:flex lg:flex-col">
          <div className="flex items-center gap-3 px-3 py-3"><BrandMark /><div><p className="font-display text-xl uppercase leading-none tracking-wide">Jan. Conf 2027</p><p className="mt-1 text-xs font-semibold text-[#9bc4e5]">Admin</p></div></div>
          <div className="mt-8"><NavContent active={active} onSelect={selectNav} /></div>
          <button type="button" onClick={logout} className="mt-auto flex items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-bold text-[#b9cee1] transition hover:bg-white/10 hover:text-white"><span className="grid h-6 w-6 place-items-center text-base">↪</span>Log out</button>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="flex items-center justify-between border-b border-ink/10 bg-cream px-5 py-4 lg:hidden">
            <div className="flex items-center gap-3"><BrandMark /><div><p className="font-display text-lg uppercase leading-none">Jan. Conf 2027</p><p className="text-[10px] font-semibold text-ink/50">Admin dashboard</p></div></div>
            <button type="button" className="grid h-11 w-11 place-items-center rounded-xl bg-ink text-xl text-white" aria-label="Open admin navigation" aria-expanded={mobileNavOpen} onClick={() => setMobileNavOpen((open) => !open)}>{mobileNavOpen ? '×' : '☰'}</button>
          </header>

          {mobileNavOpen && <div className="border-b border-ink/10 bg-[#001a2d] p-4 lg:hidden"><NavContent active={active} onSelect={selectNav} /><button type="button" onClick={logout} className="mt-3 flex w-full items-center gap-3 rounded-xl border-t border-white/10 px-4 pt-4 text-left text-sm font-bold text-[#b9cee1]"><span className="grid h-6 w-6 place-items-center text-base">↪</span>Log out</button></div>}

          <div className="border-b border-ink/10 bg-[#e8edf3] px-5 py-2 text-xs font-medium text-ink/50 sm:px-8"><span className="mr-2 rounded bg-ink/10 px-2 py-1 text-[10px] font-bold text-ink/60">15a</span> Overview · Approvals · Broadcast · Testimonies — switch with the sidebar</div>

          <section className="p-5 sm:p-8 lg:p-10">
            <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-semibold text-ink/50">84 days to opening</p><h1 className="mt-1 font-display text-6xl uppercase leading-[.82] tracking-tight sm:text-7xl">{active}</h1></div><div className="flex gap-3"><button type="button" className="rounded-full border-2 border-ink/15 bg-white px-5 py-3 text-sm font-bold text-ink transition hover:border-ink/40">Export</button><button type="button" onClick={() => setBroadcastOpen(true)} className="rounded-full bg-[#1469a9] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#0e568d]">New broadcast</button></div></div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard label="Registered" value="4,912" detail="+198 today" positive />
              <MetricCard label="Onsite" value="1,846" detail="74% of cap" />
              <MetricCard label="Online" value="3,066" detail="+120 today" positive />
              <MetricCard label="Awaiting approval" value="18" detail="Oldest 2 days" alert />
            </div>

            <div className="mt-6 grid gap-4 xl:grid-cols-[1.45fr_1fr]">
              <section className="rounded-[1.4rem] border border-ink/10 bg-white p-6 shadow-sm sm:p-7"><div className="mb-6 flex items-center justify-between"><h2 className="font-display text-2xl uppercase sm:text-3xl">Registrations · last 14 days</h2><span className="text-sm font-semibold text-ink/45">Daily</span></div><RegistrationChart /></section>
              <section className="rounded-[1.4rem] border border-ink/10 bg-white p-6 shadow-sm sm:p-7"><h2 className="font-display text-2xl uppercase sm:text-3xl">Onsite capacity</h2><div className="mt-5 flex items-baseline gap-3"><strong className="font-display text-6xl leading-none">74%</strong><span className="text-sm font-semibold text-ink/55">1,846 of 2,500</span></div><div className="mt-4 h-3 overflow-hidden rounded-full bg-[#e3e6eb]"><div className="h-full w-[74%] bg-[#1469a9]" /></div><div className="mt-6 grid gap-3">{capacityBreakdown.map((item) => <div key={item.label} className="flex items-center gap-3 text-sm"><span className={`h-3 w-3 shrink-0 rounded-[3px] ${item.color}`} /><span className="flex-1 font-semibold text-ink/80">{item.label}</span><strong>{item.value}</strong></div>)}</div></section>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3"><QuickPanel title="Approvals" value="18" detail="Need review" action="Review queue" /><QuickPanel title="Broadcasts" value="04" detail="2 scheduled today" action="Manage broadcasts" /><QuickPanel title="Store orders" value="126" detail="₦1.84m this month" action="View orders" /></div>
          </section>
        </div>
      </div>

      {broadcastOpen && <div className="fixed inset-0 z-50 grid place-items-center bg-ink/50 p-5" role="dialog" aria-modal="true" aria-labelledby="broadcast-title"><div className="w-full max-w-md rounded-[1.5rem] bg-cream p-6 shadow-2xl sm:p-8"><div className="flex items-start justify-between gap-4"><div><p className="eyebrow">Admin tools</p><h2 id="broadcast-title" className="mt-2 font-display text-4xl uppercase leading-none">New broadcast</h2></div><button type="button" onClick={() => setBroadcastOpen(false)} className="grid h-10 w-10 place-items-center rounded-full bg-ink text-xl text-white" aria-label="Close broadcast dialog">×</button></div><label className="mt-7 block text-sm font-bold">Message<textarea className="mt-2 min-h-32 w-full rounded-xl border border-ink/10 bg-white p-4 outline-none focus:border-[#1469a9]" placeholder="Write an update for delegates..." /></label><div className="mt-5 flex justify-end gap-3"><button type="button" onClick={() => setBroadcastOpen(false)} className="rounded-full border border-ink/15 px-5 py-3 text-sm font-bold">Cancel</button><button type="button" onClick={() => setBroadcastOpen(false)} className="rounded-full bg-[#1469a9] px-5 py-3 text-sm font-bold text-white">Schedule broadcast</button></div></div></div>}
    </main>
  );
}

function MetricCard({ label, value, detail, positive, alert }: { label: string; value: string; detail: string; positive?: boolean; alert?: boolean }) {
  return <article className="rounded-[1.25rem] border border-ink/10 bg-white p-6 shadow-sm"><p className="text-sm font-semibold text-ink/60">{label}</p><strong className="mt-2 block font-display text-5xl leading-none sm:text-6xl">{value}</strong><p className={`mt-3 text-sm font-bold ${alert ? 'text-coral' : positive ? 'text-[#34865e]' : 'text-ink/55'}`}>{detail}</p></article>;
}

function RegistrationChart() {
  return <div className="flex h-64 items-end gap-2 border-b border-ink/10 px-1 pb-0 sm:gap-3">{registrations.map((value, index) => <div key={index} className="flex h-full flex-1 flex-col items-center justify-end gap-2"><div className={`w-full max-w-10 rounded-t-lg transition hover:opacity-80 ${index === registrations.length - 1 ? 'bg-[#b52e28]' : 'bg-[#b9d5ec]'}`} style={{ height: `${Math.round((value / 160) * 82)}%` }} title={`${value} registrations`} /><span className="text-xs font-semibold text-ink/45">{index + 1}</span></div>)}</div>;
}

function QuickPanel({ title, value, detail, action }: { title: string; value: string; detail: string; action: string }) {
  return <article className="rounded-[1.25rem] border border-ink/10 bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold text-ink/55">{title}</p><strong className="mt-1 block font-display text-4xl">{value}</strong></div><span className="rounded-full bg-[#e7edf3] px-3 py-1 text-xs font-bold text-ink/55">Live</span></div><p className="mt-3 text-sm text-ink/60">{detail}</p><button type="button" className="mt-5 text-sm font-bold text-[#1469a9] hover:underline">{action} →</button></article>;
}
