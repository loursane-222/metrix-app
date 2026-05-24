import { PhaseExecutionStatus } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { sseEmitter } from "@/lib/sseEmitter"
import { logActivity } from "@/lib/activityLogger"
import { canTransition, eventTypeForTransition } from "./transitions"

// ─── Elapsed time helper ──────────────────────────────────────────────────────
// Server-side hesap: actualStartedAt'den şimdiye kadar geçen süre,
// birikmiş pause dakikaları düşülmüş halde.
export function computeElapsedMinutes(
  actualStartedAt: Date | null | undefined,
  pauseMinutes: number | null | undefined,
): number {
  if (!actualStartedAt) return 0
  const elapsedMs = Date.now() - new Date(actualStartedAt).getTime()
  const pauseMs = (pauseMinutes ?? 0) * 60_000
  return Math.max(0, Math.round((elapsedMs - pauseMs) / 60_000))
}

// ─── Risk state helpers ───────────────────────────────────────────────────────

export type RiskState = "NO_PLAN" | "NORMAL" | "OVERRUN" | "CRITICAL" | "STALE"

export function computeRiskState(
  elapsedMinutes: number,
  expectedMinutes: number | null | undefined,
): RiskState {
  if (elapsedMinutes > 1440) return "STALE"
  if (!expectedMinutes || expectedMinutes <= 0) return "NO_PLAN"
  const ratio = elapsedMinutes / expectedMinutes
  if (ratio <= 1.0) return "NORMAL"
  if (ratio <= 1.25) return "OVERRUN"
  return "CRITICAL"
}

export function computeVariance(
  elapsedMinutes: number,
  expectedMinutes: number | null | undefined,
): number | null {
  if (!expectedMinutes || expectedMinutes <= 0) return null
  return elapsedMinutes - expectedMinutes
}

export function computeProgressRatio(
  elapsedMinutes: number,
  expectedMinutes: number | null | undefined,
): number | null {
  if (!expectedMinutes || expectedMinutes <= 0) return null
  return elapsedMinutes / expectedMinutes
}

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
  userId?: string | null
  note?: string | null
  cannotStartReason?: string | null
  failureDescription?: string | null
  materialLossCost?: number | null
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
    userId,
    note,
    cannotStartReason,
    failureDescription,
    materialLossCost,
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

  // ── Pause accumulation — BEFORE switch so COMPLETED sees the updated value ─
  // Runs whenever leaving PAUSED state (→ STARTED, COMPLETED, CANCELLED).
  let effectivePauseMinutes = execution.pauseMinutes ?? 0
  if (execution.status === "PAUSED") {
    const lastPause = await prisma.phaseExecutionEvent.findFirst({
      where: { phaseExecutionId: executionId, eventType: "PAUSED" },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    })
    if (lastPause) {
      effectivePauseMinutes += Math.max(
        0,
        Math.round((now.getTime() - lastPause.createdAt.getTime()) / 60_000),
      )
    }
  }

  // ── Status'a göre alan güncellemeleri ────────────────────────────────────
  const update: Record<string, unknown> = { status: toStatus }
  if (execution.status === "PAUSED") update.pauseMinutes = effectivePauseMinutes

  switch (toStatus) {
    case "STARTED":
      if (!execution.actualStartedAt) {
        update.actualStartedAt = now
      }
      break

    case "COMPLETED":
      update.actualEndedAt = now
      if (execution.actualStartedAt) {
        const elapsedMs = now.getTime() - execution.actualStartedAt.getTime()
        const elapsedMin = Math.round(elapsedMs / 60_000)
        update.actualMinutes = Math.max(0, elapsedMin - effectivePauseMinutes)
      }
      if (mtul != null) update.mtul = mtul
      break

    case "CANNOT_START":
      if (cannotStartReason) update.cannotStartReason = cannotStartReason
      if (failureDescription) update.failureDescription = failureDescription
      if (materialLossCost != null) update.materialLossCost = materialLossCost
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
          toStatus === "CANNOT_START"
            ? {
                ...(cannotStartReason ? { cannotStartReason } : {}),
                ...(failureDescription ? { failureDescription } : {}),
                ...(materialLossCost != null ? { materialLossCost } : {}),
              }
            : undefined,
      },
    })

    if (toStatus === "COMPLETED") {
      await tx.schedulePhase.update({
        where: { id: execution.schedulePhaseId },
        data: { isCompleted: true, completedAt: now, completedBy: personelId ?? null },
      })
      // MONTAJ tamamlandığında işi montaj_tamamlandi yap (togglePhaseCompletion ile tutarlı).
      const phaseInfo = await tx.schedulePhase.findUnique({
        where: { id: execution.schedulePhaseId },
        select: { phase: true, workSchedule: { select: { isId: true } } },
      })
      if (phaseInfo?.phase === "MONTAJ") {
        await tx.is.update({
          where: { id: phaseInfo.workSchedule.isId },
          data: { durum: "montaj_tamamlandi" },
        })
      }
    }

    return tx.phaseExecution.findUniqueOrThrow({ where: { id: executionId } })
  })

  // SSE execution_status — live-ops paneli invalidate eder (fire-and-forget).
  // Vercel multi-instance'da kayıp olabilir; polling fallback (10s) devreye girer.
  sseEmitter.emit(`activity:${atolyeId}`, {
    type: "execution_status",
    execId: executionId,
    phaseId: execution.schedulePhaseId,
    toStatus,
  })

  // Activity log — fire-and-forget.
  // ActivityLog DB + Notification + SSE(type=activity) → dashboard canlı akış + toast.
  void (async () => {
    try {
      const FAZ_LABEL: Record<string, string> = {
        IMALAT: "imalat", MONTAJ: "montaj", OLCU: "ölçü", TAS_ALINACAK: "taş alınacak",
      }
      const isResumed = toStatus === "STARTED" && fromStatus === "PAUSED"
      const actType = isResumed
        ? "execution_resumed"
        : `execution_${String(toStatus).toLowerCase()}`

      const [phaseCtx, actorName] = await Promise.all([
        prisma.schedulePhase.findUnique({
          where: { id: execution.schedulePhaseId },
          select: {
            phase: true,
            workSchedule: { select: { is: { select: { musteriAdi: true } } } },
          },
        }),
        personelId
          ? prisma.personel
              .findUnique({ where: { id: personelId }, select: { ad: true, soyad: true } })
              .then((p) => (p ? `${p.ad}${p.soyad ? " " + p.soyad : ""}`.trim() : null))
          : userId
          ? prisma.user
              .findUnique({ where: { id: userId }, select: { ad: true } })
              .then((u) => u?.ad || "Admin")
          : Promise.resolve(null),
      ])

      const fazLabel = FAZ_LABEL[phaseCtx?.phase ?? ""] ?? "faz"
      const musteriAdi = phaseCtx?.workSchedule?.is?.musteriAdi || "—"
      const actorLabel = actorName || "Atölye"

      const MSG: Record<string, string> = {
        execution_started:      `${actorLabel} — ${musteriAdi} ${fazLabel} fazını başlattı`,
        execution_resumed:      `${actorLabel} — ${musteriAdi} ${fazLabel} fazını devam ettirdi`,
        execution_paused:       `${actorLabel} — ${musteriAdi} ${fazLabel} fazını duraklattı`,
        execution_completed:    `${actorLabel} — ${musteriAdi} ${fazLabel} fazını tamamladı`,
        execution_cancelled:    `${actorLabel} — ${musteriAdi} ${fazLabel} fazı iptal edildi`,
        execution_cannot_start: `${actorLabel} — ${musteriAdi} ${fazLabel} fazı başlatılamadı`,
      }

      await logActivity({
        atolyeId,
        personelId: personelId ?? undefined,
        userId: userId ?? undefined,
        type: actType,
        message: MSG[actType] ?? `${actorLabel} — ${musteriAdi} ${fazLabel} durumu değişti`,
        refId: executionId,
      })
    } catch {
      // fire-and-forget — hata yutulur
    }
  })()

  return updated
}
