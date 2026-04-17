"use client";

import { useState } from "react";
import { PhaseBadge } from "./PhaseBadge";
import { ScheduleModal } from "./ScheduleModal";
import type { ScheduleWithIs } from "@/lib/types/schedule";
import { PHASE_ORDER } from "@/lib/types/schedule";

const TR_MONTHS = ["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"];
const TR_DAYS = ["Pzt","Sal","Çar","Per","Cum","Cmt","Paz"];

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

  function getSchedulesForDay(day: number): ScheduleWithIs[] {
    const date = new Date(year, month - 1, day);
    date.setHours(0, 0, 0, 0);
    return schedules.filter((s) => {
      if (s.startDate && s.endDate) {
        const start = new Date(s.startDate); start.setHours(0,0,0,0);
        const end = new Date(s.endDate); end.setHours(23,59,59,999);
        return date >= start && date <= end;
      }
      if (s.startDate) {
        const start = new Date(s.startDate); start.setHours(0,0,0,0);
        return date.getTime() === start.getTime();
      }
      return s.phases.some((p) => {
        if (p.plannedStart && p.plannedEnd) {
          const ps = new Date(p.plannedStart); ps.setHours(0,0,0,0);
          const pe = new Date(p.plannedEnd); pe.setHours(23,59,59,999);
          return date >= ps && date <= pe;
        }
        return false;
      });
    });
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
            <button onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth() + 1); }} className="text-xs px-2.5 py-1 rounded-full border hover:bg-gray-50 transition-colors">Bugün</button>
          )}
        </div>
        <button onClick={() => { setSelectedSchedule(null); setIsModalOpen(true); }} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 transition-colors">
          + İş Programı Ekle
        </button>
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
          const daySchedules = isValid ? getSchedulesForDay(dayNum) : [];

          return (
            <div key={i} className={`min-h-[100px] border-r border-b p-1.5 ${!isValid ? "bg-gray-50" : "bg-white hover:bg-gray-50 transition-colors"}`}>
              {isValid && (
                <>
                  <div className="mb-1">
                    <span className={`text-xs font-medium w-6 h-6 inline-flex items-center justify-center rounded-full ${isToday ? "bg-blue-600 text-white" : "text-gray-500"}`}>
                      {dayNum}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {daySchedules.slice(0, 3).map((s) => (
                      <button key={s.id} onClick={() => { setSelectedSchedule(s); setIsModalOpen(true); }}
                        className="w-full text-left px-1.5 py-1 rounded text-xs border bg-white hover:shadow-sm transition-all">
                        <div className="font-medium truncate">{s.is.teklifNo || s.is.musteriAdi}</div>
                        <div className="text-gray-400 truncate" style={{fontSize:"10px"}}>{s.is.musteriAdi}</div>
                        <div className="flex gap-0.5 mt-0.5">
                          {PHASE_ORDER.map((phase) => {
                            const p = s.phases.find((ph) => ph.phase === phase);
                            return <div key={phase} className={`h-1 flex-1 rounded-full ${p?.isCompleted ? "bg-green-500" : "bg-gray-200"}`} />;
                          })}
                        </div>
                      </button>
                    ))}
                    {daySchedules.length > 3 && (
                      <div className="text-xs text-gray-400 text-center">+{daySchedules.length - 3} daha</div>
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
