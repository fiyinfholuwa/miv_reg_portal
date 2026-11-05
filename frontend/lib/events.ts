import { apiUrl } from './api';

export const SESSION_KEY = 'jan-conf-session';
export const PRIMARY_EVENT_SLUG = 'imlc';

/** `start`/`end` are 24h "HH:mm" in Lagos time; `time` is the legacy 12h label. */
export type ProgrammeSession = { start?: string | null; end?: string | null; time?: string; title: string; detail?: string | null };
export type ProgrammeDay = { day: string; date?: string | null; sessions: ProgrammeSession[] };
export type Hotel = { name: string; area: string | null; price: number | null; distance: string | null; conference_rate: boolean; phone: string | null; url: string | null; image: string | null; notes: string | null };

export type MivEvent = {
  id: number;
  slug: string;
  title: string;
  short_name: string;
  summary: string | null;
  description: string | null;
  date_label: string;
  starts_at: string | null;
  ends_at: string | null;
  location: string | null;
  image: string | null;
  attendance_options: string[];
  day_options: string[];
  offers_accommodation: boolean;
  programme: ProgrammeDay[];
  stream_url: string | null;
  stream_title: string | null;
  stream_live: boolean;
  publicity: { caption: string; assets: { title: string; image: string }[] };
  hotels: Hotel[];
  is_featured: boolean;
  registration_open: boolean;
};

export type EventRegistration = {
  id: number;
  ticket_code: string;
  attendance_mode: string | null;
  attendance_days: string[];
  needs_accommodation: boolean;
  registered_at: string | null;
  event: MivEvent;
};

export type AccountUser = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  role: string | null;
  church: string | null;
  state_country: string | null;
  registration_completed: boolean;
  registered_events: string[];
  has_photo: boolean;
};

/** Thrown for API errors so callers can show the first field message. */
export class ApiError extends Error {
  constructor(message: string, public status: number, public errors: Record<string, string[]> = {}) {
    super(message);
  }
}

export function readSession() {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

export function saveSession(token: string) {
  window.localStorage.setItem(SESSION_KEY, token);
}

export function clearSession() {
  window.localStorage.removeItem(SESSION_KEY);
}

export async function apiRequest<T = Record<string, unknown>>(path: string, options: { method?: string; body?: unknown; auth?: boolean } = {}): Promise<T> {
  const token = options.auth ? readSession() : null;
  let response: Response;
  try {
    response = await fetch(apiUrl(path), {
      method: options.method ?? (options.body === undefined ? 'GET' : 'POST'),
      headers: {
        Accept: 'application/json',
        ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch {
    throw new ApiError('We could not reach the server. Check your connection and try again.', 0);
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errors = (data.errors ?? {}) as Record<string, string[]>;
    const firstError = Object.values(errors)[0]?.[0];
    throw new ApiError(firstError ?? data.message ?? 'Something went wrong. Please try again.', response.status, errors);
  }

  return data as T;
}

export const fetchEvent = (slug: string) => apiRequest<{ event: MivEvent }>(`/events/${encodeURIComponent(slug)}`).then((data) => data.event);
export const fetchMyRegistrations = () => apiRequest<{ registrations: EventRegistration[] }>('/auth/events', { auth: true }).then((data) => data.registrations);
export const fetchAccount = () => apiRequest<{ user: AccountUser }>('/auth/user', { auth: true }).then((data) => data.user);

export function registerForEvent(slug: string, attendance: { attendance_mode?: string | null; attendance_days?: string[]; needs_accommodation?: boolean }) {
  return apiRequest<{ status: 'registered' | 'updated'; registration: EventRegistration }>(`/auth/events/${encodeURIComponent(slug)}/register`, { body: attendance, auth: true });
}

/** An event needs the attendance step only when it offers a real choice. */
export function needsAttendanceStep(event: MivEvent) {
  return event.attendance_options.length > 1 || event.day_options.length > 0 || event.offers_accommodation;
}

/** Upload the photo used on "I will be attending" cards. */
export async function uploadPhoto(file: File) {
  const body = new FormData();
  body.append('photo', file);
  let response: Response;
  try {
    response = await fetch(apiUrl('/auth/photo'), { method: 'POST', headers: { Accept: 'application/json', Authorization: `Bearer ${readSession()}` }, body });
  } catch {
    throw new ApiError('We could not reach the server to save your photo.', 0);
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(data.errors?.photo?.[0] ?? data.message ?? 'We could not save your photo.', response.status);
}

/** The saved photo as a same-origin object URL (safe to draw on a canvas), or null. */
export async function fetchPhotoUrl(): Promise<string | null> {
  try {
    const response = await fetch(apiUrl('/auth/photo'), { headers: { Authorization: `Bearer ${readSession()}` } });
    if (!response.ok) return null;
    return URL.createObjectURL(await response.blob());
  } catch {
    return null;
  }
}

export function eventPageUrl(slug: string) {
  return typeof window === 'undefined' ? `/events/${slug}` : `${window.location.origin}/events/${slug}`;
}
