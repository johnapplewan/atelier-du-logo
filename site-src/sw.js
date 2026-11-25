// Retires the service worker of the earlier version, when the workshop was served at the root of this site.
// The workshop now lives under /atelier/ with its own service worker; this one unregisters itself and reloads
// the open pages so they get the new site. It caches nothing.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil((async () => {
  await self.registration.unregister();
  for (const c of await self.clients.matchAll({ type: "window" })) c.navigate(c.url);
})()));
