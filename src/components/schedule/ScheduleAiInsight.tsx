"use client";
import dayjs from "dayjs";
import "dayjs/locale/tr";

dayjs.locale("tr");

// İş tiplerine göre günlük kapasite sabitleri
// Ölçü: aynı bina/proje ise günde 200+, farklı lokasyon ise max 5-7
// İmalat: usta başına günde 2-4 iş (ortalama 120dk/iş)
// Montaj: montajcı başına günde 2-3 iş (ortalama 160dk/iş)

const GUNLUK_OLCU_AYNI_BINA = 40;   // tek ölçücü, aynı bina/tip
const GUNLUK_OLCU_FARKLI_LOK = 5;   // tek ölçücü, farklı lokasyon
const GUNLUK_IMALAT_USTA = 3;        // tek usta günde ortalama iş
const GUNLUK_MONTAJ_MONTAJCI = 2;    // tek montajcı günde ortalama iş

interface PersonelTipleri {
  olcucu: number;
  usta: number;
  montajci: number;
}

function hesaplaGunlukKapasite(
  personelTipleri: PersonelTipleri,
  tasks: any[],
  gun: dayjs.Dayjs
) {
  const gunTasks = tasks.filter((t) => dayjs(t.date).isSame(gun, "day"));
  const olcuTasks = gunTasks.filter((t) => t.phase === "OLCU");

  // Ölçü için lokasyon çeşitliliği tespiti
  // Aynı müşteri/bina ise yüksek kapasite, farklı ise düşük
  const uniqueMusteriler = new Set(olcuTasks.map((t) => t.musteriAdi)).size;
  const olcuAyniMi = olcuTasks.length > 0 && uniqueMusteriler <= 2;
  const olcuKapasite = olcuAyniMi
    ? (personelTipleri.olcucu || 1) * GUNLUK_OLCU_AYNI_BINA
    : (personelTipleri.olcucu || 1) * GUNLUK_OLCU_FARKLI_LOK;

  const imalatKapasite = (personelTipleri.usta || 1) * GUNLUK_IMALAT_USTA;
  const montajKapasite = (personelTipleri.montajci || 1) * GUNLUK_MONTAJ_MONTAJCI;

  return { olcuKapasite, imalatKapasite, montajKapasite };
}

function kapasite7Gun(personelTipleri: PersonelTipleri, tasks: any[], weekStart: dayjs.Dayjs) {
  // Haftalık toplam kapasite (5 iş günü)
  const isgunu = [1, 2, 3, 4, 5]; // Pzt-Cuma
  let topOlcu = 0, topImalat = 0, topMontaj = 0;
  for (let i = 0; i < 7; i++) {
    const gun = weekStart.add(i, "day");
    if (!isgunu.includes(gun.day())) continue;
    const k = hesaplaGunlukKapasite(personelTipleri, tasks, gun);
    topOlcu += k.olcuKapasite;
    topImalat += k.imalatKapasite;
    topMontaj += k.montajKapasite;
  }
  return { topOlcu, topImalat, topMontaj };
}

export default function ScheduleAiInsight({
  schedules = [],
  weekStart,
  personelTipleri = { olcucu: 0, usta: 0, montajci: 0 },
}: any) {
  const start = dayjs(weekStart);
  const end = start.add(6, "day");

  // Tüm hafta görevlerini topla
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

  // Gün bazlı yük
  const dayLoad = Array.from({ length: 7 }).map((_, i) => {
    const d = start.add(i, "day");
    const dayTasks = tasks.filter((t) => dayjs(t.date).isSame(d, "day"));
    const kap = hesaplaGunlukKapasite(personelTipleri, tasks, d);
    const isGunu = [1, 2, 3, 4, 5].includes(d.day());
    const gunKapasite = isGunu
      ? kap.olcuKapasite + kap.imalatKapasite + kap.montajKapasite
      : 0;
    return {
      date: d,
      count: dayTasks.length,
      imalat: dayTasks.filter((t) => t.phase === "IMALAT").length,
      montaj: dayTasks.filter((t) => t.phase === "MONTAJ").length,
      olcu: dayTasks.filter((t) => t.phase === "OLCU").length,
      kapasite: gunKapasite,
      doluluk: gunKapasite > 0 ? Math.min(100, Math.round((dayTasks.length / gunKapasite) * 100)) : 0,
      isGunu,
    };
  });

  // Haftalık kapasite hesabı
  const haftaKap = kapasite7Gun(personelTipleri, tasks, start);
  const haftaTopKap = haftaKap.topOlcu + haftaKap.topImalat + haftaKap.topMontaj;

  // Doluluk oranları (kapasite bazlı, görev sayısına göre)
  const olcuDoluluk = haftaKap.topOlcu > 0 ? Math.min(100, Math.round((olcu / haftaKap.topOlcu) * 100)) : 0;
  const imalatDoluluk = haftaKap.topImalat > 0 ? Math.min(100, Math.round((imalat / haftaKap.topImalat) * 100)) : 0;
  const montajDoluluk = haftaKap.topMontaj > 0 ? Math.min(100, Math.round((montaj / haftaKap.topMontaj) * 100)) : 0;
  const genelDoluluk = haftaTopKap > 0 ? Math.min(100, Math.round((total / haftaTopKap) * 100)) : 0;

  // Oran (dağılım yüzdesi)
  const olcuRatio = total ? Math.round((olcu / total) * 100) : 0;
  const imalatRatio = total ? Math.round((imalat / total) * 100) : 0;
  const montajRatio = total ? Math.round((montaj / total) * 100) : 0;

  const busiestDay = [...dayLoad].sort((a, b) => b.doluluk - a.doluluk)[0];
  const calmestDay = [...dayLoad].filter((d) => d.isGunu).sort((a, b) => a.count - b.count)[0];

  // Öneri motoru
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

  // Ölçü lokasyon uyarısı
  const olcuGunleri = dayLoad.filter((d) => d.olcu > 0);
  olcuGunleri.forEach((d) => {
    const gunOlcuTasks = tasks.filter(
      (t) => t.phase === "OLCU" && dayjs(t.date).isSame(d.date, "day")
    );
    const uniqueM = new Set(gunOlcuTasks.map((t) => t.musteriAdi)).size;
    if (uniqueM >= 5 && d.olcu <= (personelTipleri.olcucu || 1) * 2) {
      recommendations.push(
        `${d.date.format("dddd")} günü ${d.olcu} farklı lokasyonda ölçü var. Ölçücü sayısı (${personelTipleri.olcucu || 1} kişi) yetersiz kalabilir, gruplama yapılmalı.`
      );
    }
  });

  if (imalatDoluluk >= 80) {
    recommendations.push(`İmalat kapasitesi %${imalatDoluluk} dolu. ${personelTipleri.usta || 1} usta ile haftalık max ${haftaKap.topImalat} iş yapılabilir, yeni iş eklerken dikkat.`);
  }

  if (montajDoluluk >= 80) {
    recommendations.push(`Montaj kapasitesi %${montajDoluluk} dolu. ${personelTipleri.montajci || 1} montajcı ile haftalık max ${haftaKap.topMontaj} iş yapılabilir.`);
  }

  if (busiestDay?.doluluk >= 70 && busiestDay.isGunu) {
    recommendations.push(
      `${busiestDay.date.format("dddd")} günü %${busiestDay.doluluk} dolulukla en yoğun gün. Yeni işleri ${calmestDay?.date.format("dddd") || "daha boş bir güne"} kaydırmak daha sağlıklı.`
    );
  }

  if (recommendations.length === 0) {
    recommendations.push("Haftalık plan dengeli görünüyor. Kapasite müsait, yeni iş eklerken en düşük yoğunluklu günü tercih et.");
  }

  // Plan sağlığı
  const health =
    delayed > 2 ? "Riskli" :
    genelDoluluk >= 85 ? "Yoğun" :
    genelDoluluk >= 40 ? "Dengeli" :
    total === 0 ? "Boş" :
    "Rahat";

  const healthColor =
    health === "Riskli" ? "text-red-300" :
    health === "Yoğun" ? "text-amber-300" :
    health === "Dengeli" ? "text-emerald-300" :
    "text-blue-300";

  // Doluluk bar rengi
  function barColor(val: number) {
    if (val >= 85) return "bg-red-500";
    if (val >= 60) return "bg-amber-500";
    return "bg-blue-500";
  }

  return (
    <div className="mt-5 rounded-[28px] border border-blue-500/20 bg-blue-500/[0.06] p-5 shadow-2xl">
      {/* Başlık */}
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="text-sm font-bold text-blue-300">AI Planlama Motoru v2</div>
          <h3 className="mt-1 text-2xl font-black text-white">Haftalık Plan Analizi</h3>
          <p className="mt-1 text-sm text-slate-400">
            {start.format("DD MMMM")} – {end.format("DD MMMM YYYY")} · {" "}
            {personelTipleri.olcucu} ölçücü · {personelTipleri.usta} usta · {personelTipleri.montajci} montajcı
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-right">
          <div className="text-xs text-slate-400">Plan Sağlığı</div>
          <div className={`text-xl font-black ${healthColor}`}>{health}</div>
          <div className="text-xs text-slate-500">%{genelDoluluk} doluluk</div>
        </div>
      </div>

      {/* Üst istatistik kartları */}
      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-2xl bg-white/[0.05] p-4">
          <div className="text-xs text-slate-400">Toplam Görev</div>
          <div className="text-2xl font-black text-white">{total}</div>
          <div className="text-xs text-slate-500">haftalık kapasite: {haftaTopKap}</div>
        </div>
        <div className="rounded-2xl bg-blue-500/10 p-4">
          <div className="text-xs text-blue-300">Ölçü</div>
          <div className="text-2xl font-black text-blue-300">{olcu}</div>
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <div className={`h-full rounded-full ${barColor(olcuDoluluk)}`} style={{ width: `${olcuDoluluk}%` }} />
          </div>
          <div className="mt-1 text-xs text-slate-400">%{olcuDoluluk} kapasite · max {haftaKap.topOlcu}/hafta</div>
        </div>
        <div className="rounded-2xl bg-amber-500/10 p-4">
          <div className="text-xs text-amber-300">İmalat</div>
          <div className="text-2xl font-black text-amber-300">{imalat}</div>
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <div className={`h-full rounded-full ${barColor(imalatDoluluk)}`} style={{ width: `${imalatDoluluk}%` }} />
          </div>
          <div className="mt-1 text-xs text-slate-400">%{imalatDoluluk} kapasite · max {haftaKap.topImalat}/hafta</div>
        </div>
        <div className="rounded-2xl bg-emerald-500/10 p-4">
          <div className="text-xs text-emerald-300">Montaj</div>
          <div className="text-2xl font-black text-emerald-300">{montaj}</div>
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <div className={`h-full rounded-full ${barColor(montajDoluluk)}`} style={{ width: `${montajDoluluk}%` }} />
          </div>
          <div className="mt-1 text-xs text-slate-400">%{montajDoluluk} kapasite · max {haftaKap.topMontaj}/hafta</div>
        </div>
      </div>

      {/* Alt grid: Gün yoğunluğu + Öneriler */}
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {/* Gün yoğunluğu */}
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <div className="mb-3 text-sm font-bold text-slate-300">Günlük Doluluk</div>
          <div className="space-y-2">
            {dayLoad.map((d) => (
              <div key={d.date.toString()} className="flex items-center gap-3">
                <div className="w-20 text-xs text-slate-400">{d.date.format("ddd DD/MM")}</div>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
                  <div
                    className={`h-full rounded-full transition-all ${barColor(d.doluluk)}`}
                    style={{ width: `${d.isGunu ? d.doluluk : 0}%` }}
                  />
                </div>
                <div className="w-16 text-right text-xs text-slate-300">
                  {d.isGunu ? (
                    <span>{d.count} iş <span className="text-slate-500">(%{d.doluluk})</span></span>
                  ) : (
                    <span className="text-slate-600">Tatil</span>
                  )}
                </div>
              </div>
            ))}
          </div>
          {/* Faz dağılımı */}
          <div className="mt-4 flex gap-3 text-xs text-slate-400">
            <span className="text-blue-300">● Ölçü %{olcuRatio}</span>
            <span className="text-amber-300">● İmalat %{imalatRatio}</span>
            <span className="text-emerald-300">● Montaj %{montajRatio}</span>
          </div>
        </div>

        {/* Öneriler */}
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <div className="mb-3 text-sm font-bold text-slate-300">AI Önerileri</div>
          <div className="space-y-2">
            {recommendations.map((rec, i) => (
              <div key={i} className="rounded-xl bg-white/[0.05] p-3 text-sm text-slate-200">
                {rec}
              </div>
            ))}
          </div>
          {/* Kapasite özeti */}
          <div className="mt-4 rounded-xl bg-white/[0.03] p-3 text-xs text-slate-500">
            <div className="font-semibold text-slate-400 mb-1">Kapasite Hesabı</div>
            <div>Ölçü: {personelTipleri.olcucu || 1} kişi × ~{GUNLUK_OLCU_FARKLI_LOK}–{GUNLUK_OLCU_AYNI_BINA} iş/gün</div>
            <div>İmalat: {personelTipleri.usta || 1} usta × {GUNLUK_IMALAT_USTA} iş/gün × 5 gün = {(personelTipleri.usta || 1) * GUNLUK_IMALAT_USTA * 5}</div>
            <div>Montaj: {personelTipleri.montajci || 1} montajcı × {GUNLUK_MONTAJ_MONTAJCI} iş/gün × 5 gün = {(personelTipleri.montajci || 1) * GUNLUK_MONTAJ_MONTAJCI * 5}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
