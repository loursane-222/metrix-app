"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dayjs from "dayjs";
import "dayjs/locale/tr";
import { togglePhaseCompletion } from "@/app/actions/schedule";
import ExecutionControlPanel from "@/components/execution/ExecutionControlPanel";

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

  // ── Ölçü fotoğraf state ────────────────────────────────────────────────────
  const [olcuPhotoUrl, setOlcuPhotoUrl] = useState<string>(phaseRow?.photoUrl || "");
  const [olcuPhotoUploading, setOlcuPhotoUploading] = useState(false);
  const [photoPreviewOpen, setPhotoPreviewOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileInputChangeRef = useRef<HTMLInputElement>(null);

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

  // Mevcut kayıtlı fotoğraf (tamamlanmış ölçülerde)
  const savedPhotoUrl = phaseRow?.photoUrl || "";
  const displayPhotoUrl = olcuPhotoUrl || savedPhotoUrl;

  function togglePersonel(id: string) {
    setSelectedPersonelIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  // ── Cloudinary upload ──────────────────────────────────────────────────────
  async function uploadOlcuPhoto(file: File) {
    setOlcuPhotoUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/uploads/plan", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok || !json.file?.url) throw new Error(json.hata || "Upload başarısız");
      setOlcuPhotoUrl(json.file.url);
    } catch (e: any) {
      alert(e.message || "Fotoğraf yüklenemedi");
    } finally {
      setOlcuPhotoUploading(false);
    }
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
      await togglePhaseCompletion({
        schedulePhaseId: phaseRow.id,
        isCompleted: true,
        ...((phase === "OLCU" || phase === "MONTAJ") && olcuPhotoUrl ? { photoUrl: olcuPhotoUrl } : {}),
      });
      onUpdated();
    } catch (e: any) {
      alert(e?.message || "Bu görevi tamamlandı yapma yetkiniz olmayabilir.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/70 p-0 backdrop-blur-md md:items-center md:p-5">
        <div className="flex max-h-[92dvh] w-full max-w-4xl flex-col overflow-hidden rounded-t-[30px] border border-white/10 bg-[#08111f] text-white shadow-2xl md:max-h-[86dvh] md:rounded-[30px]">

          {/* Header */}
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

          {/* Body */}
          <div className="min-h-0 flex-1 overflow-y-auto p-5">
            <div className="grid gap-4 md:grid-cols-[1fr_0.8fr]">

              {/* Sol kolon */}
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

              {/* Sağ kolon */}
              <div className="space-y-4">

                {/* ── ÖLÇÜ: Fotoğraf Yükleme ─────────────────────────────── */}
                {phase === "OLCU" && (
                  <div className="rounded-3xl border border-blue-500/20 bg-blue-500/[0.04] p-5">
                    <div className="text-xs font-bold uppercase tracking-[0.18em] text-blue-300 mb-3">
                      Ölçü Fotoğrafı
                    </div>

                    {/* Fotoğraf var → önizleme */}
                    {displayPhotoUrl ? (
                      <div className="relative">
                        <button
                          onClick={() => setPhotoPreviewOpen(true)}
                          className="block w-full overflow-hidden rounded-2xl border border-blue-400/20 hover:border-blue-400/40 transition"
                        >
                          <img
                            src={displayPhotoUrl}
                            alt="Ölçü fotoğrafı"
                            className="w-full object-cover"
                            style={{ maxHeight: 180 }}
                          />
                        </button>

                        {/* Küçüt + tam ekran hint */}
                        <div className="mt-2 flex items-center justify-between">
                          <span className="text-[11px] text-blue-300/70">
                            {savedPhotoUrl && !olcuPhotoUrl ? "Kayıtlı fotoğraf" : "Yeni fotoğraf"}
                          </span>
                          <button
                            onClick={() => setPhotoPreviewOpen(true)}
                            className="rounded-lg bg-blue-500/10 px-2 py-1 text-[10px] font-bold text-blue-300 hover:bg-blue-500/20 transition"
                          >
                            Tam Ekran ↗
                          </button>
                        </div>

                        {/* Değiştir (tamamlanmamışsa) */}
                        {!phaseRow?.isCompleted && (
                          <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-white/5 px-4 py-2.5 text-xs font-bold text-blue-300 hover:bg-white/10 transition">
                            {olcuPhotoUploading ? (
                              <>
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
                                Yükleniyor...
                              </>
                            ) : (
                              <>📷 Fotoğrafı Değiştir</>
                            )}
                            <input
                              ref={fileInputChangeRef}
                              type="file"
                              accept="image/*"
                              capture="environment"
                              className="hidden"
                              disabled={olcuPhotoUploading}
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) uploadOlcuPhoto(f);
                              }}
                            />
                          </label>
                        )}
                      </div>
                    ) : (
                      /* Fotoğraf yok → upload alanı */
                      <label className={[
                        "flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed px-4 py-8 text-center transition",
                        olcuPhotoUploading
                          ? "border-blue-400/40 bg-blue-500/5"
                          : "border-blue-400/20 bg-black/20 hover:border-blue-400/40 hover:bg-blue-500/5",
                      ].join(" ")}>
                        {olcuPhotoUploading ? (
                          <>
                            <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
                            <div className="mt-3 text-sm font-bold text-blue-300">Yükleniyor...</div>
                            <div className="mt-1 text-xs text-slate-500">Lütfen bekleyin</div>
                          </>
                        ) : (
                          <>
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-2xl">
                              📷
                            </div>
                            <div className="mt-3 text-sm font-bold text-blue-300">Ölçü Fotoğrafı Yükle</div>
                            <div className="mt-1 text-xs text-slate-500">
                              JPG, PNG, HEIC · Maks 15 MB
                            </div>
                            <div className="mt-2 rounded-xl bg-blue-500/10 px-3 py-1.5 text-[11px] text-blue-400">
                              Kamera veya galeride seç
                            </div>
                          </>
                        )}
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="hidden"
                          disabled={olcuPhotoUploading}
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) uploadOlcuPhoto(f);
                          }}
                        />
                      </label>
                    )}

                    {/* Tamamlanmış ölçü bilgisi */}
                    {phaseRow?.isCompleted && phaseRow?.photoUploadedAt && (
                      <div className="mt-3 rounded-2xl bg-blue-500/5 px-3 py-2">
                        <p className="text-[11px] text-blue-300/70">
                          Yüklenme: {dayjs(phaseRow.photoUploadedAt).format("DD MMM YYYY HH:mm")}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* İmalat bilgileri */}
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

                {/* ── MONTAJ: Fotoğraf Yükleme ───────────────────────────── */}
                {phase === "MONTAJ" && (
                  <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/[0.04] p-5">
                    <div className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-300 mb-3">
                      Montaj Kanıt Fotoğrafı
                    </div>

                    {displayPhotoUrl ? (
                      <div className="relative">
                        <button
                          onClick={() => setPhotoPreviewOpen(true)}
                          className="block w-full overflow-hidden rounded-2xl border border-emerald-400/20 hover:border-emerald-400/40 transition"
                        >
                          <img
                            src={displayPhotoUrl}
                            alt="Montaj fotoğrafı"
                            className="w-full object-cover"
                            style={{ maxHeight: 180 }}
                          />
                        </button>

                        <div className="mt-2 flex items-center justify-between">
                          <span className="text-[11px] text-emerald-300/70">
                            {savedPhotoUrl && !olcuPhotoUrl ? "Kayıtlı fotoğraf" : "Yeni fotoğraf"}
                          </span>
                          <button
                            onClick={() => setPhotoPreviewOpen(true)}
                            className="rounded-lg bg-emerald-500/10 px-2 py-1 text-[10px] font-bold text-emerald-300 hover:bg-emerald-500/20 transition"
                          >
                            Tam Ekran ↗
                          </button>
                        </div>

                        {!phaseRow?.isCompleted && (
                          <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-white/5 px-4 py-2.5 text-xs font-bold text-emerald-300 hover:bg-white/10 transition">
                            {olcuPhotoUploading ? (
                              <>
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
                                Yükleniyor...
                              </>
                            ) : (
                              <>📷 Fotoğrafı Değiştir</>
                            )}
                            <input
                              ref={fileInputChangeRef}
                              type="file"
                              accept="image/*"
                              capture="environment"
                              className="hidden"
                              disabled={olcuPhotoUploading}
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) uploadOlcuPhoto(f);
                              }}
                            />
                          </label>
                        )}
                      </div>
                    ) : (
                      <label className={[
                        "flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed px-4 py-8 text-center transition",
                        olcuPhotoUploading
                          ? "border-emerald-400/40 bg-emerald-500/5"
                          : "border-emerald-400/20 bg-black/20 hover:border-emerald-400/40 hover:bg-emerald-500/5",
                      ].join(" ")}>
                        {olcuPhotoUploading ? (
                          <>
                            <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
                            <div className="mt-3 text-sm font-bold text-emerald-300">Yükleniyor...</div>
                            <div className="mt-1 text-xs text-slate-500">Lütfen bekleyin</div>
                          </>
                        ) : (
                          <>
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-2xl">
                              📷
                            </div>
                            <div className="mt-3 text-sm font-bold text-emerald-300">Montaj Fotoğrafı Yükle</div>
                            <div className="mt-1 text-xs text-slate-500">
                              JPG, PNG, HEIC · Maks 15 MB
                            </div>
                            <div className="mt-2 rounded-xl bg-emerald-500/10 px-3 py-1.5 text-[11px] text-emerald-400">
                              Kamera veya galeride seç
                            </div>
                          </>
                        )}
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="hidden"
                          disabled={olcuPhotoUploading}
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) uploadOlcuPhoto(f);
                          }}
                        />
                      </label>
                    )}

                    {phaseRow?.isCompleted && phaseRow?.photoUploadedAt && (
                      <div className="mt-3 rounded-2xl bg-emerald-500/5 px-3 py-2">
                        <p className="text-[11px] text-emerald-300/70">
                          Yüklenme: {dayjs(phaseRow.photoUploadedAt).format("DD MMM YYYY HH:mm")}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Durum */}
                <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
                  <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Durum</div>
                  <div className="mt-2 text-lg font-black">{phaseRow?.isCompleted ? "Tamamlandı" : "Bekliyor"}</div>
                  {phaseRow?.completedAt && <div className="mt-1 text-sm text-slate-400">{fmtDate(phaseRow.completedAt)}</div>}

                  {/* Tamamlanan faz fotoğraf thumbnail */}
                  {(phase === "OLCU" || phase === "MONTAJ") && phaseRow?.isCompleted && savedPhotoUrl && (
                    <button
                      onClick={() => setPhotoPreviewOpen(true)}
                      className={[
                        "mt-3 block w-full overflow-hidden rounded-xl border transition",
                        phase === "MONTAJ"
                          ? "border-emerald-400/20 hover:border-emerald-400/40"
                          : "border-blue-400/20 hover:border-blue-400/40",
                      ].join(" ")}
                    >
                      <img
                        src={savedPhotoUrl}
                        alt="Fotoğraf kanıtı"
                        className="w-full object-cover"
                        style={{ maxHeight: 100 }}
                      />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Execution Panel — body scroll içinde, grid altında */}
            {task?.id && !editMode && !(phaseRow?.isCompleted ?? task?.completed) && (
              <div className="mt-4">
                <ExecutionControlPanel
                  schedulePhaseId={task.id}
                  phaseType={phase as "OLCU" | "IMALAT" | "MONTAJ"}
                />
              </div>
            )}
          </div>

          {/* Footer */}
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
                {phaseRow?.isCompleted
                  ? "Zaten Tamamlandı"
                  : saving
                  ? "İşleniyor..."
                  : (phase === "OLCU" || phase === "MONTAJ") && !olcuPhotoUrl
                  ? "Tamamlandı (Fotoğrafsız)"
                  : "Tamamlandı"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Fotoğraf tam ekran önizleme */}
      {photoPreviewOpen && displayPhotoUrl && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 p-4"
          onClick={() => setPhotoPreviewOpen(false)}
          style={{ paddingTop: "env(safe-area-inset-top, 16px)", paddingBottom: "env(safe-area-inset-bottom, 16px)" }}
        >
          <img
            src={displayPhotoUrl}
            alt="Fotoğraf tam ekran"
            className="max-h-full max-w-full rounded-2xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            className="absolute right-4 top-4 rounded-2xl bg-white/10 px-4 py-2.5 text-sm font-bold text-white backdrop-blur-sm hover:bg-white/20 transition"
            style={{ top: "calc(env(safe-area-inset-top, 0px) + 16px)" }}
            onClick={() => setPhotoPreviewOpen(false)}
          >
            Kapat ✕
          </button>
        </div>
      )}
    </>
  );
}
