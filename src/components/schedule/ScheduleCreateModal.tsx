
"use client";

import { useEffect, useState } from "react";

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

  async function createSchedule(jobId: string) {
    setCreatingId(jobId);

    try {
      const res = await fetch("/api/schedule/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isId: jobId }),
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

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md">
      <div className="w-full max-w-2xl overflow-hidden rounded-[28px] border border-white/10 bg-[#08111f] text-white shadow-2xl">
        <div className="border-b border-white/10 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black">Yeni İş Oluştur</h2>
              <p className="mt-1 text-sm text-slate-400">
                Onaylanmış ve henüz programa alınmamış işleri seç.
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
        </div>

        <div className="max-h-[60dvh] overflow-y-auto p-5">
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
              {filtered.map((job) => (
                <button
                  key={job.id}
                  disabled={creatingId === job.id}
                  onClick={() => createSchedule(job.id)}
                  className="w-full rounded-3xl border border-white/10 bg-white/[0.04] p-4 text-left transition hover:border-blue-500/50 hover:bg-blue-500/10 disabled:opacity-60"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
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
                      </div>
                    </div>

                    <div className="shrink-0 rounded-2xl bg-blue-600 px-4 py-2 text-sm font-bold">
                      {creatingId === job.id ? "Ekleniyor..." : "Programa Al"}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
