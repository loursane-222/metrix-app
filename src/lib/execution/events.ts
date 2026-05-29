import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

const ACTIVE_STATUSES = ["PLANNED", "STARTED", "PAUSED", "CANNOT_START"] as const;
const TERMINAL_STATUSES = ["COMPLETED", "CANCELLED"] as const;

type ActorAuditInput = {
  personelId?: string | null;
  userId?: string | null;
};

type AppendExecutionTimelineEventInput = ActorAuditInput & {
  schedulePhaseId: string;
  atolyeId: string;
  operationStep?: string | null;
  eventType: string;
  note?: string | null;
  metadata?: Prisma.InputJsonValue | null;
  reasonCode?: string | null;
  costType?: string | null;
  costAmount?: number | string | null;
  currency?: string | null;
  attachmentUrl?: string | null;
  attachmentType?: string | null;
};

export function buildActorAuditFields({ personelId, userId }: ActorAuditInput) {
  if (personelId) {
    return {
      actorType: "PERSONEL",
      actorPersonelId: personelId,
      actorUserId: null,
    };
  }

  if (userId) {
    return {
      actorType: "USER",
      actorPersonelId: null,
      actorUserId: userId,
    };
  }

  return {
    actorType: "SYSTEM",
    actorPersonelId: null,
    actorUserId: null,
  };
}

export function operationStepForPhase(phase?: string | null) {
  if (phase === "OLCU") return "OLCU";
  if (phase === "MONTAJ") return "MONTAJ";
  return "DIGER";
}

export async function resolveActiveExecutionForPhase(
  schedulePhaseId: string,
  atolyeId: string,
) {
  const active = await prisma.phaseExecution.findFirst({
    where: { schedulePhaseId, atolyeId, status: { in: [...ACTIVE_STATUSES] } },
    orderBy: { createdAt: "desc" },
    include: { schedulePhase: { select: { phase: true } } },
  });

  if (active) return active;

  return prisma.phaseExecution.findFirst({
    where: { schedulePhaseId, atolyeId, status: { in: [...TERMINAL_STATUSES] } },
    orderBy: { createdAt: "desc" },
    include: { schedulePhase: { select: { phase: true } } },
  });
}

export async function appendExecutionTimelineEvent(input: AppendExecutionTimelineEventInput) {
  const execution = await resolveActiveExecutionForPhase(input.schedulePhaseId, input.atolyeId);
  if (!execution) return null;

  return prisma.phaseExecutionEvent.create({
    data: {
      phaseExecutionId: execution.id,
      schedulePhaseId: input.schedulePhaseId,
      personelId: input.personelId ?? null,
      atolyeId: input.atolyeId,
      eventType: input.eventType,
      note: input.note ?? null,
      metadata: input.metadata ?? undefined,
      ...buildActorAuditFields({ personelId: input.personelId, userId: input.userId }),
      operationStep: input.operationStep ?? operationStepForPhase(execution.schedulePhase?.phase),
      reasonCode: input.reasonCode ?? null,
      costType: input.costType ?? null,
      costAmount: input.costAmount ?? null,
      currency: input.currency ?? null,
      attachmentUrl: input.attachmentUrl ?? null,
      attachmentType: input.attachmentType ?? null,
    },
  });
}
