/* Service worker — this is what makes it a real installable app.
   It keeps a copy of the app's own files so it opens instantly and
   works with no signal. Weather data still needs internet, but the
   app remembers the last forecast it saw.

   npm run build updates VERSION automatically when app files change. */
const VERSION = "nice-out-1bb248710cf4b542";

const FILES = [
  "./",
  "./index.html",
  "./style.css",
  "./jokes.js",
  "./app.js",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable.png"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith("nice-out-") && k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== self.location.origin) return;

  // Weather data: always go to the network, never serve a stale forecast.
  if (url.hostname.endsWith("open-meteo.com") || url.hostname.endsWith("bigdatacloud.net")) return;

  // The app's own files: cache first, so it opens with no signal.
  e.respondWith(
    caches.open(VERSION).then(cache => cache.match(e.request)).then(hit => hit || fetch(e.request))
  );
});
