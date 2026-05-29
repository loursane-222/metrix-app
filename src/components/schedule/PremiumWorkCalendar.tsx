"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import dayjs from "dayjs";
import "dayjs/locale/tr";
import ScheduleCreateModal from "./ScheduleCreateModal";
import TaskDetailModal from "./TaskDetailModal";
import ScheduleAiInsight from "./ScheduleAiInsight";
import { PHASE_META, WEEKDAYS } from "./premium/constants";
import { formatTaskTime, trDateRange, weekStartMonday } from "./premium/date-utils";
import { MobileLiveTab } from "./premium/MobileLiveTab";
import { MobileRisksTab } from "./premium/MobileRisksTab";
import { MobileTeamTab } from "./premium/MobileTeamTab";
import { MobileTodayTab } from "./premium/MobileTodayTab";
import { OperationsCockpitShell } from "./premium/OperationsCockpitShell";
import type { LiveOpsData, MobileSeg, ViewMode } from "./premium/types";

dayjs.locale("tr");

type PremiumWorkCalendarProps = {
  initialSchedules?: any[];
  initialYear?: number;
  initialMonth?: number;
};

export function PremiumWorkCalendar({ initialSchedules = [], initialYear, initialMonth }: PremiumWorkCalendarProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const rawSeg = searchParams.get("seg");
  const mobileSeg: MobileSeg =
    rawSeg === "live" || rawSeg === "today" || rawSeg === "calendar" || rawSeg === "team" || rawSeg === "risks"
      ? rawSeg
      : "live";

  function setMobileSeg(seg: MobileSeg) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("seg", seg);
    router.replace(`/dashboard/is-programi?${params.toString()}`);
  }
  const [view, setView] = useState<ViewMode>("week");
  const [currentDate, setCurrentDate] = useState(() => {
    if (initialYear && initialMonth) {
      return dayjs(new Date(initialYear, initialMonth - 1, 1));
    }
    return dayjs();
  });
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [schedules, setSchedules] = useState<any[]>(initialSchedules);
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [savingDrag, setSavingDrag] = useState(false);
  const [personelSayisi, setPersonelSayisi] = useState(1);
  const [personelTipleri, setPersonelTipleri] = useState({ olcucu: 0, usta: 0, montajci: 0 });
  const autoOpenedRef = useRef(false);
  const [liveOpsData, setLiveOpsData] = useState<LiveOpsData | null>(null);
  const liveOpsIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Modal açıkken body scroll/zoom kilit
  useEffect(() => {
    const isOpen = !!(selectedTask || showCreate);
    if (isOpen) {
      document.body.classList.add("modal-open");
    } else {
      document.body.classList.remove("modal-open");
    }
    return () => document.body.classList.remove("modal-open");
  }, [selectedTask, showCreate]);

  useEffect(() => {
    fetch("/api/personel", { credentials: "include", cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        const personeller = (d?.personeller || []).filter((p: any) => p.aktif !== false);
        if (personeller.length > 0) setPersonelSayisi(personeller.length);
        const OLCUCU_GOREVLER = ["Ölçücü"];
        const USTA_GOREVLER = ["Usta", "Ustabaşı", "Kalfa", "Kesimci"];
        const MONTAJ_GOREVLER = ["Montajcı"];
        setPersonelTipleri({
          olcucu: personeller.filter((p: any) => OLCUCU_GOREVLER.includes(p.gorevi)).length,
          usta: personeller.filter((p: any) => USTA_GOREVLER.includes(p.gorevi)).length,
          montajci: personeller.filter((p: any) => MONTAJ_GOREVLER.includes(p.gorevi)).length,
        });
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (mobileSeg !== "live") {
      if (liveOpsIntervalRef.current) {
        clearInterval(liveOpsIntervalRef.current);
        liveOpsIntervalRef.current = null;
      }
      return;
    }
    const fetchLiveOps = () => {
      fetch("/api/dashboard/live-ops", { credentials: "include", cache: "no-store" })
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (d?.aktifEkip) setLiveOpsData(d); })
        .catch(() => {});
    };
    fetchLiveOps();
    liveOpsIntervalRef.current = setInterval(fetchLiveOps, 10_000);
    return () => {
      if (liveOpsIntervalRef.current) {
        clearInterval(liveOpsIntervalRef.current);
        liveOpsIntervalRef.current = null;
      }
    };
  }, [mobileSeg]); // eslint-disable-line react-hooks/exhaustive-deps

  const tasks = useMemo(() => {
    const mapped: any[] = [];

    schedules.forEach((schedule: any) => {
      schedule.phases?.forEach((phase: any) => {
        if (!phase.plannedStart) return;

        const assignments = phase.fazAtamalar || [];
        const personelText =
          assignments.length > 0
            ? assignments
                .map((a: any) => [a?.personel?.ad, a?.personel?.soyad].filter(Boolean).join(" "))
                .filter(Boolean)
                .join(", ")
            : "Personel atanmadı";

        const execs: Array<{ status: string }> = phase.executions || [];
        const hasStarted = execs.some((e) => e.status === "STARTED");
        const hasPaused = execs.some((e) => e.status === "PAUSED");
        const executionStatus = hasStarted ? "STARTED" : hasPaused ? "PAUSED" : null;

        mapped.push({
          id: phase.id,
          scheduleId: schedule.id,
          schedule,
          title: schedule.is?.musteriAdi || "İsimsiz İş",
          subtitle: schedule.is?.urunAdi || schedule.is?.teklifNo || "",
          phase: phase.phase,
          date: phase.plannedStart,
          endDate: phase.plannedEnd,
          completed: phase.isCompleted,
          personelText,
          toplamSureDakika: phase.workSchedule?.is?.toplamSureDakika || 0,
          fazAtamalari: phase.fazAtamalar || [],
          executionStatus,
        });
      });

      // Virtual "taş alınacak" hazırlık kartı — DB'ye yazılmaz, computed.
      if (schedule.is?.tasDurumu === "alinacak") {
        const olcuPhase = schedule.phases?.find((p: any) => p.phase === "OLCU");
        if (olcuPhase?.plannedStart) {
          const olcuDate = new Date(olcuPhase.plannedStart);
          // 3 iş günü geri git (hafta sonu atla)
          let d = new Date(olcuDate);
          let count = 0;
          while (count < 3) {
            d.setDate(d.getDate() - 1);
            const day = d.getDay();
            if (day !== 0 && day !== 6) count++;
          }
          d.setHours(9, 0, 0, 0);

          mapped.push({
            id: `virtual-tas-${schedule.id}`,
            scheduleId: schedule.id,
            schedule,
            title: schedule.is?.musteriAdi || "İsimsiz İş",
            subtitle: schedule.is?.urunAdi || schedule.is?.teklifNo || "",
            phase: "TAS_ALINACAK",
            date: d.toISOString(),
            endDate: d.toISOString(),
            completed: false,
            personelText: "—",
            toplamSureDakika: 0,
            fazAtamalari: [],
            executionStatus: null,
            virtual: true,
          });
        }
      }
    });

    return mapped.sort((a, b) => +new Date(a.date) - +new Date(b.date));
  }, [schedules]);

  // Auto-open modal from push notification deep-link (?phaseId=xxx)
  useEffect(() => {
    if (autoOpenedRef.current || tasks.length === 0) return;
    const phaseId = searchParams.get("phaseId");
    if (!phaseId) return;
    const task = tasks.find((t) => t.id === phaseId);
    if (task) {
      setSelectedTask(task);
      autoOpenedRef.current = true;
    }
  }, [tasks]); // eslint-disable-line react-hooks/exhaustive-deps

  const startOfWeek = weekStartMonday(currentDate);
  const weekDays = Array.from({ length: 7 }).map((_, i) => startOfWeek.add(i, "day"));

  const weekTasks = tasks.filter((task) => {
    const d = dayjs(task.date);
    return d.isAfter(startOfWeek.subtract(1, "day")) && d.isBefore(startOfWeek.add(7, "day"));
  });

  const selectedDayTasks = tasks.filter((task) => dayjs(task.date).isSame(currentDate, "day"));

  // View'a göre aktif görev listesi ve iş günü sayısı
  const viewStartOf = view === "month" ? currentDate.startOf("month") : view === "day" ? currentDate.startOf("day") : startOfWeek;
  const viewEndOf = view === "month" ? currentDate.endOf("month") : view === "day" ? currentDate.endOf("day") : startOfWeek.add(6, "day").endOf("day");
  
  const viewTasks = tasks.filter((task) => {
    const d = dayjs(task.date);
    return !d.isBefore(viewStartOf, "day") && !d.isAfter(viewEndOf, "day");
  });

  // Periyottaki iş günü sayısı (Pzt-Cuma)
  const isGunuSayisi = (() => {
    if (view === "day") return [1,2,3,4,5].includes(currentDate.day()) ? 1 : 0;
    if (view === "week") return 5;
    // Aylık: o aydaki Pzt-Cuma sayısı
    let count = 0;
    const gunSayisi = viewEndOf.date();
    for (let i = 1; i <= gunSayisi; i++) {
      const gun = currentDate.date(i).day();
      if (gun >= 1 && gun <= 5) count++;
    }
    return count;
  })();

  const stats = {
    total: viewTasks.length,
    olcu: viewTasks.filter((t) => t.phase === "OLCU").length,
    imalat: viewTasks.filter((t) => t.phase === "IMALAT").length,
    montaj: viewTasks.filter((t) => t.phase === "MONTAJ").length,
    completed: viewTasks.filter((t) => t.completed).length,
    delayed: viewTasks.filter((t) => !t.completed && dayjs(t.date).isBefore(dayjs(), "day")).length,
  };

  // Kapasite: personel tipi × iş günü sayısı × günlük iş kapasitesi
  const olcuKapasiteHafta = Math.max(1, personelTipleri.olcucu) * isGunuSayisi * 5;
  const imalatKapasiteHafta = Math.max(1, personelTipleri.usta) * isGunuSayisi * 3;
  const montajKapasiteHafta = Math.max(1, personelTipleri.montajci) * isGunuSayisi * 2;
  const genelKapasiteHafta = olcuKapasiteHafta + imalatKapasiteHafta + montajKapasiteHafta;
  const haftaKapasiteDk = genelKapasiteHafta * 60;
  const toplamYukDk = viewTasks.length * 60;
  const olcuDk = stats.olcu * 60;
  const imalatDk = stats.imalat * 60;
  const montajDk = stats.montaj * 60;

  const density = {
    olcu: olcuKapasiteHafta > 0 ? Math.min(100, Math.round((stats.olcu / olcuKapasiteHafta) * 100)) : 0,
    imalat: imalatKapasiteHafta > 0 ? Math.min(100, Math.round((stats.imalat / imalatKapasiteHafta) * 100)) : 0,
    montaj: montajKapasiteHafta > 0 ? Math.min(100, Math.round((stats.montaj / montajKapasiteHafta) * 100)) : 0,
    genel: genelKapasiteHafta > 0 ? Math.min(100, Math.round((stats.total / genelKapasiteHafta) * 100)) : 0,
  };

  const mobileTitle =
    mobileSeg === "live" ? "Aktif Üretim" :
    mobileSeg === "today" ? "Bugünün Planı" :
    mobileSeg === "calendar" ? "Takvim" :
    mobileSeg === "team" ? "Ekip Durumu" :
    "Riskler & Uyarılar";

  const mobileSubtitle = (() => {
    if (mobileSeg === "live") {
      const n = liveOpsData ? (liveOpsData.toplamAktif + liveOpsData.toplamPaused) : tasks.filter(t => t.executionStatus === "STARTED" || t.executionStatus === "PAUSED").length;
      const bl = liveOpsData?.toplamBlocked ?? 0;
      return n > 0 ? `${n} iş devam ediyor${bl > 0 ? ` · ${bl} bloke` : ""}` : "Şu an aktif iş yok";
    }
    if (mobileSeg === "today") {
      const tod = tasks.filter(t => dayjs(t.date).isSame(dayjs(), "day"));
      return `${tod.filter(t => t.completed).length}/${tod.length} tamamlandı`;
    }
    if (mobileSeg === "calendar") {
      return view === "week" ? trDateRange(startOfWeek)
        : view === "day" ? currentDate.format("DD MMMM YYYY dddd")
        : currentDate.format("MMMM YYYY");
    }
    if (mobileSeg === "team") return `${personelSayisi} personel`;

    const delayedCount = tasks.filter(t => !t.completed && dayjs(t.date).isBefore(dayjs(), "day")).length;
    return delayedCount > 0 ? `${delayedCount} geciken iş` : "Kritik risk yok";
  })();

  const hasLiveAlerts = (liveOpsData?.toplamAktif ?? tasks.filter(t => t.executionStatus === "STARTED").length) > 0;
  const hasRiskAlerts = (tasks.filter(t => !t.completed && dayjs(t.date).isBefore(dayjs(), "day")).length + tasks.filter(t => t.executionStatus === "PAUSED").length) > 0;

  function meta(phase: string) {
    return PHASE_META[phase] || PHASE_META.OLCU;
  }

  function goToDate(nextDate: dayjs.Dayjs) {
    const currentMonthKey = currentDate.format("YYYY-MM");
    const nextMonthKey = nextDate.format("YYYY-MM");

    if (currentMonthKey === nextMonthKey) {
      setCurrentDate(nextDate);
      return;
    }

    const params = new URLSearchParams(searchParams.toString());
    params.set("year", String(nextDate.year()));
    params.set("month", String(nextDate.month() + 1));
    params.delete("phaseId");
    window.location.href = `/dashboard/is-programi?${params.toString()}`;
  }

  function goPrev() {
    goToDate(currentDate.subtract(1, view));
  }

  function goNext() {
    goToDate(currentDate.add(1, view));
  }

  function goToday() {
    goToDate(dayjs());
  }

  function goToCreatedSchedule(schedule: any) {
    const olcuPhase = schedule?.phases?.find((phase: any) => phase?.phase === "OLCU" && phase?.plannedStart);
    const firstPlannedPhase = schedule?.phases
      ?.filter((phase: any) => phase?.plannedStart)
      ?.sort((a: any, b: any) => +new Date(a.plannedStart) - +new Date(b.plannedStart))?.[0];
    const targetDate = dayjs(olcuPhase?.plannedStart || firstPlannedPhase?.plannedStart);

    if (!targetDate.isValid()) {
      window.location.reload();
      return;
    }

    window.location.href = `/dashboard/is-programi?year=${targetDate.year()}&month=${targetDate.month() + 1}`;
  }

  async function moveTaskToDay(taskId: string, targetDay: dayjs.Dayjs) {
    const task = tasks.find((t) => t.id === taskId);
    if (!task || savingDrag) return;

    const plannedDate = targetDay.format("YYYY-MM-DD");
    const oldSchedules = schedules;

    setSavingDrag(true);

    setSchedules((prev) =>
      prev.map((schedule) => ({
        ...schedule,
        phases: schedule.phases?.map((phase: any) =>
          phase.id === taskId
            ? {
                ...phase,
                plannedStart: `${plannedDate}T00:00:00.000Z`,
                plannedEnd:
                  !phase.plannedEnd ||
                  String(phase.plannedEnd).slice(0, 10) === String(phase.plannedStart).slice(0, 10)
                    ? `${plannedDate}T00:00:00.000Z`
                    : phase.plannedEnd,
              }
            : phase
        ),
      }))
    );

    try {
      const res = await fetch("/api/schedule/phase", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phaseId: taskId, plannedDate }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Tarih güncellenemedi");
    } catch (error: any) {
      setSchedules(oldSchedules);
      alert(error?.message || "Tarih güncellenemedi");
    } finally {
      setDraggingTaskId(null);
      setSavingDrag(false);
    }
  }

  function TaskCard({ task, compact = false }: { task: any; compact?: boolean }) {
    const m = meta(task.phase);
    const delayed = !task.completed && dayjs(task.date).isBefore(dayjs(), "day");
    const isVirtual = !!task.virtual;

    if (isVirtual) {
      return (
        <div
          className={[
            "w-full rounded-2xl border border-dashed border-orange-400/50 bg-gradient-to-br p-3 text-left",
            m.soft,
          ].join(" ")}
          title="Bu görev taş tedarik hatırlatmasıdır. Tıklanamaz."
        >
          <div className="flex items-start gap-3">
            {!compact && (
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${m.bg} text-lg`}>
                {m.icon}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className={`text-xs font-bold ${m.text}`}>{formatTaskTime(task.date)}</div>
              <div className="mt-0.5 line-clamp-2 text-sm font-semibold text-white">{task.title}</div>
              <div className="mt-0.5 line-clamp-1 text-xs text-slate-400">{task.subtitle || "Taş hazırlık"}</div>
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${m.bg} ${m.text}`}>
                  {m.label.toUpperCase()}
                </span>
                <span className="rounded-md bg-orange-500/10 px-2 py-0.5 text-[10px] font-semibold text-orange-300">
                  HATIRLATICI
                </span>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <button
        draggable
        onDragStart={(e) => {
          setDraggingTaskId(task.id);
          e.dataTransfer.setData("text/plain", task.id);
          e.dataTransfer.effectAllowed = "move";
        }}
        onDragEnd={() => setDraggingTaskId(null)}
        onClick={() => setSelectedTask(task)}
        className={[
          "group w-full cursor-grab rounded-2xl border border-white/10 bg-gradient-to-br p-3 text-left shadow-[0_18px_40px_rgba(0,0,0,0.25)] transition hover:-translate-y-0.5 hover:border-white/20 active:cursor-grabbing",
          m.soft,
          draggingTaskId === task.id ? "scale-[0.98] opacity-60" : "",
          delayed ? "ring-1 ring-red-500/50" : "",
          task.completed ? "opacity-60 ring-1 ring-green-500/30" : "",
        ].join(" ")}
      >
        <div className="flex items-start gap-3">
          {!compact && (
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${m.bg} text-lg`}>
              {m.icon}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className={`text-xs font-bold ${m.text}`}>{formatTaskTime(task.date)}</div>
            <div className="mt-0.5 line-clamp-2 text-sm font-semibold text-white">{task.title}</div>
            <div className="mt-0.5 line-clamp-1 text-xs text-slate-400">{task.personelText}</div>
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${m.bg} ${m.text}`}>
                {m.label.toUpperCase()}
              </span>
              {task.completed && (
                <span className="rounded-md bg-green-500/15 px-2 py-0.5 text-[10px] font-bold text-green-400">
                  ✓ TAMAMLANDI
                </span>
              )}
              {!task.completed && task.executionStatus === "STARTED" && (
                <span className="rounded-md bg-green-500/15 px-2 py-0.5 text-[10px] font-bold text-green-400">
                  ÇALIŞIYOR
                </span>
              )}
              {!task.completed && task.executionStatus === "PAUSED" && (
                <span className="rounded-md bg-yellow-500/15 px-2 py-0.5 text-[10px] font-bold text-yellow-400">
                  DURAKLADI
                </span>
              )}
              {delayed && (
                <span className="rounded-md bg-red-500/10 px-2 py-0.5 text-[10px] font-bold text-red-300">
                  GECİKTİ
                </span>
              )}
            </div>
          </div>
          <div className="text-slate-500 group-hover:text-white">⋯</div>
        </div>
      </button>
    );
  }

  function DensityCard({ title, value, tone, helper }: { title: string; value: number; tone: string; helper: string }) {
    const bar =
      tone.includes("blue") ? "bg-blue-500" :
      tone.includes("amber") ? "bg-amber-400" :
      tone.includes("emerald") ? "bg-emerald-400" :
      "bg-purple-400";

    return (
      <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-slate-400">{title}</div>
            <div className={`mt-1 text-4xl font-black ${tone}`}>%{value}</div>
          </div>
          <div className="text-right text-xs text-slate-500">{helper}</div>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
          <div className={`h-full rounded-full ${bar}`} style={{ width: `${value}%` }} />
        </div>
      </div>
    );
  }

  function DesktopWeek() {
    return (
      <div className="hidden md:block">
        <div className="grid grid-cols-7 h-[calc(100dvh-260px)] overflow-hidden rounded-3xl border border-white/10 bg-slate-950/40 shadow-2xl">
          {weekDays.map((d, index) => {
            const dayTasks = tasks.filter((task) => dayjs(task.date).isSame(d, "day"));
            const today = d.isSame(dayjs(), "day");

            return (
              <div
                key={d.toString()}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const taskId = e.dataTransfer.getData("text/plain") || draggingTaskId;
                  if (taskId) moveTaskToDay(taskId, d);
                }}
                className={[
                  "h-[calc(100dvh-320px)] flex flex-col border-r border-white/10 p-3 transition last:border-r-0",
                  today ? "bg-blue-500/5" : "bg-slate-900/40",
                  draggingTaskId ? "ring-1 ring-blue-400/20" : "",
                ].join(" ")}
              >
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-medium text-slate-400">{WEEKDAYS[index]}</div>
                    <div className={today ? "text-lg font-black text-blue-300" : "text-lg font-black text-white"}>
                      {d.format("DD")}
                    </div>
                  </div>
                  <div className="rounded-full bg-white/5 px-2 py-1 text-xs text-slate-300">{dayTasks.length} iş</div>
                </div>

                <div className="space-y-2 overflow-y-auto pr-1 flex-1">
                  {dayTasks.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-white/10 p-4 text-center text-xs text-slate-600">
                      Plan yok
                    </div>
                  ) : (
                    dayTasks.map((task) => <TaskCard key={task.id} task={task} compact />)
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Desktop Günlük View ────────────────────────────────────────────────────
  function DesktopDay() {
    return (
      <div className="hidden md:block">
        {/* Haftanın günleri — tıklayarak gün değiştir */}
        <div className="mb-4 flex gap-2 rounded-3xl border border-white/10 bg-white/[0.03] p-2">
          {weekDays.map((d, index) => {
            const active = d.isSame(currentDate, "day");
            const count = tasks.filter((task) => dayjs(task.date).isSame(d, "day")).length;
            return (
              <button
                key={d.toString()}
                onClick={() => goToDate(d)}
                className={[
                  "flex-1 rounded-2xl px-3 py-3 text-center transition",
                  active
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-900/40"
                    : "bg-slate-900/70 text-slate-400 hover:bg-slate-800",
                ].join(" ")}
              >
                <div className="text-xs font-semibold">{WEEKDAYS[index]}</div>
                <div className="mt-1 text-xl font-black">{d.format("DD")}</div>
                <div className="mt-1 text-[10px] opacity-70">{count} iş</div>
              </button>
            );
          })}
        </div>

        {/* Seçili günün görevleri */}
        <div className="rounded-3xl border border-white/10 bg-slate-950/40 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-lg font-bold text-white">
              {currentDate.format("DD MMMM YYYY dddd")}
            </div>
            <div className="text-sm text-slate-400">{selectedDayTasks.length} iş</div>
          </div>
          <div className="max-h-[calc(100dvh-500px)] space-y-3 overflow-y-auto pr-1">
            {selectedDayTasks.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-white/10 p-8 text-center text-slate-500">
                Bu güne planlanmış iş yok.
              </div>
            ) : (
              selectedDayTasks.map((task) => <TaskCard key={task.id} task={task} />)
            )}
          </div>
        </div>
      </div>
    );
  }

  function MobileDayList() {
    return (
      <div className="md:hidden">
        <div className="no-scrollbar mb-4 flex gap-2 overflow-x-auto rounded-3xl border border-white/10 bg-white/[0.03] p-2">
          {weekDays.map((d, index) => {
            const active = d.isSame(currentDate, "day");
            const count = tasks.filter((task) => dayjs(task.date).isSame(d, "day")).length;

            return (
              <button
                key={d.toString()}
                onClick={() => goToDate(d)}
                className={[
                  "min-w-[62px] rounded-2xl px-3 py-3 text-center transition",
                  active ? "bg-blue-600 text-white shadow-lg shadow-blue-900/40" : "bg-slate-900/70 text-slate-400",
                ].join(" ")}
              >
                <div className="text-xs font-semibold">{WEEKDAYS[index]}</div>
                <div className="mt-1 text-xl font-black">{d.format("DD")}</div>
                <div className="mt-1 text-[10px] opacity-70">{count} iş</div>
              </button>
            );
          })}
        </div>

        <div className="mb-3 flex items-center justify-between">
          <div className="text-lg font-bold text-white">{currentDate.format("DD MMMM YYYY dddd")}</div>
          <div className="text-sm text-slate-400">{selectedDayTasks.length} iş</div>
        </div>

        <div className="space-y-3">
          {selectedDayTasks.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.03] p-8 text-center text-slate-500">
              Bu güne planlanmış iş yok.
            </div>
          ) : (
            selectedDayTasks.map((task) => <TaskCard key={task.id} task={task} />)
          )}
        </div>
      </div>
    );
  }

  // ── Mobile Haftalık View ────────────────────────────────────────────────────
  function MobileWeekView() {
    return (
      <div className="md:hidden">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm font-semibold text-white">{trDateRange(startOfWeek)}</div>
          <div className="text-sm text-slate-400">{weekTasks.length} iş</div>
        </div>
        <div className="space-y-2">
          {weekDays.map((d, index) => {
            const dayTasks = tasks.filter((task) => dayjs(task.date).isSame(d, "day"));
            const isToday = d.isSame(dayjs(), "day");
            return (
              <button
                key={d.toString()}
                onClick={() => { goToDate(d); setView("day"); }}
                className={[
                  "w-full rounded-2xl border p-3 text-left transition",
                  isToday
                    ? "border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/10"
                    : "border-white/10 bg-slate-900/40 hover:bg-slate-800/50",
                ].join(" ")}
              >
                <div className="flex items-center justify-between">
                  <div className={`text-sm font-bold flex items-center gap-2 ${isToday ? "text-blue-300" : "text-white"}`}>
                    {WEEKDAYS[index]} · {d.format("DD MMMM")}
                    {isToday && (
                      <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] text-white font-semibold">
                        Bugün
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400">
                    {dayTasks.length > 0 ? `${dayTasks.length} iş →` : "→"}
                  </div>
                </div>
                {dayTasks.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {["OLCU", "IMALAT", "MONTAJ"].map((phase) => {
                      const n = dayTasks.filter((t) => t.phase === phase).length;
                      if (!n) return null;
                      const m = meta(phase);
                      return (
                        <span key={phase} className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${m.bg} ${m.text}`}>
                          {m.icon} {n} {m.label}
                        </span>
                      );
                    })}
                  </div>
                ) : (
                  <div className="mt-1 text-xs text-slate-600">Plan yok</div>
                )}
              </button>
            );
          })}
          {weekTasks.length === 0 && (
            <div className="rounded-3xl border border-dashed border-white/10 p-8 text-center text-slate-500">
              Bu hafta planlanmış iş yok.
            </div>
          )}
        </div>
      </div>
    );
  }

  function MonthView() {
    const start = weekStartMonday(currentDate.startOf("month"));
    const monthDays = Array.from({ length: 35 }).map((_, i) => start.add(i, "day"));

    return (
      <div className="rounded-3xl border border-white/10 bg-slate-950/40 p-3">
        <div className="mb-4 text-xl font-black text-white">{currentDate.format("MMMM YYYY")}</div>
        <div className="mb-2 grid grid-cols-7 gap-2">
          {WEEKDAYS.map((d) => (
            <div key={d} className="text-center text-xs font-bold text-slate-500">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-2">
          {monthDays.map((d) => {
            const dayTasks = tasks.filter((task) => dayjs(task.date).isSame(d, "day"));
            const inMonth = d.month() === currentDate.month();

            return (
              <button
                key={d.toString()}
                onClick={() => {
                  goToDate(d);
                  setView("day");
                }}
                className={[
                  "min-h-[74px] rounded-2xl border border-white/10 p-2 text-left",
                  inMonth ? "bg-slate-900/70" : "bg-slate-950/30 opacity-40",
                ].join(" ")}
              >
                <div className="text-sm font-bold text-white">{d.format("D")}</div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {["OLCU", "IMALAT", "MONTAJ"].map((phase) => {
                    const n = dayTasks.filter((t) => t.phase === phase).length;
                    if (!n) return null;
                    return <span key={phase} className={`h-2 w-2 rounded-full ${meta(phase).dot}`} />;
                  })}
                </div>
                {dayTasks.length > 0 && <div className="mt-2 text-[10px] text-slate-400">{dayTasks.length} iş</div>}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  function MobileMonthSummary() {
    const monthStart = currentDate.startOf("month");
    const monthEnd = currentDate.endOf("month");
    const monthTasks = tasks.filter(t => {
      const d = dayjs(t.date);
      return !d.isBefore(monthStart, "day") && !d.isAfter(monthEnd, "day");
    });
    const dayMap = new Map<string, any[]>();
    monthTasks.forEach(t => {
      const key = dayjs(t.date).format("YYYY-MM-DD");
      if (!dayMap.has(key)) dayMap.set(key, []);
      dayMap.get(key)!.push(t);
    });
    const busyDays = Array.from(dayMap.entries())
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 5)
      .sort((a, b) => a[0].localeCompare(b[0]));

    return (
      <div className="space-y-3">
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <div className="flex items-center justify-between">
            <div className="text-base font-black text-white">{currentDate.format("MMMM YYYY")}</div>
            <div className="text-xs text-slate-400">{monthTasks.length} iş</div>
          </div>
          <div className="mt-3 space-y-1.5">
            {busyDays.length === 0 ? (
              <div className="py-2 text-[11px] text-slate-500">Bu ay için plan yok</div>
            ) : (
              busyDays.map(([dateKey, dayTasks]) => (
                <button
                  key={dateKey}
                  onClick={() => { goToDate(dayjs(dateKey)); setView("day"); }}
                  className="flex w-full items-center justify-between rounded-xl bg-white/[0.04] px-3 py-2 text-left transition hover:bg-white/[0.07]"
                >
                  <div className="text-xs font-semibold text-white">{dayjs(dateKey).format("DD MMMM dddd")}</div>
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      {["OLCU", "IMALAT", "MONTAJ"].map(ph => {
                        const n = dayTasks.filter((t: any) => t.phase === ph).length;
                        if (!n) return null;
                        return <span key={ph} className={`h-2 w-2 rounded-full ${meta(ph).dot}`} />;
                      })}
                    </div>
                    <div className="text-[10px] text-slate-400">{dayTasks.length} iş →</div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
        <button
          onClick={() => setView("week")}
          className="w-full rounded-2xl border border-blue-500/20 bg-blue-600/10 py-2.5 text-sm font-bold text-blue-300 transition hover:bg-blue-600/20"
        >
          Haftalık görünüme geç →
        </button>
      </div>
    );
  }

  function MobileCalendarTab() {
    return (
      <div className="mt-3 space-y-3">
        <div className="flex items-center gap-2">
          <div className="flex flex-1 rounded-2xl border border-white/10 bg-white/[0.04] p-1">
            {(["day", "week", "month"] as ViewMode[]).map((key, i) => (
              <button
                key={key}
                onClick={() => setView(key)}
                className={[
                  "flex-1 rounded-xl py-1.5 text-[11px] font-bold transition",
                  view === key ? "bg-blue-600 text-white shadow-lg shadow-blue-900/40" : "text-slate-400",
                ].join(" ")}
              >
                {["Gün", "Hafta", "Ay"][i]}
              </button>
            ))}
          </div>
          <button onClick={goPrev} className="rounded-2xl bg-white/10 px-3 py-2 text-sm font-bold hover:bg-white/15">←</button>
          <button onClick={goToday} className="rounded-2xl bg-white/10 px-3 py-2 text-[11px] font-bold hover:bg-white/15">Bugün</button>
          <button onClick={goNext} className="rounded-2xl bg-white/10 px-3 py-2 text-sm font-bold hover:bg-white/15">→</button>
        </div>
        {view === "week" && <MobileWeekView />}
        {view === "day" && <MobileDayList />}
        {view === "month" && <MobileMonthSummary />}
      </div>
    );
  }

  return (
    <div className="h-full w-full md:overflow-hidden rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top_left,#0f2a4a_0%,#07111f_35%,#030712_75%)] p-4 text-white shadow-2xl md:p-6">
      <div className="mb-5 hidden md:flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight md:text-3xl">İş Programı</h1>
          <p className="mt-1 text-sm text-slate-400">
          {view === "day"
            ? currentDate.format("DD MMMM YYYY dddd")
            : view === "month"
            ? currentDate.format("MMMM YYYY")
            : trDateRange(startOfWeek)}
        </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            data-onboarding-target="is-programi-ekle"
            onClick={() => setShowCreate(true)}
            className="rounded-2xl bg-blue-600 px-5 py-2 text-sm font-black text-white shadow-lg shadow-blue-900/40 hover:bg-blue-500"
          >
            + Program Ekle
          </button>

          <div className="flex rounded-2xl border border-white/10 bg-white/[0.04] p-1">
            {[
              ["day", "Günlük"],
              ["week", "Haftalık"],
              ["month", "Aylık"],
            ].map(([key, label]) => (
              <button
                key={key}
                onClick={() => setView(key as ViewMode)}
                className={[
                  "rounded-xl px-4 py-2 text-sm font-bold transition",
                  view === key ? "bg-blue-600 text-white shadow-lg shadow-blue-900/40" : "text-slate-300 hover:bg-white/10",
                ].join(" ")}
              >
                {label}
              </button>
            ))}
          </div>

          <button onClick={goPrev} className="rounded-2xl bg-white/10 px-4 py-2 font-bold hover:bg-white/15">←</button>
          <button onClick={goToday} className="rounded-2xl bg-white/10 px-4 py-2 font-bold hover:bg-white/15">Bugün</button>
          <button onClick={goNext} className="rounded-2xl bg-white/10 px-4 py-2 font-bold hover:bg-white/15">→</button>
        </div>
      </div>

      <div className="mb-5 hidden md:grid grid-cols-3 gap-2 md:grid-cols-6">
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-2 md:p-4"><div className="text-[10px] md:text-xs text-slate-400">Toplam</div><div className="mt-1 text-xl md:text-3xl font-black">{stats.total}</div></div>
        <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-2 md:p-4"><div className="text-[10px] md:text-xs text-blue-300">Ölçü</div><div className="mt-1 text-xl md:text-3xl font-black text-blue-300">{stats.olcu}</div></div>
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-2 md:p-4"><div className="text-[10px] md:text-xs text-amber-300">İmalat</div><div className="mt-1 text-xl md:text-3xl font-black text-amber-300">{stats.imalat}</div></div>
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-2 md:p-4"><div className="text-[10px] md:text-xs text-emerald-300">Montaj</div><div className="mt-1 text-xl md:text-3xl font-black text-emerald-300">{stats.montaj}</div></div>
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-2 md:p-4"><div className="text-[10px] md:text-xs text-red-300">Geciken</div><div className="mt-1 text-xl md:text-3xl font-black text-red-300">{stats.delayed}</div></div>
        <div className="rounded-2xl border border-purple-500/20 bg-purple-500/10 p-2 md:p-4"><div className="text-[10px] md:text-xs text-purple-300">Tamam</div><div className="mt-1 text-xl md:text-3xl font-black text-purple-300">{stats.completed}</div></div>
      </div>

      {view === "week" && <DesktopWeek />}
      {view === "day" && <DesktopDay />}
      {view === "month" && <div className="hidden md:block"><MonthView /></div>}


      {/* ── MOBILE COCKPIT SHELL ──────────────────────────────────────── */}
      <OperationsCockpitShell
        mobileSeg={mobileSeg}
        onSegmentChange={setMobileSeg}
        title={mobileTitle}
        subtitle={mobileSubtitle}
        hasLiveAlerts={hasLiveAlerts}
        hasRiskAlerts={hasRiskAlerts}
      >
        {mobileSeg === "live" && <MobileLiveTab tasks={tasks} liveOpsData={liveOpsData} renderTask={(task) => <TaskCard task={task} />} />}
        {mobileSeg === "today" && <MobileTodayTab tasks={tasks} renderTask={(task) => <TaskCard task={task} />} />}
        {mobileSeg === "calendar" && <MobileCalendarTab />}
        {mobileSeg === "team" && <MobileTeamTab tasks={tasks} personelSayisi={personelSayisi} onSelectTask={setSelectedTask} />}
        {mobileSeg === "risks" && <MobileRisksTab tasks={tasks} onSelectTask={setSelectedTask} />}
      </OperationsCockpitShell>
      {/* ── END MOBILE COCKPIT ────────────────────────────────────────── */}
      <div className="mt-5 hidden md:grid grid-cols-1 gap-3 md:grid-cols-4">
        <DensityCard title="Ölçü Yoğunluğu" value={density.olcu} tone="text-blue-300" helper={`${stats.olcu} iş / ${olcuKapasiteHafta} kapasite`} />
        <DensityCard title="İmalat Yoğunluğu" value={density.imalat} tone="text-amber-300" helper={`${stats.imalat} iş / ${imalatKapasiteHafta} kapasite`} />
        <DensityCard title="Montaj Yoğunluğu" value={density.montaj} tone="text-emerald-300" helper={`${stats.montaj} iş / ${montajKapasiteHafta} kapasite`} />
        <DensityCard title="Genel Yoğunluk" value={density.genel} tone="text-purple-300" helper={`${stats.total} iş / ${genelKapasiteHafta} kapasite`} />
      </div>

      <div className="hidden md:block"><ScheduleAiInsight schedules={schedules} weekStart={startOfWeek.toISOString()} personelTipleri={personelTipleri} view={view} currentDate={currentDate.toISOString()} /></div>

      <button
        data-onboarding-target="is-programi-ekle"
        onClick={() => setShowCreate(true)}
        className="fixed bottom-[calc(88px+env(safe-area-inset-bottom,0px))] right-5 z-40 h-14 w-14 rounded-full bg-blue-600 text-3xl leading-none text-white shadow-2xl shadow-blue-900/50 md:hidden"
      >
        +
      </button>

      {savingDrag && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-2xl bg-slate-900 px-4 py-3 text-sm text-white shadow-2xl">
          Tarih güncelleniyor...
        </div>
      )}

      {showCreate && (
        <ScheduleCreateModal
          onClose={() => setShowCreate(false)}
          onCreated={goToCreatedSchedule}
        />
      )}

      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onUpdated={() => window.location.reload()}
        />
      )}
    </div>
  );
}

export default PremiumWorkCalendar;
