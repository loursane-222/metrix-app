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
  self.registration.showNotification(payload?.notification?.title || "Metrix", {
    body: payload?.notification?.body || "Yeni bildiriminiz var.",
    icon: "/icon-192.png"
  });
});
