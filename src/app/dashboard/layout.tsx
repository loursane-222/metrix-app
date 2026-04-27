"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/dashboard/Sidebar";
import DailyPlanPopup from "@/components/dashboard/DailyPlanPopup";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [aktif, setAktif] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/auth/current-user", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        if (!data?.userId) {
          router.push("/login");
          return;
        }

        if (!data.aktif) {
          router.push("/abonelik");
          return;
        }

        setAktif(true);
        setLoading(false);
      })
      .catch(() => {
        router.push("/login");
      });
  }, []);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#030712] text-slate-400">
        Kontrol ediliyor...
      </div>
    );
  }

  if (!aktif) return null;

  return (
    <div className="min-h-[100dvh] bg-[#0B1120] overflow-x-hidden">
      <Sidebar />
      <main className="min-h-[100dvh] md:ml-72 bg-[#0B1120] overflow-x-hidden">
        <div className="min-h-[100dvh] w-full">
          <DailyPlanPopup />
          {children}
        </div>
      </main>
    </div>
  );
}
