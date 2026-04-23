"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Atolye = {
  atolyeAdi?: string;
  logoUrl?: string;
};

const menuItems = [
  { href: "/dashboard", label: "Dashboard", badge: "Genel Bakış" },
  { href: "/dashboard/isler", label: "İşler", badge: "Teklifler" },
  { href: "/dashboard/musteriler", label: "Müşteriler", badge: "CRM" },
  { href: "/dashboard/is-programi", label: "İş Programı", badge: "Planlama" },
  { href: "/dashboard/atolye", label: "Atölye", badge: "Maliyet" },
  { href: "/dashboard/personel", label: "Personel", badge: "Ekip" },
  { href: "/dashboard/plaka-planlayici", label: "Plaka Planlayıcı", badge: "Optimizasyon" },
];

export default function Sidebar() {
  const [atolye, setAtolye] = useState<Atolye | null>(null);

  useEffect(() => {
    fetch("/api/atolye", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => setAtolye(data?.atolye || null))
      .catch(() => setAtolye(null));
  }, []);

  const firmaAdi =
    atolye?.atolyeAdi && atolye.atolyeAdi.trim().length > 0
      ? atolye.atolyeAdi.toUpperCase()
      : "PREMIUM ATÖLYE";

  const logoFallback =
    atolye?.atolyeAdi?.trim()?.charAt(0)?.toUpperCase() || "M";

  return (
    <aside className="hidden md:fixed md:inset-y-0 md:left-0 md:flex md:w-72 bg-[#0B1020] text-white border-r border-white/10">
      <div className="flex h-full w-full min-h-0 flex-col p-3">
        <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
            <div className="flex items-center gap-3">
              {atolye?.logoUrl ? (
                <img
                  src={atolye.logoUrl}
                  alt="Firma logosu"
                  className="h-12 w-12 shrink-0 rounded-2xl object-cover border border-white/10 bg-white"
                />
              ) : (
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 text-xl font-bold">
                  {logoFallback}
                </div>
              )}

              <div className="min-w-0 flex-1">
                <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">
                  Metrix Tezgah
                </p>
                <h2 className="mt-1 break-words text-[16px] font-semibold leading-[1.15] text-white">
                  {firmaAdi}
                </h2>
              </div>
            </div>

            <div className="mt-3 rounded-xl bg-gradient-to-br from-blue-500/20 via-violet-500/20 to-fuchsia-500/20 p-3">
              <p className="text-xs text-slate-300">Bugünün Özeti</p>
              <p className="mt-2 text-xl font-bold leading-none">15 aktif teklif</p>
              <p className="mt-2 text-sm leading-snug text-slate-300">
                4 onay, 11 takip bekliyor
              </p>
            </div>
          </div>

          <nav className="mt-3 space-y-1">
            {menuItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group flex items-center justify-between rounded-2xl border border-transparent px-4 py-2.5 text-sm text-slate-200 transition hover:border-white/10 hover:bg-white/5 hover:text-white"
              >
                <span className="font-medium">{item.label}</span>
                <span className="rounded-full bg-white/5 px-2.5 py-1 text-[11px] text-slate-300 transition group-hover:bg-white/10">
                  {item.badge}
                </span>
              </Link>
            ))}
          </nav>

          <div className="mt-4 rounded-2xl border border-amber-400/20 bg-gradient-to-br from-amber-500/10 to-orange-500/10 p-3">
            <p className="text-[11px] uppercase tracking-[0.22em] text-amber-300">
              Aksiyon
            </p>
            <h3 className="mt-2 text-sm font-semibold leading-tight">
              Takip Gerekiyor
            </h3>
            <p className="mt-2 text-sm leading-snug text-slate-300">
              Bekleyen teklif sayısı yüksek. İlk 5 müşteriye bugün dönüş yap.
            </p>
          </div>

          <div className="mt-3 pb-1">
            <button
              onClick={async () => {
                try {
                  await fetch("/api/auth/logout", {
                    method: "POST",
                    credentials: "include",
                    cache: "no-store",
                  });
                } catch (e) {}

                localStorage.clear();
                sessionStorage.clear();
                window.location.href = "/login";
              }}
              className="group flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:border-red-400/30 hover:bg-red-500/10 hover:text-red-300"
            >
              <span>Çıkış Yap</span>
              <span className="text-sm opacity-70 transition group-hover:translate-x-0.5 group-hover:opacity-100">
                →
              </span>
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
