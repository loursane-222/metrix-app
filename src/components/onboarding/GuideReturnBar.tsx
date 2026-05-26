"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { onboardingSteps, type OnboardingStepKey } from "@/lib/onboarding/registry";

function withGuideParams(href: string, stepKey?: OnboardingStepKey) {
  const [path, query = ""] = href.split("?");
  const params = new URLSearchParams(query);
  params.set("guide", "1");
  if (stepKey) params.set("step", stepKey);
  return `${path}?${params.toString()}`;
}

function isStepKey(value: string | null): value is OnboardingStepKey {
  return !!value && onboardingSteps.some((step) => step.key === value);
}

export default function GuideReturnBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const guideActive = searchParams.get("guide") === "1";
  const stepParam = searchParams.get("step");

  if (!guideActive || pathname === "/dashboard" || pathname.startsWith("/dashboard/onboarding")) {
    return null;
  }

  const activeStep = isStepKey(stepParam)
    ? onboardingSteps.find((step) => step.key === stepParam)
    : null;
  const activeIndex = activeStep
    ? onboardingSteps.findIndex((step) => step.key === activeStep.key)
    : -1;
  const nextStep = activeIndex >= 0 ? onboardingSteps[activeIndex + 1] : null;

  return (
    <div className="sticky top-0 z-[35] border-b border-white/10 bg-[#030712]/90 px-3 py-2 backdrop-blur-xl md:px-6">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-white shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
        <div className="flex min-w-0 items-center gap-2">
          <span className="h-2 w-2 shrink-0 rounded-full bg-blue-300 shadow-[0_0_18px_rgba(96,165,250,0.7)]" />
          <div className="min-w-0">
            <p className="truncate text-[11px] font-bold uppercase tracking-[0.16em] text-blue-200">
              Metrix Rehberi aktif
              {activeStep ? (
                <span className="ml-2 normal-case tracking-normal text-slate-300">
                  {activeStep.order}. {activeStep.title}
                </span>
              ) : null}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 gap-1.5">
          <Link
            href="/dashboard?guide=1"
            className="inline-flex min-h-[30px] items-center justify-center rounded-full border border-white/10 bg-white/10 px-3 text-[11px] font-bold text-white transition hover:bg-white/15"
          >
            Rehbere dön
          </Link>
          {nextStep && (
            <Link
              href={withGuideParams(nextStep.href, nextStep.key)}
              className="inline-flex min-h-[30px] items-center justify-center rounded-full bg-white px-3 text-[11px] font-bold text-slate-950 transition hover:bg-blue-50"
            >
              Sonraki adım
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
