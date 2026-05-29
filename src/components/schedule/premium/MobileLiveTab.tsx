import { PHASE_META } from "./constants";
import { LiveOpsCard } from "./LiveOpsCard";
import type { LiveOpsData } from "./types";
import type { ReactNode } from "react";

type MobileLiveTabProps = {
  tasks: any[];
  liveOpsData: LiveOpsData | null;
  renderTask: (task: any) => ReactNode;
};

function meta(phase: string) {
  return PHASE_META[phase] || PHASE_META.OLCU;
}

const BLOCKED_REASON: Record<string, string> = {
  CUSTOMER_NOT_READY: "Müşteri hazır değil",
  MATERIAL_MISSING: "Malzeme eksik",
  MEASUREMENT_MISSING: "Ölçü eksik",
  MACHINE_BUSY: "Makine meşgul",
  PERSONNEL_UNAVAILABLE: "Personel yok",
  SITE_NOT_READY: "Saha hazır değil",
  STONE_BROKEN_IN_CUTTING: "Kesimde taş kırıldı",
  OTHER: "Diğer",
};

export function MobileLiveTab({ tasks, liveOpsData, renderTask }: MobileLiveTabProps) {
  const fallbackLiveTasks = tasks.filter(t => t.executionStatus === "STARTED" || t.executionStatus === "PAUSED");
  const activeCount = liveOpsData ? liveOpsData.toplamAktif : fallbackLiveTasks.filter(t => t.executionStatus === "STARTED").length;
  const pausedCount = liveOpsData ? liveOpsData.toplamPaused : fallbackLiveTasks.filter(t => t.executionStatus === "PAUSED").length;
  const blockedCount = liveOpsData?.toplamBlocked ?? 0;

  return (
    <div className="mt-3 space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-2xl border border-green-500/20 bg-green-500/10 p-3">
          <div className="text-[10px] text-green-300">Aktif</div>
          <div className="mt-0.5 text-2xl font-black text-green-300">{activeCount}</div>
        </div>
        <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-3">
          <div className="text-[10px] text-yellow-300">Beklemede</div>
          <div className="mt-0.5 text-2xl font-black text-yellow-300">{pausedCount}</div>
        </div>
        <div className={["rounded-2xl border p-3", blockedCount > 0 ? "border-red-500/20 bg-red-500/10" : "border-white/10 bg-white/[0.04]"].join(" ")}>
          <div className={["text-[10px]", blockedCount > 0 ? "text-red-300" : "text-slate-400"].join(" ")}>Bloke</div>
          <div className={["mt-0.5 text-2xl font-black", blockedCount > 0 ? "text-red-300" : "text-white"].join(" ")}>{blockedCount}</div>
        </div>
      </div>

      {liveOpsData ? (
        <>
          {liveOpsData.aktifEkip.length === 0 && liveOpsData.blockedItems.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-slate-500">
              <div className="text-2xl">💤</div>
              <div className="mt-2 text-sm">Şu an aktif iş yok</div>
              <div className="mt-1 text-xs">Bugünün planı için Bugün sekmesini aç</div>
            </div>
          ) : (
            <>
              {liveOpsData.aktifEkip.length > 0 && (
                <div className="space-y-2">
                  {liveOpsData.aktifEkip.map((ex) => <LiveOpsCard key={ex.execId} ex={ex} />)}
                </div>
              )}
              {liveOpsData.blockedItems.length > 0 && (
                <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <div className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
                    <div className="text-xs font-bold text-red-300">BAŞLANAMAYAN İŞLER ({liveOpsData.blockedItems.length})</div>
                  </div>
                  <div className="space-y-1.5">
                    {liveOpsData.blockedItems.map((b) => {
                      const bm = meta(b.phaseType ?? "IMALAT");
                      return (
                        <div key={b.execId} className="rounded-xl bg-white/[0.04] px-3 py-2">
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <div className="text-xs font-semibold text-white">{b.musteriAdi}</div>
                              {b.urunAdi && <div className="text-[10px] text-slate-400">{b.urunAdi}</div>}
                            </div>
                            <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${bm.bg} ${bm.text}`}>{bm.label}</span>
                          </div>
                          <div className="mt-1 text-[10px] text-red-300">{BLOCKED_REASON[b.cannotStartReason ?? ""] ?? (b.cannotStartReason ?? "Bilinmeyen neden")}</div>
                          {b.materialLossCost && <div className="text-[10px] text-slate-500">Malzeme kaybı: ₺{b.materialLossCost}</div>}
                          <div className="text-[10px] text-slate-600">{b.elapsedBlockedMinutes} dk süredir bekliyor</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </>
      ) : (
        fallbackLiveTasks.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-slate-500">
            <div className="text-2xl">💤</div>
            <div className="mt-2 text-sm">Şu an aktif iş yok</div>
            <div className="mt-1 text-xs">Bugünün planı için Bugün sekmesini aç</div>
          </div>
        ) : (
          <div className="space-y-2">
            {fallbackLiveTasks.map(task => (
              <div key={task.id} className={["rounded-2xl overflow-hidden border-l-4", task.executionStatus === "STARTED" ? "border-l-green-500" : "border-l-yellow-400"].join(" ")}>
                {renderTask(task)}
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
