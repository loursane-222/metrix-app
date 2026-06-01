"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Sidebar from "@/components/dashboard/Sidebar";
import DailyPlanPopup from "@/components/dashboard/DailyPlanPopup";
import InAppToast, { showToast } from "@/components/push/InAppToast";
import GuideReturnBar from "@/components/onboarding/GuideReturnBar";
import OnboardingTourController from "@/components/onboarding/OnboardingTourController";
import DashboardGuideLauncher from "@/components/onboarding/DashboardGuideLauncher";
import PageActionCoach from "@/components/onboarding/PageActionCoach";
import TrialReminderPopup from "@/components/subscription/TrialReminderPopup";
import { getRequiredPlanForPath, hasSubscriptionAccess } from "@/lib/subscription/plans";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [aktif, setAktif] = useState<boolean | null>(null);

  // SSE — tüm sayfalarda anlık bildirim
  useEffect(() => {
    let es: EventSource | null = null;
    let retryTimeout: ReturnType<typeof setTimeout> | null = null;

    function connect() {
      es = new EventSource("/api/sse");
      es.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.type === "activity" && data.message) {
            showToast("Metrix — Yeni Hareket", data.message);
          }
          // Execution geçişlerini page-level listener'lara ilet.
          // window.dispatchEvent cross-tab değil, aynı sekme içinde çalışır.
          if (data.type === "execution_status") {
            window.dispatchEvent(
              new CustomEvent("metrix:execution_update", { detail: data }),
            );
          }
        } catch {}
      };
      es.onerror = () => {
        es?.close();
        retryTimeout = setTimeout(connect, 3000);
      };
    }

    connect();
    return () => {
      es?.close();
      if (retryTimeout) clearTimeout(retryTimeout);
    };
  }, []);

  useEffect(() => {
    fetch("/api/auth/current-user", { credentials: "include" })
      .then((res) => res.json())
      .then(async (data) => {
        if (!data?.userId) { router.push("/login"); return; }
        if (!data.aktif) {
          if (pathname !== "/dashboard/abonelik") {
            router.push("/dashboard/abonelik");
            return;
          }
          setAktif(true);
          setLoading(false);
          return;
        }

        // Abonelik süresi kontrolü
        if (data.trial?.isTrialExpired && pathname !== "/dashboard/abonelik") {
          router.push("/dashboard/abonelik?expired=1");
          return;
        }
        if (data.abonelikBitis) {
          const bitis = new Date(data.abonelikBitis)
          const simdi = new Date()
          if (bitis < simdi) {
            if (pathname !== "/dashboard/abonelik") {
              router.push("/dashboard/abonelik")
              return
            }
            setAktif(true);
            setLoading(false);
            return
          }
        }
        const requiredPlan = getRequiredPlanForPath(pathname);
        if (pathname !== "/dashboard/abonelik" && !hasSubscriptionAccess(data.abonelikPlani, requiredPlan, data.abonelikBitis)) {
          router.push(`/dashboard/abonelik?upgrade=1&required=${requiredPlan}`);
          return;
        }
        if (!pathname.startsWith("/dashboard/onboarding") && pathname !== "/dashboard/abonelik") {
          try {
            const atolyeRes = await fetch("/api/atolye", { credentials: "include" });
            const atolyeData = await atolyeRes.json();
            const atolye = atolyeData?.atolye;
            const kurulum = atolye?.atolyeAdi && String(atolye.atolyeAdi).trim().length > 0;
            if (!kurulum) { router.push("/dashboard/onboarding"); return; }
          } catch {}
        }
        setAktif(true);
        setLoading(false);
      })
      .catch(() => { router.push("/login"); });
  }, [pathname]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#030712]">
        <div className="w-48 space-y-3">
          <div className="animate-pulse h-3 w-3/4 rounded-md bg-white/[0.06]" />
          <div className="animate-pulse h-5 w-full rounded-xl bg-white/[0.05]" />
          <div className="animate-pulse h-3 w-2/3 rounded-md bg-white/[0.04]" />
          <div className="animate-pulse h-3 w-1/2 rounded-md bg-white/[0.03]" />
        </div>
      </div>
    );
  }
  if (!aktif) return null;
  if (pathname.startsWith("/dashboard/onboarding")) {
    return <div className="min-h-[100dvh] bg-[#0B1120] overflow-x-hidden">{children}</div>;
  }
  return (
    <div className="min-h-[100dvh] bg-[#0B1120] overflow-x-hidden">
      <InAppToast />
      <Sidebar />
      <DashboardGuideLauncher />
      <main className="min-h-[100dvh] md:ml-72 bg-[#0B1120] overflow-x-hidden" id="dashboard-main"
        style={{ paddingBottom: "calc(72px + env(safe-area-inset-bottom, 0px))" }}>
        <div className="min-h-[100dvh] w-full md:[padding-bottom:0]" id="dashboard-inner">
          <DailyPlanPopup />
          <TrialReminderPopup />
          <GuideReturnBar />
          <OnboardingTourController />
          <PageActionCoach />
          {children}
        </div>
      </main>
    </div>
  );
}
