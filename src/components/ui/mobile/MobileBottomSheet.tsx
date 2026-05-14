"use client";

import { useEffect, useRef } from "react";

interface MobileBottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  /** auto = içerik yüksekliği (max %85dvh), full = %90dvh */
  size?: "auto" | "full";
}

/**
 * iOS-style bottom sheet.
 * - Backdrop tıklaması kapatır.
 * - Açıkken body scroll kilitlenir (pozisyon korunarak).
 * - Safe-area-inset-bottom otomatik eklenir.
 * - Sadece mobile'da görünür (md:hidden).
 */
export function MobileBottomSheet({
  open,
  onClose,
  title,
  children,
  size = "auto",
}: MobileBottomSheetProps) {
  // Scroll lock — pozisyon korunarak
  useEffect(() => {
    if (!open) return;
    const scrollY = window.scrollY;
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";
    document.body.style.overflowY = "scroll";
    return () => {
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
      document.body.style.overflowY = "";
      window.scrollTo(0, scrollY);
    };
  }, [open]);

  // Back button → sheet'i kapat (route değişimi olmadan)
  const popHandledRef = useRef(false);
  useEffect(() => {
    if (!open) return;
    popHandledRef.current = false;
    window.history.pushState({ metrixSheet: true }, "");
    function handlePop() {
      popHandledRef.current = true;
      onClose();
    }
    window.addEventListener("popstate", handlePop);
    return () => {
      window.removeEventListener("popstate", handlePop);
      // Manuel kapamada (back değil) pushState'i temizle
      if (!popHandledRef.current && window.history.state?.metrixSheet) {
        window.history.back();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] md:hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/65"
        onClick={onClose}
        aria-hidden
      />

      {/* Panel */}
      <div
        className={[
          "absolute left-0 right-0 bottom-0",
          "flex flex-col",
          size === "full" ? "max-h-[90dvh]" : "max-h-[85dvh]",
        ].join(" ")}
        style={{
          background: "rgba(11,16,32,0.98)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderRadius: "20px 20px 0 0",
          border: "0.5px solid rgba(255,255,255,0.10)",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div
            className="w-9 h-1 rounded-full"
            style={{ background: "rgba(255,255,255,0.18)" }}
          />
        </div>

        {/* Title */}
        {title && (
          <div
            className="px-5 pt-2 pb-3 shrink-0"
            style={{ borderBottom: "0.5px solid rgba(255,255,255,0.07)" }}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-[15px] font-semibold text-white">{title}</h2>
              <button
                onClick={onClose}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center -mr-2"
                aria-label="Kapat"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="rgba(148,163,184,0.6)"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Scrollable content */}
        <div
          className="flex-1 overflow-y-auto px-5 py-4"
          style={{ overscrollBehavior: "contain" }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
