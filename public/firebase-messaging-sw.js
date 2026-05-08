importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyD0o1I6rAy44qNnAdjFfQfwKZHqTuwFk1U",
  authDomain: "satisyon-41ea3.firebaseapp.com",
  projectId: "satisyon-41ea3",
  messagingSenderId: "43178763523",
  appId: "1:43178763523:web:f668942d11f56e448ab536",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  const title = payload?.notification?.title || "Metrix";
  const body = payload?.notification?.body || "Yeni bildiriminiz var.";
  const actionUrl = payload?.data?.actionUrl || "/dashboard";

  self.registration.showNotification(title, {
    body,
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    vibrate: [200, 100, 200, 100, 200],
    sound: "default",
    requireInteraction: true,
    data: { actionUrl },
    actions: [
      { action: "open", title: "Aç" },
      { action: "close", title: "Kapat" }
    ]
  });
});

self.addEventListener("notificationclick", function(event) {
  event.notification.close();
  if (event.action === "close") return;

  const actionUrl = event.notification.data?.actionUrl || "/dashboard";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(function(clientList) {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.focus();
          client.navigate(actionUrl);
          return;
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(actionUrl);
      }
    })
  );
});
