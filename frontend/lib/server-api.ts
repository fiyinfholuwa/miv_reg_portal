import { headers } from 'next/headers';

/**
 * Absolute API base for server-side fetches (share pages, image proxy).
 * Uses API_URL when it is absolute; otherwise assumes the API is served from
 * this site's own domain under /api.
 */
export async function serverApiUrl(path: string) {
  const configured = process.env.API_URL?.trim().replace(/\/+$/, '').replace(/^(.+?)(?:\/api)?$/, '$1/api');
  let base = configured && /^https?:\/\//i.test(configured) ? configured : '';
  if (!base) {
    const incoming = await headers();
    const host = incoming.get('x-forwarded-host') ?? incoming.get('host') ?? 'localhost:3000';
    const proto = incoming.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
    base = `${proto}://${host}/api`;
  }
  return `${base}/${path.replace(/^\/+/, '')}`;
}

/** This site's public origin, for absolute og:url / og:image links. */
export async function siteOrigin() {
  const incoming = await headers();
  const host = incoming.get('x-forwarded-host') ?? incoming.get('host') ?? 'localhost:3000';
  const proto = incoming.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
  return `${proto}://${host}`;
}

export type SharedCard = { image_url: string; title: string; description: string; event: { slug: string; title: string; short_name: string } };

export async function fetchSharedCard(slug: string, code: string): Promise<SharedCard | null> {
  if (!/^[a-f0-9]{24}$/.test(code)) return null;
  try {
    const response = await fetch(await serverApiUrl(`/cards/${encodeURIComponent(slug)}/${code}`), { headers: { Accept: 'application/json' }, next: { revalidate: 60 } });
    return response.ok ? ((await response.json()) as SharedCard) : null;
  } catch {
    return null;
  }
}
