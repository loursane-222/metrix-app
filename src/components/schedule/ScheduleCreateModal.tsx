"use client";

import { useEffect, useState } from "react";
import dayjs from "dayjs";
import "dayjs/locale/tr";

dayjs.locale("tr");

const PHASE_LABELS: Record<string, string> = {
  OLCU: "Ölçü",
  IMALAT: "İmalat",
  MONTAJ: "Montaj",
};

export default function ScheduleCreateModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingId, setCreatingId] = useState<string | null>(null);
  const [recommendingId, setRecommendingId] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<any | null>(null);
  const [recommendation, setRecommendation] = useState<any | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetch("/api/schedule/candidates", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => setJobs(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, []);

  const filtered = jobs.filter((j) => {
    const text = `${j.musteriAdi || ""} ${j.teklifNo || ""} ${j.urunAdi || ""}`.toLowerCase();
    return text.includes(query.toLowerCase());
  });

  async function getRecommendation(job: any) {
    setSelectedJob(job);
    setRecommendation(null);
    setRecommendingId(job.id);

    try {
      const res = await fetch("/api/schedule/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isId: job.id }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Plan önerisi alınamadı");

      setRecommendation(json);
    } catch (error: any) {
      alert(error?.message || "Plan önerisi alınamadı");
      setSelectedJob(null);
    } finally {
      setRecommendingId(null);
    }
  }

  async function createSchedule() {
    if (!selectedJob) return;

    setCreatingId(selectedJob.id);

    try {
      const res = await fetch("/api/schedule/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isId: selectedJob.id,
          plan: recommendation?.plan || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "İş programa eklenemedi");

      onCreated();
    } catch (error: any) {
      alert(error?.message || "İş programa eklenemedi");
    } finally {
      setCreatingId(null);
    }
  }

  function updatePlan(phase: string, value: string) {
    if (!recommendation) return;
    const current = recommendation.plan?.[phase];
    const time = current ? dayjs(current).format("HH:mm") : "09:00";

    setRecommendation({
      ...recommendation,
      plan: {
        ...recommendation.plan,
        [phase]: `${value}T${time}:00.000Z`,
      },
    });
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-[28px] border border-white/10 bg-[#08111f] text-white shadow-2xl md:grid-cols-[0.95fr_1.05fr]">
        <div className="border-b border-white/10 p-5 md:border-b-0 md:border-r">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black">Yeni İş Oluştur</h2>
              <p className="mt-1 text-sm text-slate-400">
                Onaylı işi seç, AI önerisini kontrol et, programa al.
              </p>
            </div>

            <button
              onClick={onClose}
              className="rounded-2xl bg-white/10 px-4 py-2 text-sm font-bold hover:bg-white/15"
            >
              Kapat
            </button>
          </div>

          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Müşteri, teklif no veya ürün ara..."
            className="mt-4 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm outline-none placeholder:text-slate-500 focus:border-blue-500"
          />

          <div className="mt-4 max-h-[58dvh] overflow-y-auto pr-1">
            {loading ? (
              <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 text-center text-slate-400">
                İşler yükleniyor...
              </div>
            ) : filtered.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.03] p-8 text-center text-slate-400">
                Programa alınacak onaylı iş bulunamadı.
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map((job) => {
                  const active = selectedJob?.id === job.id;

                  return (
                    <button
                      key={job.id}
                      disabled={recommendingId === job.id}
                      onClick={() => getRecommendation(job)}
                      className={[
                        "w-full rounded-3xl border p-4 text-left transition disabled:opacity-60",
                        active
                          ? "border-blue-500/70 bg-blue-500/10"
                          : "border-white/10 bg-white/[0.04] hover:border-blue-500/50 hover:bg-blue-500/10",
                      ].join(" ")}
                    >
                      <div className="truncate text-lg font-black">
                        {job.musteriAdi || "İsimsiz müşteri"}
                      </div>
                      <div className="mt-1 truncate text-sm text-slate-400">
                        {job.urunAdi || "Ürün bilgisi yok"}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {job.teklifNo && (
                          <span className="rounded-lg bg-white/10 px-2 py-1 text-xs text-slate-300">
                            {job.teklifNo}
                          </span>
                        )}
                        <span className="rounded-lg bg-emerald-500/10 px-2 py-1 text-xs font-bold text-emerald-300">
                          Onaylı
                        </span>
                        {recommendingId === job.id && (
                          <span className="rounded-lg bg-blue-500/10 px-2 py-1 text-xs font-bold text-blue-300">
                            Öneri hazırlanıyor...
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="p-5">
          {!selectedJob ? (
            <div className="flex h-full min-h-[360px] items-center justify-center rounded-3xl border border-dashed border-white/10 bg-white/[0.03] p-8 text-center">
              <div>
                <div className="text-4xl">🧠</div>
                <div className="mt-3 text-xl font-black">AI Plan Önerisi</div>
                <p className="mt-2 text-sm text-slate-400">
                  Soldan bir iş seç. Sistem ölçü, imalat ve montaj için en uygun günleri önersin.
                </p>
              </div>
            </div>
          ) : !recommendation ? (
            <div className="flex h-full min-h-[360px] items-center justify-center rounded-3xl border border-white/10 bg-white/[0.03] p-8 text-center text-slate-400">
              Plan önerisi hazırlanıyor...
            </div>
          ) : (
            <div>
              <div className="rounded-3xl border border-blue-500/20 bg-blue-500/[0.06] p-5">
                <div className="text-sm font-bold text-blue-300">AI Planlama Motoru v2</div>
                <h3 className="mt-1 text-2xl font-black">{selectedJob.musteriAdi}</h3>
                <p className="mt-1 text-sm text-slate-400">
                  {selectedJob.urunAdi || "Ürün bilgisi yok"}
                </p>
              </div>

              <div className="mt-4 grid gap-3">
                {["OLCU", "IMALAT", "MONTAJ"].map((phase) => {
                  const value = recommendation.plan?.[phase];
                  return (
                    <div
                      key={phase}
                      className="rounded-3xl border border-white/10 bg-white/[0.04] p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-sm text-slate-400">{PHASE_LABELS[phase]}</div>
                          <div className="mt-1 text-xl font-black">
                            {value ? dayjs(value).format("DD MMMM YYYY dddd") : "-"}
                          </div>
                        </div>

                        <input
                          type="date"
                          value={value ? dayjs(value).format("YYYY-MM-DD") : ""}
                          onChange={(e) => updatePlan(phase, e.target.value)}
                          className="rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 rounded-3xl border border-white/10 bg-black/20 p-4">
                <div className="mb-3 text-sm font-bold text-slate-300">Neden bu plan?</div>
                <div className="space-y-2">
                  {(recommendation.reasons || []).map((reason: string, i: number) => (
                    <div key={i} className="rounded-2xl bg-white/[0.05] p-3 text-sm text-slate-300">
                      {reason}
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={createSchedule}
                disabled={creatingId === selectedJob.id}
                className="mt-4 w-full rounded-2xl bg-blue-600 px-5 py-4 text-base font-black text-white shadow-lg shadow-blue-900/40 hover:bg-blue-500 disabled:opacity-60"
              >
                {creatingId === selectedJob.id ? "Programa Ekleniyor..." : "Bu Planla Programa Al"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
