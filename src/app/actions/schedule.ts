"use server";

import { revalidatePath } from "next/cache";
import { PrismaClient } from "@prisma/client";
import { PhaseType, PHASE_ORDER, canCompletePhase } from "@/lib/types/schedule";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export async function getSchedulesForMonth(year: number, month: number) {
  const startOfMonth = new Date(year, month - 1, 1);
  const endOfMonth = new Date(year, month, 0, 23, 59, 59);

  return prisma.workSchedule.findMany({
    where: {
      OR: [
        { startDate: { gte: startOfMonth, lte: endOfMonth } },
        { endDate: { gte: startOfMonth, lte: endOfMonth } },
        { startDate: { lte: startOfMonth }, endDate: { gte: endOfMonth } },
        {
          phases: {
            some: {
              OR: [
                { plannedStart: { gte: startOfMonth, lte: endOfMonth } },
                { plannedEnd: { gte: startOfMonth, lte: endOfMonth } },
              ],
            },
          },
        },
      ],
    },
    include: {
      is: {
        select: {
          id: true,
          teklifNo: true,
          musteriAdi: true,
          urunAdi: true,
        },
      },
      phases: { orderBy: { phase: "asc" } },
    },
    orderBy: { startDate: "asc" },
  });
}

export async function upsertWorkSchedule(data: {
  isId: string;
  startDate?: Date | null;
  endDate?: Date | null;
  notes?: string;
  phases?: Array<{
    phase: PhaseType;
    plannedStart?: Date | null;
    plannedEnd?: Date | null;
  }>;
}) {
  const schedule = await prisma.workSchedule.upsert({
    where: { isId: data.isId },
    create: {
      isId: data.isId,
      startDate: data.startDate,
      endDate: data.endDate,
      notes: data.notes,
      phases: {
        create: PHASE_ORDER.map((phase) => {
          const p = data.phases?.find((x) => x.phase === phase);
          return {
            phase,
            plannedStart: p?.plannedStart ?? null,
            plannedEnd: p?.plannedEnd ?? null,
          };
        }),
      },
    },
    update: {
      startDate: data.startDate,
      endDate: data.endDate,
      notes: data.notes,
    },
    include: { phases: true },
  });

  if (data.phases) {
    for (const phaseData of data.phases) {
      await prisma.schedulePhase.upsert({
        where: {
          workScheduleId_phase: {
            workScheduleId: schedule.id,
            phase: phaseData.phase,
          },
        },
        create: {
          workScheduleId: schedule.id,
          phase: phaseData.phase,
          plannedStart: phaseData.plannedStart ?? null,
          plannedEnd: phaseData.plannedEnd ?? null,
        },
        update: {
          plannedStart: phaseData.plannedStart ?? null,
          plannedEnd: phaseData.plannedEnd ?? null,
        },
      });
    }
  }

  revalidatePath("/dashboard/is-programi");
  return schedule;
}

export async function togglePhaseCompletion(data: {
  schedulePhaseId: string;
  isCompleted: boolean;
  completedBy?: string;
  overrideNote?: string;
}) {
  const phase = await prisma.schedulePhase.findUnique({
    where: { id: data.schedulePhaseId },
    include: {
      workSchedule: { include: { phases: true } },
    },
  });

  if (!phase) throw new Error("Aşama bulunamadı");

  if (data.isCompleted) {
    const check = canCompletePhase(phase.workSchedule.phases, phase.phase as PhaseType);
    if (!check.allowed && !data.overrideNote) {
      throw new Error(check.reason ?? "Bu aşama henüz işaretlenemez");
    }
  }

  const updated = await prisma.schedulePhase.update({
    where: { id: data.schedulePhaseId },
    data: {
      isCompleted: data.isCompleted,
      completedAt: data.isCompleted ? new Date() : null,
      completedBy: data.isCompleted ? (data.completedBy ?? null) : null,
      isOverridden: !!data.overrideNote,
      overrideNote: data.overrideNote ?? null,
    },
  });

  revalidatePath("/dashboard/is-programi");
  return updated;
}

export async function searchIsler(q: string) {
  if (q.length < 2) return [];
  return prisma.is.findMany({
    where: {
      OR: [
        { teklifNo: { contains: q, mode: "insensitive" } },
        { musteriAdi: { contains: q, mode: "insensitive" } },
        { urunAdi: { contains: q, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      teklifNo: true,
      musteriAdi: true,
      urunAdi: true,
    },
    take: 10,
    orderBy: { createdAt: "desc" },
  });
}
