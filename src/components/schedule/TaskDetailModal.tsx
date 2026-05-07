"use client";

import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import "dayjs/locale/tr";
import { togglePhaseCompletion } from "@/app/actions/schedule";

dayjs.locale("tr");

const PHASE_META: Record<string, any> = {
  OLCU: { label: "Ölçü", icon: "📏", text: "text-blue-300", bg: "bg-blue-500/10", border: "border-blue-500/25" },
  IMALAT: { label: "İmalat", icon: "⚙️", text: "text-amber-300", bg: "bg-amber-500/10", border: "border-amber-500/25" },
  MONTAJ: { label: "Montaj", icon: "🔧", text: "text-emerald-300", bg: "bg-emerald-500/10", border: "border-emerald-500/25" },
};

function fmtDate(v: any) {
  return v ? dayjs(v).format("DD MMMM YYYY dddd") : "Tarih yok";
}

function delayDays(v: any, completed: boolean) {
  if (!v || completed) return 0;
  const planned = dayjs(v).startOf("day");
  const today = dayjs().startOf("day");
  return today.isAfter(planned) ? today.diff(planned, "day") : 0;
}


function PlakaLayoutPreview({ job }: { job: any }) {
  const layout = job?.plakaLayoutJson;
  const slabs = Array.isArray(layout?.slabs) ? layout.slabs : [];
  const w = Number(layout?.plaka?.genislik || layout?.plakaGenislik || job?.plakaGenislikCm || 320);
  const h = Number(layout?.plaka?.yukseklik || layout?.plakaYukseklik || job?.plakaUzunlukCm || 160);

  if (!slabs.length) {
    return (
      <div className="mt-3 flex h-44 items-center justify-center rounded-2xl border border-dashed border-white/10 bg-black/20 text-center text-sm text-slate-500">
        Bu iş için kayıtlı plaka yerleşimi bulunamadı.
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-4">
      {slabs.map((slab: any, idx: number) => (
        <div key={slab.index ?? idx} className="rounded-2xl border border-white/10 bg-black/20 p-3">
          <div className="mb-2 text-xs font-black text-slate-400">Plaka {(slab.index ?? idx) + 1}</div>
          <div
            className="relative w-full overflow-hidden rounded-xl border border-white/15 bg-[linear-gradient(135deg,#d9d0c0,#f8f1e7,#b8ad9d,#efe4d2)]"
            style={{ aspectRatio: `${w} / ${h}` }}
          >
            {(slab.yerlesim || []).map((piece: any, i: number) => (
              <div
                key={`${piece.id || i}-${piece.x}-${piece.y}`}
                className="absolute flex items-center justify-center border border-rose-700/80 bg-rose-500/30 px-1 text-center text-[10px] font-black text-slate-950 backdrop-blur-[1px]"
                style={{
                  left: `${(Number(piece.x || 0) / w) * 100}%`,
                  top: `${(Number(piece.y || 0) / h) * 100}%`,
                  width: `${(Number(piece.genislik || 0) / w) * 100}%`,
                  height: `${(Number(piece.yukseklik || 0) / h) * 100}%`,
                }}
              >
                <span className="line-clamp-2">{piece.parcaTuru || piece.label || "Parça"}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function TaskDetailModal({ task, onClose, onUpdated }: any) {
  const phase = task?.phase;
  const meta = PHASE_META[phase] || PHASE_META.OLCU;
  const schedule = task?.schedule || {};
  const job = schedule?.is || {};

  const phaseRow = useMemo(
    () => (schedule?.phases || []).find((p: any) => p.id === task?.id || p.phase === phase),
    [schedule, task?.id, phase]
  );

  const assignments = phaseRow?.fazAtamalar || [];
  const initialIds = assignments.map((a: any) => a.personelId || a?.personel?.id).filter(Boolean);

  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [personeller, setPersoneller] = useState<any[]>([]);
  const [plannedDate, setPlannedDate] = useState(phaseRow?.plannedStart ? dayjs(phaseRow.plannedStart).format("YYYY-MM-DD") : "");
  const [notesDraft, setNotesDraft] = useState(schedule?.notes || job?.notlar || "");
  const [selectedPersonelIds, setSelectedPersonelIds] = useState<string[]>(initialIds);

  useEffect(() => {
    fetch("/api/personel", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setPersoneller(Array.isArray(d?.personeller) ? d.personeller : []))
      .catch(() => setPersoneller([]));
  }, []);

  const assignedText =
    assignments.length > 0
      ? assignments.map((a: any) => [a?.personel?.ad, a?.personel?.soyad].filter(Boolean).join(" ")).filter(Boolean).join(", ")
      : "Personel atanmadı";

  const gecikme = delayDays(phaseRow?.plannedStart, !!phaseRow?.isCompleted);
  const toplamDakika = Number(job?.toplamSureDakika || 0);
  const saat = toplamDakika > 0 ? Math.floor(toplamDakika / 60) : 0;
  const dakika = toplamDakika > 0 ? Math.round(toplamDakika % 60) : 0;

  function togglePersonel(id: string) {
    setSelectedPersonelIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function saveFullEdit() {
    if (!phaseRow?.id || !plannedDate) return;
    setSaving(true);
    try {
      const res = await fetch("/api/schedule/phase-full", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phaseId: phaseRow.id,
          plannedDate,
          notes: notesDraft,
          personelIds: selectedPersonelIds,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Görev güncellenemedi");
      onUpdated();
    } catch (e: any) {
      alert(e?.message || "Görev güncellenemedi");
    } finally {
      setSaving(false);
    }
  }

  async function completePhase() {
    if (!phaseRow?.id) return;
    setSaving(true);
    try {
      await togglePhaseCompletion({ schedulePhaseId: phaseRow.id, isCompleted: true });
      onUpdated();
    } catch (e: any) {
      alert(e?.message || "Bu görevi tamamlandı yapma yetkiniz olmayabilir.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/70 p-0 backdrop-blur-md md:items-center md:p-5">
      <div className="flex max-h-[92dvh] w-full max-w-4xl flex-col overflow-hidden rounded-t-[30px] border border-white/10 bg-[#08111f] text-white shadow-2xl md:max-h-[86dvh] md:rounded-[30px]">
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-white/10 p-5">
          <div>
            <div className={`inline-flex items-center gap-2 rounded-2xl border px-3 py-1.5 text-sm font-black ${meta.bg} ${meta.text} ${meta.border}`}>
              <span>{meta.icon}</span>
              <span>{meta.label}</span>
            </div>
            <h2 className="mt-3 text-2xl font-black tracking-tight">{job?.musteriAdi || task?.title || "İsimsiz iş"}</h2>
            <p className="mt-1 text-sm text-slate-400">{job?.urunAdi || task?.subtitle || "Ürün bilgisi yok"}</p>
          </div>

          <button onClick={onClose} className="rounded-2xl bg-white/10 px-4 py-2 text-sm font-bold hover:bg-white/15">
            Kapat
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <div className="grid gap-4 md:grid-cols-[1fr_0.8fr]">
            <div className="space-y-4">
              <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
                <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Planlanan Tarih</div>
                <div className="mt-2 text-xl font-black">{fmtDate(phaseRow?.plannedStart)}</div>

                {gecikme > 0 && (
                  <div className="mt-3 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-300">
                    {gecikme} gün gecikti
                  </div>
                )}

                {editMode && (
                  <input
                    type="date"
                    value={plannedDate}
                    onChange={(e) => setPlannedDate(e.target.value)}
                    className="mt-4 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                  />
                )}
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
                <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Personel</div>

                {!editMode ? (
                  <>
                    <div className="mt-2 text-lg font-black">{assignedText}</div>
                    <p className="mt-2 text-sm text-slate-400">Tamamlama yetkisi atanmış personel kuralıyla çalışır.</p>
                  </>
                ) : (
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    {personeller.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-white/10 p-4 text-sm text-slate-400">Personel bulunamadı.</div>
                    ) : (
                      personeller.map((p) => {
                        const active = selectedPersonelIds.includes(p.id);
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => togglePersonel(p.id)}
                            className={[
                              "rounded-2xl border p-3 text-left transition",
                              active ? "border-blue-500 bg-blue-500/15" : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]",
                            ].join(" ")}
                          >
                            <div className="font-black">{p.ad} {p.soyad}</div>
                            <div className="mt-1 text-xs text-slate-400">{p.gorevi || "Görev yok"}</div>
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
                <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                  {phase === "OLCU" || phase === "MONTAJ" ? "Adres / Notlar" : "İş Notları"}
                </div>

                {!editMode ? (
                  <div className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-300">
                    {schedule?.notes || job?.notlar || "Not/adres bilgisi girilmemiş."}
                  </div>
                ) : (
                  <textarea
                    value={notesDraft}
                    onChange={(e) => setNotesDraft(e.target.value)}
                    rows={5}
                    placeholder="Adres, özel not, müşteri talebi..."
                    className="mt-4 w-full resize-none rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
                  />
                )}
              </div>
            </div>

            <div className="space-y-4">
              {phase === "IMALAT" && (
                <>
                  <div className="rounded-3xl border border-amber-500/20 bg-amber-500/10 p-5">
                    <div className="text-xs font-bold uppercase tracking-[0.18em] text-amber-300">Hesaplanan Süre</div>
                    <div className="mt-2 text-3xl font-black text-amber-200">{toplamDakika > 0 ? `${Math.round(toplamDakika)} dk` : "Süre yok"}</div>
                    {toplamDakika > 0 && <div className="mt-1 text-sm text-amber-100/70">{saat} saat {dakika} dakika</div>}
                  </div>

                  <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
                    <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Plaka Yerleşimi</div>
                    <PlakaLayoutPreview job={job} />
                  </div>
                </>
              )}

              {phase === "MONTAJ" && (
                <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-5">
                  <div className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-300">Montaj Kanıt Görselleri</div>
                  <div className="mt-3 flex h-40 items-center justify-center rounded-2xl border border-dashed border-emerald-400/20 bg-black/20 text-center text-sm text-emerald-100/70">
                    Fotoğraf yükleme ve arşiv sistemi bir sonraki fazda eklenecek.
                  </div>
                  <button disabled className="mt-3 w-full rounded-2xl bg-white/10 px-4 py-3 text-sm font-black text-white/50">
                    Görsel Yükle — yakında
                  </button>
                </div>
              )}

              <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
                <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Durum</div>
                <div className="mt-2 text-lg font-black">{phaseRow?.isCompleted ? "Tamamlandı" : "Bekliyor"}</div>
                {phaseRow?.completedAt && <div className="mt-1 text-sm text-slate-400">{fmtDate(phaseRow.completedAt)}</div>}
              </div>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-3 border-t border-white/10 p-5 sm:flex-row">
          <button
            onClick={() => setEditMode((v) => !v)}
            className="w-full rounded-2xl bg-white/10 px-5 py-4 text-base font-black hover:bg-white/15"
          >
            {editMode ? "Düzenlemeyi Kapat" : "Düzenle"}
          </button>

          {editMode && (
            <button
              onClick={saveFullEdit}
              disabled={saving || !plannedDate}
              className="w-full rounded-2xl bg-blue-600 px-5 py-4 text-base font-black text-white shadow-lg shadow-blue-900/30 hover:bg-blue-500 disabled:opacity-50"
            >
              {saving ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}
            </button>
          )}

          {!editMode && (
            <button
              onClick={completePhase}
              disabled={saving || phaseRow?.isCompleted}
              className="w-full rounded-2xl bg-emerald-600 px-5 py-4 text-base font-black text-white shadow-lg shadow-emerald-900/30 hover:bg-emerald-500 disabled:opacity-50"
            >
              {phaseRow?.isCompleted ? "Zaten Tamamlandı" : saving ? "İşleniyor..." : "Tamamlandı"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
