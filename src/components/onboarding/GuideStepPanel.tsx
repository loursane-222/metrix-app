"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import type { OnboardingStep } from "@/lib/onboarding/registry";

type GuideStepPanelProps = {
  step: OnboardingStep;
};

export default function GuideStepPanel({ step }: GuideStepPanelProps) {
  const pathname = usePathname();
  const [dismissedKey, setDismissedKey] = useState("");
  const panelKey = `${pathname}:${step.key}`;
  const dismissed = dismissedKey === panelKey;

  useEffect(() => {
    setDismissedKey("");
  }, [panelKey]);

  if (dismissed) return null;

  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.08] via-white/[0.05] to-blue-500/[0.08] p-4 text-white shadow-[0_16px_48px_rgba(0,0,0,0.20)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-blue-300/20 bg-blue-400/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-blue-200">
            <span>{step.order}. adım</span>
            <span className="h-1 w-1 rounded-full bg-blue-300" />
            <span>{step.title}</span>
          </div>
          <h3 className="text-base font-black tracking-tight md:text-lg">
            {step.pageGuide.title}
          </h3>
          <p className="mt-1 text-sm font-semibold leading-6 text-blue-100">
            {step.pageGuide.promise}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setDismissedKey(panelKey)}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-lg leading-none text-slate-400 transition hover:bg-white/10 hover:text-white"
          aria-label="Rehber panelini kapat"
        >
          ×
        </button>
      </div>

      <div className="mt-3 rounded-xl border border-white/8 bg-white/[0.04] px-3 py-2.5">
        <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
          Metrix bunu neden istiyor?
        </div>
        <p className="mt-1 text-xs leading-5 text-slate-300">{step.pageGuide.why}</p>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {step.pageGuide.bullets.map((bullet, index) => (
          <div
            key={bullet}
            className="flex items-center gap-2 rounded-xl border border-white/8 bg-white/[0.04] px-3 py-2"
          >
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white text-[10px] font-black text-slate-950">
              {index + 1}
            </span>
            <span className="text-xs font-semibold text-slate-200">{bullet}</span>
          </div>
        ))}
      </div>

      <div className="mt-3 rounded-xl border border-emerald-300/15 bg-emerald-400/[0.08] px-3 py-2.5">
        <div className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-200">
          Bu adım tamamlanınca
        </div>
        <p className="mt-1 text-xs leading-5 text-emerald-50/90">{step.pageGuide.outcome}</p>
      </div>
    </div>
  );
}
