"use client";

interface MobileDarkCardProps {
  children: React.ReactNode;
  className?: string;
  /** Semantik renk tonu */
  tone?: "default" | "emerald" | "amber" | "red" | "blue";
}

const TONE_STYLES: Record<
  NonNullable<MobileDarkCardProps["tone"]>,
  { background: string; border: string }
> = {
  default: {
    background: "#0B1120",
    border: "0.5px solid rgba(255,255,255,0.09)",
  },
  emerald: {
    background: "rgba(34,197,94,0.08)",
    border: "0.5px solid rgba(34,197,94,0.20)",
  },
  amber: {
    background: "rgba(245,158,11,0.08)",
    border: "0.5px solid rgba(245,158,11,0.20)",
  },
  red: {
    background: "rgba(239,68,68,0.08)",
    border: "0.5px solid rgba(239,68,68,0.20)",
  },
  blue: {
    background: "rgba(59,130,246,0.08)",
    border: "0.5px solid rgba(59,130,246,0.20)",
  },
};

/**
 * Standart dark surface kart.
 * Tüm yeni mobile kartlar bu component'i temel alır.
 */
export function MobileDarkCard({
  children,
  className = "",
  tone = "default",
}: MobileDarkCardProps) {
  const s = TONE_STYLES[tone];
  return (
    <div
      className={`rounded-2xl p-4 ${className}`}
      style={{ background: s.background, border: s.border }}
    >
      {children}
    </div>
  );
}
