"use client";

import { useEffect, useState } from "react";

const VAPID_KEY = process.env.NEXT_PUBLIC_VAPID_KEY ?? "";

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) output[i] = rawData.charCodeAt(i);
  return output.buffer;
}

function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isPWA() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true
  );
}

type State = "loading" | "done" | "unsupported" | "ios-not-pwa" | "denied" | "idle" | "busy";

export default function PushPermission() {
  const [state, setState] = useState<State>("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (
      localStorage.getItem("metrix_push_enabled") === "1" ||
      localStorage.getItem("metrix_push_dismissed") === "1"
    ) {
      setState("done");
      return;
    }

    if (isIOS() && !isPWA()) {
      setState("ios-not-pwa");
      return;
    }

    if (
      !("Notification" in window) ||
      !("serviceWorker" in navigator) ||
      !("PushManager" in window)
    ) {
      setState("unsupported");
      return;
    }

    if (Notification.permission === "denied") {
      setState("denied");
      return;
    }

    setState("idle");
  }, []);

  async function enablePush() {
    try {
      setErrorMsg(null);
      setState("busy");

      console.log("[push] step: requestPermission");
      const permission = await Notification.requestPermission();
      console.log("[push] permission:", permission);

      if (permission !== "granted") {
        localStorage.setItem("metrix_push_dismissed", "1");
        setState(permission === "denied" ? "denied" : "idle");
        return;
      }

      console.log("[push] step: register sw");
      const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      console.log("[push] sw registered:", reg.scope);

      await navigator.serviceWorker.ready;
      console.log("[push] sw ready");

      console.log("[push] step: pushManager.subscribe, vapid key length:", VAPID_KEY.length);
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_KEY),
      });
      console.log("[push] subscribed, endpoint prefix:", sub.endpoint.slice(0, 40));

      const subJson = JSON.stringify(sub.toJSON());

      console.log("[push] step: get current-user");
      const currentUserRes = await fetch("/api/auth/current-user", { cache: "no-store" });
      const currentUser = await currentUserRes.json();
      if (!currentUser?.userId) {
        setState("idle");
        setErrorMsg("Oturum bilgisi alınamadı, lütfen tekrar deneyin.");
        return;
      }

      console.log("[push] step: save subscription, role:", currentUser.role);
      if (currentUser.role === "personel") {
        await fetch("/api/push/save-personel", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            personelId: currentUser.personelId,
            atolyeId: currentUser.atolyeId,
            token: subJson,
          }),
        });
      } else {
        await fetch("/api/push/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: currentUser.userId, token: subJson }),
        });
      }

      localStorage.setItem("metrix_push_enabled", "1");
      localStorage.removeItem("metrix_push_dismissed");
      console.log("[push] done ✓");
      setState("done");
    } catch (e: any) {
      console.error("[push] error:", e);
      setState("idle");
      setErrorMsg("Bildirim açılamadı. Lütfen tekrar deneyin.");
    }
  }

  function dismiss() {
    localStorage.setItem("metrix_push_dismissed", "1");
    setState("done");
  }

  if (state === "loading" || state === "done" || state === "unsupported" || state === "denied") {
    return null;
  }

  if (state === "ios-not-pwa") {
    return (
      <div style={bannerStyle}>
        <button onClick={dismiss} style={closeStyle}>×</button>
        <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 6 }}>
          Bildirimleri almak ister misin?
        </div>
        <div style={{ fontSize: 12, opacity: 0.8, lineHeight: 1.6 }}>
          iPhone&apos;da bildirim için uygulamayı ana ekrana ekle:{" "}
          Safari&apos;de <strong>Paylaş</strong> (⬆) →{" "}
          <strong>Ana Ekrana Ekle</strong> → Oradan aç.
        </div>
      </div>
    );
  }

  return (
    <div style={bannerStyle}>
      <button onClick={dismiss} style={closeStyle}>×</button>
      <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 6 }}>
        Metrix bildirimlerini aç
      </div>
      <div style={{ fontSize: 13, opacity: 0.85, marginBottom: 12 }}>
        İş programı, personel atama ve onaylanan işler için bildirim gelsin.
      </div>
      <button onClick={enablePush} disabled={state === "busy"} style={btnStyle}>
        {state === "busy" ? "Açılıyor..." : "Bildirimleri Aç"}
      </button>
      {errorMsg && (
        <p style={{ marginTop: 10, fontSize: 12, color: "#f87171", textAlign: "center" }}>
          {errorMsg}
        </p>
      )}
    </div>
  );
}

const bannerStyle: React.CSSProperties = {
  position: "fixed", left: 16, right: 16, bottom: 24, zIndex: 99999,
  background: "#111827", color: "white", borderRadius: 18, padding: 16,
  boxShadow: "0 20px 60px rgba(0,0,0,.40)", maxWidth: 520, margin: "0 auto",
  fontFamily: "system-ui, -apple-system, sans-serif",
};

const closeStyle: React.CSSProperties = {
  position: "absolute", right: 12, top: 10, border: 0,
  background: "transparent", color: "white", fontSize: 20, cursor: "pointer",
};

const btnStyle: React.CSSProperties = {
  width: "100%", border: 0, borderRadius: 14, padding: "12px 14px",
  background: "white", color: "#111827", fontWeight: 800,
  cursor: "pointer", opacity: 1,
};
