"use client";

import { useState, useTransition, useEffect } from "react";
import { PhaseBadge } from "./PhaseBadge";
import { upsertWorkSchedule } from "@/app/actions/schedule";
import type { ScheduleWithIs } from "@/lib/types/schedule";
import { PHASE_ORDER, PHASE_LABELS } from "@/lib/types/schedule";

interface ScheduleModalProps {
  schedule?: ScheduleWithIs | null;
  onClose: () => void;
  onSaved: () => void;
}

type Personel = { id: string; ad: string; soyad: string; gorevi: string };
type FazAtama = { id: string; personel: Personel };

type LocalSchedule = {
  id: string;
  isId: string;
  startDate: Date | null;
  endDate: Date | null;
  notes: string | null;
  phases: any[];
  is: {
    id: string;
    teklifNo: string;
    musteriAdi: string;
    urunAdi: string;
  };
};

export function ScheduleModal({ schedule, onClose, onSaved }: ScheduleModalProps) {
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState<"is" | "tarihler" | "asamalar" | "atama">(
    schedule ? "tarihler" : "is"
  );

  const [currentSchedule, setCurrentSchedule] = useState<LocalSchedule | null>(
    schedule
      ? {
          ...schedule,
          phases: schedule.phases as any[],
          is: {
            id: schedule.is.id,
            teklifNo: schedule.is.teklifNo,
            musteriAdi: schedule.is.musteriAdi,
            urunAdi: schedule.is.urunAdi,
          },
        }
      : null
  );

  const [selectedIs, setSelectedIs] = useState<{
    id: string;
    teklifNo: string;
    musteriAdi: string;
    urunAdi: string;
  } | null>(
    schedule
      ? {
          id: schedule.isId,
          teklifNo: schedule.is.teklifNo,
          musteriAdi: schedule.is.musteriAdi,
          urunAdi: schedule.is.urunAdi,
        }
      : null
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<typeof selectedIs[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const [startDate] = useState(
    schedule?.startDate ? new Date(schedule.startDate).toISOString().split("T")[0] : ""
  );
  const [endDate] = useState(
    schedule?.endDate ? new Date(schedule.endDate).toISOString().split("T")[0] : ""
  );
  const [notes, setNotes] = useState(schedule?.notes ?? "");

  const [phaseDates, setPhaseDates] = useState<Record<string, { start: string; end: string }>>(
    Object.fromEntries(
      PHASE_ORDER.map((phase) => {
        const p = schedule?.phases.find((ph) => ph.phase === phase);
        return [
          phase,
          {
            start: p?.plannedStart ? new Date(p.plannedStart).toISOString().split("T")[0] : "",
            end: p?.plannedEnd ? new Date(p.plannedEnd).toISOString().split("T")[0] : "",
          },
        ];
      })
    )
  );

  const [personeller, setPersoneller] = useState<Personel[]>([]);
  const [fazAtamalar, setFazAtamalar] = useState<Record<string, FazAtama[]>>({});
  const [atamaYukleniyor, setAtamaYukleniyor] = useState(false);

  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/isler-ara?q=${encodeURIComponent(searchQuery)}`);
        setSearchResults(await res.json());
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    fetch("/api/personel")
      .then((r) => r.json())
      .then((v) => {
        if (v.personeller) setPersoneller(v.personeller);
      });
  }, []);

  useEffect(() => {
    if (currentSchedule?.phases?.length) {
      const baslangicAtamalar: Record<string, FazAtama[]> = {};
      for (const phase of currentSchedule.phases as any[]) {
        baslangicAtamalar[phase.id] = phase.fazAtamalar || [];
      }
      setFazAtamalar(baslangicAtamalar);
    }
  }, [currentSchedule]);

  useEffect(() => {
    if (step === "atama" && currentSchedule) {
      yukleAtamalar();
    }
  }, [step, currentSchedule]);

  async function yukleAtamalar() {
    if (!currentSchedule) return;

    setAtamaYukleniyor(true);
    const yeni: Record<string, FazAtama[]> = {};

    for (const phase of currentSchedule.phases as any[]) {
      const res = await fetch(`/api/faz-atama?schedulePhaseId=${phase.id}`);
      const v = await res.json();
      yeni[phase.id] = v.atamalar || [];
    }

    setFazAtamalar(yeni);
    setAtamaYukleniyor(false);
  }

  async function atamaEkle(schedulePhaseId: string, personelId: string) {
    const res = await fetch("/api/faz-atama", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ schedulePhaseId, personelId }),
    });

    const v = await res.json();
    if (v.hata) {
      alert(v.hata);
      return;
    }

    setFazAtamalar((prev) => ({
      ...prev,
      [schedulePhaseId]: [...(prev[schedulePhaseId] || []), v.atama],
    }));
  }

  async function atamaSil(schedulePhaseId: string, atamaId: string) {
    const res = await fetch(`/api/faz-atama?id=${atamaId}`, { method: "DELETE" });
    const v = await res.json();
    if (v?.hata) {
      alert(v.hata);
      return;
    }

    setFazAtamalar((prev) => ({
      ...prev,
      [schedulePhaseId]: (prev[schedulePhaseId] || []).filter((a) => a.id !== atamaId),
    }));
  }

  function handleSave() {
    if (!selectedIs) return;

    startTransition(async () => {
      const saved: any = await upsertWorkSchedule({
        isId: selectedIs.id,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        notes: notes || undefined,
        phases: PHASE_ORDER.map((phase) => ({
          phase,
          plannedStart: phaseDates[phase].start ? new Date(phaseDates[phase].start) : null,
          plannedEnd: phaseDates[phase].end ? new Date(phaseDates[phase].end) : null,
        })),
      });

      const normalized: LocalSchedule = {
        ...saved,
        phases: saved.phases || [],
        is: {
          id: selectedIs.id,
          teklifNo: selectedIs.teklifNo,
          musteriAdi: selectedIs.musteriAdi,
          urunAdi: selectedIs.urunAdi,
        },
      };

      setCurrentSchedule(normalized);

      if (!schedule) {
        setStep("atama");
      } else {
        onSaved();
      }
    });
  }

  const adimlar = currentSchedule
    ? (["is", "tarihler", "asamalar", "atama"] as const)
    : (["is", "tarihler", "asamalar"] as const);

  const adimEtiket = (s: string) => {
    if (s === "is") return "1. İş";
    if (s === "tarihler") return "2. Notlar";
    if (s === "asamalar") return "3. Aşamalar";
    return "4. Personel Ata";
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="font-semibold">
            {schedule ? "İş Programını Düzenle" : "Yeni İş Programı"}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
            ✕
          </button>
        </div>

        <div className="flex px-5 pt-4 gap-2">
          {adimlar.map((s) => (
            <button
              key={s}
              onClick={() => setStep(s as any)}
              className={`flex-1 py-1.5 text-xs font-medium rounded-full transition-colors ${
                step === s ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-500"
              }`}
            >
              {adimEtiket(s)}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {step === "is" && (
            <div className="space-y-3">
              <label className="text-sm font-medium">İş Ara</label>

              <div className="relative">
                <input
                  className="w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Teklif no, müşteri adı veya ürün..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                />
                {isSearching && (
                  <div className="absolute right-3 top-3 w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                )}
              </div>

              {searchResults.length > 0 && (
                <div className="border rounded-lg divide-y overflow-hidden">
                  {searchResults.map(
                    (o) =>
                      o && (
                        <button
                          key={o.id}
                          className="w-full text-left px-3 py-2.5 hover:bg-gray-50 transition-colors"
                          onClick={() => {
                            setSelectedIs(o);
                            setStep("tarihler");
                          }}
                        >
                          <div className="font-medium text-sm">{o.teklifNo || "(Teklif no yok)"}</div>
                          <div className="text-xs text-gray-500">
                            {o.musteriAdi} — {o.urunAdi}
                          </div>
                        </button>
                      )
                  )}
                </div>
              )}

              {selectedIs && (
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="text-sm font-medium">{selectedIs.teklifNo}</div>
                    <div className="text-xs text-gray-500">{selectedIs.musteriAdi}</div>
                  </div>
                  <button
                    className="text-xs text-gray-400 hover:text-gray-600"
                    onClick={() => setSelectedIs(null)}
                  >
                    Değiştir
                  </button>
                </div>
              )}
            </div>
          )}

          {step === "tarihler" && (
            <div className="space-y-4">
              {selectedIs && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium">{selectedIs.teklifNo}</span>
                  <span className="text-xs text-gray-500 ml-2">{selectedIs.musteriAdi}</span>
                </div>
              )}

              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Notlar</label>
                <textarea
                  className="w-full border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="İsteğe bağlı..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>
          )}

          {step === "asamalar" && (
            <div className="space-y-3">
              {PHASE_ORDER.map((phase, i) => (
                <div key={phase} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-xs font-medium">
                      {i + 1}
                    </span>
                    <span className="text-sm font-medium">{PHASE_LABELS[phase]}</span>
                    {currentSchedule &&
                      (() => {
                        const p = currentSchedule.phases.find((ph: any) => ph.phase === phase);
                        return p ? <PhaseBadge phase={p} allPhases={currentSchedule.phases} compact /> : null;
                      })()}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Plan Başl.</label>
                      <input
                        type="date"
                        className="w-full border rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={phaseDates[phase].start}
                        onChange={(e) =>
                          setPhaseDates((prev) => ({
                            ...prev,
                            [phase]: { ...prev[phase], start: e.target.value },
                          }))
                        }
                      />
                    </div>

                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Plan Bitiş</label>
                      <input
                        type="date"
                        className="w-full border rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={phaseDates[phase].end}
                        min={phaseDates[phase].start}
                        onChange={(e) =>
                          setPhaseDates((prev) => ({
                            ...prev,
                            [phase]: { ...prev[phase], end: e.target.value },
                          }))
                        }
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {step === "atama" && (
            <div className="space-y-4">
              {!currentSchedule ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
                  Önce iş programını kaydedin. Kaydettikten sonra personel atama ekranı açılır.
                </div>
              ) : atamaYukleniyor ? (
                <p className="text-sm text-gray-400 text-center py-4">Yükleniyor...</p>
              ) : (
                PHASE_ORDER.map((phase) => {
                  const phaseObj = (currentSchedule.phases as any[]).find((p: any) => p.phase === phase);
                  if (!phaseObj) return null;

                  const atamalar = fazAtamalar[phaseObj.id] || [];
                  const atanenIds = atamalar.map((a) => a.personel.id);
                  const atanamaz = atamalar.length >= 5;

                  return (
                    <div key={phase} className="border rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-sm font-semibold">{PHASE_LABELS[phase]}</span>
                        <span className="text-xs text-gray-400">{atamalar.length}/5 kişi</span>
                      </div>

                      {atamalar.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {atamalar.map((a) => (
                            <span
                              key={a.id}
                              className="flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-2.5 py-0.5 text-xs"
                            >
                              {a.personel.ad} {a.personel.soyad}
                              <button
                                onClick={() => atamaSil(phaseObj.id, a.id)}
                                className="ml-0.5 text-blue-400 hover:text-red-500 font-bold"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      )}

                      {!atanamaz && (
                        <select
                          className="w-full border rounded-lg px-3 py-1.5 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          value=""
                          onChange={(e) => {
                            if (e.target.value) atamaEkle(phaseObj.id, e.target.value);
                          }}
                        >
                          <option value="">+ Atama Ekle...</option>
                          {personeller
                            .filter((p) => !atanenIds.includes(p.id))
                            .map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.ad} {p.soyad} — {p.gorevi}
                              </option>
                            ))}
                        </select>
                      )}

                      {atanamaz && (
                        <p className="text-xs text-gray-400 text-center">Maksimum 5 kişi atandı.</p>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t flex items-center justify-between">
          <div>
            {step !== "is" && (
              <button
                className="px-3 py-2 text-sm rounded-lg border hover:bg-gray-50 transition-colors"
                onClick={() => {
                  const simdikiIndex = adimlar.indexOf(step as any);
                  if (simdikiIndex > 0) setStep(adimlar[simdikiIndex - 1] as any);
                }}
              >
                ← Geri
              </button>
            )}
          </div>

          <div className="flex gap-2">
            {step === "atama" ? (
              <button
                className="px-4 py-2 text-sm rounded-lg bg-green-600 text-white hover:bg-green-700"
                onClick={onSaved}
              >
                ✓ Tamamlandı
              </button>
            ) : step === "asamalar" ? (
              <button
                className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                onClick={handleSave}
                disabled={isPending || !selectedIs}
              >
                {isPending && (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                {currentSchedule ? "Güncelle" : "Kaydet ve Personel Ata"}
              </button>
            ) : (
              <button
                className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                onClick={() => {
                  const simdikiIndex = adimlar.indexOf(step as any);
                  if (simdikiIndex < adimlar.length - 1) setStep(adimlar[simdikiIndex + 1] as any);
                }}
                disabled={step === "is" && !selectedIs}
              >
                Devam →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
