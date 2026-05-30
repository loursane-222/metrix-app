import { prisma } from "@/lib/prisma";

export type ScheduleRiskSeverity = "critical" | "high" | "medium" | "watch";

export type ScheduleRiskType =
  | "STONE_BROKEN_IN_CUTTING"
  | "MULTIPLE_FIRE_ON_JOB"
  | "CRITICAL_PROFITABILITY"
  | "UNCONSUMED_ACTIVE_RESERVATION"
  | "CONSUMED_JOB_NOT_COMPLETED";

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

function isJobCompleted(job: { durum?: string | null; workSchedule?: { phases?: Array<{ phase: string; isCompleted: boolean }> } | null }) {
  if (job.durum === "montaj_tamamlandi") return true;
  return job.workSchedule?.phases?.some((phase) => phase.phase === "MONTAJ" && phase.isCompleted) ?? false;
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
              select: { phases: { select: { phase: true, isCompleted: true } } },
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
        fireType: record.fireType,
        reasonCode: record.reasonCode,
        status: record.status,
        productName: job?.urunAdi ?? null,
      },
      createdAt: iso(record.createdAt),
    });
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
    risks.push({
      id: `unconsumed_active_reservation_${reservation.id}`,
      type: "UNCONSUMED_ACTIVE_RESERVATION",
      severity: "high",
      title: "Rezerve plaka tüketilmedi",
      message: `${plate?.plateCode || "Stok plakası"} ${ageDays} gündür aktif rezervasyonda.`,
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
      title: "Plaka tüketildi, iş tamamlanmadı",
      message: `${plate?.plateCode || "Stok plakası"} tüketildi ancak iş tamamlanmış görünmüyor.`,
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
