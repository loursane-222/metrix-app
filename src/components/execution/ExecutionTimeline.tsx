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
  personel?: { ad: string; soyad: string } | null
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
    label:     "Başlatıldı",
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
    label:     "Devam edildi",
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
}

const FALLBACK_CONFIG: EventConfig = {
  label:     "Güncellendi",
  dotColor:  "bg-slate-600",
  lineColor: "bg-slate-800",
  textColor: "text-slate-400",
  badgeTone: "slate",
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

function actorName(personel?: { ad: string; soyad: string } | null): string | null {
  if (!personel) return null
  return [personel.ad, personel.soyad].filter(Boolean).join(" ").trim() || null
}

// ─── CannotStartCard ──────────────────────────────────────────────────────────

function CannotStartCard({ meta }: { meta: unknown }) {
  if (!meta || typeof meta !== "object") return null
  const m = meta as Record<string, unknown>
  const reasonKey   = typeof m.cannotStartReason === "string" ? m.cannotStartReason : null
  const description = typeof m.failureDescription === "string" ? m.failureDescription : null
  const cost        = m.materialLossCost != null ? Number(m.materialLossCost) : null

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
          Maliyet etkisi: ₺{cost.toLocaleString("tr-TR")}
        </p>
      )}
    </div>
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
  const actor  = actorName(event.personel)
  const { relative, absolute } = formatTime(event.createdAt)

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

        {/* Note */}
        {event.note && (
          <p className="mt-1.5 text-xs italic leading-relaxed text-slate-400">
            &ldquo;{event.note}&rdquo;
          </p>
        )}

        {/* CANNOT_START metadata */}
        {event.eventType === "CANNOT_START" && (
          <CannotStartCard meta={event.metadata} />
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
