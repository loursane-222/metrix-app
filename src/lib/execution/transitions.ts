import type { PhaseExecutionStatus } from "@prisma/client"

// ─── Transition matrix ────────────────────────────────────────────────────────
// COMPLETED ve CANCELLED terminal state — çıkış yok.
// RESCHEDULE_REQUESTED şu an kullanılmıyor; ileride eklenir.

export const ALLOWED_TRANSITIONS: Record<PhaseExecutionStatus, PhaseExecutionStatus[]> = {
  PLANNED:              ["STARTED", "CANNOT_START", "CANCELLED"],
  STARTED:              ["PAUSED", "COMPLETED", "CANNOT_START"],
  PAUSED:               ["STARTED", "COMPLETED", "CANCELLED"],
  CANNOT_START:         ["STARTED", "CANCELLED"],
  COMPLETED:            [],
  CANCELLED:            [],
  RESCHEDULE_REQUESTED: [],
}

export function canTransition(
  from: PhaseExecutionStatus,
  to: PhaseExecutionStatus,
): boolean {
  return (ALLOWED_TRANSITIONS[from] ?? []).includes(to)
}

// PAUSED → STARTED geçişi bir RESUMED event'i tetikler (farklı event type, aynı status).
// CANNOT_START → STARTED ilk gerçek başlangıç gibi davranır (STARTED event).
export function eventTypeForTransition(
  from: PhaseExecutionStatus,
  to: PhaseExecutionStatus,
): string {
  if (to === "STARTED" && from === "PAUSED") return "RESUMED"
  return to
}
