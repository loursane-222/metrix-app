// This service worker has been replaced by /sw.js (native Web Push, VAPID).
// Kept as no-op stub so cached registrations on old devices don't error out.
self.addEventListener("install", () => self.skipWaiting())
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()))
