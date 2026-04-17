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

export function ScheduleModal({ schedule, onClose, onSaved }: ScheduleModalProps) {
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState<"is" | "tarihler" | "asamalar">(schedule ? "tarihler" : "is");
  const [selectedIs, setSelectedIs] = useState<{id:string;teklifNo:string;musteriAdi:string;urunAdi:string} | null>(
    schedule ? { id: schedule.isId, teklifNo: schedule.is.teklifNo, musteriAdi: schedule.is.musteriAdi, urunAdi: schedule.is.urunAdi } : null
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<typeof selectedIs[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [startDate, setStartDate] = useState(schedule?.startDate ? new Date(schedule.startDate).toISOString().split("T")[0] : "");
  const [endDate, setEndDate] = useState(schedule?.endDate ? new Date(schedule.endDate).toISOString().split("T")[0] : "");
  const [notes, setNotes] = useState(schedule?.notes ?? "");
  const [phaseDates, setPhaseDates] = useState<Record<string,{start:string;end:string}>>(
    Object.fromEntries(PHASE_ORDER.map((phase) => {
      const p = schedule?.phases.find((ph) => ph.phase === phase);
      return [phase, {
        start: p?.plannedStart ? new Date(p.plannedStart).toISOString().split("T")[0] : "",
        end: p?.plannedEnd ? new Date(p.plannedEnd).toISOString().split("T")[0] : ""
      }];
    }))
  );

  useEffect(() => {
    if (searchQuery.length < 2) { setSearchResults([]); return; }
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

  function handleSave() {
    if (!selectedIs) return;
    startTransition(async () => {
      await upsertWorkSchedule({
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
      onSaved();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="font-semibold">{schedule ? "İş Programını Düzenle" : "Yeni İş Programı"}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">✕</button>
        </div>

        <div className="flex px-5 pt-4 gap-2">
          {(["is","tarihler","asamalar"] as const).map((s) => (
            <button key={s} onClick={() => setStep(s)}
              className={`flex-1 py-1.5 text-xs font-medium rounded-full transition-colors ${step === s ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-500"}`}>
              {s === "is" ? "1. İş" : s === "tarihler" ? "2. Tarihler" : "3. Aşamalar"}
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
                  {searchResults.map((o) => o && (
                    <button key={o.id} className="w-full text-left px-3 py-2.5 hover:bg-gray-50 transition-colors"
                      onClick={() => { setSelectedIs(o); setStep("tarihler"); }}>
                      <div className="font-medium text-sm">{o.teklifNo || "(Teklif no yok)"}</div>
                      <div className="text-xs text-gray-500">{o.musteriAdi} — {o.urunAdi}</div>
                    </button>
                  ))}
                </div>
              )}
              {selectedIs && (
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="text-sm font-medium">{selectedIs.teklifNo}</div>
                    <div className="text-xs text-gray-500">{selectedIs.musteriAdi}</div>
                  </div>
                  <button className="text-xs text-gray-400 hover:text-gray-600" onClick={() => setSelectedIs(null)}>Değiştir</button>
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Başlangıç</label>
                  <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Bitiş</label>
                  <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={endDate} min={startDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Notlar</label>
                <textarea className="w-full border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={2} placeholder="İsteğe bağlı..." value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
            </div>
          )}

          {step === "asamalar" && (
            <div className="space-y-3">
              {schedule && (
                <p className="text-xs text-gray-500">Tamamlandı durumunu aşama satırına tıklayarak değiştirebilirsiniz.</p>
              )}
              {PHASE_ORDER.map((phase, i) => (
                <div key={phase} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-xs font-medium">{i + 1}</span>
                    <span className="text-sm font-medium">{PHASE_LABELS[phase]}</span>
                    {schedule && (() => {
                      const p = schedule.phases.find((ph) => ph.phase === phase);
                      return p ? <PhaseBadge phase={p} allPhases={schedule.phases} compact /> : null;
                    })()}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Plan Başl.</label>
                      <input type="date" className="w-full border rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={phaseDates[phase].start}
                        onChange={(e) => setPhaseDates((prev) => ({ ...prev, [phase]: { ...prev[phase], start: e.target.value } }))} />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Plan Bitiş</label>
                      <input type="date" className="w-full border rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={phaseDates[phase].end} min={phaseDates[phase].start}
                        onChange={(e) => setPhaseDates((prev) => ({ ...prev, [phase]: { ...prev[phase], end: e.target.value } }))} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t flex items-center justify-between">
          <div>
            {step !== "is" && (
              <button className="px-3 py-2 text-sm rounded-lg border hover:bg-gray-50 transition-colors"
                onClick={() => setStep(step === "asamalar" ? "tarihler" : "is")}>← Geri</button>
            )}
          </div>
          {step !== "asamalar" ? (
            <button className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
              onClick={() => setStep(step === "is" ? "tarihler" : "asamalar")}
              disabled={step === "is" && !selectedIs}>
              Devam →
            </button>
          ) : (
            <button className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              onClick={handleSave} disabled={isPending || !selectedIs}>
              {isPending && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {schedule ? "Güncelle" : "Kaydet"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
