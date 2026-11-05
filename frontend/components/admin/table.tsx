'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { input } from './adminUi';

/* ------------------------------------------------------------------ Modal */

export function Modal({ title, subtitle, onClose, children, footer, size = 'md' }: { title: string; subtitle?: string; onClose: () => void; children: ReactNode; footer?: ReactNode; size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const width = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl', xl: 'max-w-5xl' }[size];
  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-[#001428]/55 p-0 backdrop-blur-[2px] sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className={`flex max-h-[92dvh] w-full ${width} flex-col overflow-hidden rounded-t-[1.5rem] bg-cream shadow-2xl sm:rounded-[1.5rem]`}>
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-ink/10 bg-white px-5 py-4">
          <div className="min-w-0"><h2 className="text-lg font-bold text-[#03284a]">{title}</h2>{subtitle && <p className="text-xs text-ink/55">{subtitle}</p>}</div>
          <button type="button" onClick={onClose} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#f4f5f7] text-lg" aria-label="Close">×</button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-5">{children}</div>
        {footer && <footer className="flex shrink-0 justify-end gap-2 border-t border-ink/10 bg-white px-5 py-3">{footer}</footer>}
      </div>
    </div>
  );
}

export const primaryButton = 'rounded-full bg-[#03284a] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#0b4779] disabled:opacity-50';
export const secondaryButton = 'rounded-full border border-ink/15 bg-white px-4 py-2.5 text-sm font-bold text-ink transition hover:border-ink/40 disabled:opacity-50';
export const dangerButton = 'rounded-full bg-[#fff0ee] px-4 py-2.5 text-sm font-bold text-coral transition hover:bg-[#ffe1dc] disabled:opacity-50';

/* ----------------------------------------------------------------- Badges */

const BADGE_TONES: Record<string, string> = {
  green: 'bg-[#dff2e5] text-[#2f7d4f]', amber: 'bg-[#fff4d9] text-[#9a6814]', red: 'bg-[#fff0ee] text-coral', blue: 'bg-[#e7f1fa] text-[#0b4779]', grey: 'bg-[#f1f2f4] text-ink/60', navy: 'bg-[#03284a] text-white',
};
const STATUS_TONE: Record<string, keyof typeof BADGE_TONES> = {
  approved: 'green', published: 'green', paid: 'green', sent: 'green', collected: 'navy', closed: 'grey', contacted: 'blue', scheduled: 'blue', new: 'amber', pending: 'amber', draft: 'grey', rejected: 'red', failed: 'red', sending: 'blue',
};

export function Badge({ children, tone = 'grey' }: { children: ReactNode; tone?: keyof typeof BADGE_TONES }) {
  return <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-bold capitalize ${BADGE_TONES[tone]}`}>{children}</span>;
}

export function StatusBadge({ status }: { status: string }) {
  return <Badge tone={STATUS_TONE[status] ?? 'grey'}>{status}</Badge>;
}

export const formatDate = (iso?: string | null, withTime = false) => iso ? new Date(iso).toLocaleString('en-NG', withTime ? { dateStyle: 'medium', timeStyle: 'short' } : { dateStyle: 'medium' }) : '—';

/* -------------------------------------------------------- Filters & toolbar */

export type FilterDef = { key: string; label: string; options: { value: string; label: string }[] };
export type FilterValues = Record<string, string>;

/** Search + Filters button (status selects and a date range) + optional actions. */
export function TableToolbar({ query, onQuery, placeholder, filters = [], values, onFilter, dateRange, onDateRange, dateLabel = 'Date', actions, onReset }: {
  query: string; onQuery: (value: string) => void; placeholder: string;
  filters?: FilterDef[]; values: FilterValues; onFilter: (key: string, value: string) => void;
  dateRange?: { from: string; to: string }; onDateRange?: (range: { from: string; to: string }) => void; dateLabel?: string;
  actions?: ReactNode; onReset: () => void;
}) {
  const [open, setOpen] = useState(false);
  const active = Object.values(values).filter(Boolean).length + (dateRange?.from ? 1 : 0) + (dateRange?.to ? 1 : 0);
  const hasPanel = filters.length > 0 || Boolean(onDateRange);

  return (
    <div className="grid gap-3">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 gap-2">
          <label className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-full border border-ink/15 bg-white px-4 focus-within:border-[#1469a9] lg:max-w-md">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="shrink-0 text-ink/40" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
            <span className="sr-only">Search</span>
            <input value={query} onChange={(event) => onQuery(event.target.value)} placeholder={placeholder} className="min-w-0 flex-1 border-0 bg-transparent text-sm outline-none" />
            {query && <button type="button" onClick={() => onQuery('')} className="text-lg leading-none text-ink/40" aria-label="Clear search">×</button>}
          </label>
          {hasPanel && (
            <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} className={`flex h-11 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-bold transition ${open || active ? 'bg-[#03284a] text-white' : 'border border-ink/15 bg-white'}`}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M4 6h16M7 12h10M10 18h4" /></svg>
              Filters{active > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-white px-1 text-[11px] text-[#03284a]">{active}</span>}
            </button>
          )}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
      {open && hasPanel && (
        <div className="grid gap-3 rounded-2xl border border-ink/10 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
          {filters.map((filter) => (
            <label key={filter.key} className="grid gap-1.5"><span className="text-xs font-bold uppercase tracking-[.08em] text-ink/50">{filter.label}</span>
              <select value={values[filter.key] ?? ''} onChange={(event) => onFilter(filter.key, event.target.value)} className={input}>
                <option value="">All</option>
                {filter.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
          ))}
          {onDateRange && dateRange && <>
            <label className="grid gap-1.5"><span className="text-xs font-bold uppercase tracking-[.08em] text-ink/50">{dateLabel} from</span><input type="date" value={dateRange.from} max={dateRange.to || undefined} onChange={(event) => onDateRange({ ...dateRange, from: event.target.value })} className={input} /></label>
            <label className="grid gap-1.5"><span className="text-xs font-bold uppercase tracking-[.08em] text-ink/50">{dateLabel} to</span><input type="date" value={dateRange.to} min={dateRange.from || undefined} onChange={(event) => onDateRange({ ...dateRange, to: event.target.value })} className={input} /></label>
          </>}
          <div className="flex items-end sm:col-span-2 lg:col-span-4"><button type="button" onClick={onReset} className="text-sm font-bold text-[#1469a9]">Clear all filters</button></div>
        </div>
      )}
    </div>
  );
}

/** Status chips with counts, a quicker alternative to the filter panel. */
export function StatusTabs({ options, value, onChange, counts }: { options: { value: string; label: string }[]; value: string; onChange: (value: string) => void; counts?: Record<string, number> }) {
  return (
    <div className="no-scrollbar flex gap-1.5 overflow-x-auto" role="group">
      {options.map((option) => (
        <button key={option.value} type="button" aria-pressed={value === option.value} onClick={() => onChange(option.value)} className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition ${value === option.value ? 'bg-[#03284a] text-white' : 'bg-white text-ink/65 ring-1 ring-ink/10 hover:text-ink'}`}>
          {option.label}{counts && <span className={`rounded-full px-1.5 text-[10px] ${value === option.value ? 'bg-white/20' : 'bg-ink/5'}`}>{counts[option.value] ?? 0}</span>}
        </button>
      ))}
    </div>
  );
}

/* --------------------------------------------------------------- Pagination */

export function Pagination({ page, pages, total, pageSize, onPage, onPageSize }: { page: number; pages: number; total: number; pageSize: number; onPage: (page: number) => void; onPageSize?: (size: number) => void }) {
  if (total === 0) return null;
  const first = (page - 1) * pageSize + 1;
  const last = Math.min(total, page * pageSize);
  // Windowed page numbers: 1 … 4 5 6 … 20
  const numbers = Array.from({ length: pages }, (_, index) => index + 1).filter((number) => number === 1 || number === pages || Math.abs(number - page) <= 1);
  return (
    <div className="flex flex-col items-center justify-between gap-3 px-1 py-3 text-xs sm:flex-row">
      <div className="flex items-center gap-3 text-ink/55">
        <span>Showing {first}–{last} of {total}</span>
        {onPageSize && <select value={pageSize} onChange={(event) => onPageSize(Number(event.target.value))} className="rounded-lg border border-ink/15 bg-white px-2 py-1" aria-label="Rows per page">{[10, 15, 25, 50, 100].map((size) => <option key={size} value={size}>{size} / page</option>)}</select>}
      </div>
      {pages > 1 && (
        <nav className="flex items-center gap-1" aria-label="Pagination">
          <button type="button" onClick={() => onPage(page - 1)} disabled={page === 1} className="h-8 rounded-full px-3 font-bold ring-1 ring-ink/10 disabled:opacity-35">‹ Prev</button>
          {numbers.map((number, index) => (
            <span key={number} className="flex items-center gap-1">
              {index > 0 && number - numbers[index - 1] > 1 && <span className="px-1 text-ink/40">…</span>}
              <button type="button" onClick={() => onPage(number)} aria-current={number === page ? 'page' : undefined} className={`h-8 min-w-8 rounded-full px-2 font-bold ${number === page ? 'bg-[#03284a] text-white' : 'hover:bg-white'}`}>{number}</button>
            </span>
          ))}
          <button type="button" onClick={() => onPage(page + 1)} disabled={page === pages} className="h-8 rounded-full px-3 font-bold ring-1 ring-ink/10 disabled:opacity-35">Next ›</button>
        </nav>
      )}
    </div>
  );
}

/* ----------------------------------------------------------------- Table */

export type Column<T> = { key: string; header: ReactNode; cell: (row: T) => ReactNode; className?: string };

/** Responsive table: a real table on desktop, stacked cards on phones. */
export function DataTable<T>({ columns, rows, rowKey, empty = 'Nothing to show.', loading = false, onRowClick }: { columns: Column<T>[]; rows: T[]; rowKey: (row: T) => string | number; empty?: ReactNode; loading?: boolean; onRowClick?: (row: T) => void }) {
  if (loading) return <div className="grid gap-2">{[0, 1, 2, 3, 4].map((row) => <div key={row} className="h-12 animate-pulse rounded-xl bg-white" />)}</div>;
  return (
    <div className="overflow-hidden rounded-[1.25rem] border border-ink/10 bg-white">
      <table className="hidden w-full border-collapse text-left text-sm md:table">
        <thead><tr className="border-b border-ink/10 bg-[#fafaf8]">{columns.map((column) => <th key={column.key} scope="col" className={`px-4 py-3 text-[11px] font-bold uppercase tracking-[.08em] text-ink/45 ${column.className ?? ''}`}>{column.header}</th>)}</tr></thead>
        <tbody>
          {rows.length === 0 && <tr><td colSpan={columns.length} className="px-4 py-10 text-center text-sm text-ink/50">{empty}</td></tr>}
          {rows.map((row) => (
            <tr key={rowKey(row)} onClick={onRowClick ? () => onRowClick(row) : undefined} className={`border-b border-ink/5 last:border-0 ${onRowClick ? 'cursor-pointer hover:bg-[#f8f9fb]' : ''}`}>
              {columns.map((column) => <td key={column.key} className={`px-4 py-3 align-middle ${column.className ?? ''}`}>{column.cell(row)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
      <ul className="m-0 grid list-none p-0 md:hidden">
        {rows.length === 0 && <li className="px-4 py-10 text-center text-sm text-ink/50">{empty}</li>}
        {rows.map((row) => (
          <li key={rowKey(row)} onClick={onRowClick ? () => onRowClick(row) : undefined} className="grid gap-1.5 border-b border-ink/5 px-4 py-3 last:border-0">
            {columns.map((column) => <div key={column.key} className="flex items-start justify-between gap-3 text-sm"><span className="shrink-0 text-[11px] font-bold uppercase tracking-[.06em] text-ink/40">{column.header}</span><div className="min-w-0 text-right">{column.cell(row)}</div></div>)}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------ Client-side state */

type ClientTableOptions<T> = {
  search: (row: T) => string;
  filters?: Record<string, (row: T, value: string) => boolean>;
  date?: (row: T) => string | null | undefined;
  pageSize?: number;
};

/** Search, filters, date range and pagination over rows already loaded in the browser. */
export function useClientTable<T>(rows: T[], { search, filters = {}, date, pageSize: initialSize = 15 }: ClientTableOptions<T>) {
  const [query, setQuery] = useState('');
  const [values, setValues] = useState<FilterValues>({});
  const [range, setRange] = useState({ from: '', to: '' });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialSize);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (needle && !search(row).toLowerCase().includes(needle)) return false;
      for (const [key, value] of Object.entries(values)) if (value && filters[key] && !filters[key](row, value)) return false;
      if (date && (range.from || range.to)) {
        const iso = date(row);
        if (!iso) return false;
        const day = new Date(iso).toLocaleDateString('en-CA', { timeZone: 'Africa/Lagos' });
        if (range.from && day < range.from) return false;
        if (range.to && day > range.to) return false;
      }
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, query, values, range]);

  useEffect(() => setPage(1), [query, values, range, pageSize]);

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = Math.min(page, pages);

  return {
    query, setQuery, values, setFilter: (key: string, value: string) => setValues((current) => ({ ...current, [key]: value })),
    range, setRange, page: current, setPage, pages, pageSize, setPageSize,
    filtered, shown: filtered.slice((current - 1) * pageSize, current * pageSize), total: filtered.length,
    reset: () => { setQuery(''); setValues({}); setRange({ from: '', to: '' }); },
  };
}

/** Downloads rows as a CSV file. */
export function downloadCsv(filename: string, header: string[], rows: (string | number | null | undefined)[][]) {
  const escape = (value: string | number | null | undefined) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const csv = [header, ...rows].map((row) => row.map(escape).join(',')).join('\n');
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}
