"use client";

import dayjs from "dayjs";
import "dayjs/locale/tr";

dayjs.locale("tr");

const PHASE_LABELS: Record<string, string> = {
  OLCU: "Ölçü",
  IMALAT: "İmalat",
  MONTAJ: "Montaj",
};

export default function ScheduleAiInsight({ schedules = [], weekStart }: any) {
  const start = dayjs(weekStart);
  const end = start.add(6, "day");

  const tasks: any[] = [];

  schedules.forEach((schedule: any) => {
    schedule.phases?.forEach((phase: any) => {
      if (!phase.plannedStart) return;

      const d = dayjs(phase.plannedStart);
      if (d.isBefore(start, "day") || d.isAfter(end, "day")) return;

      tasks.push({
        id: phase.id,
        phase: phase.phase,
        date: phase.plannedStart,
        musteriAdi: schedule.is?.musteriAdi || "İsimsiz İş",
        completed: phase.isCompleted,
        atamalar: phase.fazAtamalar || [],
      });
    });
  });

  const total = tasks.length;
  const olcu = tasks.filter((t) => t.phase === "OLCU").length;
  const imalat = tasks.filter((t) => t.phase === "IMALAT").length;
  const montaj = tasks.filter((t) => t.phase === "MONTAJ").length;
  const delayed = tasks.filter(
    (t) => !t.completed && dayjs(t.date).isBefore(dayjs(), "day")
  ).length;
  const unassigned = tasks.filter((t) => !t.atamalar?.length).length;

  const dayLoad = Array.from({ length: 7 }).map((_, i) => {
    const d = start.add(i, "day");
    const dayTasks = tasks.filter((t) => dayjs(t.date).isSame(d, "day"));
    return {
      date: d,
      count: dayTasks.length,
      imalat: dayTasks.filter((t) => t.phase === "IMALAT").length,
      montaj: dayTasks.filter((t) => t.phase === "MONTAJ").length,
      olcu: dayTasks.filter((t) => t.phase === "OLCU").length,
    };
  });

  const busiestDay = [...dayLoad].sort((a, b) => b.count - a.count)[0];
  const calmestDay = [...dayLoad].sort((a, b) => a.count - b.count)[0];

  const imalatRatio = total ? Math.round((imalat / total) * 100) : 0;
  const montajRatio = total ? Math.round((montaj / total) * 100) : 0;
  const olcuRatio = total ? Math.round((olcu / total) * 100) : 0;

  const recommendations: string[] = [];

  if (total === 0) {
    recommendations.push("Bu hafta için program boş. Onaylanmış işleri programa alarak haftayı doldurabilirsin.");
  }

  if (delayed > 0) {
    recommendations.push(`${delayed} geciken aşama var. Önce bu işleri kapatmak haftalık akışı rahatlatır.`);
  }

  if (unassigned > 0) {
    recommendations.push(`${unassigned} işte personel ataması eksik. Operasyon başlamadan önce atama yapılmalı.`);
  }

  if (imalatRatio >= 45) {
    recommendations.push("İmalat yükü haftaya göre yüksek. Yeni imalat işleri mümkünse daha boş güne kaydırılmalı.");
  }

  if (montajRatio >= 40) {
    recommendations.push("Montaj yoğunluğu yüksek. Aynı güne fazla montaj koymak saha ekibini sıkıştırabilir.");
  }

  if (busiestDay?.count >= 4) {
    recommendations.push(`${busiestDay.date.format("dddd")} günü yoğun görünüyor. Yeni işleri ${calmestDay.date.format("dddd")} gününe kaydırmak daha sağlıklı olur.`);
  }

  if (recommendations.length === 0) {
    recommendations.push("Haftalık plan dengeli görünüyor. Yeni iş eklerken en düşük yoğunluklu günü tercih et.");
  }

  const health =
    delayed > 2 ? "Riskli" :
    imalatRatio >= 50 || total >= 18 ? "Yoğun" :
    total >= 8 ? "Dengeli" :
    "Rahat";

  return (
    <div className="mt-5 rounded-[28px] border border-blue-500/20 bg-blue-500/[0.06] p-5 shadow-2xl">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="text-sm font-bold text-blue-300">AI Planlama Motoru v1</div>
          <h3 className="mt-1 text-2xl font-black text-white">Haftalık Plan Analizi</h3>
          <p className="mt-1 text-sm text-slate-400">
            {start.format("DD MMMM")} - {end.format("DD MMMM YYYY")} haftası için operasyon önerileri.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-right">
          <div className="text-xs text-slate-400">Plan Sağlığı</div>
          <div className="text-xl font-black text-blue-300">{health}</div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-5">
        <div className="rounded-2xl bg-white/[0.05] p-4">
          <div className="text-xs text-slate-400">Toplam</div>
          <div className="text-2xl font-black text-white">{total}</div>
        </div>
        <div className="rounded-2xl bg-white/[0.05] p-4">
          <div className="text-xs text-slate-400">Ölçü</div>
          <div className="text-2xl font-black text-blue-300">%{olcuRatio}</div>
        </div>
        <div className="rounded-2xl bg-white/[0.05] p-4">
          <div className="text-xs text-slate-400">İmalat</div>
          <div className="text-2xl font-black text-amber-300">%{imalatRatio}</div>
        </div>
        <div className="rounded-2xl bg-white/[0.05] p-4">
          <div className="text-xs text-slate-400">Montaj</div>
          <div className="text-2xl font-black text-emerald-300">%{montajRatio}</div>
        </div>
        <div className="rounded-2xl bg-white/[0.05] p-4">
          <div className="text-xs text-slate-400">Geciken</div>
          <div className="text-2xl font-black text-red-300">{delayed}</div>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <div className="mb-3 text-sm font-bold text-slate-300">Gün Yoğunluğu</div>
          <div className="space-y-2">
            {dayLoad.map((d) => (
              <div key={d.date.toString()} className="flex items-center gap-3">
                <div className="w-24 text-xs text-slate-400">{d.date.format("dddd")}</div>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-blue-500"
                    style={{ width: `${Math.min(100, d.count * 20)}%` }}
                  />
                </div>
                <div className="w-10 text-right text-xs text-slate-300">{d.count} iş</div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <div className="mb-3 text-sm font-bold text-slate-300">Önerilen Aksiyonlar</div>
          <div className="space-y-2">
            {recommendations.map((rec, i) => (
              <div key={i} className="rounded-xl bg-white/[0.05] p-3 text-sm text-slate-200">
                {rec}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
