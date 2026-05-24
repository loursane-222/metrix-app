// Metrix — Native Web Push Service Worker
// iOS PWA (16.4+), Chrome, Firefox, Edge compatible

self.addEventListener("install", () => self.skipWaiting())
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()))

self.addEventListener("push", (event) => {
  if (!event.data) return

  let data = {}
  try {
    data = event.data.json()
  } catch {
    data = { title: "Metrix", body: event.data.text() }
  }

  const title = data.title || "Metrix"
  const options = {
    body: data.body || "Yeni bildirim",
    icon: "/icons/metrix-192.png",
    badge: "/icons/metrix-192.png",
    vibrate: [200, 100, 200, 100, 200],
    data: { url: data.url || "/dashboard" },
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  const url = event.notification.data?.url || "/dashboard"

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            client.focus()
            if ("navigate" in client) client.navigate(url)
            return
          }
        }
        return self.clients.openWindow(url)
      })
  )
})
