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

const VAPID_KEY =
  "BLmAn43zqAzo3RuPh89CzH3Ob_BjGI0DL0a9scSS_mSCQqTqHWvi9OAUKbsoNxLGqjNFYiEzJdhgtMOltVsAQjs";

function isPWA() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true
  );
}

function isIOS() {
  if (typeof window === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export default function PushPermission() {
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showIOSHint, setShowIOSHint] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const saved = localStorage.getItem("metrix_push_enabled");
    const dismissed = localStorage.getItem("metrix_push_dismissed");
    if (saved === "1") return;
    if (dismissed === "1") return;

    // iOS'ta PWA değilse "Ana ekrana ekle" ipucu göster
    if (isIOS() && !isPWA()) {
      setShowIOSHint(true);
      return;
    }

    if (!("Notification" in window)) return;
    if (Notification.permission === "denied") return;

    setVisible(true);
  }, []);

  async function enablePush() {
    try {
      setBusy(true);

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        localStorage.setItem("metrix_push_dismissed", "1");
        setVisible(false);
        return;
      }

      const currentUserRes = await fetch("/api/auth/current-user", { cache: "no-store" });
      const currentUser = await currentUserRes.json();
      if (!currentUser?.userId) { setVisible(false); return; }

      const supported = await isSupported();
      if (!supported) {
        alert("Bu tarayıcı web bildirimi desteklemiyor.");
        setVisible(false);
        return;
      }

      const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
      const messaging = getMessaging(app);
      const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
      await navigator.serviceWorker.ready;
      if (!registration.active) await new Promise((r) => setTimeout(r, 1500));
      const readyRegistration = await navigator.serviceWorker.ready;

      const token = await getToken(messaging, {
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: readyRegistration,
      });

      if (!token) { setVisible(false); return; }

      const role = currentUser.role;

      if (role === "personel") {
        await fetch("/api/push/save-personel", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            personelId: currentUser.personelId,
            atolyeId: currentUser.atolyeId,
            token,
          }),
        });
      } else {
        await fetch("/api/push/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: currentUser.userId, token }),
        });
      }

      localStorage.setItem("metrix_push_enabled", "1");
      localStorage.removeItem("metrix_push_dismissed");
      setVisible(false);
      alert("Bildirimler açıldı.");
    } catch (e: any) {
      console.error(e);
      setVisible(false);
      alert("Bildirim açılırken hata: " + (e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  function dismiss() {
    localStorage.setItem("metrix_push_dismissed", "1");
    setVisible(false);
    setShowIOSHint(false);
  }

  // iOS'ta PWA değilse ana ekrana ekle ipucu
  if (showIOSHint) {
    return (
      <div style={{
        position: "fixed", left: 16, right: 16, bottom: 24, zIndex: 99999,
        background: "#111827", color: "white", borderRadius: 18, padding: 16,
        boxShadow: "0 20px 60px rgba(0,0,0,.40)", maxWidth: 520, margin: "0 auto",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}>
        <button onClick={dismiss} style={{
          position: "absolute", right: 12, top: 10, border: 0,
          background: "transparent", color: "white", fontSize: 20, cursor: "pointer",
        }}>×</button>
        <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 6 }}>
          Bildirimleri almak ister misin?
        </div>
        <div style={{ fontSize: 12, opacity: 0.8, lineHeight: 1.5 }}>
          iPhone bildirimleri için uygulamayı ana ekrana ekle:
          Safari alt menüsünden <strong>Paylaş</strong> (
          <span style={{ fontSize: 14 }}>⬆</span>
          ) → <strong>Ana Ekrana Ekle</strong> → Uygulamayı oradan aç.
        </div>
      </div>
    );
  }

  if (!visible) return null;

  return (
    <div style={{
      position: "fixed", left: 16, right: 16, bottom: 24, zIndex: 99999,
      background: "#111827", color: "white", borderRadius: 18, padding: 16,
      boxShadow: "0 20px 60px rgba(0,0,0,.40)", maxWidth: 520, margin: "0 auto",
      fontFamily: "system-ui, -apple-system, sans-serif",
    }}>
      <button onClick={dismiss} style={{
        position: "absolute", right: 12, top: 10, border: 0,
        background: "transparent", color: "white", fontSize: 20, cursor: "pointer",
      }}>×</button>
      <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 6 }}>
        Metrix bildirimlerini aç
      </div>
      <div style={{ fontSize: 13, opacity: 0.85, marginBottom: 12 }}>
        İş programı, personel atama ve onaylanan işler için bildirim gelsin.
      </div>
      <button onClick={enablePush} disabled={busy} style={{
        width: "100%", border: 0, borderRadius: 14, padding: "12px 14px",
        background: "white", color: "#111827", fontWeight: 800, cursor: "pointer",
      }}>
        {busy ? "Açılıyor..." : "Bildirimleri Aç"}
      </button>
    </div>
  );
}
