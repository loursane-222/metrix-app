"use client";

import { usePathname, useRouter } from "next/navigation";

type MetrixGuideLauncherProps = {
  className?: string;
  compact?: boolean;
  onOpen?: () => void;
};

const DISMISS_KEY = "metrix_onboarding_checklist_dismissed";
const OPEN_EVENT = "metrix:onboarding_checklist_open";
const TOUR_OPEN_EVENT = "metrix:onboarding_tour_open";
const TOUR_WELCOME_FLAG = "metrix_guide_show_welcome";
const CUE_SEEN_KEY = "metrix_guide_launcher_cue_seen";

export default function MetrixGuideLauncher({
  className = "",
  compact = false,
  onOpen,
}: MetrixGuideLauncherProps) {
  const pathname = usePathname();
  const router = useRouter();

  function scrollToChecklist() {
    onOpen?.();
    try {
      localStorage.setItem(CUE_SEEN_KEY, "1");
    } catch {}

    if (pathname !== "/dashboard") {
      try {
        sessionStorage.setItem(TOUR_WELCOME_FLAG, "1");
      } catch {}
      router.push("/dashboard?guide=1");
      return;
    }

    try {
      localStorage.removeItem(DISMISS_KEY);
    } catch {}

    window.dispatchEvent(new CustomEvent(OPEN_EVENT));
    window.dispatchEvent(new CustomEvent(TOUR_OPEN_EVENT));

    window.setTimeout(() => {
      document
        .getElementById("metrix-onboarding-checklist")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }

  return (
    <button
      type="button"
      onClick={scrollToChecklist}
      className={[
        "inline-flex min-h-[36px] items-center justify-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-[11px] font-semibold text-slate-200 shadow-[0_8px_24px_rgba(0,0,0,0.16)] backdrop-blur-md transition hover:border-blue-300/30 hover:bg-white/[0.07] hover:text-white active:scale-[0.98] md:min-h-[40px] md:px-4 md:text-xs",
        className,
      ].join(" ")}
      aria-label="Metrix Rehberi"
    >
      <span aria-hidden>🎓</span>
      {compact ? (
        <span>Rehber</span>
      ) : (
        <>
          <span className="hidden sm:inline">Metrix Rehberi</span>
          <span className="sm:hidden">Rehber</span>
        </>
      )}
    </button>
  );
}
