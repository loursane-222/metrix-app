"use client";

import { useEffect, useMemo, useState } from "react";

type TodayItem = {
  id: string;
  musteriAdi: string;
  teklifNo?: string;
  urunAdi?: string;
  phase: string;
  completed: boolean;
  people: string[];
};

const phaseLabel: Record<string, string> = {
  OLCU: "Ölçü",
  IMALAT: "İmalat",
  MONTAJ: "Montaj",
};

function todayKey() {
  const d = new Date();
  return `metrix-daily-plan-${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export default function DailyPlanPopup() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<TodayItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const key = todayKey();

    if (localStorage.getItem(key) === "seen") return;

    async function loadTodayPlan() {
      setLoading(true);

      try {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;

        const res = await fetch(`/api/schedule?year=${year}&month=${month}`, {
          cache: "no-store",
        });

        if (!res.ok) return;

        const schedules = await res.json();
        const list: TodayItem[] = [];

        for (const schedule of Array.isArray(schedules) ? schedules : []) {
          const is = schedule?.is || {};

          for (const phase of schedule?.phases || []) {
            if (!phase?.plannedStart || !phase?.plannedEnd) continue;

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const start = new Date(phase.plannedStart);
            start.setHours(0, 0, 0, 0);

            const end = new Date(phase.plannedEnd);
            end.setHours(23, 59, 59, 999);

            if (today >= start && today <= end) {
              list.push({
                id: phase.id,
                musteriAdi: is.musteriAdi || "Müşteri",
                teklifNo: is.teklifNo,
                urunAdi: is.urunAdi,
                phase: phaseLabel[phase.phase] || phase.phase || "Görev",
                completed: !!phase.isCompleted,
                people: (phase.fazAtamalar || [])
                  .map((a: any) => a?.personel?.ad)
                  .filter(Boolean),
              });
            }
          }
        }

        setItems(list);
        setOpen(true);
      } catch {
        // sessiz geç
      } finally {
        setLoading(false);
      }
    }

    loadTodayPlan();
  }, []);

  const activeItems = useMemo(() => items.filter((i) => !i.completed), [items]);
  const completedItems = useMemo(() => items.filter((i) => i.completed), [items]);

  function closeForToday() {
    localStorage.setItem(todayKey(), "seen");
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_30px_90px_rgba(15,23,42,0.28)]">
        <div className="bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.34),transparent_35%),linear-gradient(135deg,#0f172a,#1e1b4b)] px-6 py-6 text-white">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/55">
            Günlük Operasyon Uyarısı
          </p>

          <h2 className="mt-3 text-3xl font-bold tracking-tight">
            Bugünün İş Planı
          </h2>

          <p className="mt-2 text-sm text-white/65">
            Bugün takip etmen gereken görevleri güne başlamadan kontrol et.
          </p>

          <div className="mt-5 grid grid-cols-3 gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/10 p-3">
              <p className="text-xs text-white/55">Toplam</p>
              <p className="mt-1 text-2xl font-bold">{items.length}</p>
            </div>
            <div className="rounded-2xl border border-blue-300/20 bg-blue-400/10 p-3">
              <p className="text-xs text-white/55">Aktif</p>
              <p className="mt-1 text-2xl font-bold">{activeItems.length}</p>
            </div>
            <div className="rounded-2xl border border-emerald-300/20 bg-emerald-400/10 p-3">
              <p className="text-xs text-white/55">Tamamlanan</p>
              <p className="mt-1 text-2xl font-bold">{completedItems.length}</p>
            </div>
          </div>
        </div>

        <div className="max-h-[54vh] overflow-y-auto px-6 py-5">
          {loading ? (
            <p className="text-sm text-slate-500">Bugünün planı yükleniyor...</p>
          ) : items.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-8 text-center">
              <p className="text-lg font-bold text-slate-900">
                Bugün planlanmış iş yok.
              </p>
              <p className="mt-2 text-sm text-slate-500">
                Takvimde bugün için ölçü, imalat veya montaj görevi bulunmuyor.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item.id}
                  className={[
                    "rounded-3xl border p-4",
                    item.completed
                      ? "border-emerald-200 bg-emerald-50"
                      : "border-slate-200 bg-white",
                  ].join(" ")}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <span
                        className={[
                          "inline-flex rounded-full border px-3 py-1 text-xs font-semibold",
                          item.completed
                            ? "border-emerald-200 bg-white text-emerald-700"
                            : "border-blue-200 bg-blue-50 text-blue-700",
                        ].join(" ")}
                      >
                        {item.completed ? "✓ Tamamlandı" : item.phase}
                      </span>

                      <h3 className="mt-3 text-lg font-bold text-slate-900">
                        {item.musteriAdi}
                      </h3>

                      <p className="mt-1 text-sm text-slate-500">
                        {item.teklifNo || "Teklif no yok"}
                        {item.urunAdi ? ` • ${item.urunAdi}` : ""}
                      </p>

                      {item.people.length > 0 && (
                        <p className="mt-2 text-xs text-slate-500">
                          👤 {item.people.join(", ")}
                        </p>
                      )}
                    </div>

                    <div className="text-right text-sm font-semibold text-slate-400">
                      {item.phase}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={closeForToday}
            className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            Bugün tekrar gösterme
          </button>

          <a
            href="/dashboard/is-programi"
            onClick={closeForToday}
            className="rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 px-5 py-3 text-center text-sm font-semibold text-white shadow-[0_12px_24px_rgba(59,130,246,0.22)]"
          >
            İş Programına Git
          </a>
        </div>
      </div>
    </div>
  );
}
