import dayjs from "dayjs";
import { PHASE_META } from "./constants";

type MobileRisksTabProps = {
  tasks: any[];
  onSelectTask: (task: any) => void;
};

function meta(phase: string) {
  return PHASE_META[phase] || PHASE_META.OLCU;
}

function getMobileRiskSummary(tasks: any[]) {
  const geciken = tasks.filter(t => !t.completed && dayjs(t.date).isBefore(dayjs(), "day"));
  const paused = tasks.filter(t => t.executionStatus === "PAUSED");
  const tasAlinacak = tasks.filter(t => t.phase === "TAS_ALINACAK");
  const todayUnfinished = tasks.filter(t => dayjs(t.date).isSame(dayjs(), "day") && !t.completed);
  const criticalCount = geciken.length;
  const highCount = paused.length;
  const mediumCount = tasAlinacak.length;
  const lowCount = todayUnfinished.length;
  const totalRisk = criticalCount + highCount + mediumCount;

  return {
    geciken,
    paused,
    tasAlinacak,
    criticalCount,
    highCount,
    mediumCount,
    lowCount,
    totalRisk,
  };
}

export function MobileRisksTab({ tasks, onSelectTask }: MobileRisksTabProps) {
  const {
    geciken,
    paused,
    tasAlinacak,
    criticalCount,
    highCount,
    mediumCount,
    lowCount,
    totalRisk,
  } = getMobileRiskSummary(tasks);

  return (
    <div className="mt-3 space-y-3">
      {/* Severity KPI strip */}
      <div className="grid grid-cols-4 gap-1.5">
        <div className={["rounded-2xl border p-2.5 text-center", criticalCount > 0 ? "border-red-500/20 bg-red-500/10" : "border-white/10 bg-white/[0.04]"].join(" ")}>
          <div className={["text-[9px] font-bold uppercase tracking-wide", criticalCount > 0 ? "text-red-400" : "text-slate-600"].join(" ")}>Kritik</div>
          <div className={["mt-0.5 text-xl font-black", criticalCount > 0 ? "text-red-300" : "text-slate-600"].join(" ")}>{criticalCount}</div>
        </div>
        <div className={["rounded-2xl border p-2.5 text-center", highCount > 0 ? "border-yellow-500/20 bg-yellow-500/10" : "border-white/10 bg-white/[0.04]"].join(" ")}>
          <div className={["text-[9px] font-bold uppercase tracking-wide", highCount > 0 ? "text-yellow-400" : "text-slate-600"].join(" ")}>Yüksek</div>
          <div className={["mt-0.5 text-xl font-black", highCount > 0 ? "text-yellow-300" : "text-slate-600"].join(" ")}>{highCount}</div>
        </div>
        <div className={["rounded-2xl border p-2.5 text-center", mediumCount > 0 ? "border-orange-500/20 bg-orange-500/10" : "border-white/10 bg-white/[0.04]"].join(" ")}>
          <div className={["text-[9px] font-bold uppercase tracking-wide", mediumCount > 0 ? "text-orange-400" : "text-slate-600"].join(" ")}>Orta</div>
          <div className={["mt-0.5 text-xl font-black", mediumCount > 0 ? "text-orange-300" : "text-slate-600"].join(" ")}>{mediumCount}</div>
        </div>
        <div className={["rounded-2xl border p-2.5 text-center", lowCount > 0 ? "border-blue-500/20 bg-blue-500/10" : "border-white/10 bg-white/[0.04]"].join(" ")}>
          <div className={["text-[9px] font-bold uppercase tracking-wide", lowCount > 0 ? "text-blue-400" : "text-slate-600"].join(" ")}>Düşük</div>
          <div className={["mt-0.5 text-xl font-black", lowCount > 0 ? "text-blue-300" : "text-slate-600"].join(" ")}>{lowCount}</div>
        </div>
      </div>

      {totalRisk === 0 && lowCount === 0 ? (
        <div className="rounded-2xl border border-green-500/20 bg-green-500/5 p-6 text-center">
          <div className="text-2xl">✅</div>
          <div className="mt-2 text-sm font-semibold text-green-400">Kritik risk yok</div>
          <div className="mt-1 text-xs text-slate-500">Tüm işler yolunda görünüyor</div>
        </div>
      ) : (
        <div className="space-y-2">
          {/* CRITICAL */}
          <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-3">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {criticalCount > 0 && <div className="h-2 w-2 animate-pulse rounded-full bg-red-500" />}
                <div className="text-xs font-bold text-red-300">KRİTİK — GECİKEN ({criticalCount})</div>
              </div>
              {criticalCount === 0 && <span className="text-[10px] text-green-500">Yok ✓</span>}
            </div>
            {criticalCount > 0 && (
              <div className="space-y-1">
                {geciken.slice(0, 4).map(t => (
                  <button key={t.id} onClick={() => onSelectTask(t)}
                    className="flex w-full items-center justify-between rounded-xl bg-white/[0.04] px-3 py-2 text-left">
                    <div>
                      <div className="text-xs font-semibold text-white">{t.title}</div>
                      <div className="text-[10px] text-slate-400">{dayjs(t.date).format("DD MMM")} · {meta(t.phase).label} · {dayjs().diff(dayjs(t.date), "day")} gün gecikti</div>
                    </div>
                    <div className="text-slate-500">›</div>
                  </button>
                ))}
                {geciken.length > 4 && <div className="text-center text-[10px] text-slate-500">+{geciken.length - 4} daha</div>}
              </div>
            )}
          </div>

          {/* HIGH */}
          <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-3">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {highCount > 0 && <div className="h-2 w-2 rounded-full bg-yellow-400" />}
                <div className="text-xs font-bold text-yellow-300">YÜKSEK — OPERASYON DURDU ({highCount})</div>
              </div>
              {highCount === 0 && <span className="text-[10px] text-green-500">Yok ✓</span>}
            </div>
            {highCount > 0 && (
              <div className="space-y-1">
                {paused.slice(0, 3).map(t => (
                  <button key={t.id} onClick={() => onSelectTask(t)}
                    className="flex w-full items-center justify-between rounded-xl bg-white/[0.04] px-3 py-2 text-left">
                    <div>
                      <div className="text-xs font-semibold text-white">{t.title}</div>
                      <div className="text-[10px] text-slate-400">{meta(t.phase).label}</div>
                    </div>
                    <div className="text-slate-500">›</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* MEDIUM */}
          <div className="rounded-2xl border border-orange-500/20 bg-orange-500/5 p-3">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {mediumCount > 0 && <div className="h-2 w-2 rounded-full bg-orange-400" />}
                <div className="text-xs font-bold text-orange-300">ORTA — MALZEME RİSKİ ({mediumCount})</div>
              </div>
              {mediumCount === 0 && <span className="text-[10px] text-green-500">Yok ✓</span>}
            </div>
            {mediumCount > 0 && (
              <div className="space-y-1">
                {tasAlinacak.slice(0, 3).map(t => (
                  <div key={t.id} className="flex items-center justify-between rounded-xl bg-white/[0.04] px-3 py-2">
                    <div>
                      <div className="text-xs font-semibold text-white">{t.title}</div>
                      <div className="text-[10px] text-slate-400">{dayjs(t.date).format("DD MMM")} hedefi</div>
                    </div>
                    <div className="text-[10px] text-orange-300">Taş alınacak</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* LOW */}
          {lowCount > 0 && (
            <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-3">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-blue-400" />
                <div className="text-xs font-bold text-blue-300">DÜŞÜK — BUGÜN BİTMEYEN ({lowCount})</div>
              </div>
              <div className="mt-1 text-[10px] text-slate-400">Bugün tamamlanmamış {lowCount} iş var.</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
