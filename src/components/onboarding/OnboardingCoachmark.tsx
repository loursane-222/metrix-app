"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { OnboardingStep } from "@/lib/onboarding/registry";

type OnboardingCoachmarkProps = {
  activeStep: OnboardingStep | null;
  onClose: () => void;
  onMissingTarget?: () => void;
};

type TooltipPosition = {
  top: number;
  left: number;
};

function withGuideParams(href: string, stepKey: string) {
  const [path, query = ""] = href.split("?");
  const params = new URLSearchParams(query);
  params.set("guide", "1");
  params.set("step", stepKey);
  return `${path}?${params.toString()}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export default function OnboardingCoachmark({
  activeStep,
  onClose,
  onMissingTarget,
}: OnboardingCoachmarkProps) {
  const [position, setPosition] = useState<TooltipPosition | null>(null);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const href = useMemo(
    () => (activeStep ? withGuideParams(activeStep.href, activeStep.key) : "#"),
    [activeStep]
  );

  useEffect(() => {
    if (!activeStep) {
      setPosition(null);
      setTargetRect(null);
      return;
    }

    const step = activeStep;
    let target: HTMLElement | null = null;
    let attachedTarget: HTMLElement | null = null;
    let frame = 0;
    const guideHref = withGuideParams(step.href, step.key);

    function handleTargetClick(event: MouseEvent) {
      event.preventDefault();
      window.location.href = guideHref;
    }

    function cleanup() {
      if (target) target.classList.remove("metrix-onboarding-pulse");
      if (attachedTarget) attachedTarget.removeEventListener("click", handleTargetClick);
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    }

    function updatePosition() {
      target = document.querySelector(
        `[data-onboarding-target="${step.target}"]`
      ) as HTMLElement | null;

      if (!target) {
        setPosition(null);
        setTargetRect(null);
        onMissingTarget?.();
        return;
      }

      target.classList.add("metrix-onboarding-pulse");
      if (attachedTarget !== target) {
        if (attachedTarget) attachedTarget.removeEventListener("click", handleTargetClick);
        target.addEventListener("click", handleTargetClick);
        attachedTarget = target;
      }
      const rect = target.getBoundingClientRect();
      setTargetRect(rect);

      const tooltipWidth = Math.min(320, window.innerWidth - 24);
      const tooltipHeight = 180;
      const gap = 14;
      let top = rect.bottom + gap;
      let left = rect.left;

      if (step.placement === "right" && window.innerWidth >= 768) {
        top = rect.top + rect.height / 2 - tooltipHeight / 2;
        left = rect.right + gap;
      } else if (step.placement === "top") {
        top = rect.top - tooltipHeight - gap;
        left = rect.left;
      }

      setPosition({
        top: clamp(top, 12, window.innerHeight - tooltipHeight - 12),
        left: clamp(left, 12, window.innerWidth - tooltipWidth - 12),
      });
    }

    frame = window.requestAnimationFrame(updatePosition);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return cleanup;
  }, [activeStep, onMissingTarget]);

  if (!activeStep || !position || !targetRect) return null;

  return (
    <>
      <div className="pointer-events-none fixed inset-0 z-[85] bg-slate-950/10" />
      <div
        className="pointer-events-none fixed z-[86] rounded-[22px] border border-blue-300/70 shadow-[0_0_0_9999px_rgba(2,6,23,0.28),0_0_38px_rgba(59,130,246,0.34)]"
        style={{
          top: targetRect.top - 6,
          left: targetRect.left - 6,
          width: targetRect.width + 12,
          height: targetRect.height + 12,
        }}
      />
      <div
        className="fixed z-[90] w-[min(320px,calc(100vw-24px))] rounded-3xl border border-white/70 bg-white p-4 text-slate-950 shadow-[0_24px_80px_rgba(15,23,42,0.28)]"
        style={{ top: position.top, left: position.left }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-600">
              {activeStep.order}. adım
            </p>
            <h3 className="mt-1 text-base font-black tracking-tight">
              {activeStep.coachmarkTitle}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 text-lg leading-none text-slate-400 transition hover:text-slate-800"
            aria-label="Rehberi kapat"
          >
            ×
          </button>
        </div>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          {activeStep.coachmarkCopy}
        </p>
        <Link
          href={href}
          className="mt-4 inline-flex min-h-[38px] items-center justify-center rounded-full bg-slate-950 px-4 text-xs font-bold text-white transition hover:bg-blue-600"
        >
          Bu adımı aç
        </Link>
      </div>
    </>
  );
}
