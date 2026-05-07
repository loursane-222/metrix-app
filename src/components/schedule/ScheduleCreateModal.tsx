"use client";

import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import "dayjs/locale/tr";

dayjs.locale("tr");

const PHASES = ["OLCU", "IMALAT", "MONTAJ"] as const;

const PHASE_LABELS: Record<string, string> = {
  OLCU: "Ölçü",
  IMALAT: "İmalat",
  MONTAJ: "Montaj",
};

type MobileTab = "jobs" | "plan";
type Mode = "ai" | "manual";

export default function ScheduleCreateModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [jobs, setJobs] = useState<any[]>([]);
  const [personeller, setPersoneller] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [recommendingId, setRecommendingId] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<any | null>(null);
  const [recommendation, setRecommendation] = useState<any | null>(null);
  const [query, setQuery] = useState("");
  const [mobileTab, setMobileTab] = useState<MobileTab>("jobs");
  const [mode, setMode] = useState<Mode>("ai");

  const [manualDates, setManualDates] = useState<Record<string, string>>({
    OLCU: "",
    IMALAT: "",
    MONTAJ: "",
  });

  const [manualPersonel, setManualPersonel] = useState<Record<string, string>>({
    OLCU: "",
    IMALAT: "",
    MONTAJ: "",
  });

  useEffect(() => {
    fetch("/api/schedule/candidates", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => setJobs(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));

    fetch("/api/personel", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => setPersoneller(Array.isArray(data?.personeller) ? data.personeller : []))
      .catch(() => setPersoneller([]));
  }, []);

  const filtered = useMemo(() => {
    return jobs.filter((j) => {
      const text = `${j.musteriAdi || ""} ${j.teklifNo || ""} ${j.urunAdi || ""}`.toLowerCase();
      return text.includes(query.toLowerCase());
    });
  }, [jobs, query]);

  function dateToPayload(value: string) {
    return value ? `${value}T09:00:00.000Z` : undefined;
  }

  function syncManualDatesFromRecommendation(rec: any) {
    setManualDates({
      OLCU: rec?.plan?.OLCU ? dayjs(rec.plan.OLCU).format("YYYY-MM-DD") : "",
      IMALAT: rec?.plan?.IMALAT ? dayjs(rec.plan.IMALAT).format("YYYY-MM-DD") : "",
      MONTAJ: rec?.plan?.MONTAJ ? dayjs(rec.plan.MONTAJ).format("YYYY-MM-DD") : "",
    });
  }

  async function getRecommendation(job: any) {
    setSelectedJob(job);
    setRecommendation(null);
    setMode("ai");
    setMobileTab("plan");
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
      syncManualDatesFromRecommendation(json);
    } catch (error: any) {
      alert(error?.message || "Plan önerisi alınamadı");
      setSelectedJob(null);
      setMobileTab("jobs");
    } finally {
      setRecommendingId(null);
    }
  }

  function updateAiPlan(phase: string, value: string) {
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

  async function assignPersonelToCreatedSchedule(schedule: any) {
    const phases = schedule?.phases || [];
    for (const phase of phases) {
      const personelId = manualPersonel[phase.phase];
      if (!personelId) continue;

      await fetch("/api/faz-atama", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schedulePhaseId: phase.id, personelId }),
      });
    }
  }

  async function createSchedule(useManual = false) {
    if (!selectedJob) return;

    setCreating(true);

    try {
      const plan = useManual
        ? {
            OLCU: dateToPayload(manualDates.OLCU),
            IMALAT: dateToPayload(manualDates.IMALAT),
            MONTAJ: dateToPayload(manualDates.MONTAJ),
          }
        : recommendation?.plan || undefined;

      const res = await fetch("/api/schedule/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isId: selectedJob.id, plan }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "İş programa eklenemedi");

      if (useManual) {
        await assignPersonelToCreatedSchedule(json.schedule);
      }

      onCreated();
    } catch (error: any) {
      alert(error?.message || "İş programa eklenemedi");
    } finally {
      setCreating(false);
    }
  }

  const selectedReady = !!selectedJob && !!recommendation;

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/70 p-0 backdrop-blur-md md:items-center md:p-4">
      <div className="grid h-[94dvh] w-full max-w-5xl overflow-hidden rounded-t-[28px] border border-white/10 bg-[#08111f] text-white shadow-2xl md:h-[86dvh] md:rounded-[28px] md:grid-cols-[0.95fr_1.05fr]">
        <section className={`${mobileTab === "plan" ? "hidden md:flex" : "flex"} min-h-0 flex-col border-b border-white/10 p-5 md:border-b-0 md:border-r`}>
          <div className="shrink-0">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black">Program Ekle</h2>
                <p className="mt-1 text-sm text-slate-400">Onaylı işi seç, AI önerisini kontrol et, programa al.</p>
              </div>

              <button onClick={onClose} className="rounded-2xl bg-white/10 px-4 py-2 text-sm font-bold hover:bg-white/15">
                Kapat
              </button>
            </div>

            <div className="mt-4 flex gap-2 md:hidden">
              <button
                onClick={() => setMobileTab("jobs")}
                className="flex-1 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-black"
              >
                İş Seç
              </button>
              <button
                onClick={() => setMobileTab("plan")}
                disabled={!selectedJob}
                className="flex-1 rounded-2xl bg-white/10 px-4 py-3 text-sm font-black disabled:opacity-40"
              >
                Planla
              </button>
            </div>

            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Müşteri, teklif no veya ürün ara..."
              className="mt-4 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm outline-none placeholder:text-slate-500 focus:border-blue-500"
            />
          </div>

          <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
            {loading ? (
              <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 text-center text-slate-400">İşler yükleniyor...</div>
            ) : filtered.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.03] p-8 text-center text-slate-400">Programa alınacak onaylı iş bulunamadı.</div>
            ) : (
              <div className="space-y-3 pb-6">
                {filtered.map((job) => {
                  const active = selectedJob?.id === job.id;

                  return (
                    <button
                      key={job.id}
                      disabled={recommendingId === job.id}
                      onClick={() => getRecommendation(job)}
                      className={[
                        "w-full rounded-3xl border p-4 text-left transition disabled:opacity-60",
                        active ? "border-blue-500/70 bg-blue-500/10" : "border-white/10 bg-white/[0.04] hover:border-blue-500/50 hover:bg-blue-500/10",
                      ].join(" ")}
                    >
                      <div className="truncate text-lg font-black">{job.musteriAdi || "İsimsiz müşteri"}</div>
                      <div className="mt-1 truncate text-sm text-slate-400">{job.urunAdi || "Ürün bilgisi yok"}</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {job.teklifNo && <span className="rounded-lg bg-white/10 px-2 py-1 text-xs text-slate-300">{job.teklifNo}</span>}
                        <span className="rounded-lg bg-emerald-500/10 px-2 py-1 text-xs font-bold text-emerald-300">Onaylı</span>
                        {recommendingId === job.id && <span className="rounded-lg bg-blue-500/10 px-2 py-1 text-xs font-bold text-blue-300">Öneri hazırlanıyor...</span>}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <section className={`${mobileTab === "jobs" ? "hidden md:flex" : "flex"} min-h-0 flex-col overflow-hidden p-5`}>
          <div className="mb-4 flex shrink-0 items-center justify-between gap-3 md:hidden">
            <button onClick={() => setMobileTab("jobs")} className="rounded-2xl bg-white/10 px-4 py-2 text-sm font-bold">
              ← İş Seç
            </button>
            <button onClick={onClose} className="rounded-2xl bg-white/10 px-4 py-2 text-sm font-bold">
              Kapat
            </button>
          </div>

          {!selectedJob ? (
            <div className="flex min-h-0 flex-1 items-center justify-center rounded-3xl border border-dashed border-white/10 bg-white/[0.03] p-8 text-center">
              <div>
                <div className="text-4xl">🧠</div>
                <div className="mt-3 text-xl font-black">AI Plan Önerisi</div>
                <p className="mt-2 text-sm text-slate-400">Soldan bir iş seç. Sistem ölçü, imalat ve montaj için en uygun günleri önersin.</p>
              </div>
            </div>
          ) : !recommendation ? (
            <div className="flex min-h-0 flex-1 items-center justify-center rounded-3xl border border-white/10 bg-white/[0.03] p-8 text-center text-slate-400">
              Plan önerisi hazırlanıyor...
            </div>
          ) : (
            <>
              <div className="shrink-0 rounded-3xl border border-blue-500/20 bg-blue-500/[0.06] p-5">
                <div className="text-sm font-bold text-blue-300">AI Planlama Motoru v2</div>
                <h3 className="mt-1 text-2xl font-black">{selectedJob.musteriAdi}</h3>
                <p className="mt-1 text-sm text-slate-400">{selectedJob.urunAdi || "Ürün bilgisi yok"}</p>
              </div>

              <div className="mt-4 flex shrink-0 rounded-2xl border border-white/10 bg-white/[0.04] p-1">
                <button
                  onClick={() => setMode("ai")}
                  className={`flex-1 rounded-xl px-4 py-2 text-sm font-black ${mode === "ai" ? "bg-blue-600" : "text-slate-300"}`}
                >
                  AI Plan
                </button>
                <button
                  onClick={() => setMode("manual")}
                  className={`flex-1 rounded-xl px-4 py-2 text-sm font-black ${mode === "manual" ? "bg-blue-600" : "text-slate-300"}`}
                >
                  Manuel Program Yap
                </button>
              </div>

              <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
                {mode === "ai" ? (
                  <div className="space-y-3 pb-4">
                    {PHASES.map((phase) => {
                      const value = recommendation.plan?.[phase];

                      return (
                        <div key={phase} className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <div className="text-sm text-slate-400">{PHASE_LABELS[phase]}</div>
                              <div className="mt-1 text-xl font-black">{value ? dayjs(value).format("DD MMMM YYYY dddd") : "-"}</div>
                            </div>

                            <input
                              type="date"
                              value={value ? dayjs(value).format("YYYY-MM-DD") : ""}
                              onChange={(e) => updateAiPlan(phase, e.target.value)}
                              className="rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none"
                            />
                          </div>
                        </div>
                      );
                    })}

                    <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
                      <div className="mb-3 text-sm font-bold text-slate-300">Neden bu plan?</div>
                      <div className="space-y-2">
                        {(recommendation.reasons || []).map((reason: string, i: number) => (
                          <div key={i} className="rounded-2xl bg-white/[0.05] p-3 text-sm text-slate-300">
                            {reason}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 pb-4">
                    {PHASES.map((phase) => (
                      <div key={phase} className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
                        <div className="text-sm font-bold text-slate-300">{PHASE_LABELS[phase]}</div>

                        <input
                          type="date"
                          value={manualDates[phase]}
                          onChange={(e) => setManualDates({ ...manualDates, [phase]: e.target.value })}
                          className="mt-3 w-full rounded-2xl border border-white/10 bg-black/30 px-3 py-3 text-sm text-white outline-none"
                        />

                        <select
                          value={manualPersonel[phase]}
                          onChange={(e) => setManualPersonel({ ...manualPersonel, [phase]: e.target.value })}
                          className="mt-3 w-full rounded-2xl border border-white/10 bg-black/30 px-3 py-3 text-sm text-white outline-none"
                        >
                          <option value="">Personel seçilmedi</option>
                          {personeller.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.ad} {p.soyad} {p.gorevi ? `- ${p.gorevi}` : ""}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="shrink-0 border-t border-white/10 pt-4">
                <button
                  onClick={() => createSchedule(mode === "manual")}
                  disabled={creating || !selectedReady}
                  className="w-full rounded-2xl bg-blue-600 px-5 py-4 text-base font-black text-white shadow-lg shadow-blue-900/40 hover:bg-blue-500 disabled:opacity-60"
                >
                  {creating ? "Programa Ekleniyor..." : mode === "manual" ? "Manuel Programı Kaydet" : "Bu Planla Programa Al"}
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
