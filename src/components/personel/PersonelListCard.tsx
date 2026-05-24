"use client"

import SwipeToDelete from "@/components/ui/SwipeToDelete"
import { PersonelRoleBadge } from "./PersonelRoleBadge"
import { DarkBadge, type BadgeTone } from "@/components/ui/DarkBadge"
import type { Personel } from "./types"

function performansTone(not: number | null): BadgeTone {
  if (not === null) return "slate"
  if (not >= 80) return "emerald"
  if (not >= 60) return "amber"
  return "red"
}

export function PersonelListCard({
  personel,
  isActive,
  onClick,
  onDelete,
}: {
  personel: Personel
  isActive: boolean
  onClick: () => void
  onDelete: () => void
}) {
  return (
    <SwipeToDelete onDelete={onDelete}>
      <button
        onClick={onClick}
        className={[
          "group relative w-full rounded-2xl border p-3 text-left transition",
          isActive
            ? "border-blue-500/50 bg-blue-500/10"
            : "border-slate-800 bg-[#111827] hover:bg-slate-800",
        ].join(" ")}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">
              {personel.ad} {personel.soyad}
            </p>
            <p className="mt-0.5 text-xs text-slate-400">
              {personel.gorevi} · {personel.toplamGorev || 0} görev
            </p>
            {personel.rolGrubu && personel.rolGrubu !== "DIGER" && (
              <div className="mt-1.5">
                <PersonelRoleBadge rolGrubu={personel.rolGrubu} />
              </div>
            )}
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            <DarkBadge tone={performansTone(personel.performansNotu)}>
              {personel.performansNotu === null ? "—" : `%${personel.performansNotu}`}
            </DarkBadge>
            <span
              onClick={(e) => { e.stopPropagation(); onDelete() }}
              className="hidden cursor-pointer items-center gap-1 rounded-lg border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-[10px] font-bold text-red-400 transition hover:bg-red-500/25 group-hover:flex"
            >
              🗑 Sil
            </span>
          </div>
        </div>
      </button>
    </SwipeToDelete>
  )
}
