import type { PhaseExecutionStatus } from "@prisma/client"
import { prisma } from "@/lib/prisma"

const ACTIVE_STATUSES: PhaseExecutionStatus[] = [
  "PLANNED",
  "STARTED",
  "PAUSED",
  "CANNOT_START",
]

const TERMINAL_STATUSES: PhaseExecutionStatus[] = ["COMPLETED", "CANCELLED"]

// Önce non-terminal (active) execution aranır.
// Yoksa en son terminal execution döner.
// Hiç yoksa null.
export async function getCurrentExecutionForPhase(schedulePhaseId: string, atolyeId: string) {
  const active = await prisma.phaseExecution.findFirst({
    where: { schedulePhaseId, atolyeId, status: { in: ACTIVE_STATUSES } },
    orderBy: { createdAt: "desc" },
  })
  if (active) return active

  return prisma.phaseExecution.findFirst({
    where: { schedulePhaseId, atolyeId, status: { in: TERMINAL_STATUSES } },
    orderBy: { createdAt: "desc" },
  })
}
