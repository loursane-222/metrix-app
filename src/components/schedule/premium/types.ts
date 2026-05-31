export type ViewMode = "day" | "week" | "month";
export type MobileSeg = "live" | "today" | "calendar" | "team" | "risks";

export type LiveOpsProductionOperation = {
  operationType: string;
  status: string;
  startedAt: string | null;
  completedAt: string | null;
};

export type LiveOpsExecution = {
  execId: string;
  phaseId: string;
  personelAd: string;
  phaseType: string;
  musteriAdi: string;
  urunAdi: string;
  status: "STARTED" | "PAUSED";
  actualStartedAt: string | null;
  elapsedMinutes: number;
  expectedMinutes: number | null;
  varianceMinutes: number | null;
  progressRatio: number | null;
  riskState?: "NORMAL" | "NO_PLAN" | "OVERRUN" | "CRITICAL" | "STALE" | string;
  cannotStartReason?: string | null;
  productionOperations?: LiveOpsProductionOperation[];
};

export type BlockedLiveOpsItem = {
  execId: string;
  phaseId: string;
  phaseType: string;
  musteriAdi: string;
  urunAdi: string;
  cannotStartReason?: string | null;
  materialLossCost?: string | null;
  elapsedBlockedMinutes: number;
  productionOperations?: LiveOpsProductionOperation[];
};

export type LiveOpsData = {
  aktifEkip: LiveOpsExecution[];
  blockedItems: BlockedLiveOpsItem[];
  toplamAktif: number;
  toplamPaused: number;
  toplamBlocked: number;
};
