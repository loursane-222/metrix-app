import type { ReactNode } from "react";
import MetrixGuideLauncher from "@/components/onboarding/MetrixGuideLauncher";
import type { MobileSeg } from "./types";

type OperationsCockpitShellProps = {
  mobileSeg: MobileSeg;
  onSegmentChange: (seg: MobileSeg) => void;
  title: string;
  subtitle: string;
  hasLiveAlerts: boolean;
  hasRiskAlerts: boolean;
  children: ReactNode;
};

const MOBILE_SEGMENTS: Array<{ id: MobileSeg; label: string }> = [
  { id: "live", label: "Canlı" },
  { id: "today", label: "Bugün" },
  { id: "calendar", label: "Takvim" },
  { id: "team", label: "Ekip" },
  { id: "risks", label: "Riskler" },
];

export function OperationsCockpitShell({
  mobileSeg,
  onSegmentChange,
  title,
  subtitle,
  hasLiveAlerts,
  hasRiskAlerts,
  children,
}: OperationsCockpitShellProps) {
  return (
    <div className="md:hidden">
      <div className="sticky top-0 z-30 -mx-4 border-b border-white/[0.06] bg-[#030712]/95 backdrop-blur-md">
        <div className="px-4 pb-2 pt-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-[0.22em] text-blue-400">Metrix · İş Programı</p>
              <h1 className="mt-0.5 text-lg font-black text-white">{title}</h1>
            </div>
            <MetrixGuideLauncher compact className="mt-0.5 shrink-0 min-h-[28px] bg-white/[0.04] px-2.5 py-1 text-[10px] border-white/[0.08]" />
          </div>
          <p className="text-[11px] text-slate-400">{subtitle}</p>
          <div className="mt-2 flex gap-1 rounded-2xl border border-white/[0.08] bg-white/[0.04] p-1">
            {MOBILE_SEGMENTS.map(({ id, label }) => {
              const liveActive = id === "live" && hasLiveAlerts;
              const riskActive = id === "risks" && hasRiskAlerts;
              return (
                <button
                  key={id}
                  onClick={() => onSegmentChange(id)}
                  className={[
                    "relative flex-1 rounded-xl py-1.5 text-[11px] font-bold transition-all",
                    mobileSeg === id ? "bg-blue-600 text-white shadow-lg shadow-blue-900/40" : "text-slate-400 hover:text-white",
                  ].join(" ")}
                >
                  {label}
                  {liveActive && <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />}
                  {riskActive && <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-red-500" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <div className="pb-[calc(88px+env(safe-area-inset-bottom,0px))]">
        {children}
      </div>
    </div>
  );
}
