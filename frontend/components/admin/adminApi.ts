import { API_URL } from '../../lib/api';

/** Authenticated admin JSON call. Throws the first validation message on failure. */
export async function api(path: string, options: RequestInit = {}) {
  const token = window.localStorage.getItem('jan-conf-session');
  const response = await fetch(API_URL + path, {
    ...options,
    headers: { Accept: 'application/json', ...(options.body && !(options.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: 'Bearer ' + token } : {}), ...options.headers },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const firstError = data.errors ? Object.values(data.errors as Record<string, string[]>)[0]?.[0] : undefined;
    throw new Error(firstError || data.message || 'Request failed.');
  }
  return data;
}

/** Uploads an image to public storage and returns its URL. */
export async function uploadImage(file: File): Promise<string> {
  const body = new FormData();
  body.append('image', file);
  const data = await api('/admin/uploads', { method: 'POST', body });
  return data.url as string;
}
