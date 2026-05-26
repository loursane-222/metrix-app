"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { onboardingSteps, type OnboardingStep, type OnboardingStepKey } from "@/lib/onboarding/registry";
import { useOnboardingStatus } from "@/hooks/useOnboardingStatus";
import OnboardingWelcomeModal from "./OnboardingWelcomeModal";
import OnboardingCoachmark from "./OnboardingCoachmark";

const CHECKLIST_DISMISS_KEY = "metrix_onboarding_checklist_dismissed";
const CHECKLIST_OPEN_EVENT = "metrix:onboarding_checklist_open";
const TOUR_OPEN_EVENT = "metrix:onboarding_tour_open";
const TOUR_SEEN_KEY = "metrix_guide_tour_seen";
const TOUR_ACTIVE_KEY = "metrix_guide_tour_active";
const TOUR_STEP_KEY = "metrix_guide_current_step";
const TOUR_WELCOME_FLAG = "metrix_guide_show_welcome";

function isStepKey(value: string | null): value is OnboardingStepKey {
  return !!value && onboardingSteps.some((step) => step.key === value);
}

function openChecklist() {
  try {
    localStorage.removeItem(CHECKLIST_DISMISS_KEY);
  } catch {}
  window.dispatchEvent(new CustomEvent(CHECKLIST_OPEN_EVENT));
}

export default function OnboardingTourController() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data } = useOnboardingStatus();
  const [welcomeOpen, setWelcomeOpen] = useState(false);
  const [activeStepKey, setActiveStepKey] = useState<OnboardingStepKey | null>(null);

  const orderedSteps = useMemo(
    () => onboardingSteps.slice().sort((a, b) => a.order - b.order),
    []
  );

  const activeStep = useMemo<OnboardingStep | null>(
    () => orderedSteps.find((step) => step.key === activeStepKey) ?? null,
    [activeStepKey, orderedSteps]
  );

  const firstMissingStep = useCallback(() => {
    return orderedSteps.find((step) => !data?.steps?.[step.key]) ?? orderedSteps[0] ?? null;
  }, [data?.steps, orderedSteps]);

  const startTour = useCallback((preferredStep?: OnboardingStepKey | null) => {
    openChecklist();
    const step =
      (preferredStep && orderedSteps.find((item) => item.key === preferredStep)) ||
      firstMissingStep();

    if (!step) return;

    setWelcomeOpen(false);
    setActiveStepKey(step.key);
    try {
      localStorage.setItem(TOUR_SEEN_KEY, "1");
      localStorage.setItem(TOUR_ACTIVE_KEY, "1");
      localStorage.setItem(TOUR_STEP_KEY, step.key);
    } catch {}
  }, [firstMissingStep, orderedSteps]);

  const closeTour = useCallback(() => {
    setWelcomeOpen(false);
    setActiveStepKey(null);
    try {
      localStorage.setItem(TOUR_SEEN_KEY, "1");
      localStorage.removeItem(TOUR_ACTIVE_KEY);
      localStorage.removeItem(TOUR_STEP_KEY);
    } catch {}
  }, []);

  useEffect(() => {
    function handleOpenTour() {
      openChecklist();
      setActiveStepKey(null);
      setWelcomeOpen(true);
      try {
        localStorage.setItem(TOUR_ACTIVE_KEY, "1");
      } catch {}
    }

    window.addEventListener(TOUR_OPEN_EVENT, handleOpenTour);
    return () => window.removeEventListener(TOUR_OPEN_EVENT, handleOpenTour);
  }, []);

  useEffect(() => {
    if (searchParams.get("guide") !== "1") return;

    const stepFromUrl = searchParams.get("step");
    const storedStep = typeof window !== "undefined" ? localStorage.getItem(TOUR_STEP_KEY) : null;
    const stepKey = isStepKey(stepFromUrl)
      ? stepFromUrl
      : isStepKey(storedStep)
      ? storedStep
      : null;

    openChecklist();
    if (pathname === "/dashboard") {
      let shouldShowWelcome = false;
      try {
        shouldShowWelcome = sessionStorage.getItem(TOUR_WELCOME_FLAG) === "1";
        sessionStorage.removeItem(TOUR_WELCOME_FLAG);
      } catch {}

      if (shouldShowWelcome) {
        setActiveStepKey(null);
        setWelcomeOpen(true);
        return;
      }
      startTour(stepKey);
    } else {
      setWelcomeOpen(false);
      setActiveStepKey(null);
      if (stepKey) {
        try {
          localStorage.setItem(TOUR_ACTIVE_KEY, "1");
          localStorage.setItem(TOUR_STEP_KEY, stepKey);
        } catch {}
      }
    }
  }, [pathname, searchParams, startTour]);

  function handleMissingTarget() {
    if (window.innerWidth < 768) {
      setActiveStepKey(null);
      document
        .getElementById("metrix-onboarding-checklist")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  return (
    <>
      <OnboardingWelcomeModal
        open={welcomeOpen}
        onStart={() => startTour(null)}
        onClose={closeTour}
      />
      <OnboardingCoachmark
        activeStep={activeStep}
        onClose={closeTour}
        onMissingTarget={handleMissingTarget}
      />
    </>
  );
}
