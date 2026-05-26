"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { onboardingSteps } from "@/lib/onboarding/registry";

type CoachPosition = {
  top: number;
  left: number;
};

const STEP_ROUTES: Record<string, string> = {
  personel: "/dashboard/personel",
  atolye_gideri: "/dashboard/atolye",
  musteri: "/dashboard/musteriler",
  ilk_teklif: "/dashboard/yeni-is-v3",
  is_programi: "/dashboard/is-programi",
  tahsilat: "/dashboard/tahsilatlar",
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function isVisibleTarget(element: HTMLElement) {
  const rect = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);
  return (
    rect.width > 0 &&
    rect.height > 0 &&
    rect.right > 0 &&
    rect.bottom > 0 &&
    rect.left < window.innerWidth &&
    rect.top < window.innerHeight &&
    style.display !== "none" &&
    style.visibility !== "hidden" &&
    style.opacity !== "0"
  );
}

function findVisibleTarget(target: string) {
  const elements = Array.from(
    document.querySelectorAll(`[data-onboarding-target="${target}"]`)
  ) as HTMLElement[];

  return elements.find(isVisibleTarget) ?? null;
}

export default function PageActionCoach() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const guideActive = searchParams.get("guide") === "1";
  const stepParam = searchParams.get("step");

  const activeStepKey =
    guideActive && stepParam && STEP_ROUTES[stepParam] === pathname
      ? stepParam
      : null;
  const enabled = !!activeStepKey;

  const activeOnboardingStep = useMemo(
    () =>
      activeStepKey
        ? onboardingSteps.find((s) => s.key === activeStepKey)
        : null,
    [activeStepKey]
  );
  const tourSteps = activeOnboardingStep?.pageTourSteps ?? [];
  const stepLabel = activeOnboardingStep?.title ?? "Adım";
  const completionMessage =
    activeOnboardingStep?.pageGuide?.outcome ??
    "Bu adım tamamlandı.";

  const [activeIndex, setActiveIndex] = useState(0);
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [position, setPosition] = useState<CoachPosition | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [completed, setCompleted] = useState(false);

  const activeTourStep = tourSteps[activeIndex] ?? null;

  useEffect(() => {
    setActiveIndex(0);
    setDismissed(false);
    setCompleted(false);
  }, [pathname, stepParam, guideActive]);

  useEffect(() => {
    if (!enabled || !activeTourStep || dismissed || completed) {
      setTarget(null);
      setPosition(null);
      return;
    }

    let currentTarget: HTMLElement | null = null;
    let interval: number | null = null;
    let frame = 0;
    let scrolledTarget: HTMLElement | null = null;

    function clearPulse() {
      currentTarget?.classList.remove("metrix-onboarding-pulse");
    }

    function calculatePosition(element: HTMLElement) {
      const rect = element.getBoundingClientRect();
      const width = Math.min(330, window.innerWidth - 24);
      const height = 190;
      const gap = 12;
      const mobile = window.innerWidth < 768;
      let top = rect.bottom + gap;
      let left = rect.left;

      if (!mobile && rect.right + width + gap < window.innerWidth) {
        top = rect.top + rect.height / 2 - height / 2;
        left = rect.right + gap;
      }

      if (top + height > window.innerHeight - 12) {
        top = rect.top - height - gap;
      }

      return {
        top: clamp(top, 12, Math.max(12, window.innerHeight - height - 12)),
        left: clamp(left, 12, Math.max(12, window.innerWidth - width - 12)),
      };
    }

    function scan() {
      const nextTarget = findVisibleTarget(activeTourStep.target);

      if (!nextTarget) {
        clearPulse();
        currentTarget = null;
        setTarget(null);
        setPosition(null);
        return;
      }

      if (currentTarget !== nextTarget) {
        clearPulse();
        currentTarget = nextTarget;
        currentTarget.classList.add("metrix-onboarding-pulse");
        scrolledTarget = null;
        setTarget(currentTarget);
      }

      const rect = nextTarget.getBoundingClientRect();
      if (
        scrolledTarget !== nextTarget &&
        (rect.top < 72 || rect.bottom > window.innerHeight - 96)
      ) {
        scrolledTarget = nextTarget;
        nextTarget.scrollIntoView({ behavior: "smooth", block: "center" });
      }

      setPosition(calculatePosition(nextTarget));
    }

    function handleTargetClick(event: MouseEvent) {
      if (!currentTarget || !currentTarget.contains(event.target as Node))
        return;
      const isButtonTarget = currentTarget.tagName === "BUTTON";
      if (!isButtonTarget) return;
      const isSaveStep =
        activeTourStep.key.includes("save") ||
        activeTourStep.key.includes("kaydet");
      window.setTimeout(
        () => {
          setActiveIndex((index) => {
            if (index >= tourSteps.length - 1) {
              setCompleted(true);
              return index;
            }
            return index + 1;
          });
        },
        isSaveStep ? 900 : 350
      );
    }

    frame = window.requestAnimationFrame(scan);
    interval = window.setInterval(scan, 450);
    const observer = new MutationObserver(scan);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
    });
    window.addEventListener("resize", scan);
    window.addEventListener("scroll", scan, true);
    document.addEventListener("click", handleTargetClick, true);

    return () => {
      clearPulse();
      window.cancelAnimationFrame(frame);
      if (interval) window.clearInterval(interval);
      observer.disconnect();
      window.removeEventListener("resize", scan);
      window.removeEventListener("scroll", scan, true);
      document.removeEventListener("click", handleTargetClick, true);
    };
  }, [activeTourStep, completed, dismissed, enabled, tourSteps.length]);

  if (!enabled || dismissed) return null;

  if (completed) {
    return (
      <div className="fixed bottom-[calc(92px+env(safe-area-inset-bottom,0px))] left-3 right-3 z-[320] mx-auto max-w-sm rounded-3xl border border-emerald-300/30 bg-slate-950/94 p-4 text-white shadow-[0_22px_70px_rgba(0,0,0,0.34)] backdrop-blur-xl md:bottom-6 md:left-auto md:right-6">
        <div className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-300">
          {stepLabel}
        </div>
        <h3 className="mt-1 text-base font-black">Harika.</h3>
        <p className="mt-2 text-sm leading-6 text-slate-300">
          {completionMessage}
        </p>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="mt-3 rounded-full bg-white px-4 py-2 text-xs font-bold text-slate-950"
        >
          Tamam
        </button>
      </div>
    );
  }

  if (!activeTourStep) return null;

  const bubble = (
    <div className="w-[min(330px,calc(100vw-24px))] rounded-3xl border border-white/70 bg-white p-4 text-slate-950 shadow-[0_24px_80px_rgba(15,23,42,0.28)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-600">
            Canlı operasyon koçu
          </p>
          <h3 className="mt-1 text-base font-black tracking-tight">
            {activeTourStep.title}
          </h3>
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 text-lg leading-none text-slate-400 transition hover:text-slate-800"
          aria-label="Koçu kapat"
        >
          ×
        </button>
      </div>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        {activeTourStep.copy}
      </p>
      <p className="mt-2 rounded-2xl bg-blue-50 px-3 py-2 text-xs font-semibold leading-5 text-blue-900">
        {activeTourStep.value}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {target && activeTourStep.actionLabel ? (
          <button
            type="button"
            onClick={() => target.click()}
            className="inline-flex min-h-[36px] items-center justify-center rounded-full bg-slate-950 px-4 text-xs font-bold text-white transition hover:bg-blue-600"
          >
            {activeTourStep.actionLabel}
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => {
            if (activeIndex >= tourSteps.length - 1) {
              setCompleted(true);
              return;
            }
            setActiveIndex((index) => index + 1);
          }}
          className="inline-flex min-h-[36px] items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
        >
          {activeIndex >= tourSteps.length - 1 ? "Bunu yaptım" : "Sonraki"}
        </button>
      </div>
    </div>
  );

  if (!target || !position) {
    return (
      <div className="fixed bottom-[calc(92px+env(safe-area-inset-bottom,0px))] left-3 right-3 z-[320] mx-auto max-w-sm rounded-3xl border border-white/12 bg-slate-950/94 p-4 text-white shadow-[0_22px_70px_rgba(0,0,0,0.34)] backdrop-blur-xl md:bottom-6 md:left-auto md:right-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-300">
              {stepLabel}
            </p>
            <h3 className="mt-1 text-base font-black">{activeTourStep.title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Bu hedef ekranda belirdiğinde Metrix onu otomatik işaretleyecek.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 text-lg leading-none text-slate-400"
            aria-label="Koçu kapat"
          >
            ×
          </button>
        </div>
        <div className="mt-3">
          <button
            type="button"
            onClick={() => {
              if (activeIndex >= tourSteps.length - 1) {
                setCompleted(true);
                return;
              }
              setActiveIndex((index) => index + 1);
            }}
            className="inline-flex min-h-[36px] items-center justify-center rounded-full border border-white/20 bg-white/10 px-4 text-xs font-bold text-white transition hover:bg-white/20"
          >
            {activeIndex >= tourSteps.length - 1 ? "Bunu yaptım" : "Sonraki"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed z-[320]" style={{ top: position.top, left: position.left }}>
      {bubble}
    </div>
  );
}
