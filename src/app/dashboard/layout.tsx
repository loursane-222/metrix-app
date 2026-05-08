"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Sidebar from "@/components/dashboard/Sidebar";
import DailyPlanPopup from "@/components/dashboard/DailyPlanPopup";
import PushPermission from "@/components/push/PushPermission";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [aktif, setAktif] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/auth/current-user", { credentials: "include" })
      .then((res) => res.json())
      .then(async (data) => {
        if (!data?.userId) { router.push("/login"); return; }
        if (!data.aktif) { router.push("/abonelik"); return; }

        // Abonelik süresi kontrolü
        if (data.abonelikBitis) {
          const bitis = new Date(data.abonelikBitis)
          const simdi = new Date()
          if (bitis < simdi) {
            router.push("/abonelik")
            return
          }
        }
        if (!pathname.startsWith("/dashboard/onboarding")) {
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
      <div className="h-screen flex items-center justify-center bg-[#030712] text-slate-400">
        Kontrol ediliyor...
      </div>
    );
  }
  if (!aktif) return null;
  if (pathname.startsWith("/dashboard/onboarding")) {
    return <div className="min-h-[100dvh] bg-[#0B1120] overflow-x-hidden">{children}</div>;
  }
  return (
    <div className="min-h-[100dvh] bg-[#0B1120] overflow-x-hidden">
      <Sidebar />
      <main className="min-h-[100dvh] md:ml-72 bg-[#0B1120] overflow-x-hidden" id="dashboard-main"
        style={{ paddingBottom: "calc(72px + env(safe-area-inset-bottom, 0px))" }}>
        <div className="min-h-[100dvh] w-full md:[padding-bottom:0]" id="dashboard-inner">
          <DailyPlanPopup />
          <PushPermission />
          {children}
        </div>
      </main>
    </div>
  );
}
