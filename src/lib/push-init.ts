import { initializeApp } from "firebase/app";
import { getMessaging, getToken } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyD0o1I6rAy44qNnAdjFfQfwKZHqTuwFk1U",
  authDomain: "satisyon-41ea3.firebaseapp.com",
  projectId: "satisyon-41ea3",
  messagingSenderId: "43178763523",
  appId: "1:43178763523:web:f668942d11f56e448ab536"
};

const app = initializeApp(firebaseConfig);

export async function initPush(userId: string) {
  try {
    const permission = await Notification.requestPermission();

    if (permission !== "granted") return;

    const messaging = getMessaging(app);

    const token = await getToken(messaging, {
      vapidKey: process.env.NEXT_PUBLIC_VAPID_KEY,
    });

    if (!token) return;

    await fetch("/api/push/save", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userId, token }),
    });

    console.log("Push aktif");
  } catch (e) {
    console.error(e);
  }
}
