"use client"

import { ROL_META } from "./types"

export function PersonelRoleBadge({
  rolGrubu,
  size = "sm",
}: {
  rolGrubu?: string
  size?: "sm" | "md"
}) {
  const m = ROL_META[rolGrubu || "DIGER"] ?? ROL_META.DIGER
  const sz = size === "md" ? "px-3 py-1 text-xs" : "px-2 py-0.5 text-[10px]"
  return (
    <span className={`rounded-full border font-semibold ${sz} ${m.tw}`}>
      {m.label}
    </span>
  )
}
