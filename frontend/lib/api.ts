const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/+$/, '');
const browserHost = typeof window === 'undefined' ? '' : window.location.hostname;
const pointsToLoopback = Boolean(configuredApiUrl && /:\/\/(localhost|127\.0\.0\.1)(:\d+)?(?:\/|$)/i.test(configuredApiUrl));
const isLocalBrowser = browserHost === 'localhost' || browserHost === '127.0.0.1';

// Keep local development pointed at the Laravel server, but do not ship a
// localhost URL into a hosted frontend. A hosted app can use /api when the API
// shares its domain, or set NEXT_PUBLIC_API_URL to the public API URL.
export const API_URL = configuredApiUrl && (!pointsToLoopback || isLocalBrowser) ? configuredApiUrl : '/api';

export function apiUrl(path: string) {
  return `${API_URL}/${path.replace(/^\/+/, '')}`;
}
