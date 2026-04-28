"use client";

import { useEffect, useState } from "react";
import { initializeApp, getApps } from "firebase/app";
import { getMessaging, getToken, isSupported } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyD0o1I6rAy44qNnAdjFfQfwKZHqTuwFk1U",
  authDomain: "satisyon-41ea3.firebaseapp.com",
  projectId: "satisyon-41ea3",
  messagingSenderId: "43178763523",
  appId: "1:43178763523:web:f668942d11f56e448ab536",
};

const VAPID_KEY = "BLmAn43zqAzo3RuPh89CzH3Ob_BjGI0DL0a9scSS_mSCQqTqHWvi9OAUKbsoNxLGqjNFYiEzJdhgtMOltVsAQjs";

export default function PushPermission() {
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) return;
    if (Notification.permission === "default") setVisible(true);
  }, []);

  async function enablePush() {
    try {
      setBusy(true);

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setVisible(false);
        return;
      }

      const currentUserRes = await fetch("/api/auth/current-user", { cache: "no-store" });
      const currentUser = await currentUserRes.json();

      if (!currentUser?.userId) {
        alert("Bildirim için önce giriş yapılmalı.");
        return;
      }

      const supported = await isSupported();
      if (!supported) {
        alert("Bu tarayıcı web bildirimi desteklemiyor.");
        return;
      }

      const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
      const messaging = getMessaging(app);

      const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");

      const token = await getToken(messaging, {
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: registration,
      });

      if (!token) {
        alert("Bildirim token alınamadı.");
        return;
      }

      await fetch("/api/push/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUser.userId, token }),
      });

      setVisible(false);
      alert("Bildirimler açıldı.");
    } catch (e: any) {
      console.error(e);
      alert("Bildirim açılırken hata oluştu: " + (e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  if (!visible) return null;

  return (
    <div style={{
      position: "fixed",
      left: 16,
      right: 16,
      bottom: 16,
      zIndex: 99999,
      background: "#111827",
      color: "white",
      borderRadius: 18,
      padding: 16,
      boxShadow: "0 20px 60px rgba(0,0,0,.30)",
      maxWidth: 520,
      margin: "0 auto",
      fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif"
    }}>
      <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 6 }}>
        Metrix bildirimlerini aç
      </div>
      <div style={{ fontSize: 13, opacity: .85, marginBottom: 12 }}>
        İş programı, personel atama ve onaylanan işler için telefona bildirim gelsin.
      </div>
      <button
        onClick={enablePush}
        disabled={busy}
        style={{
          width: "100%",
          border: 0,
          borderRadius: 14,
          padding: "12px 14px",
          background: "white",
          color: "#111827",
          fontWeight: 800,
          cursor: "pointer"
        }}
      >
        {busy ? "Açılıyor..." : "Bildirimleri Aç"}
      </button>
    </div>
  );
}
