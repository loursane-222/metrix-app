import type { Prisma } from "@prisma/client";

type StoneJob = {
  tasDurumu?: string | null;
  stoneSource?: string | null;
};

export function isBusinessDay(date: Date) {
  const day = date.getDay();
  return day !== 0 && day !== 6;
}

export function subtractBusinessDays(start: Date, days: number) {
  const date = new Date(start);
  let remaining = days;

  while (remaining > 0) {
    date.setDate(date.getDate() - 1);
    if (isBusinessDay(date)) remaining--;
  }

  return date;
}

export function stonePurchasePhaseDate(olcuDate: Date | string | null | undefined) {
  if (!olcuDate) return null;
  const parsed = new Date(olcuDate);
  if (Number.isNaN(parsed.getTime())) return null;

  const date = subtractBusinessDays(parsed, 3);
  date.setHours(9, 0, 0, 0);
  return date;
}

export function shouldCreateStonePurchasePhase(job: StoneJob | null | undefined) {
  return job?.tasDurumu === "alinacak" || job?.stoneSource === "PURCHASE";
}

export async function syncStonePurchasePhaseForOlcu(
  tx: Prisma.TransactionClient,
  input: {
    workScheduleId: string;
    job: StoneJob | null | undefined;
    olcuPlannedStart: Date | string | null | undefined;
  },
) {
  if (!shouldCreateStonePurchasePhase(input.job)) return null;

  const plannedStart = stonePurchasePhaseDate(input.olcuPlannedStart);
  if (!plannedStart) return null;

  const existing = await tx.schedulePhase.findUnique({
    where: {
      workScheduleId_phase: {
        workScheduleId: input.workScheduleId,
        phase: "TAS_ALINACAK",
      },
    },
    select: { id: true, isOverridden: true },
  });

  if (existing?.isOverridden) return existing;

  if (existing) {
    return tx.schedulePhase.update({
      where: { id: existing.id },
      data: {
        plannedStart,
        plannedEnd: plannedStart,
      },
    });
  }

  return tx.schedulePhase.create({
    data: {
      workScheduleId: input.workScheduleId,
      phase: "TAS_ALINACAK",
      plannedStart,
      plannedEnd: plannedStart,
    },
  });
}
