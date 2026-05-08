"use client";
import { useEffect, useRef, useState } from "react";

interface Toast {
  id: string;
  title: string;
  body: string;
}

// Global event bus
const TOAST_EVENT = "metrix-toast";

export function showToast(title: string, body: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(TOAST_EVENT, { detail: { title, body } }));
}

export default function InAppToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const audioRef = useRef<AudioContext | null>(null);

  function playSound() {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioRef.current = ctx;

      // Kısa, hoş bildirim sesi — iPhone mesaj sesine benzer
      const times = [0, 0.1, 0.2];
      times.forEach((t) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "sine";
        osc.frequency.setValueAtTime(880, ctx.currentTime + t);
        osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + t + 0.08);
        gain.gain.setValueAtTime(0.3, ctx.currentTime + t);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.15);
        osc.start(ctx.currentTime + t);
        osc.stop(ctx.currentTime + t + 0.15);
      });
    } catch {
      // ses çalamazsa sessiz geç
    }
  }

  useEffect(() => {
    function handler(e: Event) {
      const { title, body } = (e as CustomEvent).detail;
      const id = Math.random().toString(36).slice(2);
      setToasts((prev) => [{ id, title, body }, ...prev].slice(0, 5));
      playSound();
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 5000);
    }

    window.addEventListener(TOAST_EVENT, handler);
    return () => window.removeEventListener(TOAST_EVENT, handler);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div style={{
      position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)",
      zIndex: 99999, display: "flex", flexDirection: "column", gap: 8,
      width: "min(420px, calc(100vw - 32px))", pointerEvents: "none",
    }}>
      {toasts.map((toast) => (
        <div key={toast.id} style={{
          background: "rgba(17,24,39,0.97)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 18,
          padding: "14px 18px",
          boxShadow: "0 8px 40px rgba(0,0,0,0.4)",
          display: "flex", alignItems: "flex-start", gap: 12,
          pointerEvents: "auto",
          animation: "metrix-slide-in 0.35s cubic-bezier(0.34,1.56,0.64,1) both",
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, overflow: "hidden",
            flexShrink: 0, background: "#1e3a5f",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <img src="/icon-192.png" width={36} height={36} alt="" style={{ objectFit: "cover" }} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{
              fontSize: 13, fontWeight: 700, color: "white",
              fontFamily: "system-ui, -apple-system, sans-serif",
              marginBottom: 2,
            }}>{toast.title}</div>
            <div style={{
              fontSize: 12, color: "rgba(255,255,255,0.7)",
              fontFamily: "system-ui, -apple-system, sans-serif",
              lineHeight: 1.4,
              overflow: "hidden", display: "-webkit-box",
              WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
            }}>{toast.body}</div>
          </div>
        </div>
      ))}
      <style>{`
        @keyframes metrix-slide-in {
          from { opacity: 0; transform: translateY(-24px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0)     scale(1);    }
        }
      `}</style>
    </div>
  );
}
