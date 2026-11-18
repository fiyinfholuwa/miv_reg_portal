/* MIV Events service worker: shows Web Push notifications and opens their link. */

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : '' };
  }

  const title = data.title || 'MIV Events';
  event.waitUntil(self.registration.showNotification(title, {
    body: data.body || '',
    icon: '/images/miv-logo.png',
    badge: '/images/miv-logo.png',
    tag: data.tag || undefined,
    renotify: Boolean(data.tag),
    data: { url: data.url || '/dashboard' },
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || '/dashboard', self.location.origin).href;

  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    // Reuse an open tab of this site: focus it and move it to the link.
    for (const client of windows) {
      if (new URL(client.url).origin === self.location.origin && 'focus' in client) {
        await client.focus();
        if ('navigate' in client && client.url !== target) await client.navigate(target).catch(() => undefined);
        return;
      }
    }
    await self.clients.openWindow(target);
  })());
});
