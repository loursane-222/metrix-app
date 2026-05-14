import { PhaseExecutionStatus } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { canTransition, eventTypeForTransition } from "./transitions"

// ─── Public error ─────────────────────────────────────────────────────────────

export class ExecutionError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message)
    this.name = "ExecutionError"
  }
}

// ─── Input types ──────────────────────────────────────────────────────────────

export interface CreateExecutionInput {
  schedulePhaseId: string
  atolyeId: string
  personelId?: string | null
  plannedStartAt?: Date | null
  plannedEndAt?: Date | null
  estimatedMinutes?: number | null
  note?: string | null
}

export interface TransitionInput {
  executionId: string
  atolyeId: string           // ownership re-check burada da yapılır
  toStatus: PhaseExecutionStatus
  personelId?: string | null
  note?: string | null
  cannotStartReason?: string | null
  mtul?: number | null
}

// ─── createExecution ──────────────────────────────────────────────────────────
// Her zaman PLANNED durumunda başlar.
// Tek personel owner şu an; schema multi-staff'a kapalı değil.

const ACTIVE_STATUSES: PhaseExecutionStatus[] = [
  "PLANNED",
  "STARTED",
  "PAUSED",
  "CANNOT_START",
]

export async function createExecution(input: CreateExecutionInput) {
  const {
    schedulePhaseId,
    atolyeId,
    personelId,
    plannedStartAt,
    plannedEndAt,
    estimatedMinutes,
    note,
  } = input

  // Aynı faz için zaten aktif bir execution varsa yeni kayıt açma.
  // Transaction içinde: check + create atomik — race condition guard.
  const execution = await prisma.$transaction(async (tx) => {
    const existing = await tx.phaseExecution.findFirst({
      where: { schedulePhaseId, atolyeId, status: { in: ACTIVE_STATUSES } },
    })
    if (existing) {
      throw new ExecutionError(
        "Bu faz için zaten aktif bir operasyon kaydı var",
        409,
      )
    }

    return tx.phaseExecution.create({
      data: {
        schedulePhaseId,
        atolyeId,
        personelId: personelId ?? null,
        status: "PLANNED",
        plannedStartAt: plannedStartAt ?? null,
        plannedEndAt: plannedEndAt ?? null,
        estimatedMinutes: estimatedMinutes ?? null,
      },
    })
  })

  // CREATED event — immutable log başlangıcı (transaction dışı, ok)
  await prisma.phaseExecutionEvent.create({
    data: {
      phaseExecutionId: execution.id,
      schedulePhaseId,
      personelId: personelId ?? null,
      atolyeId,
      eventType: "CREATED",
      note: note ?? null,
    },
  })

  return execution
}

// ─── transitionExecution ──────────────────────────────────────────────────────
// Tüm status geçişleri buradan geçer.
// Event log immutable — update/delete yok, sadece append.

export async function transitionExecution(input: TransitionInput) {
  const {
    executionId,
    atolyeId,
    toStatus,
    personelId,
    note,
    cannotStartReason,
    mtul,
  } = input

  const execution = await prisma.phaseExecution.findUnique({
    where: { id: executionId },
  })

  if (!execution) throw new ExecutionError("Execution bulunamadı", 404)
  if (execution.atolyeId !== atolyeId) throw new ExecutionError("Yetkisiz", 403)

  if (!canTransition(execution.status, toStatus)) {
    throw new ExecutionError(
      `${execution.status} → ${toStatus} geçişine izin verilmiyor`,
      400,
    )
  }

  const now = new Date()

  // ── Status'a göre alan güncellemeleri ────────────────────────────────────
  const update: Record<string, unknown> = { status: toStatus }

  switch (toStatus) {
    case "STARTED":
      // İlk başlatma — PAUSED'dan RESUMED da aynı path'e gelir ama
      // actualStartedAt sıfırlanmaz (ilk anı korur).
      if (!execution.actualStartedAt) {
        update.actualStartedAt = now
      }
      break

    case "COMPLETED":
      update.actualEndedAt = now
      // actualMinutes: cache alanı, source-of-truth değil.
      // event'lerden recompute edilebilir; şimdilik basit hesap.
      if (execution.actualStartedAt) {
        const elapsedMs = now.getTime() - execution.actualStartedAt.getTime()
        const elapsedMin = Math.round(elapsedMs / 60_000)
        const pauseMin = execution.pauseMinutes ?? 0
        update.actualMinutes = Math.max(0, elapsedMin - pauseMin)
      }
      if (mtul != null) update.mtul = mtul
      break

    case "CANNOT_START":
      if (cannotStartReason) update.cannotStartReason = cannotStartReason
      break

    case "PAUSED":
    case "CANCELLED":
      break
  }

  const eventType = eventTypeForTransition(execution.status, toStatus)
  const fromStatus = execution.status // optimistic lock için snapshot

  // ── Atomic: optimistic lock + immutable event append ─────────────────────
  // updateMany ile { id, status: fromStatus } — eşzamanlı başka bir PATCH
  // status'u değiştirdiyse count === 0 gelir ve 409 fırlatılır.
  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.phaseExecution.updateMany({
      where: { id: executionId, status: fromStatus },
      data: update,
    })

    if (result.count === 0) {
      throw new ExecutionError(
        "Eşzamanlı güncelleme çakışması, lütfen tekrar deneyin",
        409,
      )
    }

    await tx.phaseExecutionEvent.create({
      data: {
        phaseExecutionId: executionId,
        schedulePhaseId: execution.schedulePhaseId,
        personelId: personelId ?? null,
        atolyeId,
        eventType,
        note: note ?? null,
        metadata:
          toStatus === "CANNOT_START" && cannotStartReason
            ? { cannotStartReason }
            : undefined,
      },
    })

    return tx.phaseExecution.findUniqueOrThrow({ where: { id: executionId } })
  })

  return updated
}
