"use client"

import Link from "next/link"
import type { ReactNode } from "react"

type EmptyStateProps = {
  icon: ReactNode
  title: string
  description?: string
  action?: { label: string; href: string }
  className?: string
}

export function EmptyState({ icon, title, description, action, className = "" }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center gap-2 rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-5 text-center ${className}`}>
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.05] text-slate-500">
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium text-slate-400">{title}</p>
        {description && (
          <p className="mt-0.5 text-xs text-slate-600">{description}</p>
        )}
      </div>
      {action && (
        <Link
          href={action.href}
          className="mt-1 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-medium text-blue-400 transition-colors hover:text-blue-300"
        >
          {action.label}
        </Link>
      )}
    </div>
  )
}
