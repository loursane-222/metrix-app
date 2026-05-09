"use client";
import { useEffect, useRef, useState } from "react";

interface Toast {
  id: string;
  title: string;
  body: string;
}

const TOAST_EVENT = "metrix-toast";

export function showToast(title: string, body: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(TOAST_EVENT, { detail: { title, body } }));
}

export default function InAppToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  function playSound() {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const master = ctx.createGain();
      master.gain.setValueAtTime(1.0, ctx.currentTime);
      master.connect(ctx.destination);

      function vurus(t: number, freq: number, dur: number) {
        // Kare dalga — keskin, gürültüyü kesen ses
        const osc1 = ctx.createOscillator();
        osc1.type = "square";
        osc1.frequency.setValueAtTime(freq, ctx.currentTime + t);
        const g1 = ctx.createGain();
        g1.gain.setValueAtTime(0.35, ctx.currentTime + t);
        g1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + dur);
        osc1.connect(g1); g1.connect(master);
        osc1.start(ctx.currentTime + t);
        osc1.stop(ctx.currentTime + t + dur);

        // Sine — dolgunluk ve güç
        const osc2 = ctx.createOscillator();
        osc2.type = "sine";
        osc2.frequency.setValueAtTime(freq, ctx.currentTime + t);
        const g2 = ctx.createGain();
        g2.gain.setValueAtTime(0.8, ctx.currentTime + t);
        g2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + dur);
        osc2.connect(g2); g2.connect(master);
        osc2.start(ctx.currentTime + t);
        osc2.stop(ctx.currentTime + t + dur);

        // Oktav üstü — parlaklık
        const osc3 = ctx.createOscillator();
        osc3.type = "sine";
        osc3.frequency.setValueAtTime(freq * 2, ctx.currentTime + t);
        const g3 = ctx.createGain();
        g3.gain.setValueAtTime(0.4, ctx.currentTime + t);
        g3.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + dur * 0.5);
        osc3.connect(g3); g3.connect(master);
        osc3.start(ctx.currentTime + t);
        osc3.stop(ctx.currentTime + t + dur);
      }

      // Üç vuruş — DİNG DİNG DONG
      vurus(0,    1047, 0.20); // Do5 — keskin
      vurus(0.22, 1047, 0.20); // Do5 — tekrar
      vurus(0.44, 784,  0.55); // Sol4 — güçlü kapanış

    } catch {}
  }

  useEffect(() => {
    const handler = (e: Event) => {
      const { title, body } = (e as CustomEvent).detail;
      const id = Date.now().toString() + Math.random().toString(36).slice(2);
      setToasts((prev) => [{ id, title, body }, ...prev].slice(0, 5));
      playSound();
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 6000);
    };

    window.addEventListener(TOAST_EVENT, handler as EventListener);
    return () => window.removeEventListener(TOAST_EVENT, handler as EventListener);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <>
      <style>{`
        @keyframes metrix-in {
          from { opacity: 0; transform: translateY(-20px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
      <div style={{
        position: "fixed",
        top: 16,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 999999,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        width: "min(420px, calc(100vw - 32px))",
        pointerEvents: "none",
      }}>
        {toasts.map((toast) => (
          <div key={toast.id} style={{
            background: "rgba(17,24,39,0.97)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: 18,
            padding: "14px 18px",
            boxShadow: "0 8px 40px rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "flex-start",
            gap: 12,
            pointerEvents: "auto",
            animation: "metrix-in 0.35s cubic-bezier(0.34,1.56,0.64,1) both",
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: "linear-gradient(135deg,#1e3a5f,#1e40af)",
              flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 18,
            }}>
              🔔
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{
                fontSize: 13, fontWeight: 700, color: "white",
                fontFamily: "system-ui,-apple-system,sans-serif",
                marginBottom: 3,
              }}>{toast.title}</div>
              <div style={{
                fontSize: 12, color: "rgba(255,255,255,0.75)",
                fontFamily: "system-ui,-apple-system,sans-serif",
                lineHeight: 1.45,
              }}>{toast.body}</div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
