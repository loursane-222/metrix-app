"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import MobileTabBar from "./MobileTabBar";

type Atolye = {
  atolyeAdi?: string;
  logoUrl?: string;
};

type CurrentUser = {
  role?: "admin" | "personel";
  personelId?: string | null;
  allowedMenus?: string[] | null;
};

const menuItems = [
  { href: "/dashboard", label: "Dashboard", badge: "Genel Bakış", onboardingTarget: "dashboard" },
  { href: "/dashboard/isler", label: "İşler", badge: "Teklifler", onboardingTarget: "yeni-is" },
  { href: "/dashboard/musteriler", label: "Müşteriler", badge: "CRM", onboardingTarget: "musteriler" },
  { href: "/dashboard/is-programi", label: "İş Programı", badge: "Planlama", onboardingTarget: "is-programi" },
  { href: "/dashboard/stok", label: "Stok", badge: "Malzeme", onboardingTarget: "stok" },
  { href: "/dashboard/atolye", label: "Atölye", badge: "Maliyet", onboardingTarget: "atolye-gideri" },
  { href: "/dashboard/personel", label: "Personel", badge: "Ekip", onboardingTarget: "personel" },
  { href: "/dashboard/plaka-planlayici", label: "Plaka Planlayıcı", badge: "Optimizasyon", onboardingTarget: "plaka-planlayici" },
  { href: "/dashboard/tahsilatlar", label: "Tahsilat & Cari", badge: "Finans", onboardingTarget: "tahsilat" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [atolye, setAtolye] = useState<Atolye | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    function userGetir() {
      fetch("/api/auth/current-user", { cache: "no-store", credentials: "include" })
        .then((res) => res.json())
        .then((data) => setCurrentUser(data || null))
        .catch(() => setCurrentUser(null));
    }

    function atolyeGetir() {
      fetch("/api/atolye", { cache: "no-store", credentials: "include" })
        .then((res) => res.json())
        .then((data) => setAtolye(data?.atolye || null))
        .catch(() => setAtolye(null));
    }

    userGetir();
    atolyeGetir();

    function aktifOluncaYenile() {
      if (document.visibilityState === "visible") {
        userGetir();
        atolyeGetir();
      }
    }

    window.addEventListener("focus", aktifOluncaYenile);
    document.addEventListener("visibilitychange", aktifOluncaYenile);

    return () => {
      window.removeEventListener("focus", aktifOluncaYenile);
      document.removeEventListener("visibilitychange", aktifOluncaYenile);
    };
  }, []);

  const visibleMenuItems = useMemo(() => {
    if (!currentUser || currentUser.role !== "personel") return menuItems;
    const allowed = currentUser.allowedMenus || ["/dashboard"];
    const allowedSet = new Set(allowed);
    return menuItems.filter((item) => allowedSet.has(item.href));
  }, [currentUser]);

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
      <div className="shrink-0 rounded-2xl border border-white/10 bg-white/5 p-3">
        <div className="flex items-center gap-3">
          {atolye?.logoUrl ? (
            <img
              src={atolye.logoUrl}
              alt="Firma logosu"
              className="h-11 w-11 shrink-0 rounded-2xl border border-white/10 bg-white object-cover"
            />
          ) : (
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 text-lg font-bold">
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
            {currentUser?.role === "personel" && (
              <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-emerald-300">
                Personel Girişi
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-3 min-h-0 flex-1 overflow-y-auto pr-1">
        <nav className="space-y-0.5">
          {visibleMenuItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => mobile && setMobileOpen(false)}
                data-onboarding-target={item.onboardingTarget}
                className={[
                  "group flex items-center justify-between rounded-xl border px-3 py-2 text-sm transition",
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
      </div>

      <button
        onClick={logout}
        className="mt-3 flex w-full shrink-0 items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-red-400/30 hover:bg-red-500/10 hover:text-red-300"
      >
        <span>Çıkış Yap</span>
        <span>→</span>
      </button>
    </div>
  );

  return (
    <>
      {/* Masaüstü sidebar — md ve üzeri */}
      <aside className="hidden md:fixed md:inset-y-0 md:left-0 md:flex md:w-72 bg-[#0B1020] text-white border-r border-white/10">
        <div className="flex h-full w-full min-h-0 flex-col p-4">
          <SidebarContent />
        </div>
      </aside>

      {/* Mobil tab bar — md altı */}
      <MobileTabBar currentUser={currentUser} />
    </>
  );
}
