"use client";

import { useEffect, useState } from "react";
import MetrixGuideLauncher from "./MetrixGuideLauncher";
import { useOnboardingStatus } from "@/hooks/useOnboardingStatus";

const CUE_SEEN_KEY = "metrix_guide_launcher_cue_seen";

export default function DashboardGuideLauncher() {
  const { data, loading } = useOnboardingStatus();
  const [showCue, setShowCue] = useState(false);

  useEffect(() => {
    if (loading) return;

    const onboardingComplete =
      data && data.totalCount > 0 && data.completedCount >= data.totalCount;
    if (onboardingComplete) return;

    try {
      if (localStorage.getItem(CUE_SEEN_KEY) === "1") return;
    } catch {}

    setShowCue(true);
    const timer = window.setTimeout(() => setShowCue(false), 5500);
    return () => window.clearTimeout(timer);
  }, [data, loading]);

  function markCueSeen() {
    try {
      localStorage.setItem(CUE_SEEN_KEY, "1");
    } catch {}
    setShowCue(false);
  }

  return (
    <div className="fixed right-5 top-[76px] z-[60] hidden md:block">
      {showCue && (
        <div className="pointer-events-none absolute right-0 top-[calc(100%+8px)] whitespace-nowrap rounded-full border border-white/15 bg-slate-950/88 px-3 py-1.5 text-[11px] font-semibold text-blue-100 shadow-[0_14px_38px_rgba(0,0,0,0.24)] backdrop-blur-md">
          Buradan başla
        </div>
      )}
      <div className={showCue ? "metrix-guide-cue-halo rounded-full" : ""}>
        <MetrixGuideLauncher
          className="bg-slate-950/82 shadow-[0_12px_34px_rgba(0,0,0,0.22)]"
          onOpen={markCueSeen}
        />
      </div>
    </div>
  );
}
