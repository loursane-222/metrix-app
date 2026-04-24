"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type Atolye = {
  atolyeAdi?: string;
  logoUrl?: string;
};

type SidebarStats = {
  toplamIs: number;
  onaylananIs: number;
  bekleyenIs: number;
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
  const pathname = usePathname();
  const [atolye, setAtolye] = useState<Atolye | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [stats, setStats] = useState<SidebarStats | null>(null);

  useEffect(() => {
    function atolyeGetir() {
      fetch("/api/atolye", { cache: "no-store" })
        .then((res) => res.json())
        .then((data) => setAtolye(data?.atolye || null))
        .catch(() => setAtolye(null));
    }

    function ozetGetir() {
      fetch("/api/dashboard", { cache: "no-store" })
        .then((res) => res.json())
        .then((data) =>
          setStats({
            toplamIs: Number(data?.toplamIs || 0),
            onaylananIs: Number(data?.onaylananIs || 0),
            bekleyenIs: Number(data?.bekleyenIs || 0),
          })
        )
        .catch(() => setStats(null));
    }

    atolyeGetir();
    ozetGetir();

    const interval = window.setInterval(ozetGetir, 5000);

    function aktifOluncaYenile() {
      if (document.visibilityState === "visible") {
        ozetGetir();
      }
    }

    window.addEventListener("focus", ozetGetir);
    document.addEventListener("visibilitychange", aktifOluncaYenile);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", ozetGetir);
      document.removeEventListener("visibilitychange", aktifOluncaYenile);
    };
  }, []);

  async function logout() {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
      });
    } catch {}

    localStorage.clear();
    sessionStorage.clear();
    window.location.href = "/login";
  }

  const firmaAdi =
    atolye?.atolyeAdi && atolye.atolyeAdi.trim().length > 0
      ? atolye.atolyeAdi.toUpperCase()
      : "PREMIUM ATÖLYE";

  const logoFallback =
    atolye?.atolyeAdi?.trim()?.charAt(0)?.toUpperCase() || "M";

  const SidebarContent = ({ mobile = false }: { mobile?: boolean }) => (
    <div className="flex h-full min-h-0 flex-col">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
        <div className="flex items-center gap-3">
          {atolye?.logoUrl ? (
            <img
              src={atolye.logoUrl}
              alt="Firma logosu"
              className="h-12 w-12 shrink-0 rounded-2xl border border-white/10 bg-white object-cover"
            />
          ) : (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 text-lg font-bold">
              {logoFallback}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-[0.24em] text-slate-400">
              Metrix Tezgah
            </p>
            <h2 className="mt-1 break-words text-[15px] font-semibold leading-[1.15] text-white">
              {firmaAdi}
            </h2>
          </div>
        </div>

        <div className="mt-3 rounded-xl bg-gradient-to-br from-blue-500/20 via-violet-500/20 to-fuchsia-500/20 p-3">
          <p className="text-xs text-slate-300">Bugünün Özeti</p>
          <p className="mt-1 text-xl font-bold leading-none">
            {stats?.toplamIs ?? 0} aktif teklif
          </p>
          <p className="mt-2 text-xs leading-snug text-slate-300">
            {stats?.onaylananIs ?? 0} onay, {stats?.bekleyenIs ?? 0} takip bekliyor
          </p>
        </div>
      </div>

      <nav className="mt-3 space-y-1">
        {menuItems.map((item) => {
          const active = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => mobile && setMobileOpen(false)}
              className={[
                "group flex items-center justify-between rounded-2xl border px-4 py-2.5 text-sm transition",
                active
                  ? "border-blue-400/50 bg-blue-500/15 text-white shadow-[0_0_0_1px_rgba(96,165,250,0.3)]"
                  : "border-transparent text-slate-200 hover:border-white/10 hover:bg-white/5 hover:text-white",
              ].join(" ")}
            >
              <span className="font-medium">{item.label}</span>
              <span className="rounded-full bg-white/5 px-2.5 py-1 text-[11px] text-slate-300 transition group-hover:bg-white/10">
                {item.badge}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-3 rounded-2xl border border-amber-400/20 bg-gradient-to-br from-amber-500/10 to-orange-500/10 p-3">
        <p className="text-[10px] uppercase tracking-[0.22em] text-amber-300">
          Aksiyon
        </p>
        <h3 className="mt-1 text-sm font-semibold leading-tight">
          Takip Gerekiyor
        </h3>
        <p className="mt-2 text-xs leading-snug text-slate-300">
          Bekleyen teklif sayısı yüksek. İlk 5 müşteriye bugün dönüş yap.
        </p>
      </div>

      <button
        onClick={logout}
        className="mt-3 flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:border-red-400/30 hover:bg-red-500/10 hover:text-red-300"
      >
        <span>Çıkış Yap</span>
        <span>→</span>
      </button>
    </div>
  );

  return (
    <>
      {/* MOBILE MENU BUTTON */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-[90] flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-2xl text-slate-900 shadow-[0_12px_30px_rgba(15,23,42,0.14)] md:hidden"
        aria-label="Menüyü aç"
      >
        ☰
      </button>

      {/* MOBILE DRAWER */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[100] md:hidden">
          <div
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />

          <aside className="absolute left-0 top-0 h-full w-[86vw] max-w-[340px] bg-[#0B1020] p-4 text-white shadow-[20px_0_60px_rgba(0,0,0,0.35)]">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                Menü
              </p>

              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="rounded-xl border border-white/10 px-3 py-2 text-white/70"
              >
                ✕
              </button>
            </div>

            <div className="h-[calc(100%-44px)] overflow-y-auto pr-1">
              <SidebarContent mobile />
            </div>
          </aside>
        </div>
      )}

      {/* DESKTOP SIDEBAR */}
      <aside className="hidden md:fixed md:inset-y-0 md:left-0 md:flex md:w-72 bg-[#0B1020] text-white border-r border-white/10">
        <div className="flex h-full w-full min-h-0 flex-col p-4">
          <SidebarContent />
        </div>
      </aside>
    </>
  );
}
