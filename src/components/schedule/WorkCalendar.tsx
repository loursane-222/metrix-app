"use client";

import { useState, useEffect, useTransition, useRef } from "react";
import { ScheduleModal } from "./ScheduleModal";
import { togglePhaseCompletion, movePhase, updateTasDurumu } from "@/app/actions/schedule";
import type { ScheduleWithIs } from "@/lib/types/schedule";
import { PHASE_ORDER, PHASE_LABELS } from "@/lib/types/schedule";

const TR_MONTHS = ["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"];
const TR_DAYS = ["Pzt","Sal","Çar","Per","Cum","Cmt","Paz"];

const PHASE_STYLES = {
  OLCU:   { bg: "bg-blue-100",  text: "text-blue-800",  border: "border-blue-300",  dot: "bg-blue-500"  },
  IMALAT: { bg: "bg-amber-100", text: "text-amber-800", border: "border-amber-300", dot: "bg-amber-500" },
  MONTAJ: { bg: "bg-green-100", text: "text-green-800", border: "border-green-300", dot: "bg-green-500" },
};

interface PhaseEntry {
  phaseId: string;
  scheduleId: string;
  phase: "OLCU" | "IMALAT" | "MONTAJ";
  isCompleted: boolean;
  musteriAdi: string;
  teklifNo: string;
  schedule: ScheduleWithIs;
  allPhases: ScheduleWithIs["phases"];
  plannedStart: Date;
  plannedEnd: Date;
}

interface TasAlinacakEntry {
  isId: string;
  musteriAdi: string;
  tasAdi: string;
  olcuTarihi: Date;
  tasAlindi: boolean;
}

interface QuickPopup {
  entry: PhaseEntry;
  x: number;
  y: number;
}

interface WorkCalendarProps {
  initialSchedules: ScheduleWithIs[];
  initialYear: number;
  initialMonth: number;
}

export function WorkCalendar({ initialSchedules, initialYear, initialMonth }: WorkCalendarProps) {
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);
  const [schedules, setSchedules] = useState<ScheduleWithIs[]>(initialSchedules);
  const [selectedSchedule, setSelectedSchedule] = useState<ScheduleWithIs | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [popup, setPopup] = useState<QuickPopup | null>(null);
  const [tasPopup, setTasPopup] = useState<{ entry: TasAlinacakEntry; x: number; y: number } | null>(null);
  const [tasAlindi, setTasAlindi] = useState(false);
  const [tasKaydediliyor, setTasKaydediliyor] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [statusError, setStatusError] = useState<string | null>(null);

  // Drag state
  const dragEntry = useRef<PhaseEntry | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null); // dayNum

  useEffect(() => {
    const interval = setInterval(async () => {
      const res = await fetch(`/api/schedule?year=${year}&month=${month}`);
      const data = await res.json();
      setSchedules(data);
    }, 30000);
    return () => clearInterval(interval);
  }, [year, month]);

  useEffect(() => {
    function handleClick() { setPopup(null); setTasPopup(null); }
    if (popup || tasPopup) document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [popup, tasPopup]);

  async function refreshSchedules() {
    const res = await fetch(`/api/schedule?year=${year}&month=${month}`);
    const data = await res.json();
    setSchedules(data);
  }

  async function navigate(direction: "prev" | "next") {
    setIsLoading(true);
    let newMonth = month + (direction === "next" ? 1 : -1);
    let newYear = year;
    if (newMonth > 12) { newMonth = 1; newYear++; }
    if (newMonth < 1) { newMonth = 12; newYear--; }
    try {
      const res = await fetch(`/api/schedule?year=${newYear}&month=${newMonth}`);
      const data = await res.json();
      setSchedules(data);
      setMonth(newMonth);
      setYear(newYear);
    } finally {
      setIsLoading(false);
    }
  }

  function handlePhaseClick(e: React.MouseEvent, entry: PhaseEntry) {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setPopup({ entry, x: rect.left, y: rect.bottom + window.scrollY + 4 });
  }

  function handleStatusChange(isCompleted: boolean, overrideNote?: string) {
    setStatusError(null);
    if (!popup) return;
    startTransition(async () => {
      try {
        await togglePhaseCompletion({
          schedulePhaseId: popup.entry.phaseId,
          isCompleted,
          overrideNote,
        });
        await refreshSchedules();
        setPopup(null);
      } catch (err: any) {
        setStatusError(err.message);
      }
    });
  }

  // --- Drag & Drop ---
  function handleDragStart(e: React.DragEvent, entry: PhaseEntry) {
    dragEntry.current = entry;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", entry.phaseId);
  }

  function handleDragOver(e: React.DragEvent, dayNum: number) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOver(dayNum);
  }

  function handleDragLeave() {
    setDragOver(null);
  }

  async function handleDrop(e: React.DragEvent, dayNum: number) {
    e.preventDefault();
    setDragOver(null);
    const entry = dragEntry.current;
    if (!entry) return;
    dragEntry.current = null;

    // Mevcut aralığın gün sayısını hesapla
    const oldStart = new Date(entry.plannedStart);
    const oldEnd = new Date(entry.plannedEnd);
    oldStart.setHours(0,0,0,0);
    oldEnd.setHours(0,0,0,0);
    const durasyonGun = Math.round((oldEnd.getTime() - oldStart.getTime()) / (1000 * 60 * 60 * 24));

    const newStart = new Date(year, month - 1, dayNum);
    const newEnd = new Date(year, month - 1, dayNum + durasyonGun);

    try {
      await movePhase({
        schedulePhaseId: entry.phaseId,
        newStart,
        newEnd,
      });
      await refreshSchedules();
    } catch (err) {
      console.error("Taşıma hatası:", err);
    }
  }

  // --- Taş Alındı ---
  async function tasSave() {
    if (!tasPopup) return;
    setTasKaydediliyor(true);
    try {
      await updateTasDurumu({
        isId: tasPopup.entry.isId,
        tasDurumu: tasAlindi ? 'alindi' : 'alinacak',
      });
      await refreshSchedules();
      setTasPopup(null);
    } finally {
      setTasKaydediliyor(false);
    }
  }

  // --- Takvim Hesapları ---
  const daysInMonth = new Date(year, month, 0).getDate();
  let firstDayOfWeek = new Date(year, month - 1, 1).getDay();
  firstDayOfWeek = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
  const totalCells = Math.ceil((daysInMonth + firstDayOfWeek) / 7) * 7;

  function isBuGunIsGunu(d: Date): boolean {
    return d.getDay() !== 0 && d.getDay() !== 6;
  }

  function isGunuGeriGit(baslangic: Date, gun: number): Date {
    let sayac = 0;
    const d = new Date(baslangic);
    while (sayac < gun) {
      d.setDate(d.getDate() - 1);
      if (isBuGunIsGunu(d)) sayac++;
    }
    return d;
  }

  function getTasAlinacakForDay(day: number): TasAlinacakEntry[] {
    const date = new Date(year, month - 1, day);
    date.setHours(0, 0, 0, 0);
    const entries: TasAlinacakEntry[] = [];
    for (const schedule of schedules) {
      if (!schedule.is) continue;
      const is = schedule.is as any;
      if (is.tasDurumu !== 'alinacak' && is.tasDurumu !== 'alindi') continue;
      const olcuPhase = schedule.phases.find((p: any) => p.phase === 'OLCU');
      if (!olcuPhase?.plannedStart) continue;
      const olcuTarihi = new Date(olcuPhase.plannedStart);
      const tasAlisTarihi = isGunuGeriGit(olcuTarihi, 3);
      tasAlisTarihi.setHours(0, 0, 0, 0);
      if (tasAlisTarihi.getTime() === date.getTime()) {
        entries.push({
          isId: is.id,
          musteriAdi: is.musteriAdi,
          tasAdi: is.urunAdi || '',
          olcuTarihi,
          tasAlindi: is.tasDurumu === 'alindi',
        });
      }
    }
    return entries;
  }

  function getPhaseEntriesForDay(day: number): PhaseEntry[] {
    const date = new Date(year, month - 1, day);
    date.setHours(0, 0, 0, 0);
    const entries: PhaseEntry[] = [];
    for (const schedule of schedules) {
      for (const phase of schedule.phases) {
        if (!phase.plannedStart || !phase.plannedEnd) continue;
        const start = new Date(phase.plannedStart); start.setHours(0,0,0,0);
        const end = new Date(phase.plannedEnd); end.setHours(23,59,59,999);
        if (date >= start && date <= end) {
          entries.push({
            phaseId: phase.id,
            scheduleId: schedule.id,
            phase: phase.phase as "OLCU" | "IMALAT" | "MONTAJ",
            isCompleted: phase.isCompleted,
            musteriAdi: schedule.is.musteriAdi,
            teklifNo: schedule.is.teklifNo,
            schedule,
            allPhases: schedule.phases,
            plannedStart: new Date(phase.plannedStart),
            plannedEnd: new Date(phase.plannedEnd),
          });
        }
      }
    }
    return entries;
  }

  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() + 1 === month;

  return (
    <div className="flex flex-col h-full">
      {/* Üst Bar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("prev")} disabled={isLoading} className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-lg">←</button>
          <h2 className="text-lg font-semibold min-w-[160px] text-center">{TR_MONTHS[month - 1]} {year}</h2>
          <button onClick={() => navigate("next")} disabled={isLoading} className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-lg">→</button>
          {!isCurrentMonth && (
            <button onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth() + 1); }} className="text-xs px-2.5 py-1 rounded-full border hover:bg-gray-50">Bugün</button>
          )}
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-3 text-xs text-gray-500">
            {PHASE_ORDER.map((p) => (
              <span key={p} className="flex items-center gap-1">
                <span className={`w-2.5 h-2.5 rounded-full ${PHASE_STYLES[p].dot}`} />
                {PHASE_LABELS[p]}
              </span>
            ))}
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-400" />
              Taş Alınacak
            </span>
          </div>
          <button onClick={() => { setSelectedSchedule(null); setIsModalOpen(true); }} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 transition-colors">
            + İş Programı Ekle
          </button>
        </div>
      </div>

      {/* Gün Başlıkları */}
      <div className="grid grid-cols-7 mb-1">
        {TR_DAYS.map((d) => (
          <div key={d} className="py-2 text-center text-xs font-medium text-gray-500">{d}</div>
        ))}
      </div>

      {/* Takvim Izgarası */}
      <div className={`grid grid-cols-7 flex-1 border-l border-t rounded-lg overflow-hidden transition-opacity ${isLoading ? "opacity-50" : ""}`}>
        {Array.from({ length: totalCells }, (_, i) => {
          const dayNum = i - firstDayOfWeek + 1;
          const isValid = dayNum >= 1 && dayNum <= daysInMonth;
          const isToday = isCurrentMonth && dayNum === today.getDate();
          const entries = isValid ? getPhaseEntriesForDay(dayNum) : [];
          const tasEntries = isValid ? getTasAlinacakForDay(dayNum) : [];
          const isDragTarget = dragOver === dayNum;

          return (
            <div
              key={i}
              className={`min-h-[100px] border-r border-b p-1 transition-colors
                ${!isValid ? "bg-gray-50" : isDragTarget ? "bg-blue-50 ring-2 ring-inset ring-blue-300" : "bg-white hover:bg-gray-50"}`}
              onDragOver={isValid ? (e) => handleDragOver(e, dayNum) : undefined}
              onDragLeave={isValid ? handleDragLeave : undefined}
              onDrop={isValid ? (e) => handleDrop(e, dayNum) : undefined}
            >
              {isValid && (
                <>
                  <div className="mb-1">
                    <span className={`text-xs font-medium w-6 h-6 inline-flex items-center justify-center rounded-full ${isToday ? "bg-blue-600 text-white" : "text-gray-500"}`}>
                      {dayNum}
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    {entries.slice(0, 4).map((entry, idx) => {
                      const style = PHASE_STYLES[entry.phase];
                      return (
                        <button
                          key={`${entry.phaseId}-${idx}`}
                          draggable
                          onDragStart={(e) => handleDragStart(e, entry)}
                          onClick={(e) => handlePhaseClick(e, entry)}
                          title="Sürükleyerek taşıyabilirsiniz"
                          className={`w-full text-left px-1.5 py-0.5 rounded text-xs border flex items-center gap-1 transition-all hover:shadow-sm cursor-grab active:cursor-grabbing ${style.bg} ${style.border} ${entry.isCompleted ? "opacity-50" : ""}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${entry.isCompleted ? "bg-green-500" : style.dot}`} />
                          <span className={`font-medium flex-shrink-0 ${style.text} ${entry.isCompleted ? "line-through" : ""}`}>
                            {PHASE_LABELS[entry.phase]}
                          </span>
                          <span className="truncate text-gray-500">— {entry.musteriAdi}</span>
                          {entry.isCompleted && <span className="ml-auto text-green-600 flex-shrink-0">✓</span>}
                        </button>
                      );
                    })}
                    {entries.length > 4 && (
                      <div className="text-xs text-gray-400 text-center py-0.5">+{entries.length - 4} daha</div>
                    )}
                    {tasEntries.map((entry, idx) => (
                      <button
                        key={`tas-${entry.isId}-${idx}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setTasAlindi(entry.tasAlindi);
                          setTasPopup({ entry, x: e.clientX, y: e.clientY });
                        }}
                        className="w-full text-left px-1.5 py-0.5 rounded text-xs border flex items-center gap-1 transition-all hover:shadow-sm"
                        style={{
                          background: entry.tasAlindi ? '#f0fdf4' : '#fff7ed',
                          borderColor: entry.tasAlindi ? '#86efac' : '#fed7aa',
                          color: entry.tasAlindi ? '#15803d' : '#c2410c',
                          opacity: entry.tasAlindi ? 0.6 : 1,
                        }}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${entry.tasAlindi ? 'bg-green-500' : 'bg-orange-500'}`} />
                        <span className={`font-medium flex-shrink-0 ${entry.tasAlindi ? 'line-through' : ''}`}>
                          {entry.tasAlindi ? '✓ Taş Alındı' : '🪨 Taş Alınacak'}
                        </span>
                        <span className={`truncate text-gray-500 ${entry.tasAlindi ? 'line-through' : ''}`}>— {entry.musteriAdi}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Sürükleme İpucu */}
      <div className="mt-2 text-xs text-gray-400 text-center">
        💡 Fazları sürükleyerek farklı bir güne taşıyabilirsiniz
      </div>

      {/* Hızlı Durum Popup */}
      {popup && (
        <div
          className="fixed z-50 bg-white rounded-xl shadow-xl border p-3 w-56"
          style={{ top: Math.min(popup.y, window.innerHeight - 180), left: Math.min(popup.x, window.innerWidth - 230) }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-2 pb-2 border-b">
            <div className={`text-xs font-semibold ${PHASE_STYLES[popup.entry.phase].text}`}>
              {PHASE_LABELS[popup.entry.phase]}
            </div>
            <div className="text-xs text-gray-500 truncate">{popup.entry.musteriAdi}</div>
            {popup.entry.teklifNo && <div className="text-xs text-gray-400">{popup.entry.teklifNo}</div>}
          </div>

          <div className="space-y-1.5">
            <button
              onClick={() => handleStatusChange(false)}
              disabled={isPending}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${!popup.entry.isCompleted ? "bg-blue-50 text-blue-700 border border-blue-200 font-medium" : "hover:bg-gray-50 text-gray-600"}`}
            >
              <span className="w-4 h-4 rounded-full border-2 border-blue-400 flex items-center justify-center flex-shrink-0">
                {!popup.entry.isCompleted && <span className="w-2 h-2 rounded-full bg-blue-400" />}
              </span>
              Devam Ediyor
            </button>
            <button
              onClick={() => handleStatusChange(true)}
              disabled={isPending}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${popup.entry.isCompleted ? "bg-green-50 text-green-700 border border-green-200 font-medium" : "hover:bg-gray-50 text-gray-600"}`}
            >
              <span className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 text-white text-xs">✓</span>
              Tamamlandı
            </button>
          </div>

          {statusError && (
            <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
              ⚠ {statusError}
            </div>
          )}

          <div className="mt-2 pt-2 border-t">
            <button
              onClick={() => { setSelectedSchedule(popup.entry.schedule); setIsModalOpen(true); setPopup(null); }}
              className="w-full text-xs text-gray-400 hover:text-gray-600 text-center py-1"
            >
              Düzenle →
            </button>
          </div>

          {isPending && (
            <div className="absolute inset-0 bg-white/70 rounded-xl flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
      )}

      {/* Taş Alınacak Popup */}
      {tasPopup && (
        <div
          className="fixed z-50 bg-white rounded-xl shadow-xl border p-4 w-64"
          style={{ top: Math.min(tasPopup.y, window.innerHeight - 220), left: Math.min(tasPopup.x, window.innerWidth - 270) }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-start mb-3">
            <div className="text-sm font-semibold text-orange-700">🪨 Taş Durumu</div>
            <button onClick={() => setTasPopup(null)} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
          </div>

          <div className="text-sm text-gray-800 font-medium mb-1">{tasPopup.entry.musteriAdi}</div>
          <div className="text-xs text-gray-500">Taş: <span className="font-medium">{tasPopup.entry.tasAdi || '—'}</span></div>
          <div className="text-xs text-gray-400 mt-1 mb-3">
            Ölçü tarihi: {tasPopup.entry.olcuTarihi.toLocaleDateString('tr-TR')}
          </div>

          {/* Alındı Tiki */}
          <label className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all mb-4 ${
            tasAlindi ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-gray-50 hover:border-green-300'
          }`}>
            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
              tasAlindi ? 'bg-green-500 border-green-500' : 'border-gray-300'
            }`}>
              {tasAlindi && <span className="text-white text-xs font-bold">✓</span>}
            </div>
            <div>
              <div className={`text-sm font-medium ${tasAlindi ? 'text-green-700' : 'text-gray-600'}`}>
                Taş Alındı
              </div>
              <div className="text-xs text-gray-400">İşaretlersen takvimde üzeri çizilir</div>
            </div>
            <input type="checkbox" className="hidden" checked={tasAlindi} onChange={e => setTasAlindi(e.target.checked)} />
          </label>

          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setTasPopup(null)}
              className="py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
              İptal
            </button>
            <button onClick={tasSave} disabled={tasKaydediliyor}
              className="py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-60">
              {tasKaydediliyor ? '...' : '💾 Kaydet'}
            </button>
          </div>
        </div>
      )}

      {isModalOpen && (
        <ScheduleModal
          schedule={selectedSchedule}
          onClose={() => { setIsModalOpen(false); setSelectedSchedule(null); }}
          onSaved={async () => { await refreshSchedules(); setIsModalOpen(false); setSelectedSchedule(null); }}
        />
      )}
    </div>
  );
}
