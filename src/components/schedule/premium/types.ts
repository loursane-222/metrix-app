export type ViewMode = "day" | "week" | "month";
export type MobileSeg = "live" | "today" | "calendar" | "team" | "risks";

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
};

export type LiveOpsData = {
  aktifEkip: LiveOpsExecution[];
  blockedItems: BlockedLiveOpsItem[];
  toplamAktif: number;
  toplamPaused: number;
  toplamBlocked: number;
};
