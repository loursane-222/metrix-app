import { NextRequest, NextResponse } from "next/server"
import { getAtolyeAuth } from "@/lib/getAtolyeId"
import { prisma } from "@/lib/prisma"
import { transitionExecution, ExecutionError } from "@/lib/execution/service"
import type { PhaseExecutionStatus } from "@prisma/client"

// Prisma enum değerlerinin whitelist'i — runtime validation için
const VALID_STATUSES = new Set<string>([
  "PLANNED",
  "STARTED",
  "PAUSED",
  "CANNOT_START",
  "COMPLETED",
  "CANCELLED",
  "RESCHEDULE_REQUESTED",
])

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await getAtolyeAuth()
    if (!auth?.atolyeId) {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })
    }

    const { id: executionId } = await params
    if (!executionId) {
      return NextResponse.json({ error: "Execution id gerekli" }, { status: 400 })
    }

    const body = await req.json()
    const toStatusRaw = String(body.toStatus || "")

    if (!VALID_STATUSES.has(toStatusRaw)) {
      return NextResponse.json(
        { error: `Geçersiz toStatus: ${toStatusRaw}` },
        { status: 400 },
      )
    }

    // Sahiplik doğrulaması — service içinde de yapılır ama erken fail daha net hata verir
    const existing = await prisma.phaseExecution.findUnique({
      where: { id: executionId },
      select: { atolyeId: true },
    })
    if (!existing) {
      return NextResponse.json({ error: "Execution bulunamadı" }, { status: 404 })
    }
    if (existing.atolyeId !== auth.atolyeId) {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 403 })
    }

    const personelId: string | null =
      body.personelId ? String(body.personelId) : (auth.personelId ?? null)

    const updated = await transitionExecution({
      executionId,
      atolyeId: auth.atolyeId,
      toStatus: toStatusRaw as PhaseExecutionStatus,
      personelId,
      note: body.note ? String(body.note) : null,
      cannotStartReason: body.cannotStartReason ? String(body.cannotStartReason) : null,
      failureDescription: body.failureDescription ? String(body.failureDescription) : null,
      materialLossCost: body.materialLossCost != null ? Number(body.materialLossCost) : null,
      mtul: body.mtul != null ? Number(body.mtul) : null,
    })

    return NextResponse.json({ ok: true, execution: updated })
  } catch (e: any) {
    if (e instanceof ExecutionError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode })
    }
    console.error(e)
    return NextResponse.json({ error: "Transition başarısız" }, { status: 500 })
  }
}
