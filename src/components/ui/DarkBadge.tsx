"use client"

import type { ReactNode } from "react"

export type BadgeTone = "emerald" | "amber" | "red" | "blue" | "purple" | "teal" | "slate" | "orange"
export type BadgeSize = "xs" | "sm"
export type BadgeShape = "pill" | "soft"

const TONE_CLASSES: Record<BadgeTone, string> = {
  emerald: "border-emerald-400/30 bg-emerald-500/10 text-emerald-300",
  amber:   "border-amber-400/30 bg-amber-500/10 text-amber-300",
  red:     "border-red-400/30 bg-red-500/10 text-red-300",
  blue:    "border-blue-400/30 bg-blue-500/10 text-blue-300",
  purple:  "border-purple-400/30 bg-purple-500/10 text-purple-300",
  teal:    "border-teal-400/30 bg-teal-500/10 text-teal-300",
  slate:   "border-white/[0.08] bg-white/[0.04] text-slate-300",
  orange:  "border-orange-400/30 bg-orange-500/10 text-orange-300",
}

const SIZE_CLASSES: Record<BadgeSize, string> = {
  xs: "px-2 py-0.5 text-[10px]",
  sm: "px-2 py-1 text-[11px]",
}

const SHAPE_CLASSES: Record<BadgeShape, string> = {
  pill: "rounded-full",
  soft: "rounded-lg",
}

export function DarkBadge({
  tone,
  children,
  dot,
  size = "xs",
  shape = "pill",
  className = "",
}: {
  tone: BadgeTone
  children: ReactNode
  dot?: boolean
  size?: BadgeSize
  shape?: BadgeShape
  className?: string
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 border font-semibold ${SHAPE_CLASSES[shape]} ${SIZE_CLASSES[size]} ${TONE_CLASSES[tone]} ${className}`}
    >
      {dot && <span className="inline-block h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  )
}
