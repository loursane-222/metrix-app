import dayjs from "dayjs";
import { PHASE_META } from "./constants";

type ScheduleRisk = {
  id: string;
  type: string;
  severity: "critical" | "high" | "medium" | "watch" | string;
  title: string;
  message: string;
  jobId: string | null;
  customerName: string | null;
  costAmount: number | null;
  url: string | null;
  evidence: Record<string, unknown>;
  createdAt: string;
};

type MobileRisksTabProps = {
  tasks: any[];
  risks?: ScheduleRisk[];
  onSelectTask: (task: any) => void;
};

const SEVERITY_META: Record<string, { label: string; dot: string; badge: string; card: string }> = {
  critical: {
    label: "Kritik",
    dot: "bg-red-500",
    badge: "border-red-500/30 bg-red-500/10 text-red-300",
    card: "border-red-500/20 bg-red-500/5",
  },
  high: {
    label: "Yüksek",
    dot: "bg-amber-400",
    badge: "border-amber-500/30 bg-amber-500/10 text-amber-300",
    card: "border-amber-500/20 bg-amber-500/5",
  },
  medium: {
    label: "Orta",
    dot: "bg-orange-400",
    badge: "border-orange-500/30 bg-orange-500/10 text-orange-300",
    card: "border-orange-500/20 bg-orange-500/5",
  },
  watch: {
    label: "İzlemede",
    dot: "bg-blue-400",
    badge: "border-blue-500/30 bg-blue-500/10 text-blue-300",
    card: "border-blue-500/20 bg-blue-500/5",
  },
};

function meta(phase: string) {
  return PHASE_META[phase] || PHASE_META.OLCU;
}

function money(value: number | null | undefined) {
  if (value == null || !Number.isFinite(Number(value))) return null;
  return `₺${Number(value).toLocaleString("tr-TR", { maximumFractionDigits: 0 })}`;
}

function evidenceText(risk: ScheduleRisk) {
  const e = risk.evidence || {};
  if (risk.type === "CRITICAL_PROFITABILITY") {
    const sale = money(Number(e.sale || 0));
    const cost = money(Number(e.cost || 0));
    const profit = money(Number(e.profitAmount || 0));
    return [sale ? `Satış ${sale}` : null, cost ? `Maliyet ${cost}` : null, profit ? `Kâr ${profit}` : null].filter(Boolean).join(" · ");
  }
  if (risk.type === "MULTIPLE_FIRE_ON_JOB") return `${e.fireCount || 0} fire kaydı`;
  if (risk.type === "UNCONSUMED_ACTIVE_RESERVATION") return `${e.plateCode || "Plaka"} · ${e.reservationAgeDays || 0} gün aktif`;
  if (risk.type === "CONSUMED_JOB_NOT_COMPLETED") return `${e.plateCode || "Plaka"} · ${e.consumedAgeDays || 0} gün önce tüketildi`;
  if (risk.type === "STONE_BROKEN_IN_CUTTING") return String(e.productName || "Kesim fire kaydı");
  return "";
}

function getLegacyRiskSummary(tasks: any[]) {
  const geciken = tasks.filter(t => !t.completed && dayjs(t.date).isBefore(dayjs(), "day"));
  const paused = tasks.filter(t => t.executionStatus === "PAUSED");
  const tasAlinacak = tasks.filter(t => t.phase === "TAS_ALINACAK");
  const todayUnfinished = tasks.filter(t => dayjs(t.date).isSame(dayjs(), "day") && !t.completed);
  return { geciken, paused, tasAlinacak, todayUnfinished };
}

export function MobileRisksTab({ tasks, risks = [], onSelectTask }: MobileRisksTabProps) {
  const { geciken, paused, tasAlinacak, todayUnfinished } = getLegacyRiskSummary(tasks);
  const counts = {
    critical: risks.filter((risk) => risk.severity === "critical").length,
    high: risks.filter((risk) => risk.severity === "high").length,
    medium: risks.filter((risk) => risk.severity === "medium").length,
    watch: risks.filter((risk) => risk.severity === "watch").length,
  };
  const hasEngineRisks = risks.length > 0;

  return (
    <div className="mt-3 space-y-3">
      <div className="grid grid-cols-4 gap-1.5">
        {(["critical", "high", "medium", "watch"] as const).map((severity) => {
          const cfg = SEVERITY_META[severity];
          const count = counts[severity];
          return (
            <div
              key={severity}
              className={[
                "rounded-2xl border p-2.5 text-center",
                count > 0 ? cfg.card : "border-white/10 bg-white/[0.04]",
              ].join(" ")}
            >
              <div className={["text-[9px] font-bold uppercase tracking-wide", count > 0 ? cfg.badge.split(" ").at(-1) : "text-slate-600"].join(" ")}>
                {cfg.label}
              </div>
              <div className={["mt-0.5 text-xl font-black", count > 0 ? cfg.badge.split(" ").at(-1) : "text-slate-600"].join(" ")}>{count}</div>
            </div>
          );
        })}
      </div>

      {hasEngineRisks ? (
        <div className="space-y-2">
          {risks.map((risk) => {
            const cfg = SEVERITY_META[risk.severity] || SEVERITY_META.watch;
            const impact = money(risk.costAmount);
            const task = risk.jobId ? tasks.find((t) => t.schedule?.is?.id === risk.jobId) : null;
            return (
              <div key={risk.id} className={["rounded-2xl border p-3", cfg.card].join(" ")}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={["h-2 w-2 rounded-full", cfg.dot, risk.severity === "critical" ? "animate-pulse" : ""].join(" ")} />
                      <span className={["rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.12em]", cfg.badge].join(" ")}>
                        {cfg.label}
                      </span>
                    </div>
                    <div className="mt-2 text-sm font-black text-white">{risk.title}</div>
                    <div className="mt-1 text-xs leading-relaxed text-slate-400">
                      {risk.message}
                      {risk.customerName ? ` · ${risk.customerName}` : ""}
                    </div>
                  </div>
                  {impact && (
                    <div className="shrink-0 rounded-xl border border-white/10 bg-black/20 px-2.5 py-1.5 text-right">
                      <div className="text-[9px] font-black uppercase tracking-wide text-slate-500">Etki</div>
                      <div className="text-xs font-black text-red-200">{impact}</div>
                    </div>
                  )}
                </div>

                {evidenceText(risk) && (
                  <div className="mt-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-[10px] font-semibold text-slate-400">
                    {evidenceText(risk)}
                  </div>
                )}

                <div className="mt-3 flex items-center justify-between gap-2">
                  <div className="text-[10px] text-slate-500">{dayjs(risk.createdAt).format("DD MMM HH:mm")}</div>
                  {task ? (
                    <button
                      type="button"
                      onClick={() => onSelectTask(task)}
                      className="rounded-xl bg-white px-3 py-1.5 text-[11px] font-black text-slate-950"
                    >
                      İşe git
                    </button>
                  ) : risk.url ? (
                    <a href={risk.url} className="rounded-xl bg-white px-3 py-1.5 text-[11px] font-black text-slate-950">
                      İşe git
                    </a>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <LegacyRisks
          geciken={geciken}
          paused={paused}
          tasAlinacak={tasAlinacak}
          todayUnfinished={todayUnfinished}
          onSelectTask={onSelectTask}
        />
      )}
    </div>
  );
}

function LegacyRisks({ geciken, paused, tasAlinacak, todayUnfinished, onSelectTask }: any) {
  const totalRisk = geciken.length + paused.length + tasAlinacak.length + todayUnfinished.length;

  if (totalRisk === 0) {
    return (
      <div className="rounded-2xl border border-green-500/20 bg-green-500/5 p-6 text-center">
        <div className="text-2xl">✓</div>
        <div className="mt-2 text-sm font-semibold text-green-400">Kritik risk yok</div>
        <div className="mt-1 text-xs text-slate-500">Tüm işler yolunda görünüyor</div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {geciken.length > 0 && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-3">
          <div className="mb-2 text-xs font-bold text-red-300">KRİTİK - GECİKEN ({geciken.length})</div>
          {geciken.slice(0, 4).map((t: any) => (
            <button key={t.id} onClick={() => onSelectTask(t)} className="mb-1 flex w-full items-center justify-between rounded-xl bg-white/[0.04] px-3 py-2 text-left">
              <div>
                <div className="text-xs font-semibold text-white">{t.title}</div>
                <div className="text-[10px] text-slate-400">{dayjs(t.date).format("DD MMM")} · {meta(t.phase).label}</div>
              </div>
              <div className="text-slate-500">›</div>
            </button>
          ))}
        </div>
      )}
      {paused.length > 0 && (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-3">
          <div className="mb-2 text-xs font-bold text-amber-300">YÜKSEK - OPERASYON DURDU ({paused.length})</div>
          {paused.slice(0, 3).map((t: any) => (
            <button key={t.id} onClick={() => onSelectTask(t)} className="mb-1 flex w-full items-center justify-between rounded-xl bg-white/[0.04] px-3 py-2 text-left">
              <div>
                <div className="text-xs font-semibold text-white">{t.title}</div>
                <div className="text-[10px] text-slate-400">{meta(t.phase).label}</div>
              </div>
              <div className="text-slate-500">›</div>
            </button>
          ))}
        </div>
      )}
      {tasAlinacak.length > 0 && (
        <div className="rounded-2xl border border-orange-500/20 bg-orange-500/5 p-3">
          <div className="mb-2 text-xs font-bold text-orange-300">ORTA - MALZEME RİSKİ ({tasAlinacak.length})</div>
          {tasAlinacak.slice(0, 3).map((t: any) => (
            <div key={t.id} className="mb-1 flex items-center justify-between rounded-xl bg-white/[0.04] px-3 py-2">
              <div>
                <div className="text-xs font-semibold text-white">{t.title}</div>
                <div className="text-[10px] text-slate-400">{dayjs(t.date).format("DD MMM")} hedefi</div>
              </div>
              <div className="text-[10px] text-orange-300">Taş alınacak</div>
            </div>
          ))}
        </div>
      )}
      {todayUnfinished.length > 0 && (
        <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-3">
          <div className="text-xs font-bold text-blue-300">İZLEMEDE - BUGÜN BİTMEYEN ({todayUnfinished.length})</div>
          <div className="mt-1 text-[10px] text-slate-400">Bugün tamamlanmamış {todayUnfinished.length} iş var.</div>
        </div>
      )}
    </div>
  );
}
