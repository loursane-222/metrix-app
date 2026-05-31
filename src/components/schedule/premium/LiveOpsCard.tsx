import { LIVE_OPS_RISK_LABEL, LIVE_OPS_RISK_STYLE, PHASE_META } from "./constants";
import type { LiveOpsExecution } from "./types";

function meta(phase: string) {
  return PHASE_META[phase] || PHASE_META.OLCU;
}

function productionOperationLabel(operationType: string, status: string): string | null {
  if (operationType === "KESIM") {
    if (status === "COMPLETED") return "✓ Kesim Tamamlandı";
    if (status === "STARTED") return "● Kesim Devam Ediyor";
  }
  if (operationType === "TOPLAMA") {
    if (status === "READY") return "○ Toplama Hazır";
    if (status === "STARTED") return "● Toplama Devam Ediyor";
    if (status === "COMPLETED") return "✓ Toplama Tamamlandı";
  }
  return null;
}

export function LiveOpsCard({ ex }: { ex: LiveOpsExecution }) {
  const m = meta(ex.phaseType ?? "IMALAT");
  const isStarted = ex.status === "STARTED";
  const riskState = ex.riskState;
  const expectedMinutes = ex.expectedMinutes;
  const varianceMinutes = ex.varianceMinutes ?? 0;
  const fmtMins = (mins: number) => {
    const h = Math.floor(mins / 60);
    const r = mins % 60;
    return h > 0 ? `${h}s ${r}dk` : `${r}dk`;
  };
  const showRisk = riskState && riskState !== "NORMAL" && riskState !== "NO_PLAN";
  const productionOperationLabels = (ex.productionOperations ?? [])
    .map((operation) => productionOperationLabel(operation.operationType, operation.status))
    .filter(Boolean);

  return (
    <div className={["rounded-2xl overflow-hidden border border-white/[0.08] bg-white/[0.04] border-l-4 p-3", isStarted ? "border-l-green-500" : "border-l-yellow-400"].join(" ")}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1">
            <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${m.bg} ${m.text}`}>{m.icon} {m.label}</span>
            <span className={["rounded px-1.5 py-0.5 text-[10px] font-bold", isStarted ? "bg-green-500/10 text-green-300" : "bg-yellow-500/10 text-yellow-300"].join(" ")}>
              {isStarted ? "ÇALIŞIYOR" : "DURAKLADI"}
            </span>
            {showRisk && (
              <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${LIVE_OPS_RISK_STYLE[riskState] ?? ""}`}>
                {LIVE_OPS_RISK_LABEL[riskState] ?? riskState}
              </span>
            )}
          </div>
          <div className="mt-1.5 text-sm font-semibold text-white">{ex.musteriAdi}</div>
          {ex.urunAdi && <div className="text-[11px] text-slate-400">{ex.urunAdi}</div>}
          <div className="mt-0.5 text-[11px] text-slate-500">{ex.personelAd}</div>
          {productionOperationLabels.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] font-semibold text-slate-400">
              {productionOperationLabels.map((label) => (
                <span key={label}>{label}</span>
              ))}
            </div>
          )}
        </div>
        <div className="shrink-0 text-right">
          <div className="text-lg font-black text-white">{fmtMins(ex.elapsedMinutes ?? 0)}</div>
          {expectedMinutes && (
            <div className="text-[10px] text-slate-500">/ {fmtMins(expectedMinutes)}</div>
          )}
          {varianceMinutes > 0 && (
            <div className="text-[10px] text-amber-400">+{fmtMins(varianceMinutes)} sapma</div>
          )}
        </div>
      </div>
      {ex.progressRatio != null && (
        <div className="mt-2.5">
          <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
            <div
              className={["h-full rounded-full transition-all", ex.progressRatio > 1.25 ? "bg-red-500" : ex.progressRatio > 1.0 ? "bg-amber-400" : "bg-green-500"].join(" ")}
              style={{ width: `${Math.min(100, Math.round((ex.progressRatio ?? 0) * 100))}%` }}
            />
          </div>
          <div className="mt-0.5 text-right text-[10px] text-slate-500">%{Math.round((ex.progressRatio ?? 0) * 100)}</div>
        </div>
      )}
    </div>
  );
}
