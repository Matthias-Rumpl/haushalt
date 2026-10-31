// Service Worker: hält die App-Hülle (index.html, Symbole) am Handy, damit die App schnell und auch offline startet.
// Die eigentliche Seite kommt aus dem Google Drive und wird in der App selbst zwischengespeichert.
const CACHE = 'haushalt-v1';
const DATEIEN = ['./', './index.html', './manifest.webmanifest', './icon-32.png', './icon-180.png', './icon-192.png', './icon-512.png', './icon-maskable-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(DATEIEN)));
  self.skipWaiting();
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
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
