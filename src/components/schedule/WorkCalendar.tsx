"use client";

import { useState } from "react";
import { ScheduleModal } from "./ScheduleModal";
import type { ScheduleWithIs } from "@/lib/types/schedule";
import { PHASE_ORDER, PHASE_LABELS } from "@/lib/types/schedule";

const TR_MONTHS = ["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"];
const TR_DAYS = ["Pzt","Sal","Çar","Per","Cum","Cmt","Paz"];

const PHASE_STYLES = {
  OLCU:   { bg: "bg-blue-100",   text: "text-blue-800",   border: "border-blue-300",   dot: "bg-blue-500"   },
  IMALAT: { bg: "bg-amber-100",  text: "text-amber-800",  border: "border-amber-300",  dot: "bg-amber-500"  },
  MONTAJ: { bg: "bg-green-100",  text: "text-green-800",  border: "border-green-300",  dot: "bg-green-500"  },
};

interface PhaseEntry {
  scheduleId: string;
  phase: "OLCU" | "IMALAT" | "MONTAJ";
  isCompleted: boolean;
  musteriAdi: string;
  teklifNo: string;
  schedule: ScheduleWithIs;
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

  async function refreshSchedules() {
    const res = await fetch(`/api/schedule?year=${year}&month=${month}`);
    const data = await res.json();
    setSchedules(data);
  }

  const daysInMonth = new Date(year, month, 0).getDate();
  let firstDayOfWeek = new Date(year, month - 1, 1).getDay();
  firstDayOfWeek = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
  const totalCells = Math.ceil((daysInMonth + firstDayOfWeek) / 7) * 7;

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
            scheduleId: schedule.id,
            phase: phase.phase as "OLCU" | "IMALAT" | "MONTAJ",
            isCompleted: phase.isCompleted,
            musteriAdi: schedule.is.musteriAdi,
            teklifNo: schedule.is.teklifNo,
            schedule,
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
          </div>
          <button onClick={() => { setSelectedSchedule(null); setIsModalOpen(true); }} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 transition-colors">
            + İş Programı Ekle
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 mb-1">
        {TR_DAYS.map((d) => (
          <div key={d} className="py-2 text-center text-xs font-medium text-gray-500">{d}</div>
        ))}
      </div>

      <div className={`grid grid-cols-7 flex-1 border-l border-t rounded-lg overflow-hidden transition-opacity ${isLoading ? "opacity-50" : ""}`}>
        {Array.from({ length: totalCells }, (_, i) => {
          const dayNum = i - firstDayOfWeek + 1;
          const isValid = dayNum >= 1 && dayNum <= daysInMonth;
          const isToday = isCurrentMonth && dayNum === today.getDate();
          const entries = isValid ? getPhaseEntriesForDay(dayNum) : [];

          return (
            <div key={i} className={`min-h-[100px] border-r border-b p-1 ${!isValid ? "bg-gray-50" : "bg-white hover:bg-gray-50 transition-colors"}`}>
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
                          key={`${entry.scheduleId}-${entry.phase}-${idx}`}
                          onClick={() => { setSelectedSchedule(entry.schedule); setIsModalOpen(true); }}
                          className={`w-full text-left px-1.5 py-0.5 rounded text-xs border flex items-center gap-1 transition-all hover:shadow-sm ${style.bg} ${style.text} ${style.border} ${entry.isCompleted ? "opacity-60 line-through" : ""}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${style.dot}`} />
                          <span className="font-medium flex-shrink-0">{PHASE_LABELS[entry.phase]}</span>
                          <span className="truncate opacity-75">— {entry.musteriAdi}</span>
                        </button>
                      );
                    })}
                    {entries.length > 4 && (
                      <div className="text-xs text-gray-400 text-center py-0.5">+{entries.length - 4} daha</div>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

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
