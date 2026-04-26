"use client";

import { useEffect, useState } from "react";

import HeroBanner from "@/components/dashboard/HeroBanner";
import StatCard from "@/components/dashboard/StatCard";
import PipelineCard from "@/components/dashboard/PipelineCard";
import ProfitCard from "@/components/dashboard/ProfitCard";
import SmartActions from "@/components/dashboard/SmartActions";
import RecentJobs from "@/components/dashboard/RecentJobs";
import MonthlySummary from "@/components/dashboard/MonthlySummary";

import { paraGoster } from "@/lib/format";

type DashboardData = {
  toplamIs: number;
  onaylananIs: number;
  kaybedilenIs: number;
  teklifVerilenTutar: number;
  onaylananTutar: number;
  onaylanmaOrani: number;
  toplamCiro: number;
  toplamMaliyet: number;
  toplamKar: number;
  toplamTahsilat: number;
  bekleyenIs: number;
};

type MonthlySummaryData = {
  yil: number;
  ay: number;
  ayAdi: string;
  toplamTeklif: number;
  onaylananTeklif: number;
  bekleyenTeklif: number;
  kaybedilenTeklif: number;
  onaylanmaOrani: number;
  toplamTeklifTutari: number;
  onaylananTeklifTutari: number;
  kaybedilenTeklifTutari: number;
  toplamTahsilat: number;
  kirilanTas: number;
  toplamPlaka: number;
  toplamMaliyet: number;
  toplamKazanc: number;
};

type AylikResponse = {
  aylar: MonthlySummaryData[];
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [monthly, setMonthly] = useState<MonthlySummaryData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/dashboard").then((res) => res.json()),
      fetch("/api/dashboard/aylik").then((res) => res.json()),
    ])
      .then(([dashboardRes, aylikRes]: [DashboardData, AylikResponse]) => {
        setData(dashboardRes);
        setMonthly(aylikRes?.aylar?.[0] ?? null);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="p-10 text-center text-slate-500">
        Dashboard yükleniyor...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-10 text-center text-red-500">
        Veri alınamadı
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <HeroBanner
        onaylananTutar={data.onaylananTutar}
        toplamKar={data.toplamKar}
        onaylanmaOrani={data.onaylanmaOrani}
        toplamTahsilat={data.toplamTahsilat}
        bekleyenIs={data.bekleyenIs}
        onaylananIs={data.onaylananIs}
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Toplam Teklif Hacmi"
          value={paraGoster(data.teklifVerilenTutar)}
          note={`${data.toplamIs} teklif`}
          tone="blue"
        />
        <StatCard
          label="Onaylanan Tutar"
          value={paraGoster(data.onaylananTutar)}
          note={`${data.onaylananIs} onay`}
          tone="green"
        />
        <StatCard
          label="Toplam Kar"
          value={paraGoster(data.toplamKar)}
          note="Gerçekleşen kazanç"
          tone="purple"
        />
        <StatCard
          label="Tahsilatlar"
          value={paraGoster(data.toplamTahsilat)}
          note="Nakit akışı"
          tone="amber"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-1">
          <PipelineCard
            toplamIs={data.toplamIs}
            onaylananIs={data.onaylananIs}
            kaybedilenIs={data.kaybedilenIs}
          />
        </div>

        <div className="xl:col-span-1">
          <ProfitCard
            toplamCiro={data.toplamCiro}
            toplamMaliyet={data.toplamMaliyet}
            toplamKar={data.toplamKar}
          />
        </div>

        <div className="xl:col-span-1">
          <SmartActions
            toplamIs={data.toplamIs}
            onaylananIs={data.onaylananIs}
            kaybedilenIs={data.kaybedilenIs}
            onaylanmaOrani={data.onaylanmaOrani}
            toplamCiro={data.toplamCiro}
            toplamTahsilat={data.toplamTahsilat}
            toplamKar={data.toplamKar}
          />
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.7fr_1fr]">
        <div>
          <MonthlySummary data={monthly} />
        </div>
        <div>
          <RecentJobs />
        </div>
      </section>
    </div>
  );
}
