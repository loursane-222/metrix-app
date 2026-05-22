"use client";

interface MobilePageContainerProps {
  children: React.ReactNode;
  /** Sticky header varsa üstten offset */
  hasHeader?: boolean;
  /** Tab bar varsa alttan offset */
  hasTabBar?: boolean;
  className?: string;
}

/**
 * Dashboard mobile sayfaları için standart wrapper.
 * md: breakpoint üzerinde görünmez — desktop layout etkilenmez.
 */
export function MobilePageContainer({
  children,
  hasHeader = false,
  hasTabBar = true,
  className = "",
}: MobilePageContainerProps) {
  return (
    <div
      className={[
        "md:hidden",
        "min-h-[100dvh]",
        "bg-[#030712]",
        "overflow-x-hidden",
        hasHeader ? "pt-[calc(52px+env(safe-area-inset-top,0px))]" : "",
        hasTabBar ? "pb-tab-bar" : "pb-safe",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </div>
  );
}
