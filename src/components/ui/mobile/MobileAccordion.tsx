"use client";

import { useState, useRef } from "react";

interface MobileAccordionProps {
  title: string;
  /** Kapalı durumdaki özet metin (ör. "2.40 mtül", "2 op seçili") */
  badge?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

/**
 * Collapsible form section.
 * max-height animasyonu ile smooth expand/collapse.
 * Expand'ta içeriği görünür alana scroll eder.
 */
export function MobileAccordion({
  title,
  badge,
  defaultOpen = false,
  children,
}: MobileAccordionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const sectionRef = useRef<HTMLDivElement>(null);

  function toggle() {
    const opening = !open;
    setOpen(opening);
    if (opening) {
      setTimeout(() => {
        sectionRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
      }, 60);
    }
  }

  return (
    <div
      ref={sectionRef}
      style={{
        border: "0.5px solid rgba(255,255,255,0.09)",
        borderRadius: 16,
        background: "#0B1120",
        overflow: "hidden",
      }}
    >
      {/* Header — tüm satır tıklanabilir, 52px min yükseklik */}
      <button
        onClick={toggle}
        className="w-full flex items-center justify-between gap-3 px-4 text-left"
        style={{ minHeight: 52 }}
        aria-expanded={open}
      >
        <span className="text-[14px] font-semibold text-white">{title}</span>

        <div className="flex items-center gap-2 shrink-0">
          {badge && (
            <span
              className="text-[11px] truncate max-w-[140px]"
              style={{ color: "rgba(148,163,184,0.65)" }}
            >
              {badge}
            </span>
          )}
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="rgba(148,163,184,0.5)"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              transition: "transform 0.22s ease",
              transform: open ? "rotate(180deg)" : "rotate(0deg)",
              flexShrink: 0,
            }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </button>

      {/* Animasyonlu içerik */}
      <div
        style={{
          maxHeight: open ? "2000px" : "0px",
          overflow: "hidden",
          transition: open
            ? "max-height 0.35s cubic-bezier(0.4,0,0.2,1)"
            : "max-height 0.22s ease-in",
        }}
      >
        <div
          style={{ borderTop: "0.5px solid rgba(255,255,255,0.07)" }}
          className="px-4 pt-4 pb-5"
        >
          {children}
        </div>
      </div>
    </div>
  );
}
