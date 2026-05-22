"use client";

interface MobileStickyHeaderProps {
  title: string;
  /** Geri butonu için callback. Verilmezse buton gösterilmez. */
  onBack?: () => void;
  backLabel?: string;
  /** Sağ tarafa yerleştirilen opsiyonel aksiyon */
  right?: React.ReactNode;
}

/**
 * Sayfanın üstüne sabitlenmiş nav bar.
 * Safe-area-inset-top'u otomatik hesaplar.
 * Sadece mobile'da görünür (md:hidden).
 */
export function MobileStickyHeader({
  title,
  onBack,
  backLabel = "Geri",
  right,
}: MobileStickyHeaderProps) {
  return (
    <div
      className="fixed top-0 left-0 right-0 z-[90] md:hidden"
      style={{
        paddingTop: "env(safe-area-inset-top, 0px)",
        background: "rgba(3,7,18,0.94)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderBottom: "0.5px solid rgba(255,255,255,0.07)",
      }}
    >
      <div className="flex items-center gap-2 px-4 h-[52px]">
        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-1 shrink-0 min-w-[44px] min-h-[44px] -ml-1 text-blue-400"
            aria-label="Geri"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
            <span className="text-[14px] font-medium">{backLabel}</span>
          </button>
        )}

        <h1 className="flex-1 text-[15px] font-semibold text-white truncate">
          {title}
        </h1>

        {right && <div className="shrink-0">{right}</div>}
      </div>
    </div>
  );
}
