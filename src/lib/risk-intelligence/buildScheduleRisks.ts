import { prisma } from "@/lib/prisma";

export type ScheduleRiskSeverity = "critical" | "high" | "medium" | "watch";

export type ScheduleRiskType =
  | "STONE_BROKEN_IN_CUTTING"
  | "MULTIPLE_FIRE_ON_JOB"
  | "CRITICAL_PROFITABILITY"
  | "UNCONSUMED_ACTIVE_RESERVATION"
  | "CONSUMED_JOB_NOT_COMPLETED"
  | "PRODUCTION_OPERATION_BLOCKED"
  | "PRODUCTION_OPERATION_READY_STALE"
  | "PRODUCTION_OPERATION_DELAYED";

export type ScheduleRisk = {
  id: string;
  type: ScheduleRiskType;
  severity: ScheduleRiskSeverity;
  title: string;
  message: string;
  jobId: string | null;
  customerName: string | null;
  costAmount: number | null;
  url: string | null;
  evidence: Record<string, unknown>;
  createdAt: string;
};

type BuildScheduleRisksInput = {
  atolyeId: string;
  limit?: number;
};

function n(value: unknown) {
  if (value == null) return 0;
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function iso(value: Date | string | null | undefined) {
  return value ? new Date(value).toISOString() : new Date().toISOString();
}

function jobUrl(jobId: string | null | undefined) {
  return jobId ? `/dashboard/isler/${jobId}` : null;
}

function daysAgo(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

function operationLabel(operationType: string) {
  if (operationType === "KESIM") return "Kesim";
  if (operationType === "TOPLAMA") return "Toplama";
  return operationType;
}

function cannotStartReasonLabel(reasonCode?: string | null) {
  const labels: Record<string, string> = {
    CUSTOMER_NOT_READY: "Müşteri hazır değil",
    MATERIAL_MISSING: "Malzeme eksik",
    MEASUREMENT_MISSING: "Ölçü eksik",
    MACHINE_BUSY: "Makine meşgul",
    PERSONNEL_UNAVAILABLE: "Personel yok",
    SITE_NOT_READY: "Saha hazır değil",
    STONE_BROKEN_IN_CUTTING: "Kesimde taş kırıldı",
    OTHER: "Diğer",
  };
  return reasonCode ? labels[reasonCode] ?? reasonCode : null;
}

function isJobCompleted(job: { durum?: string | null; workSchedule?: { phases?: Array<{ phase: string; isCompleted: boolean }> } | null }) {
  if (job.durum === "montaj_tamamlandi") return true;
  return job.workSchedule?.phases?.some((phase) => phase.phase === "MONTAJ" && phase.isCompleted) ?? false;
}

function imalatState(job: {
  workSchedule?: {
    phases?: Array<{
      phase: string;
      isCompleted: boolean;
      executions?: Array<{ status: string; actualStartedAt: Date | null; updatedAt: Date }>;
    }>;
  } | null;
}) {
  const imalat = job.workSchedule?.phases?.find((phase) => phase.phase === "IMALAT");
  const executions = imalat?.executions ?? [];
  const activeExecution = executions.find((execution) => execution.status === "STARTED" || execution.status === "PAUSED") ?? null;
  return {
    isCompleted: imalat?.isCompleted ?? false,
    activeExecution,
    hasStarted: executions.some((execution) => Boolean(execution.actualStartedAt) || ["STARTED", "PAUSED", "COMPLETED"].includes(execution.status)),
  };
}

function riskSort(a: ScheduleRisk, b: ScheduleRisk) {
  const order: Record<ScheduleRiskSeverity, number> = {
    critical: 4,
    high: 3,
    medium: 2,
    watch: 1,
  };
  return order[b.severity] - order[a.severity] || +new Date(b.createdAt) - +new Date(a.createdAt);
}

export async function buildScheduleRisks(input: BuildScheduleRisksInput): Promise<ScheduleRisk[]> {
  const { atolyeId, limit = 50 } = input;
  const activeCutoff = daysAgo(3);
  const consumedCutoff = daysAgo(3);

  const [
    stoneBrokenRecords,
    fireRecords,
    profitabilityJobs,
    activeReservations,
    consumedReservations,
    imalatPhases,
  ] = await Promise.all([
    prisma.fireRecord.findMany({
      where: { atolyeId, fireType: "STONE_BROKEN_IN_CUTTING" },
      orderBy: { createdAt: "desc" },
      take: 25,
    }),
    prisma.fireRecord.findMany({
      where: { atolyeId, isId: { not: null } },
      orderBy: { createdAt: "desc" },
      take: 250,
    }),
    prisma.is.findMany({
      where: {
        atolyeId,
        durum: { not: "kaybedildi" },
        satisFiyati: { gt: 0 },
      },
      orderBy: { updatedAt: "desc" },
      take: 200,
      select: {
        id: true,
        musteriAdi: true,
        urunAdi: true,
        satisFiyati: true,
        toplamMaliyet: true,
        operasyonelFireMaliyeti: true,
        updatedAt: true,
      },
    }),
    prisma.stockReservation.findMany({
      where: { atolyeId, status: "ACTIVE", updatedAt: { lt: activeCutoff } },
      orderBy: { updatedAt: "asc" },
      take: 50,
    }),
    prisma.stockReservation.findMany({
      where: { atolyeId, status: "CONSUMED", consumedAt: { lt: consumedCutoff } },
      orderBy: { consumedAt: "asc" },
      take: 80,
    }),
    prisma.schedulePhase.findMany({
      where: {
        phase: "IMALAT",
        isCompleted: false,
        workSchedule: {
          is: {
            atolyeId,
            durum: { not: "kaybedildi" },
          },
        },
        operations: {
          some: {
            status: { in: ["READY", "STARTED", "PAUSED", "CANNOT_START"] },
          },
        },
      },
      orderBy: { updatedAt: "asc" },
      take: 120,
      select: {
        id: true,
        workScheduleId: true,
        workSchedule: {
          select: {
            isId: true,
            is: {
              select: {
                musteriAdi: true,
                urunAdi: true,
              },
            },
          },
        },
        operations: {
          where: {
            status: { in: ["READY", "STARTED", "PAUSED", "CANNOT_START"] },
          },
          select: {
            id: true,
            operationType: true,
            status: true,
            readyAt: true,
            startedAt: true,
            updatedAt: true,
            executions: {
              select: {
                status: true,
                cannotStartReason: true,
                failureDescription: true,
                materialLossCost: true,
                updatedAt: true,
              },
              orderBy: { updatedAt: "desc" },
              take: 3,
            },
          },
        },
      },
    }),
  ]);

  const jobIds = [
    ...new Set(
      [
        ...stoneBrokenRecords.map((record) => record.isId),
        ...fireRecords.map((record) => record.isId),
        ...activeReservations.map((reservation) => reservation.isId),
        ...consumedReservations.map((reservation) => reservation.isId),
      ].filter(Boolean),
    ),
  ] as string[];
  const stockPlateIds = [
    ...new Set(
      [...activeReservations, ...consumedReservations]
        .map((reservation) => reservation.stockPlateId)
        .filter(Boolean),
    ),
  ];

  const [jobs, stockPlates] = await Promise.all([
    jobIds.length > 0
      ? prisma.is.findMany({
          where: { atolyeId, id: { in: jobIds } },
          select: {
            id: true,
            musteriAdi: true,
            urunAdi: true,
            durum: true,
            workSchedule: {
              select: {
                phases: {
                  select: {
                    phase: true,
                    isCompleted: true,
                    executions: {
                      select: { status: true, actualStartedAt: true, updatedAt: true },
                      orderBy: { updatedAt: "desc" },
                      take: 3,
                    },
                  },
                },
              },
            },
          },
        })
      : Promise.resolve([]),
    stockPlateIds.length > 0
      ? prisma.stockPlate.findMany({
          where: { atolyeId, id: { in: stockPlateIds } },
          select: { id: true, plateCode: true, productName: true },
        })
      : Promise.resolve([]),
  ]);
  const jobMap = new Map(jobs.map((job) => [job.id, job]));
  const stockPlateMap = new Map(stockPlates.map((plate) => [plate.id, plate]));

  const risks: ScheduleRisk[] = [];
  const stoneBrokenOperationIds = new Set(
    stoneBrokenRecords
      .map((record) => record.phaseOperationId)
      .filter(Boolean),
  );

  for (const record of stoneBrokenRecords) {
    const job = record.isId ? jobMap.get(record.isId) : null;
    const costAmount = n(record.finalCost ?? record.estimatedCost);
    risks.push({
      id: `stone_broken_${record.id}`,
      type: "STONE_BROKEN_IN_CUTTING",
      severity: "critical",
      title: "Kesimde taş kırıldı",
      message: `${job?.musteriAdi || "Müşteri"} işinde kesim kaynaklı taş kırığı kaydı var.`,
      jobId: record.isId,
      customerName: job?.musteriAdi ?? null,
      costAmount: costAmount > 0 ? costAmount : null,
      url: jobUrl(record.isId),
      evidence: {
        fireRecordId: record.id,
        phaseOperationId: record.phaseOperationId ?? null,
        operationType: record.phaseOperationId ? "KESIM" : null,
        fireType: record.fireType,
        reasonCode: record.reasonCode,
        status: record.status,
        productName: job?.urunAdi ?? null,
      },
      createdAt: iso(record.createdAt),
    });
  }

  for (const phase of imalatPhases) {
    const job = phase.workSchedule.is;
    const jobId = phase.workSchedule.isId;

    for (const operation of phase.operations) {
      const label = operationLabel(operation.operationType);
      const latestExecution = operation.executions[0] ?? null;
      const reasonLabel = cannotStartReasonLabel(latestExecution?.cannotStartReason);
      const referenceDate = operation.readyAt ?? operation.startedAt ?? operation.updatedAt;
      const ageDays = Math.floor((Date.now() - referenceDate.getTime()) / 86_400_000);

      if (operation.status === "CANNOT_START") {
        if (
          operation.operationType === "KESIM" &&
          latestExecution?.cannotStartReason === "STONE_BROKEN_IN_CUTTING" &&
          stoneBrokenOperationIds.has(operation.id)
        ) {
          continue;
        }

        const isStoneBroken =
          operation.operationType === "KESIM" &&
          latestExecution?.cannotStartReason === "STONE_BROKEN_IN_CUTTING";

        risks.push({
          id: `production_operation_blocked_${operation.id}`,
          type: "PRODUCTION_OPERATION_BLOCKED",
          severity: isStoneBroken ? "critical" : "high",
          title: isStoneBroken ? "Kesimde taş kırıldı" : `${label} durdu`,
          message: reasonLabel
            ? `${job.musteriAdi || "Müşteri"} işinde ${label.toLocaleLowerCase("tr-TR")} operasyonu durdu: ${reasonLabel}.`
            : `${job.musteriAdi || "Müşteri"} işinde ${label.toLocaleLowerCase("tr-TR")} operasyonu durdu.`,
          jobId,
          customerName: job.musteriAdi || null,
          costAmount: latestExecution?.materialLossCost != null ? n(latestExecution.materialLossCost) : null,
          url: jobUrl(jobId),
          evidence: {
            schedulePhaseId: phase.id,
            workScheduleId: phase.workScheduleId,
            phaseOperationId: operation.id,
            operationType: operation.operationType,
            operationStatus: operation.status,
            reasonCode: latestExecution?.cannotStartReason ?? null,
            failureDescription: latestExecution?.failureDescription ?? null,
            productName: job.urunAdi ?? null,
          },
          createdAt: iso(latestExecution?.updatedAt ?? operation.updatedAt),
        });
        continue;
      }

      if (operation.status === "READY") {
        if (referenceDate >= activeCutoff) continue;

        risks.push({
          id: `production_operation_ready_stale_${operation.id}`,
          type: "PRODUCTION_OPERATION_READY_STALE",
          severity: "medium",
          title: `${label} hazır ama başlanmadı`,
          message: `${job.musteriAdi || "Müşteri"} işinde ${label.toLocaleLowerCase("tr-TR")} ${ageDays} gündür hazır bekliyor.`,
          jobId,
          customerName: job.musteriAdi || null,
          costAmount: null,
          url: jobUrl(jobId),
          evidence: {
            schedulePhaseId: phase.id,
            workScheduleId: phase.workScheduleId,
            phaseOperationId: operation.id,
            operationType: operation.operationType,
            operationStatus: operation.status,
            readyAt: iso(operation.readyAt),
            readyAgeDays: ageDays,
            productName: job.urunAdi ?? null,
          },
          createdAt: iso(referenceDate),
        });
        continue;
      }

      if (operation.status === "STARTED" || operation.status === "PAUSED") {
        const startedAt = operation.startedAt ?? operation.updatedAt;
        if (startedAt >= activeCutoff) continue;

        risks.push({
          id: `production_operation_delayed_${operation.id}`,
          type: "PRODUCTION_OPERATION_DELAYED",
          severity: operation.status === "PAUSED" ? "high" : "medium",
          title: `${label} gecikiyor`,
          message: `${job.musteriAdi || "Müşteri"} işinde ${label.toLocaleLowerCase("tr-TR")} ${ageDays} gündür ${operation.status === "PAUSED" ? "duraklatılmış" : "devam ediyor"}.`,
          jobId,
          customerName: job.musteriAdi || null,
          costAmount: null,
          url: jobUrl(jobId),
          evidence: {
            schedulePhaseId: phase.id,
            workScheduleId: phase.workScheduleId,
            phaseOperationId: operation.id,
            operationType: operation.operationType,
            operationStatus: operation.status,
            startedAt: iso(operation.startedAt),
            activeAgeDays: ageDays,
            productName: job.urunAdi ?? null,
          },
          createdAt: iso(startedAt),
        });
      }
    }
  }

  const fireByJob = new Map<string, typeof fireRecords>();
  for (const record of fireRecords) {
    if (!record.isId) continue;
    const list = fireByJob.get(record.isId) ?? [];
    list.push(record);
    fireByJob.set(record.isId, list);
  }

  for (const [jobId, records] of fireByJob.entries()) {
    if (records.length <= 1) continue;
    const newest = records[0];
    const job = jobMap.get(jobId);
    const totalCost = records.reduce((sum, record) => sum + n(record.finalCost ?? record.estimatedCost), 0);
    risks.push({
      id: `multiple_fire_${jobId}`,
      type: "MULTIPLE_FIRE_ON_JOB",
      severity: "critical",
      title: "Aynı işte birden fazla fire",
      message: `${job?.musteriAdi || "Müşteri"} işinde ${records.length} fire kaydı var.`,
      jobId,
      customerName: job?.musteriAdi ?? null,
      costAmount: totalCost > 0 ? totalCost : null,
      url: jobUrl(jobId),
      evidence: {
        fireCount: records.length,
        fireRecordIds: records.map((record) => record.id),
        productName: job?.urunAdi ?? null,
      },
      createdAt: iso(newest.createdAt),
    });
  }

  for (const job of profitabilityJobs) {
    const sale = n(job.satisFiyati);
    const cost = n(job.toplamMaliyet);
    const profitAmount = sale - cost;
    const profitPercent = sale > 0 ? (profitAmount / sale) * 100 : 0;
    if (profitAmount >= 0 && profitPercent >= 10) continue;

    risks.push({
      id: `critical_profitability_${job.id}`,
      type: "CRITICAL_PROFITABILITY",
      severity: "critical",
      title: "Kârlılık kritik seviyede",
      message:
        profitAmount < 0
          ? `${job.musteriAdi || "Müşteri"} işinde maliyet satış fiyatını geçti.`
          : `${job.musteriAdi || "Müşteri"} işinde kâr marjı %10 altında.`,
      jobId: job.id,
      customerName: job.musteriAdi || null,
      costAmount: Math.abs(profitAmount),
      url: jobUrl(job.id),
      evidence: {
        sale,
        cost,
        profitAmount,
        profitPercent,
        operationalFireCost: n(job.operasyonelFireMaliyeti),
        productName: job.urunAdi,
      },
      createdAt: iso(job.updatedAt),
    });
  }

  for (const reservation of activeReservations) {
    const job = reservation.isId ? jobMap.get(reservation.isId) : null;
    const plate = stockPlateMap.get(reservation.stockPlateId);
    const ageDays = Math.floor((Date.now() - reservation.updatedAt.getTime()) / 86_400_000);
    const state = job ? imalatState(job) : null;
    if (state?.isCompleted) continue;
    const title = state?.activeExecution ? "Üretimde bekleyen rezerve plaka" : "Rezerve plaka üretime alınmadı";
    const message = state?.activeExecution
      ? `${plate?.plateCode || "Stok plakası"} imalatta ${ageDays} gündür aktif rezervasyonda.`
      : `${plate?.plateCode || "Stok plakası"} ${ageDays} gündür aktif rezervasyonda, imalat başlamamış görünüyor.`;
    risks.push({
      id: `unconsumed_active_reservation_${reservation.id}`,
      type: "UNCONSUMED_ACTIVE_RESERVATION",
      severity: "high",
      title,
      message,
      jobId: reservation.isId,
      customerName: job?.musteriAdi ?? null,
      costAmount: null,
      url: jobUrl(reservation.isId),
      evidence: {
        reservationId: reservation.id,
        stockPlateId: reservation.stockPlateId,
        plateCode: plate?.plateCode ?? null,
        productName: plate?.productName ?? job?.urunAdi ?? null,
        reservationAgeDays: ageDays,
        imalatStarted: state?.hasStarted ?? false,
        imalatActive: Boolean(state?.activeExecution),
      },
      createdAt: iso(reservation.updatedAt),
    });
  }

  for (const reservation of consumedReservations) {
    const job = reservation.isId ? jobMap.get(reservation.isId) : null;
    if (!job || isJobCompleted(job)) continue;
    const plate = stockPlateMap.get(reservation.stockPlateId);
    const consumedAt = reservation.consumedAt ?? reservation.updatedAt;
    const ageDays = Math.floor((Date.now() - consumedAt.getTime()) / 86_400_000);
    risks.push({
      id: `consumed_job_not_completed_${reservation.id}`,
      type: "CONSUMED_JOB_NOT_COMPLETED",
      severity: "high",
      title: "Malzeme tüketildi, iş kapanmadı",
      message: `${plate?.plateCode || "Stok plakası"} kesimde tüketildi ancak iş kapanmış görünmüyor.`,
      jobId: reservation.isId,
      customerName: job.musteriAdi || null,
      costAmount: null,
      url: jobUrl(reservation.isId),
      evidence: {
        reservationId: reservation.id,
        stockPlateId: reservation.stockPlateId,
        plateCode: plate?.plateCode ?? null,
        productName: plate?.productName ?? job.urunAdi ?? null,
        consumedAgeDays: ageDays,
        jobStatus: job.durum,
      },
      createdAt: iso(consumedAt),
    });
  }

  return risks.sort(riskSort).slice(0, limit);
}
