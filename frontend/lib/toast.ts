/**
 * App-wide toast notifications. Call `toast.success|error|warning|info(message)`
 * from anywhere (components, handlers, async callbacks); the single <Toaster />
 * mounted in the root layout renders them in the top-right corner.
 *
 * Pass `{ id }` to update one toast in place, e.g. an "info" progress message
 * that later becomes a success or error.
 */
export type ToastTone = 'success' | 'error' | 'warning' | 'info';

export type ToastItem = {
  id: string;
  tone: ToastTone;
  title: string;
  message: string;
  duration: number;
  /** Bumped on every update so the auto-dismiss timer restarts. */
  version: number;
};

type ToastOptions = { id?: string; title?: string; duration?: number };

const defaultTitles: Record<ToastTone, string> = { success: 'Success', error: 'Something went wrong', warning: 'Heads up', info: 'Please wait' };
// Errors stay longer so people have time to read them.
const defaultDurations: Record<ToastTone, number> = { success: 4000, error: 7000, warning: 6000, info: 5000 };
const MAX_TOASTS = 4;

let items: ToastItem[] = [];
let counter = 0;
const listeners = new Set<(items: ToastItem[]) => void>();

function emit() {
  listeners.forEach((listener) => listener(items));
}

function show(tone: ToastTone, message: string, options: ToastOptions = {}) {
  if (!message) return '';
  // Reuse an explicit id, or the id of an identical toast already on screen,
  // so repeated messages refresh instead of stacking.
  const existing = items.find((item) => (options.id ? item.id === options.id : item.tone === tone && item.message === message));
  const id = existing?.id ?? options.id ?? `toast-${++counter}`;
  const next: ToastItem = {
    id,
    tone,
    message,
    title: options.title ?? defaultTitles[tone],
    duration: options.duration ?? defaultDurations[tone],
    version: (existing?.version ?? 0) + 1,
  };
  items = existing ? items.map((item) => (item.id === id ? next : item)) : [...items, next].slice(-MAX_TOASTS);
  emit();
  return id;
}

export const toast = {
  success: (message: string, options?: ToastOptions) => show('success', message, options),
  error: (message: string, options?: ToastOptions) => show('error', message, options),
  warning: (message: string, options?: ToastOptions) => show('warning', message, options),
  info: (message: string, options?: ToastOptions) => show('info', message, options),
  dismiss(id: string) {
    items = items.filter((item) => item.id !== id);
    emit();
  },
  subscribe(listener: (items: ToastItem[]) => void) {
    listeners.add(listener);
    listener(items);
    return () => { listeners.delete(listener); };
  },
};

/** Human-readable message from anything thrown, with a fallback. */
export function errorMessage(error: unknown, fallback: string) {
  if (error instanceof TypeError) return 'We could not reach the server. Please check your connection and try again.';
  return error instanceof Error && error.message ? error.message : fallback;
}
