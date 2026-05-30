"use client";

import { useEffect, useMemo, useState } from "react";

type PieceDraft = {
  sourceId: string;
  label: string;
  expectedWidthCm: number;
  expectedHeightCm: number;
  actualWidthCm: string;
  actualHeightCm: string;
  changed: boolean;
  cut: boolean;
};

type OffcutDraft = {
  widthCm: string;
  heightCm: string;
  notes: string;
};

function n(value: unknown) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function collectLayoutPieces(job: any): PieceDraft[] {
  const slabs = Array.isArray(job?.plakaLayoutJson?.slabs) ? job.plakaLayoutJson.slabs : [];
  const pieces: PieceDraft[] = [];
  for (const slab of slabs) {
    const yerlesim = Array.isArray(slab?.yerlesim) ? slab.yerlesim : [];
    for (const piece of yerlesim) {
      const width = n(piece?.genislik);
      const height = n(piece?.yukseklik);
      if (width <= 0 || height <= 0) continue;
      pieces.push({
        sourceId: String(piece?.id ?? `${pieces.length + 1}`),
        label: String(piece?.parcaTuru || piece?.label || `Parça ${pieces.length + 1}`),
        expectedWidthCm: width,
        expectedHeightCm: height,
        actualWidthCm: String(width),
        actualHeightCm: String(height),
        changed: false,
        cut: true,
      });
    }
  }
  return pieces;
}

function areaLabel(areaCm2: number) {
  return `${(areaCm2 / 10_000).toFixed(2)} m²`;
}

export default function CutResultSheet({
  open,
  executionId,
  job,
  onClose,
  onSaved,
}: {
  open: boolean;
  executionId: string | null;
  job: any;
  onClose: () => void;
  onSaved: (execution: any) => void;
}) {
  const initialPieces = useMemo(() => collectLayoutPieces(job), [job]);
  const [pieces, setPieces] = useState<PieceDraft[]>([]);
  const [offcuts, setOffcuts] = useState<OffcutDraft[]>([]);
  const [stoneBroken, setStoneBroken] = useState(false);
  const [brokenWidthCm, setBrokenWidthCm] = useState("");
  const [brokenHeightCm, setBrokenHeightCm] = useState("");
  const [brokenDescription, setBrokenDescription] = useState("");
  const [requiresNewPlate, setRequiresNewPlate] = useState(false);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setPieces(initialPieces);
    setOffcuts([]);
    setStoneBroken(false);
    setBrokenWidthCm("");
    setBrokenHeightCm("");
    setBrokenDescription("");
    setRequiresNewPlate(false);
    setNote("");
    setError(null);
  }, [open, initialPieces]);

  if (!open) return null;

  const cutArea = pieces.reduce((sum, piece) => (
    piece.cut ? sum + n(piece.actualWidthCm) * n(piece.actualHeightCm) : sum
  ), 0);
  const offcutArea = offcuts.reduce((sum, offcut) => sum + n(offcut.widthCm) * n(offcut.heightCm), 0);

  function updatePiece(index: number, patch: Partial<PieceDraft>) {
    setPieces((prev) => prev.map((piece, i) => (i === index ? { ...piece, ...patch } : piece)));
  }

  function updateOffcut(index: number, patch: Partial<OffcutDraft>) {
    setOffcuts((prev) => prev.map((offcut, i) => (i === index ? { ...offcut, ...patch } : offcut)));
  }

  async function save() {
    if (!executionId || saving) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/schedule/execution/${executionId}/cut-result`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pieces: pieces.map((piece) => ({
            sourceId: piece.sourceId,
            label: piece.label,
            expectedWidthCm: piece.expectedWidthCm,
            expectedHeightCm: piece.expectedHeightCm,
            actualWidthCm: n(piece.actualWidthCm),
            actualHeightCm: n(piece.actualHeightCm),
            cut: piece.cut,
          })),
          offcuts: offcuts.map((offcut) => ({
            widthCm: n(offcut.widthCm),
            heightCm: n(offcut.heightCm),
            notes: offcut.notes.trim() || null,
          })),
          stoneBroken: {
            enabled: stoneBroken,
            description: brokenDescription.trim() || null,
            widthCm: n(brokenWidthCm),
            heightCm: n(brokenHeightCm),
            requiresNewPlate,
          },
          note: note.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Kesim sonucu kaydedilemedi");
      onSaved(json.execution);
    } catch (err: any) {
      setError(err?.message || "Kesim sonucu kaydedilemedi");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[220] flex items-end bg-black/70 sm:items-center sm:justify-center">
      <div className="max-h-[92vh] w-full overflow-hidden rounded-t-3xl border border-white/10 bg-slate-950 shadow-2xl sm:max-w-3xl sm:rounded-3xl">
        <div className="sticky top-0 z-10 border-b border-white/10 bg-slate-950/95 px-4 py-4 backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-base font-black text-white">Kesim Sonucu Gir</div>
              <div className="text-xs font-semibold text-slate-400">{job?.musteriAdi || "Müşteri"} · {job?.urunAdi || "İş"}</div>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-xl border border-white/10 px-3 py-2 text-xs font-black text-slate-300 disabled:opacity-50"
            >
              Kapat
            </button>
          </div>
        </div>

        <div className="max-h-[calc(92vh-78px)] space-y-4 overflow-y-auto px-4 py-4">
          <section className="rounded-2xl border border-white/10 bg-white/[0.035] p-3">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm font-black text-white">Beklenen Kesimler</div>
              <div className="text-[11px] font-bold text-slate-400">{areaLabel(cutArea)}</div>
            </div>
            {pieces.length === 0 ? (
              <div className="rounded-xl border border-amber-400/20 bg-amber-500/10 p-3 text-sm font-semibold text-amber-200">
                Bu iş için plaka yerleşim parçası bulunamadı.
              </div>
            ) : (
              <div className="space-y-2">
                {pieces.map((piece, index) => (
                  <div key={`${piece.sourceId}-${index}`} className="rounded-xl border border-white/10 bg-black/20 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-sm font-black text-white">{piece.label}</div>
                        <div className="text-xs font-semibold text-slate-400">
                          Beklenen {piece.expectedWidthCm} x {piece.expectedHeightCm} cm
                        </div>
                      </div>
                      <label className="flex items-center gap-2 text-xs font-bold text-slate-300">
                        <input
                          type="checkbox"
                          checked={piece.cut}
                          onChange={(event) => updatePiece(index, { cut: event.target.checked })}
                        />
                        Kesildi
                      </label>
                    </div>
                    <button
                      type="button"
                      onClick={() => updatePiece(index, { changed: !piece.changed })}
                      className="mt-3 rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] font-black text-slate-300"
                    >
                      Ölçü Değişti
                    </button>
                    {piece.changed && (
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <input
                          inputMode="decimal"
                          value={piece.actualWidthCm}
                          onChange={(event) => updatePiece(index, { actualWidthCm: event.target.value })}
                          className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm font-bold text-white"
                          placeholder="Gerçek en"
                        />
                        <input
                          inputMode="decimal"
                          value={piece.actualHeightCm}
                          onChange={(event) => updatePiece(index, { actualHeightCm: event.target.value })}
                          className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm font-bold text-white"
                          placeholder="Gerçek boy"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/[0.035] p-3">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm font-black text-white">Kullanılabilir Kalan Parçalar</div>
              <div className="text-[11px] font-bold text-slate-400">{areaLabel(offcutArea)}</div>
            </div>
            <div className="space-y-2">
              {offcuts.map((offcut, index) => (
                <div key={index} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                  <input
                    inputMode="decimal"
                    value={offcut.widthCm}
                    onChange={(event) => updateOffcut(index, { widthCm: event.target.value })}
                    className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm font-bold text-white"
                    placeholder="En"
                  />
                  <input
                    inputMode="decimal"
                    value={offcut.heightCm}
                    onChange={(event) => updateOffcut(index, { heightCm: event.target.value })}
                    className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm font-bold text-white"
                    placeholder="Boy"
                  />
                  <button
                    type="button"
                    onClick={() => setOffcuts((prev) => prev.filter((_, i) => i !== index))}
                    className="rounded-xl border border-red-400/20 px-3 py-2 text-xs font-black text-red-300"
                  >
                    Sil
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setOffcuts((prev) => [...prev, { widthCm: "", heightCm: "", notes: "" }])}
              className="mt-3 w-full rounded-xl border border-dashed border-emerald-400/30 py-2 text-sm font-black text-emerald-300"
            >
              Offcut Ekle
            </button>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/[0.035] p-3">
            <label className="flex items-center justify-between gap-3 text-sm font-black text-white">
              Taş kırıldı mı?
              <input type="checkbox" checked={stoneBroken} onChange={(event) => setStoneBroken(event.target.checked)} />
            </label>
            {stoneBroken && (
              <div className="mt-3 space-y-2">
                <textarea
                  value={brokenDescription}
                  onChange={(event) => setBrokenDescription(event.target.value)}
                  className="min-h-20 w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm font-semibold text-white"
                  placeholder="Açıklama"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    inputMode="decimal"
                    value={brokenWidthCm}
                    onChange={(event) => setBrokenWidthCm(event.target.value)}
                    className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm font-bold text-white"
                    placeholder="Kırılan en"
                  />
                  <input
                    inputMode="decimal"
                    value={brokenHeightCm}
                    onChange={(event) => setBrokenHeightCm(event.target.value)}
                    className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm font-bold text-white"
                    placeholder="Kırılan boy"
                  />
                </div>
                <label className="flex items-center gap-2 text-xs font-bold text-slate-300">
                  <input
                    type="checkbox"
                    checked={requiresNewPlate}
                    onChange={(event) => setRequiresNewPlate(event.target.checked)}
                  />
                  Yeni plaka gerekiyor
                </label>
              </div>
            )}
          </section>

          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            className="min-h-20 w-full rounded-2xl border border-white/10 bg-slate-900 px-3 py-2 text-sm font-semibold text-white"
            placeholder="Not"
          />

          {error && (
            <div className="rounded-xl border border-red-400/25 bg-red-500/10 p-3 text-sm font-bold text-red-200">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={save}
            disabled={saving || pieces.length === 0}
            className="w-full rounded-2xl bg-blue-600 px-5 py-4 text-base font-black text-white hover:bg-blue-500 disabled:opacity-50"
          >
            {saving ? "Kaydediliyor..." : "Kaydet ve Tamamla"}
          </button>
        </div>
      </div>
    </div>
  );
}
