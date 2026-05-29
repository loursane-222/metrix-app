"use client"

import dayjs from "dayjs"
import relativeTime from "dayjs/plugin/relativeTime"
import "dayjs/locale/tr"
import { DarkBadge, type BadgeTone } from "@/components/ui/DarkBadge"

dayjs.extend(relativeTime)
dayjs.locale("tr")

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TimelineEvent {
  id: string
  eventType: string
  note: string | null
  metadata: unknown
  createdAt: string | Date
  actor?: { type: string; id: string | null; name: string | null } | null
  personel?: { ad: string; soyad: string } | null
  operationStep?: string | null
  transition?: { from: string | null; to: string | null }
  reasonCode?: string | null
  cost?: { type: string | null; amount: string | number | null; currency: string | null } | null
  attachment?: { url: string | null; type: string | null } | null
}

// ─── Constants ────────────────────────────────────────────────────────────────

const FAILURE_REASON_LABELS: Record<string, string> = {
  CUSTOMER_NOT_READY:    "Müşteri hazır değil",
  MATERIAL_MISSING:      "Malzeme eksik",
  MEASUREMENT_MISSING:   "Ölçü eksik",
  MACHINE_BUSY:          "Makine meşgul",
  PERSONNEL_UNAVAILABLE: "Personel yok",
  SITE_NOT_READY:        "Saha hazır değil",
  STONE_BROKEN_IN_CUTTING: "Kesimde taş kırıldı",
  OTHER:                 "Diğer",
}

interface EventConfig {
  label: string
  dotColor: string
  lineColor: string
  textColor: string
  badgeTone: BadgeTone
}

const EVENT_CONFIG: Record<string, EventConfig> = {
  CREATED: {
    label:     "Operasyon oluşturuldu",
    dotColor:  "bg-slate-500",
    lineColor: "bg-slate-700",
    textColor: "text-slate-400",
    badgeTone: "slate",
  },
  STARTED: {
    label:     "Başladı",
    dotColor:  "bg-emerald-500",
    lineColor: "bg-emerald-900/60",
    textColor: "text-emerald-300",
    badgeTone: "emerald",
  },
  PAUSED: {
    label:     "Duraklatıldı",
    dotColor:  "bg-amber-500",
    lineColor: "bg-amber-900/60",
    textColor: "text-amber-300",
    badgeTone: "amber",
  },
  RESUMED: {
    label:     "Devam etti",
    dotColor:  "bg-emerald-500",
    lineColor: "bg-emerald-900/60",
    textColor: "text-emerald-300",
    badgeTone: "emerald",
  },
  COMPLETED: {
    label:     "Tamamlandı",
    dotColor:  "bg-blue-500",
    lineColor: "bg-blue-900/60",
    textColor: "text-blue-300",
    badgeTone: "blue",
  },
  CANNOT_START: {
    label:     "Başlanamadı",
    dotColor:  "bg-red-500",
    lineColor: "bg-red-900/60",
    textColor: "text-red-300",
    badgeTone: "red",
  },
  CANCELLED: {
    label:     "İptal edildi",
    dotColor:  "bg-zinc-600",
    lineColor: "bg-zinc-800",
    textColor: "text-zinc-500",
    badgeTone: "slate",
  },
  NOTE_ADDED: {
    label:     "Not eklendi",
    dotColor:  "bg-cyan-500",
    lineColor: "bg-cyan-900/50",
    textColor: "text-cyan-300",
    badgeTone: "blue",
  },
  PHOTO_ADDED: {
    label:     "Fotoğraf eklendi",
    dotColor:  "bg-violet-500",
    lineColor: "bg-violet-900/50",
    textColor: "text-violet-300",
    badgeTone: "purple",
  },
}

const FALLBACK_CONFIG: EventConfig = {
  label:     "Güncellendi",
  dotColor:  "bg-slate-600",
  lineColor: "bg-slate-800",
  textColor: "text-slate-400",
  badgeTone: "slate",
}

const OPERATION_STEP_LABELS: Record<string, string> = {
  OLCU: "Ölçü",
  KESIM: "Kesim",
  TOPLAMA: "Toplama",
  MONTAJ: "Montaj",
  DIGER: "Operasyon",
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(raw: string | Date): { relative: string; absolute: string } {
  const d = dayjs(raw)
  const now = dayjs()
  const diffMin = now.diff(d, "minute")

  let relative: string
  if (diffMin < 1) {
    relative = "Az önce"
  } else if (diffMin < 60) {
    relative = `${diffMin} dk önce`
  } else if (diffMin < 1440) {
    const h = Math.floor(diffMin / 60)
    relative = `${h} saat önce`
  } else {
    relative = d.format("D MMM")
  }

  const isToday = d.isSame(now, "day")
  const absolute = isToday ? `Bugün ${d.format("HH:mm")}` : d.format("D MMM HH:mm")

  return { relative, absolute }
}

function personelName(personel?: { ad: string; soyad: string } | null): string | null {
  if (!personel) return null
  return [personel.ad, personel.soyad].filter(Boolean).join(" ").trim() || null
}

function actorName(event: TimelineEvent): string | null {
  return event.actor?.name || personelName(event.personel)
}

function metadataRecord(meta: unknown): Record<string, unknown> {
  return meta && typeof meta === "object" ? meta as Record<string, unknown> : {}
}

function numericCost(value: string | number | null | undefined): number | null {
  if (value == null) return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function formatMoney(value: number, currency?: string | null): string {
  const symbol = currency === "TRY" || !currency ? "₺" : `${currency} `
  return `${symbol}${value.toLocaleString("tr-TR")}`
}

// ─── CannotStartCard ──────────────────────────────────────────────────────────

function CannotStartCard({ event }: { event: TimelineEvent }) {
  const m = metadataRecord(event.metadata)
  const reasonKey   = event.reasonCode ?? (typeof m.cannotStartReason === "string" ? m.cannotStartReason : null)
  const description = typeof m.failureDescription === "string" ? m.failureDescription : event.note
  const cost        = numericCost(event.cost?.amount) ?? numericCost(m.materialLossCost as string | number | null)
  const currency    = event.cost?.currency ?? "TRY"

  if (!reasonKey && !description && cost == null) return null

  return (
    <div className="mt-2 space-y-1.5 rounded-xl border border-red-500/20 bg-red-500/[0.06] px-3 py-2.5">
      {reasonKey && (
        <p className="text-xs font-bold text-red-300">
          {FAILURE_REASON_LABELS[reasonKey] ?? reasonKey}
        </p>
      )}
      {description && (
        <p className="text-xs leading-relaxed text-slate-400">{description}</p>
      )}
      {cost != null && cost > 0 && (
        <p className="text-xs font-bold text-red-400">
          Fire maliyeti: {formatMoney(cost, currency)}
        </p>
      )}
    </div>
  )
}

function NoteCard({ note }: { note: string | null }) {
  if (!note) return null
  return (
    <div className="mt-2 rounded-xl border border-cyan-500/20 bg-cyan-500/[0.06] px-3 py-2.5">
      <p className="text-xs italic leading-relaxed text-cyan-100/90">&ldquo;{note}&rdquo;</p>
    </div>
  )
}

function PhotoCard({ attachment }: { attachment?: TimelineEvent["attachment"] }) {
  const url = attachment?.url
  if (!url) return null

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="mt-2 flex w-fit max-w-full items-center gap-2 rounded-xl border border-violet-500/20 bg-violet-500/[0.06] px-2.5 py-2 transition hover:bg-violet-500/[0.1]"
    >
      <img
        src={url}
        alt="Eklenen operasyon fotoğrafı"
        className="h-12 w-16 rounded-lg object-cover"
        loading="lazy"
      />
      <span className="text-xs font-semibold text-violet-200">Fotoğrafı aç</span>
    </a>
  )
}

// ─── EventRow ─────────────────────────────────────────────────────────────────

function EventRow({
  event,
  isLast,
}: {
  event: TimelineEvent
  isLast: boolean
}) {
  const cfg    = EVENT_CONFIG[event.eventType] ?? FALLBACK_CONFIG
  const actor  = actorName(event)
  const { relative, absolute } = formatTime(event.createdAt)
  const stepLabel = event.operationStep ? OPERATION_STEP_LABELS[event.operationStep] ?? event.operationStep : null
  const transition = event.transition?.from && event.transition.to
    ? `${event.transition.from} → ${event.transition.to}`
    : null
  const showDefaultNote = event.note && event.eventType !== "NOTE_ADDED" && event.eventType !== "CANNOT_START"

  return (
    <div className="flex gap-3">
      {/* Left: dot + connector line */}
      <div className="flex flex-col items-center">
        <div className={`mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-white/5 ${cfg.dotColor}`} />
        {!isLast && (
          <div className={`mt-1 w-px flex-1 ${cfg.lineColor}`} style={{ minHeight: 20 }} />
        )}
      </div>

      {/* Right: content */}
      <div className={`pb-4 ${isLast ? "" : ""}`}>
        {/* Badge + time */}
        <div className="flex flex-wrap items-center gap-2">
          <DarkBadge tone={cfg.badgeTone} size="sm">
            {cfg.label}
          </DarkBadge>
          {stepLabel && (
            <span className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[10px] font-bold text-slate-400">
              {stepLabel}
            </span>
          )}
          <span className="text-[11px] text-slate-600" title={absolute}>
            {relative}
          </span>
          <span className="hidden text-[11px] text-slate-700 sm:inline">·</span>
          <span className="hidden text-[11px] text-slate-600 sm:inline">{absolute}</span>
        </div>

        {/* Actor */}
        {actor && (
          <p className="mt-1 text-xs text-slate-500">{actor}</p>
        )}

        {transition && (
          <p className="mt-1 text-[11px] font-medium text-slate-600">{transition}</p>
        )}

        {/* Note */}
        {showDefaultNote && (
          <p className="mt-1.5 text-xs italic leading-relaxed text-slate-400">
            &ldquo;{event.note}&rdquo;
          </p>
        )}

        {/* CANNOT_START metadata */}
        {event.eventType === "CANNOT_START" && (
          <CannotStartCard event={event} />
        )}

        {event.eventType === "NOTE_ADDED" && (
          <NoteCard note={event.note} />
        )}

        {event.eventType === "PHOTO_ADDED" && (
          <PhotoCard attachment={event.attachment} />
        )}
      </div>
    </div>
  )
}

// ─── ExecutionTimeline ────────────────────────────────────────────────────────

export default function ExecutionTimeline({ events }: { events: TimelineEvent[] }) {
  if (!events.length) {
    return (
      <p className="text-xs text-slate-600">Henüz kayıtlı hareket yok.</p>
    )
  }

  return (
    <div>
      {events.map((ev, idx) => (
        <EventRow key={ev.id} event={ev} isLast={idx === events.length - 1} />
      ))}
    </div>
  )
}
