"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const titleMap: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/dashboard/atolye": "Atölye",
  "/dashboard/personel": "Personel",
  "/dashboard/isler": "İşler",
  "/dashboard/musteriler": "Müşteriler",
  "/dashboard/is-programi": "İş Programı",
  "/dashboard/yeni-is": "Yeni İş",
  "/dashboard/plaka-planlayici": "Plaka Planlayıcı",
};

const actionMap: Record<
  string,
  { secondary?: { label: string; href: string }; primary?: { label: string; href: string } }
> = {
  "/dashboard": {
    secondary: { label: "Rapor AI", href: "#" },
    primary: { label: "+ Yeni İş", href: "/dashboard/yeni-is" },
  },
  "/dashboard/atolye": {
    secondary: { label: "Dashboard", href: "/dashboard" },
    primary: { label: "+ Yeni İş", href: "/dashboard/yeni-is" },
  },
  "/dashboard/personel": {
    secondary: { label: "Dashboard", href: "/dashboard" },
    primary: { label: "+ Personel Ekle", href: "/dashboard/personel" },
  },
  "/dashboard/isler": {
    secondary: { label: "Dashboard", href: "/dashboard" },
    primary: { label: "+ Yeni İş", href: "/dashboard/yeni-is" },
  },
  "/dashboard/musteriler": {
    secondary: { label: "Dashboard", href: "/dashboard" },
    primary: { label: "+ Yeni Müşteri", href: "/dashboard/musteriler" },
  },
  "/dashboard/is-programi": {
    secondary: { label: "Dashboard", href: "/dashboard" },
    primary: { label: "+ Program Ekle", href: "/dashboard/is-programi" },
  },
  "/dashboard/yeni-is": {
    secondary: { label: "Dashboard", href: "/dashboard" },
    primary: { label: "İş Listesi", href: "/dashboard/isler" },
  },
  "/dashboard/plaka-planlayici": {
    secondary: { label: "Dashboard", href: "/dashboard" },
    primary: { label: "+ Yeni İş", href: "/dashboard/yeni-is" },
  },
};

export default function Topbar() {
  const pathname = usePathname();
  const title = titleMap[pathname] || "Panel";
  const actions = actionMap[pathname] || {
    secondary: { label: "Dashboard", href: "/dashboard" },
    primary: { label: "+ Yeni İş", href: "/dashboard/yeni-is" },
  };

  return (
    <header className="mb-6 rounded-[32px] border border-slate-200 bg-white px-6 py-5 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
            Metrix Tezgah
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
            {title}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {actions.secondary && actions.secondary.href !== "#" ? (
            <Link
              href={actions.secondary.href}
              className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              {actions.secondary.label}
            </Link>
          ) : (
            <button
              type="button"
              className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              {actions.secondary?.label || "Dashboard"}
            </button>
          )}

          {actions.primary && (
            <Link
              href={actions.primary.href}
              className="rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(59,130,246,0.22)] transition hover:scale-[1.01]"
            >
              {actions.primary.label}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
