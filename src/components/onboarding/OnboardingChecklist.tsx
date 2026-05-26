"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { onboardingSteps, type OnboardingStepKey } from "@/lib/onboarding/registry";
import { useOnboardingStatus } from "@/hooks/useOnboardingStatus";

const DISMISS_KEY = "metrix_onboarding_checklist_dismissed";
const OPEN_EVENT = "metrix:onboarding_checklist_open";

function withGuideParams(href: string, stepKey: OnboardingStepKey) {
  const [path, query = ""] = href.split("?");
  const params = new URLSearchParams(query);
  params.set("guide", "1");
  params.set("step", stepKey);
  return `${path}?${params.toString()}`;
}

function SkeletonStep() {
  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white/70 p-3">
      <div className="mb-3 h-4 w-2/3 animate-pulse rounded-full bg-slate-200" />
      <div className="h-3 w-full animate-pulse rounded-full bg-slate-100" />
    </div>
  );
}

export default function OnboardingChecklist() {
  const { data, loading, error } = useOnboardingStatus();
  const searchParams = useSearchParams();
  const [dismissed, setDismissed] = useState(true);

  const orderedSteps = useMemo(
    () => onboardingSteps.slice().sort((a, b) => a.order - b.order),
    []
  );

  useEffect(() => {
    if (searchParams.get("guide") === "1") {
      setDismissed(false);
    }
  }, [searchParams]);

  useEffect(() => {
    function openChecklist() {
      try {
        localStorage.removeItem(DISMISS_KEY);
      } catch {}
      setDismissed(false);
    }

    window.addEventListener(OPEN_EVENT, openChecklist);
    return () => window.removeEventListener(OPEN_EVENT, openChecklist);
  }, []);

  useEffect(() => {
    if (searchParams.get("guide") !== "1") return;
    try {
      localStorage.removeItem(DISMISS_KEY);
    } catch {}
    setDismissed(false);
    window.setTimeout(() => {
      document
        .getElementById("metrix-onboarding-checklist")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  }, [searchParams]);

  const completedCount = data?.completedCount ?? 0;
  const totalCount = data?.totalCount ?? onboardingSteps.length;
  const progressPercent = data?.progressPercent ?? 0;
  const allDone = !loading && totalCount > 0 && completedCount === totalCount;
  const nextStepKey = orderedSteps.find((step) => !data?.steps?.[step.key])?.key ?? null;

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {}
    setDismissed(true);
  }

  if (error || dismissed) return null;

  return (
    <section
      id="metrix-onboarding-checklist"
      className="scroll-mt-20 rounded-[28px] border border-white/70 bg-gradient-to-br from-slate-50 via-white to-blue-50/80 p-4 text-slate-950 shadow-[0_20px_70px_rgba(15,23,42,0.18)] md:p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-blue-600">
            AI Operasyon Kurulumu
          </p>
          <h2 className="mt-1 text-xl font-black tracking-tight text-slate-950 md:text-2xl">
            Metrix'i işletmene göre kur. Teklif, üretim ve tahsilat aynı akışta çalışsın.
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
            Adımları sırayla tamamla; Metrix gerçek maliyeti, iş programını ve nakit akışını birlikte okumaya başlasın.
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white/80 text-lg leading-none text-slate-400 shadow-sm transition hover:border-slate-300 hover:text-slate-700"
          aria-label="Metrix rehberi kapat"
        >
          ×
        </button>
      </div>

      <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0 rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm font-medium text-slate-600">
          {nextStepKey && !loading ? (
            <>
              Sıradaki öneri:{" "}
              <span className="font-bold text-slate-950">
                {orderedSteps.find((step) => step.key === nextStepKey)?.title}
              </span>
            </>
          ) : (
            "Kurulum akışı mevcut verilerine göre canlı güncellenir."
          )}
        </div>
        <div className="shrink-0 rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-left shadow-sm md:text-right">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
            İlerleme
          </p>
          <p className="mt-1 text-2xl font-black text-slate-950">
            {loading ? "—" : `${completedCount}/${totalCount}`}
          </p>
          <p className="text-xs font-medium text-slate-500">tamamlandı</p>
        </div>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200/80">
        <div
          className="h-full rounded-full bg-gradient-to-r from-blue-500 via-sky-400 to-emerald-400 transition-all duration-700"
          style={{ width: `${loading ? 12 : progressPercent}%` }}
        />
      </div>

      {allDone && (
        <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          Kurulum tamam. Metrix artık satış, üretim ve nakit akışını birlikte okuyor.
        </div>
      )}

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {loading
          ? [0, 1, 2, 3].map((i) => <SkeletonStep key={i} />)
          : orderedSteps.map((step) => {
              const done = !!data?.steps?.[step.key];
              const isNext = step.key === nextStepKey;
              return (
                <div
                  key={step.key}
                  className={[
                    "group rounded-2xl border bg-white/80 p-3.5 shadow-sm transition",
                    done
                      ? "border-emerald-200/90"
                      : isNext
                      ? "border-blue-300 shadow-[0_12px_34px_rgba(37,99,235,0.14)]"
                      : "border-slate-200/90 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md",
                  ].join(" ")}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={[
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl text-sm font-black tabular-nums",
                        done
                          ? "bg-emerald-50 text-emerald-700"
                          : isNext
                          ? "bg-blue-600 text-white"
                          : "bg-slate-100 text-slate-700",
                      ].join(" ")}
                      aria-hidden
                    >
                      {done ? "✓" : step.order}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm font-bold leading-tight text-slate-950">
                          {step.title}
                        </h3>
                        <span
                          className={[
                            "shrink-0 rounded-full px-2 py-1 text-[10px] font-bold",
                            done
                              ? "bg-emerald-50 text-emerald-700"
                              : isNext
                              ? "bg-blue-50 text-blue-700"
                              : "bg-slate-100 text-slate-500",
                          ].join(" ")}
                        >
                          {done ? "Tamamlandı" : isNext ? "Sıradaki adım" : "Sırada"}
                        </span>
                      </div>
                      <p className="mt-1 text-xs font-medium text-slate-500">
                        {step.shortDescription}
                      </p>
                      <p className="mt-2 text-[12px] leading-5 text-slate-600">
                        {step.wowCopy}
                      </p>
                      <Link
                        href={withGuideParams(step.href, step.key)}
                        className={[
                          "mt-3 inline-flex items-center rounded-full px-3 py-1.5 text-[11px] font-bold transition",
                          done
                            ? "bg-slate-100 text-slate-500 hover:bg-slate-200"
                            : "bg-slate-950 text-white hover:bg-blue-600",
                        ].join(" ")}
                      >
                        {done ? "Gözden geçir" : "Bu adımı tamamla"}
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
      </div>
    </section>
  );
}
