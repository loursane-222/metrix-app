"use client";

import { useCallback, useEffect, useState } from "react";
import type { OnboardingStepKey } from "@/lib/onboarding/registry";

export type OnboardingStatus = {
  steps: Record<OnboardingStepKey, boolean>;
  completedCount: number;
  totalCount: number;
  progressPercent: number;
};

type UseOnboardingStatusReturn = {
  data: OnboardingStatus | null;
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
};

export function useOnboardingStatus(): UseOnboardingStatusReturn {
  const [data, setData] = useState<OnboardingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setError("");
    try {
      const res = await fetch("/api/onboarding/status", {
        cache: "no-store",
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.hata || "Onboarding durumu alınamadı.");
      setData(json);
    } catch (e: any) {
      setError(e?.message || "Onboarding durumu alınamadı.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    function handleFocus() {
      refresh();
    }

    function handleVisibility() {
      if (document.visibilityState === "visible") refresh();
    }

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [refresh]);

  return { data, loading, error, refresh };
}
