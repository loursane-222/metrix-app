import type { PhaseExecutionStatus } from "@prisma/client"
import { prisma } from "@/lib/prisma"

const ACTIVE_STATUSES: PhaseExecutionStatus[] = [
  "PLANNED",
  "STARTED",
  "PAUSED",
  "CANNOT_START",
]

const TERMINAL_STATUSES: PhaseExecutionStatus[] = ["COMPLETED", "CANCELLED"]

// PhaseExecutionEvent'te Personel relation tanımlı değil.
// personelId'leri toplu çekip event'lere merge ediyoruz (1 ekstra sorgu, N+1 yok).
async function attachActorNames<T extends { personelId: string | null }>(
  events: T[],
): Promise<(T & { personel: { ad: string; soyad: string } | null })[]> {
  const ids = [...new Set(events.map((e) => e.personelId).filter((id): id is string => !!id))]

  if (ids.length === 0) {
    return events.map((e) => ({ ...e, personel: null }))
  }

  const rows = await prisma.personel.findMany({
    where: { id: { in: ids } },
    select: { id: true, ad: true, soyad: true },
  })

  const byId = Object.fromEntries(rows.map((r) => [r.id, { ad: r.ad, soyad: r.soyad }]))

  return events.map((e) => ({
    ...e,
    personel: e.personelId ? (byId[e.personelId] ?? null) : null,
  }))
}

async function withEvents<T extends { id: string }>(
  execution: T | null,
): Promise<(T & { events: Awaited<ReturnType<typeof attachActorNames>>[number][] }) | null> {
  if (!execution) return null

  const rawEvents = await prisma.phaseExecutionEvent.findMany({
    where: { phaseExecutionId: execution.id },
    orderBy: { createdAt: "asc" },
  })

  const events = await attachActorNames(rawEvents)
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
