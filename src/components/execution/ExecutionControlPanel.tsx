"use client"

import { useEffect, useState } from "react"
import ExecutionTimeline from "./ExecutionTimeline"
import { useExecution, TERMINAL_STATUSES } from "@/hooks/useExecution"

// Re-export shared types so existing consumers don't need to change imports
export type { ExecutionStatus, ExecutionData } from "@/hooks/useExecution"

// ─── Props ────────────────────────────────────────────────────────────────────

import type { ExecutionData } from "@/hooks/useExecution"

export interface ExecutionControlPanelProps {
  schedulePhaseId: string
  phaseType?: "OLCU" | "IMALAT" | "MONTAJ"
  readOnly?: boolean
  completedAt?: string | Date | null
  onTransitionSuccess?: (execution: ExecutionData) => void
}

// ─── Constants ────────────────────────────────────────────────────────────────

import type { ExecutionStatus } from "@/hooks/useExecution"

const STATUS_META: Record<ExecutionStatus, { label: string; badge: string }> = {
  PLANNED:              { label: "Planlandı",             badge: "border-slate-700 bg-slate-800/50 text-slate-300" },
  STARTED:              { label: "Çalışıyor",             badge: "border-emerald-500/40 bg-emerald-500/15 text-emerald-300" },
  PAUSED:               { label: "Duraklatıldı",          badge: "border-amber-500/40 bg-amber-500/15 text-amber-300" },
  CANNOT_START:         { label: "Başlanamadı",           badge: "border-red-500/40 bg-red-500/15 text-red-300" },
  COMPLETED:            { label: "Tamamlandı",            badge: "border-blue-500/40 bg-blue-500/15 text-blue-300" },
  CANCELLED:            { label: "İptal Edildi",          badge: "border-zinc-700 bg-zinc-800/50 text-zinc-400" },
  RESCHEDULE_REQUESTED: { label: "Yeniden Planlanacak",   badge: "border-purple-500/40 bg-purple-500/15 text-purple-300" },
}

interface FailureReason {
  value: string
  label: string
  requiresDetail?: boolean
  phaseScope?: string[]
}

const FAILURE_REASONS: FailureReason[] = [
  { value: "CUSTOMER_NOT_READY",      label: "Müşteri hazır değil" },
  { value: "MATERIAL_MISSING",        label: "Malzeme eksik" },
  { value: "MEASUREMENT_MISSING",     label: "Ölçü eksik" },
  { value: "MACHINE_BUSY",            label: "Makine meşgul" },
  { value: "PERSONNEL_UNAVAILABLE",   label: "Personel yok" },
  { value: "SITE_NOT_READY",          label: "Saha hazır değil" },
  {
    value: "STONE_BROKEN_IN_CUTTING",
    label: "Kesimde taş kırıldı",
    requiresDetail: true,
    phaseScope: ["IMALAT"],
  },
  { value: "OTHER",                   label: "Diğer" },
]

function getReasonsForPhase(phaseType?: string): FailureReason[] {
  return FAILURE_REASONS.filter(
    (r) => !r.phaseScope || (phaseType && r.phaseScope.includes(phaseType)),
  )
}

const PHASE_LABELS: Record<string, string> = {
  OLCU: "Ölçü", IMALAT: "İmalat", MONTAJ: "Montaj",
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Spinner({ color = "border-white" }: { color?: string }) {
  return (
    <span className={`h-4 w-4 animate-spin rounded-full border-2 border-t-transparent ${color}`} />
  )
}

function ActionBtn({
  onClick,
  disabled,
  loading,
  label,
  loadingLabel = "İşleniyor...",
  variant,
}: {
  onClick: () => void
  disabled?: boolean
  loading?: boolean
  label: string
  loadingLabel?: string
  variant: "emerald" | "amber" | "blue" | "red" | "ghost"
}) {
  const base = "flex min-h-[52px] w-full items-center justify-center rounded-2xl px-5 font-bold transition disabled:opacity-50"
  const styles: Record<string, string> = {
    emerald: "bg-emerald-600 text-white hover:bg-emerald-500",
    amber:   "border border-amber-500/30 bg-amber-500/15 text-amber-300 hover:bg-amber-500/25",
    blue:    "bg-blue-600 text-white hover:bg-blue-500",
    red:     "border border-red-500/25 bg-red-500/10 text-red-400 hover:bg-red-500/20 min-h-[44px]",
    ghost:   "border border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]",
  }

  return (
    <button onClick={onClick} disabled={disabled || loading} className={`${base} ${styles[variant]}`}>
      {loading ? (
        <span className="flex items-center gap-2">
          <Spinner color={variant === "amber" ? "border-amber-300" : "border-white"} />
          {loadingLabel}
        </span>
      ) : label}
    </button>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ExecutionControlPanel({
  schedulePhaseId,
  phaseType,
  readOnly = false,
  completedAt,
  onTransitionSuccess,
}: ExecutionControlPanelProps) {
  // ── Execution state via hook ───────────────────────────────────────────────
  const {
    execution,
    fetching,
    loading,
    error,
    conflict,
    refetch,
    handleBasla,
    handleTransition,
    handleCannotStart: execHandleCannotStart,
  } = useExecution({ schedulePhaseId, onTransitionSuccess })

  // ── UI-only state (reason picker + timeline collapse) ─────────────────────
  const [showReasonPicker, setShowReasonPicker]     = useState(false)
  const [cannotReason, setCannotReason]             = useState("")
  const [failureDescription, setFailureDescription] = useState("")
  const [materialLossCost, setMaterialLossCost]     = useState("")
  const [timelineOpen, setTimelineOpen]             = useState(false)

  // Terminal durumlarda timeline default açık
  useEffect(() => {
    if (execution) {
      setTimelineOpen(TERMINAL_STATUSES.includes(execution.status))
    }
  }, [execution?.status])

  // ── CANNOT_START: UI validation + reset, then delegate to hook ────────────
  async function handleCannotStart() {
    if (!cannotReason) return
    const meta = FAILURE_REASONS.find((r) => r.value === cannotReason)
    if (meta?.requiresDetail && (!materialLossCost || Number(materialLossCost) < 0)) return
    setShowReasonPicker(false)
    await execHandleCannotStart({
      cannotReason,
      ...(meta?.requiresDetail ? {
        failureDescription: failureDescription || undefined,
        materialLossCost: Number(materialLossCost),
      } : {}),
    })
    setCannotReason("")
    setFailureDescription("")
    setMaterialLossCost("")
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const status     = execution?.status ?? null
  const isTerminal = status !== null && TERMINAL_STATUSES.includes(status)
  const phaseLabel = phaseType ? PHASE_LABELS[phaseType] ?? phaseType : "Aşama"

  const visibleReasons      = getReasonsForPhase(phaseType)
  const selectedReasonMeta  = FAILURE_REASONS.find((r) => r.value === cannotReason)
  const needsDetail         = selectedReasonMeta?.requiresDetail ?? false
  const detailValid         = !needsDetail || (materialLossCost !== "" && Number(materialLossCost) >= 0)

  // İlk yükleme
  if (fetching) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-5">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Spinner color="border-slate-600" />
          Operasyon durumu yükleniyor...
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">

      {/* Header: faz etiketi + status badge */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
          {phaseLabel} Operasyonu
        </p>
        {status && (
          <span className={`rounded-full border px-3 py-1 text-xs font-bold ${STATUS_META[status].badge}`}>
            {STATUS_META[status].label}
          </span>
        )}
      </div>

      {/* Conflict banner — 409 sonrası */}
      {conflict && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
          <p className="text-sm text-amber-300">Durum başkası tarafından değiştirildi</p>
          <button
            onClick={refetch}
            className="rounded-xl bg-amber-500/20 px-3 py-1.5 text-xs font-bold text-amber-300 transition hover:bg-amber-500/30"
          >
            Yenile
          </button>
        </div>
      )}

      {/* Error banner */}
      {error && !conflict && (
        <div className="mb-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Başlanamadı — reason picker */}
      {showReasonPicker && (
        <div className="mb-2 space-y-3">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Başlanamama Nedeni</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {visibleReasons.map((r) => (
              <button
                key={r.value}
                onClick={() => { setCannotReason(r.value); setFailureDescription(""); setMaterialLossCost("") }}
                className={[
                  "rounded-2xl border px-3 py-2.5 text-left text-sm transition",
                  cannotReason === r.value
                    ? "border-red-500/50 bg-red-500/15 text-red-300"
                    : "border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.06]",
                ].join(" ")}
              >
                {r.label}
              </button>
            ))}
          </div>

          {/* Taş kırıldı — detay alanları */}
          {needsDetail && (
            <div className="space-y-3 rounded-2xl border border-red-500/20 bg-red-500/5 p-4">
              <div>
                <label className="mb-1.5 block text-xs font-bold text-red-300/80">
                  Açıklama
                </label>
                <textarea
                  value={failureDescription}
                  onChange={(e) => setFailureDescription(e.target.value)}
                  rows={3}
                  placeholder={"Köşe kırıldı\nDamar dağıldı\nOperatör hatası\nTaşıma sırasında çatladı"}
                  className="w-full resize-none rounded-2xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold text-red-300/80">
                  Maliyet Etkisi (TL) <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={materialLossCost}
                    onChange={(e) => setMaterialLossCost(e.target.value)}
                    placeholder="0"
                    className="w-full rounded-2xl border border-white/10 bg-black/30 px-3 py-2.5 pr-10 text-sm text-white outline-none placeholder:text-slate-600"
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">
                    ₺
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <ActionBtn
              label="Vazgeç"
              variant="ghost"
              onClick={() => {
                setShowReasonPicker(false)
                setCannotReason("")
                setFailureDescription("")
                setMaterialLossCost("")
              }}
            />
            <ActionBtn
              label="Başlanamadı Olarak İşaretle"
              loadingLabel="Kaydediliyor..."
              variant="red"
              loading={loading}
              disabled={!cannotReason || !detailValid}
              onClick={handleCannotStart}
            />
          </div>
        </div>
      )}

      {/* Terminal state: salt okunur bilgi */}
      {isTerminal && !showReasonPicker && (
        <p className="text-sm text-slate-500">
          {status === "COMPLETED"
            ? execution?.actualMinutes != null
              ? `Toplam süre: ${execution.actualMinutes} dakika`
              : "Operasyon tamamlandı"
            : "Operasyon iptal edildi"}
        </p>
      )}

      {/* Read-only, no execution — manuel tamamlama fallback */}
      {readOnly && !status && !fetching && !showReasonPicker && (
        <div className="space-y-1.5 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
          <p className="text-sm font-bold text-slate-300">Manuel olarak tamamlandı</p>
          <p className="text-xs text-slate-500">Operasyon başlat/durdur kaydı bulunmuyor.</p>
          {completedAt && (
            <p className="text-xs text-slate-600">
              {new Date(completedAt).toLocaleString("tr-TR", {
                day: "numeric", month: "long", year: "numeric",
                hour: "2-digit", minute: "2-digit",
              })}
            </p>
          )}
        </div>
      )}

      {/* Action buttons — non-terminal, non-readonly, reason picker kapalı */}
      {!isTerminal && !readOnly && !showReasonPicker && (

        <div className="flex flex-col gap-2">

          {/* BAŞLA — null / PLANNED / CANNOT_START */}
          {(status === null || status === "PLANNED" || status === "CANNOT_START") && (
            <ActionBtn
              label={status === "CANNOT_START" ? "Yeniden Dene" : "Başla"}
              variant="emerald"
              loading={loading}
              onClick={handleBasla}
            />
          )}

          {/* DEVAM ET — PAUSED */}
          {status === "PAUSED" && (
            <ActionBtn
              label="Devam Et"
              variant="emerald"
              loading={loading}
              onClick={() => handleTransition("STARTED")}
            />
          )}

          {/* DURAKLAT — STARTED */}
          {status === "STARTED" && (
            <ActionBtn
              label="Duraklat"
              variant="amber"
              loading={loading}
              onClick={() => handleTransition("PAUSED")}
            />
          )}

          {/* TAMAMLA — STARTED */}
          {status === "STARTED" && (
            <ActionBtn
              label="Tamamla"
              variant="blue"
              loading={loading}
              onClick={() => handleTransition("COMPLETED")}
            />
          )}

          {/* BAŞLANAMADI — sadece execution varken: PLANNED / STARTED */}
          {(status === "PLANNED" || status === "STARTED") && (
            <ActionBtn
              label="Başlanamadı"
              variant="red"
              loading={loading}
              onClick={() => setShowReasonPicker(true)}
            />
          )}

        </div>
      )}

      {/* CANNOT_START reason display */}
      {status === "CANNOT_START" && execution?.cannotStartReason && !showReasonPicker && (
        <div className="mt-3 space-y-1.5 rounded-2xl border border-red-500/15 bg-red-500/5 px-4 py-3">
          <p className="text-xs font-bold text-red-300/80">
            {FAILURE_REASONS.find((r) => r.value === execution.cannotStartReason)?.label
              ?? execution.cannotStartReason}
          </p>
          {execution.failureDescription && (
            <p className="text-xs text-slate-400 leading-relaxed">{execution.failureDescription}</p>
          )}
          {execution.materialLossCost && (
            <p className="text-xs font-bold text-red-300">
              Maliyet etkisi: ₺{Number(execution.materialLossCost).toLocaleString("tr-TR")}
            </p>
          )}
        </div>
      )}

      {/* ── Operasyon Geçmişi ────────────────────────────────────────────────── */}
      {execution && (execution.events?.length ?? 0) > 0 && (
        <div className="mt-4 border-t border-white/[0.06] pt-4">
          <button
            onClick={() => setTimelineOpen((v) => !v)}
            className="flex w-full items-center justify-between gap-2 text-left"
          >
            <span className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
              Operasyon Geçmişi
            </span>
            <div className="flex items-center gap-2">
              <span className="rounded-full border border-white/10 bg-white/[0.05] px-2 py-0.5 text-[11px] font-bold text-slate-500">
                {execution.events?.length ?? 0}
              </span>
              <span
                className="text-slate-600 transition-transform duration-200"
                style={{ transform: timelineOpen ? "rotate(180deg)" : "rotate(0deg)" }}
              >
                ▾
              </span>
            </div>
          </button>

          <div
            className="overflow-hidden transition-all duration-200"
            style={{ maxHeight: timelineOpen ? 9999 : 0, opacity: timelineOpen ? 1 : 0 }}
          >
            <div className="pt-4">
              <ExecutionTimeline events={execution.events ?? []} />
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
