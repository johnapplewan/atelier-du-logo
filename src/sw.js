// Atelier du Logo: offline cache for the standalone app (generated into app/sw.js by build.js).
// Network first, so an online visit always gets the latest files; the cache answers when offline.
const VERSION = "__VERSION__";
const CACHE = "atelier-logo-" + VERSION;
const FILES = __FILES__;

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith("atelier-logo-") && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin) return;
  // live bridge to Claude Desktop and on-demand downloads: never cached
  if (url.pathname.includes("/bridge/") || url.pathname.includes("/downloads/")) return;
  e.respondWith(fetch(req).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return res;
  }).catch(() => caches.match(req, { ignoreSearch: req.mode === "navigate" }).then(r => r || (req.mode === "navigate" ? caches.match("./") : undefined))
    .then(r => r || new Response("Hors ligne", { status: 503 }))));
});
