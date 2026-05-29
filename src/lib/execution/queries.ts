import type { PhaseExecutionStatus } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { mapTimelineEvents } from "./timeline-dto"

const ACTIVE_STATUSES: PhaseExecutionStatus[] = [
  "PLANNED",
  "STARTED",
  "PAUSED",
  "CANNOT_START",
]

const TERMINAL_STATUSES: PhaseExecutionStatus[] = ["COMPLETED", "CANCELLED"]

async function withEvents<T extends { id: string }>(
  execution: T | null,
): Promise<(T & { events: ReturnType<typeof mapTimelineEvents> }) | null> {
  if (!execution) return null

  const rawEvents = await prisma.phaseExecutionEvent.findMany({
    where: { phaseExecutionId: execution.id },
    orderBy: { createdAt: "asc" },
  })

  const personelIds = [
    ...new Set(
      rawEvents
        .flatMap((event) => [event.personelId, event.actorPersonelId])
        .filter((id): id is string => !!id),
    ),
  ]
  const userIds = [
    ...new Set(rawEvents.map((event) => event.actorUserId).filter((id): id is string => !!id)),
  ]

  const [personeller, users] = await Promise.all([
    personelIds.length > 0
      ? prisma.personel.findMany({
          where: { id: { in: personelIds } },
          select: { id: true, ad: true, soyad: true },
        })
      : Promise.resolve([]),
    userIds.length > 0
      ? prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, ad: true },
        })
      : Promise.resolve([]),
  ])

  const events = mapTimelineEvents(rawEvents, {
    personelById: Object.fromEntries(personeller.map((p) => [p.id, { ad: p.ad, soyad: p.soyad }])),
    userById: Object.fromEntries(users.map((u) => [u.id, { ad: u.ad }])),
  })
  return { ...execution, events }
}

// Önce non-terminal (active) execution aranır.
// Yoksa en son terminal execution döner.
// Hiç yoksa null.
export async function getCurrentExecutionForPhase(schedulePhaseId: string, atolyeId: string) {
  const active = await prisma.phaseExecution.findFirst({
    where: { schedulePhaseId, atolyeId, status: { in: ACTIVE_STATUSES } },
    orderBy: { createdAt: "desc" },
  })
  if (active) return withEvents(active)

  const terminal = await prisma.phaseExecution.findFirst({
    where: { schedulePhaseId, atolyeId, status: { in: TERMINAL_STATUSES } },
    orderBy: { createdAt: "desc" },
  })
  return withEvents(terminal)
}
