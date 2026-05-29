export type OperationsSummaryStatus = "healthy" | "attention" | "critical";

type RiskSignalLike = {
  riskType?: string | null;
  severity?: string | null;
  reasonCode?: string | null;
  costAmount?: number | string | null;
  currency?: string | null;
  jobName?: string | null;
  customerName?: string | null;
};

type ActivityLike = {
  eventType?: string | null;
  type?: string | null;
};

type OperationKpiLike = {
  tamamlanan?: number | null;
  geciken?: number | null;
  islemde?: number | null;
  planlanan?: number | null;
};

type BlockedItemLike = {
  cannotStartReason?: string | null;
  materialLossCost?: number | string | null;
};

type PaymentDueLike = {
  tutar?: number | string | null;
};

export type OperationsSummaryInput = {
  riskSignals?: RiskSignalLike[];
  anaAkis?: ActivityLike[];
  operasyonKpi?: OperationKpiLike | null;
  blockedItems?: BlockedItemLike[];
  vadesiGelenler?: PaymentDueLike[];
  sicakTeklifler?: unknown[];
};

export type OperationsSummary = {
  status: OperationsSummaryStatus;
  headline: string;
  attentionItems: string[];
  metrics: {
    blockedJobs: number;
    delayedJobs: number;
    financialRiskAmount: number;
  };
};

const REASON_LABELS: Record<string, string> = {
  CUSTOMER_NOT_READY: "müşteri hazırlığı",
  MATERIAL_MISSING: "malzeme eksikliği",
  MEASUREMENT_MISSING: "ölçü eksikliği",
  MACHINE_BUSY: "makine yoğunluğu",
  PERSONNEL_UNAVAILABLE: "personel uygunluğu",
  SITE_NOT_READY: "saha hazırlığı",
  STONE_BROKEN_IN_CUTTING: "kesimde taş kırılması",
  OTHER: "diğer nedenler",
};

function numericValue(value: unknown) {
  if (value == null) return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function mostCommonReason(risks: RiskSignalLike[], blockedItems: BlockedItemLike[]) {
  const counts = new Map<string, number>();

  for (const risk of risks) {
    if (risk.reasonCode) counts.set(risk.reasonCode, (counts.get(risk.reasonCode) ?? 0) + 1);
  }
  for (const item of blockedItems) {
    if (item.cannotStartReason) counts.set(item.cannotStartReason, (counts.get(item.cannotStartReason) ?? 0) + 1);
  }

  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0] ?? null;
}

export function buildOperationsSummary(input: OperationsSummaryInput): OperationsSummary {
  const riskSignals = input.riskSignals ?? [];
  const blockedItems = input.blockedItems ?? [];
  const operasyonKpi = input.operasyonKpi ?? {};
  const vadesiGelenler = input.vadesiGelenler ?? [];
  const sicakTeklifler = input.sicakTeklifler ?? [];
  const anaAkis = input.anaAkis ?? [];

  const blockedJobs = Math.max(blockedItems.length, riskSignals.length);
  const delayedJobs = Number(operasyonKpi.geciken ?? 0);
  const completedJobs = Number(operasyonKpi.tamamlanan ?? 0);
  const financialRiskAmount = Math.max(
    riskSignals.reduce((sum, risk) => sum + numericValue(risk.costAmount), 0),
    blockedItems.reduce((sum, item) => sum + numericValue(item.materialLossCost), 0)
  );
  const hasCriticalFinancialRisk = financialRiskAmount > 0;
  const hasActiveRisk = blockedJobs > 0 || delayedJobs > 0 || vadesiGelenler.length > 0;

  const status: OperationsSummaryStatus = hasCriticalFinancialRisk
    ? "critical"
    : hasActiveRisk
    ? "attention"
    : "healthy";

  const headline =
    status === "critical"
      ? "Operasyon durumu: Kritik"
      : status === "attention"
      ? "Operasyon durumu: Dikkat Gerektiriyor"
      : "Bugün kritik operasyon riski görünmüyor.";

  const items: string[] = [];
  const commonReason = mostCommonReason(riskSignals, blockedItems);
  if (commonReason) {
    const [reasonCode, count] = commonReason;
    const label = REASON_LABELS[reasonCode] ?? reasonCode.toLowerCase();
    items.push(`${count} iş ${label} nedeniyle bekliyor.`);
  } else if (blockedJobs > 0) {
    items.push(`${blockedJobs} işte operasyon blokajı var.`);
  }

  if (hasCriticalFinancialRisk) {
    items.push(`Operasyon kaynaklı tahmini finansal risk ₺${Math.round(financialRiskAmount).toLocaleString("tr-TR")}.`);
  }

  if (completedJobs > 0 || delayedJobs > 0) {
    items.push(`Bugün ${completedJobs} faz tamamlandı, ${delayedJobs} faz gecikiyor.`);
  }

  if (vadesiGelenler.length > 0) {
    const totalDue = vadesiGelenler.reduce((sum, item) => sum + numericValue(item.tutar), 0);
    items.push(`${vadesiGelenler.length} vadesi gelen ödeme takipte${totalDue > 0 ? `: ₺${Math.round(totalDue).toLocaleString("tr-TR")}` : ""}.`);
  }

  if (sicakTeklifler.length > 0) {
    items.push(`${sicakTeklifler.length} sıcak teklif satış takibinde.`);
  }

  if (items.length === 0) {
    const completedEvents = anaAkis.filter((a) => (a.eventType ?? a.type) === "EXECUTION_COMPLETED").length;
    if (completedEvents > 0) {
      items.push(`Son akışta ${completedEvents} tamamlanan operasyon görünüyor.`);
    } else {
      items.push("Bugün kritik operasyon riski görünmüyor.");
    }
  }

  return {
    status,
    headline,
    attentionItems: items.slice(0, 3),
    metrics: {
      blockedJobs,
      delayedJobs,
      financialRiskAmount,
    },
  };
}
