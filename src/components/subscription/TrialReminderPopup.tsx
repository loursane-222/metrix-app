"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type TrialStatus = {
  isDemo?: boolean;
  isTrialActive?: boolean;
  isTrialExpired?: boolean;
  daysLeft?: number;
  daysUsed?: number;
  shouldShowTrialReminder?: boolean;
};

type CurrentUser = {
  userId?: string | null;
  abonelikPlani?: string | null;
  trial?: TrialStatus | null;
};

function getReminderTitle(daysUsed: number, daysLeft: number): string {
  if (daysUsed === 9) return "Demo sürenizin son 5 günü";
  if (daysUsed === 11) return "Demo sürenizin son 3 günü";
  if (daysUsed === 13) return "Demo sürenizin son 1 günü";
  return `Demo sürenizin son ${daysLeft} günü`;
}

export default function TrialReminderPopup() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/auth/current-user", { credentials: "include", cache: "no-store" })
      .then((res) => {
        if (!res.ok) return null;
        return res.json();
      })
      .then((data) => {
        if (!cancelled) setCurrentUser(data || null);
      })
      .catch(() => {
        if (!cancelled) setCurrentUser(null);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const trial = currentUser?.trial;
  const daysUsed = trial?.daysUsed ?? 0;
  const daysLeft = trial?.daysLeft ?? 0;
  const isExpired = Boolean(trial?.isTrialExpired);
  const shouldShowReminder = Boolean(trial?.shouldShowTrialReminder);
  const storageKey = `metrix_trial_popup_dismissed_day_${daysUsed}`;

  useEffect(() => {
    if (!shouldShowReminder || isExpired) {
      setDismissed(false);
      return;
    }

    setDismissed(localStorage.getItem(storageKey) === "1");
  }, [isExpired, shouldShowReminder, storageKey]);

  const copy = useMemo(() => {
    if (isExpired) {
      return {
        title: "Demo süreniz sona erdi",
        body: "Metrix’i kullanmaya devam etmek için lütfen size uygun paketi seçin.",
      };
    }

    return {
      title: getReminderTitle(daysUsed, daysLeft),
      body: "Tüm özellikleri kullanmaya devam etmek için paketleri şimdiden inceleyebilirsiniz.",
    };
  }, [daysLeft, daysUsed, isExpired]);

  if (!currentUser?.userId || currentUser.abonelikPlani !== "demo") return null;
  if (!isExpired && (!shouldShowReminder || dismissed)) return null;

  function closeReminder() {
    if (isExpired) return;
    localStorage.setItem(storageKey, "1");
    setDismissed(true);
  }

  function goToPlans() {
    router.push(isExpired ? "/dashboard/abonelik?expired=1" : "/dashboard/abonelik");
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/70 px-4 py-6 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-[#111936] text-white shadow-[0_28px_100px_rgba(0,0,0,0.45)]">
        <div className="border-b border-white/10 bg-white/[0.04] px-5 py-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-blue-300">
            Metrix Demo
          </p>
          <h2 className="mt-2 text-2xl font-black tracking-tight">{copy.title}</h2>
        </div>
        <div className="space-y-4 px-5 py-5">
          <p className="text-sm leading-6 text-slate-300">{copy.body}</p>
          {!isExpired && (
            <div className="rounded-2xl border border-emerald-300/20 bg-emerald-400/10 px-4 py-3 text-sm font-semibold text-emerald-100">
              Demo bitimine {daysLeft} gün kaldı.
            </div>
          )}
          {isExpired && (
            <div className="rounded-2xl border border-amber-300/20 bg-amber-400/10 px-4 py-3 text-sm font-semibold text-amber-100">
              Paket seçerek hesabınızı kaldığınız yerden kullanmaya devam edebilirsiniz.
            </div>
          )}
          <div className="flex flex-col gap-2 sm:flex-row">
            {!isExpired && (
              <button
                type="button"
                onClick={closeReminder}
                className="min-h-[44px] flex-1 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-bold text-slate-200 transition hover:bg-white/[0.08]"
              >
                Daha sonra
              </button>
            )}
            <button
              type="button"
              onClick={goToPlans}
              className="min-h-[44px] flex-1 rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-blue-100"
            >
              Paketleri Gör
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
