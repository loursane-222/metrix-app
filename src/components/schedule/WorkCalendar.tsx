"use client";

import { useState, useEffect, useTransition, useRef, useMemo } from "react";
import { ScheduleModal } from "./ScheduleModal";
import { togglePhaseCompletion, movePhase, updateTasDurumu } from "@/app/actions/schedule";
import type { ScheduleWithIs } from "@/lib/types/schedule";
import { PHASE_ORDER, PHASE_LABELS } from "@/lib/types/schedule";

const TR_MONTHS = ["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"];
const TR_DAYS = ["Pzt","Sal","Çar","Per","Cum","Cmt","Paz"];

const PHASE_STYLES = {
  OLCU:   { bg: "bg-blue-50",  text: "text-blue-700",  border: "border-blue-200",  dot: "bg-blue-500", chip: "bg-blue-100 text-blue-700 border-blue-200" },
  IMALAT: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", dot: "bg-amber-500", chip: "bg-amber-100 text-amber-700 border-amber-200" },
  MONTAJ: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", dot: "bg-emerald-500", chip: "bg-emerald-100 text-emerald-700 border-emerald-200" },
} as const;

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
  assignedPeople: { id: string; ad: string; soyad: string; gorevi: string }[];
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

interface DayDetailPopup {
  dayNum: number;
  entries: PhaseEntry[];
  tasEntries: TasAlinacakEntry[];
}

interface WorkCalendarProps {
  initialSchedules: ScheduleWithIs[];
  initialYear: number;
  initialMonth: number;
}

function cls(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
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
  const [dayPopup, setDayPopup] = useState<DayDetailPopup | null>(null);
  const [tasAlindi, setTasAlindi] = useState(false);
  const [tasKaydediliyor, setTasKaydediliyor] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [statusError, setStatusError] = useState<string | null>(null);

  const dragEntry = useRef<PhaseEntry | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/schedule?year=${year}&month=${month}`, {
          cache: "no-store",
        });

        if (!res.ok) {
          console.warn("İş programı otomatik yenileme başarısız:", res.status);
          return;
        }

        const data = await res.json();
        if (Array.isArray(data)) {
          setSchedules(data);
        }
      } catch (error) {
        console.warn("İş programı otomatik yenileme hatası:", error);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [year, month]);

  useEffect(() => {
    function handleClick() {
      setPopup(null);
    }
    if (popup) document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [popup]);

  async function refreshSchedules() {
    const res = await fetch(`/api/schedule?year=${year}&month=${month}`);
    const data = await res.json();
    setSchedules(data);
  }

  async function navigate(direction: "prev" | "next") {
    setIsLoading(true);
    let newMonth = month + (direction === "next" ? 1 : -1);
    let newYear = year;

    if (newMonth > 12) {
      newMonth = 1;
      newYear++;
    }
    if (newMonth < 1) {
      newMonth = 12;
      newYear--;
    }

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
    setPopup({
      entry,
      x: Math.min(rect.left, window.innerWidth - 360),
      y: rect.bottom + window.scrollY + 8,
    });
  }

  function handleDayNumberClick(
    e: React.MouseEvent,
    dayNum: number,
    entries: PhaseEntry[],
    tasEntries: TasAlinacakEntry[]
  ) {
    e.stopPropagation();
    setPopup(null);
    setTasPopup(null);
    setDayPopup({
      dayNum,
      entries,
      tasEntries,
    });
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

    const oldStart = new Date(entry.plannedStart);
    const oldEnd = new Date(entry.plannedEnd);
    oldStart.setHours(0, 0, 0, 0);
    oldEnd.setHours(0, 0, 0, 0);

    const durasyonGun = Math.round(
      (oldEnd.getTime() - oldStart.getTime()) / (1000 * 60 * 60 * 24)
    );

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

  async function tasSave() {
    if (!tasPopup) return;
    setTasKaydediliyor(true);

    try {
      await updateTasDurumu({
        isId: tasPopup.entry.isId,
        tasDurumu: tasAlindi ? "alindi" : "alinacak",
      });
      await refreshSchedules();
      setTasPopup(null);
    } finally {
      setTasKaydediliyor(false);
    }
  }

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
      const olcuPhase = (schedule.phases as any[]).find((p: any) => p.phase === "OLCU");
      if (!olcuPhase?.plannedStart) continue;

      const urunVarMi = !!(is.urunAdi && String(is.urunAdi).trim());
      if (!urunVarMi) continue;

      const olcuTarihi = new Date(olcuPhase.plannedStart);
      const tasAlisTarihi = isGunuGeriGit(olcuTarihi, 3);
      tasAlisTarihi.setHours(0, 0, 0, 0);

      if (tasAlisTarihi.getTime() === date.getTime()) {
        entries.push({
          isId: is.id,
          musteriAdi: is.musteriAdi,
          tasAdi: is.urunAdi || "",
          olcuTarihi,
          tasAlindi: is.tasDurumu === "alindi",
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
      for (const phase of schedule.phases as any[]) {
        if (!phase.plannedStart || !phase.plannedEnd) continue;

        const start = new Date(phase.plannedStart);
        start.setHours(0, 0, 0, 0);

        const end = new Date(phase.plannedEnd);
        end.setHours(23, 59, 59, 999);

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
            assignedPeople: (phase.fazAtamalar || []).map((a: any) => a.personel),
          });
        }
      }
    }

    return entries;
  }

  const today = new Date();
  const isCurrentMonth =
    today.getFullYear() === year && today.getMonth() + 1 === month;

  const monthlyStats = useMemo(() => {
    const phaseEntries = Array.from({ length: daysInMonth }, (_, idx) => getPhaseEntriesForDay(idx + 1)).flat();
    const tasEntries = Array.from({ length: daysInMonth }, (_, idx) => getTasAlinacakForDay(idx + 1)).flat();

    const tamamlanan = phaseEntries.filter((e) => e.isCompleted).length;
    const aktif = phaseEntries.filter((e) => !e.isCompleted).length;
    const personelAtamali = phaseEntries.filter((e) => e.assignedPeople.length > 0).length;

    return {
      toplamProgram: schedules.length,
      aktifGörev: aktif,
      tamamlananGörev: tamamlanan,
      tasTakibi: tasEntries.length,
      atamaliGörev: personelAtamali,
    };
  }, [schedules, year, month, daysInMonth]);

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
          <p className="text-sm font-medium text-slate-500">Toplam Program</p>
          <p className="mt-3 text-3xl font-bold text-slate-900">{monthlyStats.toplamProgram}</p>
        </div>
        <div className="rounded-3xl border border-blue-200 bg-blue-50 p-5 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
          <p className="text-sm font-medium text-blue-600">Aktif Görev</p>
          <p className="mt-3 text-3xl font-bold text-blue-700">{monthlyStats.aktifGörev}</p>
        </div>
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
          <p className="text-sm font-medium text-emerald-600">Tamamlanan</p>
          <p className="mt-3 text-3xl font-bold text-emerald-700">{monthlyStats.tamamlananGörev}</p>
        </div>
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
          <p className="text-sm font-medium text-amber-600">Taş Takibi</p>
          <p className="mt-3 text-3xl font-bold text-amber-700">{monthlyStats.tasTakibi}</p>
        </div>
        <div className="rounded-3xl border border-violet-200 bg-violet-50 p-5 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
          <p className="text-sm font-medium text-violet-600">Personel Atamalı</p>
          <p className="mt-3 text-3xl font-bold text-violet-700">{monthlyStats.atamaliGörev}</p>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("prev")}
              disabled={isLoading}
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-lg text-slate-700 transition hover:bg-slate-50"
            >
              ←
            </button>

            <div className="min-w-[190px] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-center">
              <h2 className="text-lg font-bold text-slate-900">
                {TR_MONTHS[month - 1]} {year}
              </h2>
            </div>

            <button
              onClick={() => navigate("next")}
              disabled={isLoading}
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-lg text-slate-700 transition hover:bg-slate-50"
            >
              →
            </button>

            {!isCurrentMonth && (
              <button
                onClick={() => {
                  setYear(today.getFullYear());
                  setMonth(today.getMonth() + 1);
                }}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Bugün
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="hidden md:flex items-center gap-3 text-xs text-slate-500">
              {PHASE_ORDER.map((p) => (
                <span key={p} className="flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1 border border-slate-200">
                  <span className={`w-2.5 h-2.5 rounded-full ${PHASE_STYLES[p].dot}`} />
                  {PHASE_LABELS[p]}
                </span>
              ))}
              <span className="flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1 border border-orange-200 text-orange-700">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-400" />
                Taş Alınacak
              </span>
            </div>

            <button
              onClick={() => {
                setSelectedSchedule(null);
                setIsModalOpen(true);
              }}
              className="rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(59,130,246,0.22)] transition hover:scale-[1.01]"
            >
              + İş Programı Ekle
            </button>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-7 gap-2">
          {TR_DAYS.map((d) => (
            <div key={d} className="rounded-2xl bg-slate-50 py-3 text-center text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 border border-slate-200">
              {d}
            </div>
          ))}
        </div>

        <div className={cls("mt-2 grid grid-cols-7 gap-2 transition-opacity", isLoading && "opacity-50")}>
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
                className={cls(
                  "min-h-[140px] rounded-2xl border p-2 transition-all",
                  !isValid && "bg-slate-50 border-slate-100",
                  isValid && !isDragTarget && "bg-white border-slate-200 hover:shadow-sm",
                  isValid && isDragTarget && "bg-blue-50 border-blue-300 ring-2 ring-blue-200"
                )}
                onDragOver={isValid ? (e) => handleDragOver(e, dayNum) : undefined}
                onDragLeave={isValid ? handleDragLeave : undefined}
                onDrop={isValid ? (e) => handleDrop(e, dayNum) : undefined}
              >
                {isValid && (
                  <>
                    <div className="mb-2 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={(e) => handleDayNumberClick(e, dayNum, entries, tasEntries)}
                        className={cls(
                          "inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition",
                          isToday ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        )}
                      >
                        {dayNum}
                      </button>

                      {(entries.length > 0 || tasEntries.length > 0) && (
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-500">
                          {entries.length + tasEntries.length} kayıt
                        </span>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      {entries.slice(0, 3).map((entry, idx) => {
                        const style = PHASE_STYLES[entry.phase];
                        const personelAdlari = entry.assignedPeople
                          .slice(0, 2)
                          .map((p) => p.ad)
                          .join(", ");

                        return (
                          <button
                            key={`${entry.phaseId}-${idx}`}
                            draggable
                            onDragStart={(e) => handleDragStart(e, entry)}
                            onClick={(e) => handlePhaseClick(e, entry)}
                            title="Sürükleyerek taşıyabilirsiniz"
                            className={cls(
                              "w-full rounded-xl border px-2 py-1.5 text-left text-xs transition hover:shadow-sm cursor-grab active:cursor-grabbing",
                              style.bg,
                              style.border,
                              entry.isCompleted && "opacity-55"
                            )}
                          >
                            <div className="flex items-center gap-1.5">
                              <span className={cls("w-2 h-2 rounded-full flex-shrink-0", entry.isCompleted ? "bg-emerald-500" : style.dot)} />
                              <span className={cls("font-semibold", style.text, entry.isCompleted && "line-through")}>
                                {PHASE_LABELS[entry.phase]}
                              </span>
                            </div>

                            <div className={cls("mt-1 truncate text-slate-600", entry.isCompleted && "line-through")}>
                              {entry.musteriAdi}
                            </div>

                            {personelAdlari && (
                              <div className="mt-1 truncate text-[10px] text-slate-500">
                                👤 {personelAdlari}
                                {entry.assignedPeople.length > 2 ? ` +${entry.assignedPeople.length - 2}` : ""}
                              </div>
                            )}
                          </button>
                        );
                      })}

                      {entries.length > 3 && (
                        <div className="rounded-xl bg-slate-50 px-2 py-1.5 text-center text-[11px] font-medium text-slate-500 border border-slate-200">
                          +{entries.length - 3} görev daha
                        </div>
                      )}

                      {tasEntries.slice(0, 2).map((entry, idx) => (
                        <button
                          key={`tas-${entry.isId}-${idx}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setTasAlindi(entry.tasAlindi);
                            setTasPopup({ entry, x: e.clientX, y: e.clientY });
                          }}
                          className={cls(
                            "w-full rounded-xl border px-2 py-1.5 text-left text-xs transition hover:shadow-sm",
                            entry.tasAlindi
                              ? "bg-emerald-50 border-emerald-200 text-emerald-700 opacity-60"
                              : "bg-orange-50 border-orange-200 text-orange-700"
                          )}
                        >
                          <div className="font-semibold">
                            {entry.tasAlindi ? "✓ Taş Alındı" : "🪨 Taş Alınacak"}
                          </div>
                          <div className={cls("mt-1 truncate text-slate-600", entry.tasAlindi && "line-through")}>
                            {entry.musteriAdi}
                          </div>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-4 text-center text-xs text-slate-400">
          Görevleri sürükleyerek farklı güne taşıyabilir, gün numarasına tıklayarak detay panelini açabilirsin.
        </div>
      </section>

      {popup && (
        <div
          className="fixed z-[60] bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 w-80 max-h-[calc(100vh-40px)] overflow-y-auto"
          style={{
            top: Math.min(popup.y, window.innerHeight - 420),
            left: Math.min(popup.x, window.innerWidth - 340),
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-3 border-b border-slate-100 pb-3">
            <span className={cls("inline-flex rounded-full border px-3 py-1 text-xs font-semibold", PHASE_STYLES[popup.entry.phase].chip)}>
              {PHASE_LABELS[popup.entry.phase]}
            </span>
            <div className="mt-3 text-base font-bold text-slate-900 truncate">
              {popup.entry.musteriAdi}
            </div>
            {popup.entry.teklifNo && (
              <div className="text-xs text-slate-400">{popup.entry.teklifNo}</div>
            )}
            {(popup.entry.schedule.is as any)?.urunAdi && (
              <div className="mt-1 text-xs text-slate-500">
                Ürün: {(popup.entry.schedule.is as any).urunAdi}
              </div>
            )}
            <div className="mt-2 text-xs text-slate-500">
              {popup.entry.plannedStart.toLocaleDateString("tr-TR")} - {popup.entry.plannedEnd.toLocaleDateString("tr-TR")}
            </div>

            {popup.entry.assignedPeople.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {popup.entry.assignedPeople.map((p) => (
                  <span
                    key={p.id}
                    className="text-[11px] px-2.5 py-1 rounded-full bg-slate-50 text-slate-600 border border-slate-200"
                  >
                    👤 {p.ad} {p.soyad}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <button
              onClick={() => handleStatusChange(false)}
              disabled={isPending}
              className={cls(
                "w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm transition",
                !popup.entry.isCompleted
                  ? "bg-blue-50 text-blue-700 border border-blue-200 font-semibold"
                  : "hover:bg-slate-50 text-slate-600 border border-slate-200"
              )}
            >
              <span className="w-4 h-4 rounded-full border-2 border-blue-400 flex items-center justify-center flex-shrink-0">
                {!popup.entry.isCompleted && <span className="w-2 h-2 rounded-full bg-blue-400" />}
              </span>
              Devam Ediyor
            </button>

            <button
              onClick={() => handleStatusChange(true)}
              disabled={isPending}
              className={cls(
                "w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm transition",
                popup.entry.isCompleted
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold"
                  : "hover:bg-slate-50 text-slate-600 border border-slate-200"
              )}
            >
              <span className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0 text-white text-xs">
                ✓
              </span>
              Tamamlandı
            </button>
          </div>

          {statusError && (
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
              ⚠ {statusError}
            </div>
          )}

          <div className="mt-4 border-t border-slate-100 pt-4">
            <button
              onClick={() => {
                setSelectedSchedule(popup.entry.schedule);
                setIsModalOpen(true);
                setPopup(null);
              }}
              className="w-full rounded-xl bg-slate-900 py-2.5 text-sm font-semibold text-white transition hover:bg-black"
            >
              Düzenle
            </button>
          </div>

          {isPending && (
            <div className="absolute inset-0 bg-white/70 rounded-2xl flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
      )}

      {dayPopup && (
        <div className="fixed inset-0 z-[75] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm" onClick={() => setDayPopup(null)}>
          <div
            className="w-full max-w-5xl max-h-[88vh] overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.24)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-slate-100 px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-500">Gün Detayı</p>
                  <h3 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
                    {dayPopup.dayNum} {TR_MONTHS[month - 1]} {year}
                  </h3>
                  <p className="mt-2 text-sm text-slate-500">
                    Bu güne planlanan görevler, taş takibi ve atanmış personeller.
                  </p>
                </div>

                <button
                  onClick={() => setDayPopup(null)}
                  className="rounded-2xl border border-slate-200 px-3 py-2 text-slate-400 transition hover:bg-slate-50 hover:text-slate-600"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="max-h-[72vh] overflow-y-auto px-6 py-5">
              <div className="mb-5 grid gap-4 md:grid-cols-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.12em] text-slate-400">Toplam Görev</p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">{dayPopup.entries.length}</p>
                </div>
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                  <p className="text-xs uppercase tracking-[0.12em] text-emerald-600">Tamamlanan</p>
                  <p className="mt-2 text-2xl font-bold text-emerald-700">
                    {dayPopup.entries.filter((e) => e.isCompleted).length}
                  </p>
                </div>
                <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4">
                  <p className="text-xs uppercase tracking-[0.12em] text-violet-600">Personelli Görev</p>
                  <p className="mt-2 text-2xl font-bold text-violet-700">
                    {dayPopup.entries.filter((e) => e.assignedPeople.length > 0).length}
                  </p>
                </div>
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-xs uppercase tracking-[0.12em] text-amber-600">Taş Takibi</p>
                  <p className="mt-2 text-2xl font-bold text-amber-700">{dayPopup.tasEntries.length}</p>
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
                <div className="space-y-4">
                  {dayPopup.entries.length === 0 ? (
                    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-10 text-center text-slate-500">
                      Bu gün için görev kaydı yok.
                    </div>
                  ) : (
                    dayPopup.entries.map((entry) => {
                      const style = PHASE_STYLES[entry.phase];
                      const isObj: any = entry.schedule.is;

                      return (
                        <div key={entry.phaseId} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className={cls("inline-flex rounded-full border px-3 py-1 text-xs font-semibold", style.chip)}>
                                  {PHASE_LABELS[entry.phase]}
                                </span>

                                {entry.isCompleted && (
                                  <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                                    ✓ Tamamlandı
                                  </span>
                                )}

                                {isObj?.tasDurumu === "alinacak" && (
                                  <span className="inline-flex rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700">
                                    🪨 Taş Alınacak
                                  </span>
                                )}

                                {isObj?.tasDurumu === "alindi" && (
                                  <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                                    🪨 Taş Alındı
                                  </span>
                                )}
                              </div>

                              <h4 className="mt-3 text-xl font-bold text-slate-900">{entry.musteriAdi}</h4>
                              <p className="mt-1 text-sm text-slate-500">
                                {entry.teklifNo || "Teklif no yok"} {isObj?.urunAdi ? `• ${isObj.urunAdi}` : ""}
                              </p>

                              <div className="mt-4 grid gap-3 md:grid-cols-2">
                                <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200">
                                  <p className="text-xs uppercase tracking-[0.12em] text-slate-400">Plan Tarihi</p>
                                  <p className="mt-2 text-sm font-semibold text-slate-900">
                                    {entry.plannedStart.toLocaleDateString("tr-TR")} - {entry.plannedEnd.toLocaleDateString("tr-TR")}
                                  </p>
                                </div>

                                <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200">
                                  <p className="text-xs uppercase tracking-[0.12em] text-slate-400">Atanan Personel</p>
                                  {entry.assignedPeople.length > 0 ? (
                                    <div className="mt-2 flex flex-wrap gap-2">
                                      {entry.assignedPeople.map((p) => (
                                        <span
                                          key={p.id}
                                          className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700"
                                        >
                                          👤 {p.ad} {p.soyad} {p.gorevi ? `• ${p.gorevi}` : ""}
                                        </span>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="mt-2 text-sm text-slate-500">Atama yapılmamış</p>
                                  )}
                                </div>
                              </div>

                              {entry.schedule.notes && (
                                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                  <p className="text-xs uppercase tracking-[0.12em] text-slate-400">Not</p>
                                  <p className="mt-2 text-sm text-slate-700">{entry.schedule.notes}</p>
                                </div>
                              )}
                            </div>

                            <div className="w-full shrink-0 lg:w-[180px]">
                              <button
                                onClick={() => {
                                  setSelectedSchedule(entry.schedule);
                                  setIsModalOpen(true);
                                  setDayPopup(null);
                                }}
                                className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-black"
                              >
                                Düzenle
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="space-y-4">
                  <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h4 className="text-lg font-bold text-slate-900">Taş Takibi</h4>

                    {dayPopup.tasEntries.length === 0 ? (
                      <p className="mt-3 text-sm text-slate-500">Bu gün için taş takibi yok.</p>
                    ) : (
                      <div className="mt-4 space-y-3">
                        {dayPopup.tasEntries.map((entry, idx) => (
                          <div key={`${entry.isId}-${idx}`} className="rounded-2xl border border-orange-200 bg-orange-50 p-4">
                            <div className="text-sm font-semibold text-orange-700">
                              {entry.tasAlindi ? "✓ Taş Alındı" : "🪨 Taş Alınacak"}
                            </div>
                            <p className="mt-2 text-sm font-medium text-slate-900">{entry.musteriAdi}</p>
                            <p className="mt-1 text-xs text-slate-500">Taş: {entry.tasAdi || "—"}</p>
                            <p className="mt-1 text-xs text-slate-500">
                              Ölçü tarihi: {entry.olcuTarihi.toLocaleDateString("tr-TR")}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h4 className="text-lg font-bold text-slate-900">Gün İçgörüsü</h4>
                    <div className="mt-4 space-y-3 text-sm text-slate-600">
                      <p>
                        Bu günde <strong>{dayPopup.entries.length}</strong> görev ve <strong>{dayPopup.tasEntries.length}</strong> taş takibi bulunuyor.
                      </p>
                      <p>
                        Personel atamalı görev sayısı <strong>{dayPopup.entries.filter((e) => e.assignedPeople.length > 0).length}</strong>.
                      </p>
                      <p>
                        Tamamlanan görev oranı{" "}
                        <strong>
                          {dayPopup.entries.length > 0
                            ? `%${Math.round((dayPopup.entries.filter((e) => e.isCompleted).length / dayPopup.entries.length) * 100)}`
                            : "%0"}
                        </strong>.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {tasPopup && (
        <div
          className="fixed inset-0 z-[65]"
          onClick={() => setTasPopup(null)}
        >
          <div
            className="fixed bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 w-72"
            style={{
              top: Math.min(tasPopup.y, window.innerHeight - 260),
              left: Math.min(tasPopup.x, window.innerWidth - 290),
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-orange-700">🪨 Taş Durumu</div>
                <div className="mt-1 text-sm font-medium text-slate-900">{tasPopup.entry.musteriAdi}</div>
              </div>
              <button
                onClick={() => setTasPopup(null)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                ×
              </button>
            </div>

            <div className="text-xs text-slate-500">
              Taş: <span className="font-medium">{tasPopup.entry.tasAdi || "—"}</span>
            </div>
            <div className="text-xs text-slate-400 mt-1 mb-3">
              Ölçü tarihi: {tasPopup.entry.olcuTarihi.toLocaleDateString("tr-TR")}
            </div>

            <label
              onClick={(e) => e.stopPropagation()}
              className={cls(
                "mb-4 flex cursor-pointer items-center gap-3 rounded-xl border-2 p-3 transition-all",
                tasAlindi
                  ? "border-emerald-500 bg-emerald-50"
                  : "border-slate-200 bg-slate-50 hover:border-emerald-300"
              )}
            >
              <div
                className={cls(
                  "w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all",
                  tasAlindi ? "bg-emerald-500 border-emerald-500" : "border-slate-300"
                )}
              >
                {tasAlindi && <span className="text-white text-xs font-bold">✓</span>}
              </div>
              <div className="flex-1">
                <div className={cls("text-sm font-medium", tasAlindi ? "text-emerald-700" : "text-slate-700")}>
                  Taş Alındı
                </div>
                <div className="text-xs text-slate-400">İşaretlersen takvimde üzeri çizilir</div>
              </div>
              <input
                type="checkbox"
                className="hidden"
                checked={tasAlindi}
                onChange={(e) => setTasAlindi(e.target.checked)}
              />
            </label>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setTasPopup(null)}
                className="rounded-xl border border-slate-200 py-2 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
              >
                İptal
              </button>
              <button
                onClick={tasSave}
                disabled={tasKaydediliyor}
                className="rounded-xl bg-emerald-600 text-white text-sm font-medium py-2 hover:bg-emerald-700 transition-colors disabled:opacity-60"
              >
                {tasKaydediliyor ? "..." : "Kaydet"}
              </button>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <ScheduleModal
          schedule={selectedSchedule}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedSchedule(null);
          }}
          onSaved={async () => {
            await refreshSchedules();
            setIsModalOpen(false);
            setSelectedSchedule(null);
          }}
        />
      )}
    </div>
  );
}
