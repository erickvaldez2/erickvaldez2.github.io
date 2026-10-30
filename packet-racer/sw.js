// Packet Racer offline cache. Bump VERSION whenever a game file changes so phones pick up the update.
const VERSION = "packet-racer-v1";
const CORE = [
  "/packet-racer/", "/packet-racer/cysa/", "/packet-racer/manifest.webmanifest",
  "/packet-racer/icon-192.png", "/packet-racer/icon-512.png", "/packet-racer/apple-touch-icon.png",
  "/fonts/fonts.css", "/fonts/archivo.woff2", "/fonts/hanken-grotesk.woff2"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith("packet-racer-") && k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  // Pages: network first so updates show up; fall back to the cached copy offline.
  if (req.mode === "navigate") {
    const url = new URL(req.url);
    const key = url.pathname.startsWith("/packet-racer/cysa") ? "/packet-racer/cysa/" : "/packet-racer/";
    e.respondWith(fetch(req).then(r => {
      if (r.ok) { const copy = r.clone(); caches.open(VERSION).then(c => c.put(key, copy)); }
      return r;
    }).catch(() => caches.match(key)));
    return;
  }
  // Everything else (icons, fonts, launch screens): cache first, then network.
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => {
    if (r && r.ok) { const copy = r.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
    return r;
  })));
});
