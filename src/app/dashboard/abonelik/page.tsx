"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getPlanLabel,
  getPlanRank,
  getPurchasablePlanDetails,
  normalizePlan,
  type SubscriptionPlan,
} from "@/lib/subscription/plans";

type CurrentUser = {
  abonelikPlani?: string | null;
  abonelikBitis?: string | null;
};

const accentClasses: Record<string, string> = {
  slate: "border-slate-400/20 bg-slate-400/[0.05]",
  emerald: "border-emerald-400/30 bg-emerald-400/[0.07]",
  blue: "border-blue-400/35 bg-blue-500/[0.08]",
  violet: "border-violet-400/35 bg-violet-500/[0.08]",
};

export default function DashboardAbonelikPage() {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [loadingPlan, setLoadingPlan] = useState<SubscriptionPlan | null>(null);
  const [message, setMessage] = useState<{ type: "error" | "info"; text: string } | null>(null);
  const plans = useMemo(() => getPurchasablePlanDetails(), []);
  const currentPlan = normalizePlan(currentUser?.abonelikPlani);
  const currentRank = getPlanRank(currentPlan);

  useEffect(() => {
    fetch("/api/auth/current-user", { credentials: "include", cache: "no-store" })
      .then((res) => res.json())
      .then((data) => setCurrentUser(data || null))
      .catch(() => setCurrentUser(null));
  }, []);

  async function startCheckout(plan: SubscriptionPlan) {
    setMessage(null);
    setLoadingPlan(plan);
    try {
      const res = await fetch("/api/subscription/checkout", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.checkoutUrl) {
        setMessage({
          type: "error",
          text: data?.hata || "Ödeme başlatılamadı. Lütfen daha sonra tekrar deneyin.",
        });
        return;
      }

      window.location.href = data.checkoutUrl;
    } catch {
      setMessage({ type: "error", text: "Ödeme başlatılamadı. Bağlantınızı kontrol edin." });
    } finally {
      setLoadingPlan(null);
    }
  }

  return (
    <main className="min-h-[100dvh] bg-[#0B1120] px-4 py-5 text-white sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
        <section className="rounded-3xl border border-white/10 bg-[#111936] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.28)] sm:p-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-300">
                Metrix2 Abonelik
              </p>
              <h1 className="mt-3 text-2xl font-black tracking-tight text-white sm:text-4xl">
                Paketler ve ödeme
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                Kapalı modüller paket seviyesine göre açılır. Mevcut paketiniz işaretli; ödeme tamamlanınca plan değişimi sadece sunucu tarafında yapılır.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
              <p className="text-xs text-slate-400">Mevcut paket</p>
              <p className="mt-1 text-lg font-bold text-white">{getPlanLabel(currentPlan)}</p>
              {currentUser?.abonelikBitis && (
                <p className="mt-1 text-xs text-slate-400">
                  Bitiş: {new Date(currentUser.abonelikBitis).toLocaleDateString("tr-TR")}
                </p>
              )}
            </div>
          </div>
        </section>

        <div className="rounded-2xl border border-emerald-300/20 bg-emerald-400/10 px-4 py-3 text-sm font-semibold text-emerald-100">
          Yeni kayıt olan atölyeler 14 gün boyunca tüm özellikleri ücretsiz kullanır.
        </div>

        {message && (
          <div
            className={[
              "rounded-2xl border px-4 py-3 text-sm shadow-[0_18px_60px_rgba(0,0,0,0.24)]",
              message.type === "error"
                ? "border-red-400/30 bg-red-500/10 text-red-100"
                : "border-blue-400/30 bg-blue-500/10 text-blue-100",
            ].join(" ")}
          >
            {message.text}
          </div>
        )}

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {plans.map((plan) => {
            const isCurrent = currentPlan === plan.plan;
            const isUpgrade = getPlanRank(plan.plan) > currentRank;
            const isDowngrade = getPlanRank(plan.plan) < currentRank;
            const accent = accentClasses[plan.accent] || accentClasses.slate;

            return (
              <article
                key={plan.plan}
                className={[
                  "flex min-h-[460px] flex-col rounded-3xl border p-5 transition",
                  accent,
                  isCurrent ? "ring-2 ring-blue-300/60" : "hover:bg-white/[0.07]",
                ].join(" ")}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                      {plan.shortLabel}
                    </p>
                    <h2 className="mt-2 text-2xl font-black text-white">{plan.label}</h2>
                  </div>
                  {isCurrent && (
                    <span className="rounded-full border border-blue-300/30 bg-blue-400/15 px-3 py-1 text-[11px] font-bold text-blue-100">
                      Aktif
                    </span>
                  )}
                </div>

                <p className="mt-4 text-2xl font-black text-white">{plan.price}</p>
                {plan.priceNote && (
                  <p className="mt-1 text-xs font-semibold text-slate-400">{plan.priceNote}</p>
                )}
                <p className="mt-3 min-h-[72px] text-sm leading-6 text-slate-300">{plan.audience}</p>

                <div className="mt-4 flex-1 space-y-3">
                  {plan.features.map((feature) => (
                    <div key={feature.title} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-3">
                      <span className="h-2 w-2 shrink-0 rounded-full bg-blue-300" />
                      <p className="text-sm font-semibold text-white">{feature.title}</p>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  disabled={!isUpgrade || isCurrent || isDowngrade || loadingPlan === plan.plan}
                  onClick={() => startCheckout(plan.plan)}
                  className={[
                    "mt-5 min-h-[44px] rounded-2xl px-4 py-3 text-sm font-bold transition",
                    isCurrent
                      ? "cursor-default border border-blue-300/30 bg-blue-400/15 text-blue-100"
                      : isDowngrade
                        ? "cursor-default border border-white/10 bg-white/[0.04] text-slate-400"
                        : isUpgrade
                          ? "bg-white text-slate-950 hover:bg-blue-100"
                          : "cursor-default border border-white/10 bg-white/[0.04] text-slate-400",
                  ].join(" ")}
                >
                  {loadingPlan === plan.plan
                    ? "Ödeme hazırlanıyor..."
                    : isCurrent
                      ? "Mevcut paket"
                      : isDowngrade
                        ? "Destek ile görüş"
                        : isUpgrade
                          ? "Paketi seç"
                          : "Destek ile görüş"}
                </button>
              </article>
            );
          })}
        </section>
      </div>
    </main>
  );
}
