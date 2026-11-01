// Service Worker: hält die App-Hülle (index.html, Symbole) am Handy, damit die App schnell und auch offline startet,
// und zeigt Push-Mitteilungen der Einkaufsliste (mit Zahl am App-Symbol).
const CACHE = 'haushalt-v2';
const API = 'https://script.google.com/macros/s/AKfycbzovDaTJPWxnOmERzJQUZRyKFjq1Bvh7HPMgQc_O2MnZ1Zh8QNH9lUAo1v4HYzmeMw4sw/exec';
const DATEIEN = ['./', './index.html', './manifest.webmanifest', './icon-32.png', './icon-180.png', './icon-192.png', './icon-512.png', './icon-maskable-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(DATEIEN)));
  self.skipWaiting();
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE && k !== 'hx-push').map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;   // Google-Script & Co. nie abfangen
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then((hit) => {
      const netz = fetch(e.request).then((r) => { if (r && r.ok) caches.open(CACHE).then((c) => c.put(e.request, r.clone())); return r; }).catch(() => hit);
      return hit || netz;
    })
  );
});

// Push: die Nachricht selbst ist leer – Text und Anzahl holt sich das Handy beim Google-Script.
self.addEventListener('push', (e) => {
  e.waitUntil((async () => {
    let titel = '🛒 Einkaufsliste', text = 'Es gibt Neues auf eurer Liste.', anzahl = null;
    try {
      const c = await caches.open('hx-push'), r = await c.match('k'), k = r ? await r.text() : '';
      if (k) {
        const res = await fetch(API, { method: 'POST', redirect: 'follow', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ fn: 'pushInfo', args: [k] }) });
        const j = await res.json();
        if (j && j.ok && j.r) { titel = j.r.titel || titel; text = j.r.text || text; anzahl = j.r.anzahl; }
      }
    } catch (err) { /* ohne Netz: allgemeiner Text */ }
    try {
      if (anzahl != null && self.navigator && self.navigator.setAppBadge) { if (anzahl) await self.navigator.setAppBadge(anzahl); else await self.navigator.clearAppBadge(); }
    } catch (err) { /* Zahl am Symbol nicht möglich */ }
    await self.registration.showNotification(titel, { body: text, icon: 'icon-192.png', badge: 'icon-192.png', tag: 'einkaufsliste', renotify: true, data: { url: './?tab=liste' } });
  })());
});
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const ziel = new URL('./?tab=liste', self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((ws) => {
    for (const w of ws) { if (w.url.startsWith(self.registration.scope) && 'focus' in w) { if (w.navigate) w.navigate(ziel).catch(() => {}); return w.focus(); } }
    return self.clients.openWindow(ziel);
  }));
});
