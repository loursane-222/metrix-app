"use client"

import { useCallback, useEffect, useState } from "react"
import type { TimelineEvent } from "@/components/execution/ExecutionTimeline"

// ─── Shared types (ECP ve hook consumers tarafından import edilir) ─────────────

export type ExecutionStatus =
  | "PLANNED"
  | "STARTED"
  | "PAUSED"
  | "CANNOT_START"
  | "COMPLETED"
  | "CANCELLED"
  | "RESCHEDULE_REQUESTED"

export interface ExecutionData {
  id: string
  status: ExecutionStatus
  actualStartedAt: string | null
  actualEndedAt: string | null
  actualMinutes: number | null
  cannotStartReason: string | null
  failureDescription: string | null
  materialLossCost: string | null  // Decimal → JSON string
  estimatedMinutes: number | null
  events?: TimelineEvent[]
}

export const TERMINAL_STATUSES: ExecutionStatus[] = ["COMPLETED", "CANCELLED"]

// ─── Internal types ───────────────────────────────────────────────────────────

interface TransitionExtra {
  cannotStartReason?: string
  failureDescription?: string
  materialLossCost?: number
  mtul?: number
}

export interface CannotStartParams {
  cannotReason: string
  failureDescription?: string
  materialLossCost?: number
}

// ─── Hook return surface ──────────────────────────────────────────────────────

export interface UseExecutionReturn {
  execution: ExecutionData | null
  fetching: boolean
  loading: boolean
  error: string | null
  conflict: boolean
  refetch: () => Promise<void>
  handleBasla: () => Promise<void>
  handleTransition: (toStatus: ExecutionStatus, extra?: TransitionExtra) => Promise<void>
  handleCannotStart: (params: CannotStartParams) => Promise<void>
}

// ─── useExecution ─────────────────────────────────────────────────────────────

export function useExecution({
  schedulePhaseId,
  onTransitionSuccess,
}: {
  schedulePhaseId: string
  onTransitionSuccess?: (execution: ExecutionData) => void
}): UseExecutionReturn {
  const [execution, setExecution] = useState<ExecutionData | null>(null)
  const [fetching, setFetching]   = useState(true)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [conflict, setConflict]   = useState(false)

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const refetch = useCallback(async () => {
    setFetching(true)
    try {
      const res  = await fetch(
        `/api/schedule/execution?schedulePhaseId=${encodeURIComponent(schedulePhaseId)}`,
        { credentials: "include", cache: "no-store" },
      )
      const json = await res.json()
      if (res.ok) {
        setExecution(json.execution ?? null)
        setConflict(false)
        setError(null)
      }
    } catch {
      // silently ignore — consumer shows empty state
    } finally {
      setFetching(false)
    }
  }, [schedulePhaseId])

  useEffect(() => { refetch() }, [refetch])

  // ── Internal: PATCH wrapper ────────────────────────────────────────────────
  // 409 optimistic lock: refetch + conflict flag.
  // Non-409 errors: throw → caller handles.

  async function doTransition(
    execId: string,
    toStatus: ExecutionStatus,
    extra?: TransitionExtra,
  ): Promise<ExecutionData | null> {
    const res  = await fetch(`/api/schedule/execution/${execId}`, {
      method:      "PATCH",
      credentials: "include",
      headers:     { "Content-Type": "application/json" },
      body:        JSON.stringify({ toStatus, ...extra }),
    })
    const json = await res.json()

    if (res.status === 409) {
      await refetch()
      setConflict(true)
      return null
    }
    if (!res.ok) throw new Error(json.error || "İşlem başarısız")

    return json.execution as ExecutionData
  }

  // ── Internal: POST (execution yoksa oluştur) ───────────────────────────────

  async function ensureExecution(): Promise<string | null> {
    if (execution?.id) return execution.id

    const res  = await fetch("/api/schedule/execution", {
      method:      "POST",
      credentials: "include",
      headers:     { "Content-Type": "application/json" },
      body:        JSON.stringify({ schedulePhaseId }),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || "Görev kaydı oluşturulamadı")

    setExecution(json.execution)
    return json.execution.id as string
  }

  // ── handleBasla: POST (if needed) → PATCH STARTED ─────────────────────────

  async function handleBasla() {
    setLoading(true)
    setError(null)
    setConflict(false)

    try {
      const execId = await ensureExecution()
      if (!execId) return

      const updated = await doTransition(execId, "STARTED")
      if (updated) {
        setExecution(updated)
        onTransitionSuccess?.(updated)
      } else {
        // 409 — conflict; refetch already called inside doTransition
        setError("Görev oluşturuldu ama başlatılamadı — durum değişti")
      }
    } catch (e: any) {
      // POST veya PATCH başarısız — mevcut durumu yenile
      await refetch()
      setError(e.message || "Görev oluşturuldu ama başlatılamadı")
    } finally {
      setLoading(false)
    }
  }

  // ── handleTransition: herhangi bir status geçişi ───────────────────────────

  async function handleTransition(
    toStatus: ExecutionStatus,
    extra?: TransitionExtra,
  ) {
    if (!execution?.id) return
    setLoading(true)
    setError(null)
    setConflict(false)

    try {
      const updated = await doTransition(execution.id, toStatus, extra)
      if (updated) {
        setExecution(updated)
        onTransitionSuccess?.(updated)
      }
    } catch (e: any) {
      setError(e.message || "İşlem başarısız")
    } finally {
      setLoading(false)
    }
  }

  // ── handleCannotStart: CANNOT_START geçişi ────────────────────────────────
  // UI validation (requiresDetail check, reason picker state reset)
  // caller'da yapılır. Hook sadece geçişi gerçekleştirir.

  async function handleCannotStart({ cannotReason, failureDescription, materialLossCost }: CannotStartParams) {
    await handleTransition("CANNOT_START", {
      cannotStartReason: cannotReason,
      ...(failureDescription !== undefined ? { failureDescription } : {}),
      ...(materialLossCost   !== undefined ? { materialLossCost }   : {}),
    })
  }

  return {
    execution,
    fetching,
    loading,
    error,
    conflict,
    refetch,
    handleBasla,
    handleTransition,
    handleCannotStart,
  }
}
