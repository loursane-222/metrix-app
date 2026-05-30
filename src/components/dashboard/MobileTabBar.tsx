"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState, useEffect } from "react";
import MetrixGuideLauncher from "@/components/onboarding/MetrixGuideLauncher";

type CurrentUser = {
  role?: "admin" | "personel";
  allowedMenus?: string[] | null;
};

const tabItems = [
  {
    href: "/dashboard",
    label: "Ana Sayfa",
    exact: true,
    onboardingTarget: "dashboard",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#60a5fa" : "rgba(148,163,184,0.6)"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    ),
  },
  {
    href: "/dashboard/isler",
    label: "İşler",
    exact: false,
    onboardingTarget: "yeni-is",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#60a5fa" : "rgba(148,163,184,0.6)"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/>
      </svg>
    ),
  },
  {
    href: "/dashboard/yeni-is-v3?fresh=1",
    label: "",
    exact: false,
    fab: true,
    onboardingTarget: "yeni-is",
    icon: (_active: boolean) => (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
      </svg>
    ),
  },
  {
    href: "/dashboard/is-programi",
    label: "Program",
    exact: false,
    onboardingTarget: "is-programi",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#60a5fa" : "rgba(148,163,184,0.6)"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
    ),
  },
  {
    href: "__more__",
    label: "Daha Fazla",
    exact: false,
    more: true,
    onboardingTarget: "more",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#60a5fa" : "rgba(148,163,184,0.6)"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>
      </svg>
    ),
  },
];

const moreItems = [
  {
    href: "/dashboard/stok",
    label: "Stok",
    sub: "Malzeme / Stok",
    color: "#06b6d4",
    onboardingTarget: "stok",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
        <path d="M3.3 7L12 12l8.7-5"/>
        <path d="M12 22V12"/>
      </svg>
    ),
  },
  {
    href: "/dashboard/musteriler",
    label: "Müşteriler",
    sub: "CRM & ekstre",
    color: "#22c55e",
    onboardingTarget: "musteriler",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
      </svg>
    ),
  },
  {
    href: "/dashboard/atolye",
    label: "Atölye",
    sub: "Maliyet ayarları",
    color: "#f59e0b",
    onboardingTarget: "atolye-gideri",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
    ),
  },
  {
    href: "/dashboard/personel",
    label: "Personel",
    sub: "Ekip yönetimi",
    color: "#a78bfa",
    onboardingTarget: "personel",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
      </svg>
    ),
  },
  {
    href: "/dashboard/plaka-planlayici",
    label: "Plaka Planlayıcı",
    sub: "Optimizasyon",
    color: "#38bdf8",
    onboardingTarget: "plaka-planlayici",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>
      </svg>
    ),
  },
  {
    href: "/dashboard/tahsilatlar",
    label: "Tahsilat & Cari",
    sub: "Finans & ödeme planı",
    color: "#10b981",
    onboardingTarget: "tahsilat",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>
      </svg>
    ),
  },
];

export default function MobileTabBar({ currentUser }: { currentUser: CurrentUser | null }) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  async function logout() {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include", cache: "no-store" });
    } catch {}
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = "/login";
  }

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  const visibleTabs = useMemo(() => {
    if (!currentUser || currentUser.role !== "personel") return tabItems;
    const allowed = new Set(currentUser.allowedMenus || ["/dashboard"]);
    return tabItems.filter((item) => item.fab || item.more || allowed.has(item.href));
  }, [currentUser]);

  const visibleMoreItems = useMemo(() => {
    if (!currentUser || currentUser.role !== "personel") return moreItems;
    const allowed = new Set(currentUser.allowedMenus || ["/dashboard"]);
    return moreItems.filter((item) => allowed.has(item.href));
  }, [currentUser]);

  const morePathlar = visibleMoreItems.map((m) => m.href);
  const moreActive = morePathlar.some((p) => pathname.startsWith(p));

  return (
    <>
      {!pathname.startsWith("/dashboard/is-programi") && (
        <div className="fixed right-3 z-[70] md:hidden" style={{ bottom: "calc(88px + env(safe-area-inset-bottom, 0px))" }}>
          <MetrixGuideLauncher compact className="min-h-[34px] bg-slate-950/90 px-3 text-[11px] shadow-[0_12px_34px_rgba(0,0,0,0.28)]" />
        </div>
      )}

      {/* Daha Fazla sheet overlay */}
      {moreOpen && (
        <div
          className="fixed inset-0 z-[75] md:hidden"
          onClick={() => setMoreOpen(false)}
        >
          <div className="absolute inset-0 bg-black/50" />
          <div
            className="absolute left-0 right-0 bottom-[72px]"
            style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                margin: "0 12px 8px",
                background: "rgba(17,25,50,0.98)",
                backdropFilter: "blur(24px)",
                WebkitBackdropFilter: "blur(24px)",
                borderRadius: 20,
                border: "0.5px solid rgba(255,255,255,0.1)",
                overflow: "hidden",
              }}
            >
              <div style={{ padding: "12px 16px 6px" }}>
                <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", color: "rgba(148,163,184,0.6)", textTransform: "uppercase", margin: 0 }}>
                  Daha Fazla
                </p>
              </div>
              {visibleMoreItems.map((item, i) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMoreOpen(false)}
                  data-onboarding-target={item.onboardingTarget}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: "13px 16px",
                    borderTop: i === 0 ? "none" : "0.5px solid rgba(255,255,255,0.06)",
                    textDecoration: "none",
                    background: pathname.startsWith(item.href) ? "rgba(96,165,250,0.08)" : "transparent",
                  }}
                >
                  <div style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: `${item.color}18`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}>
                    {item.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: 15, fontWeight: 500, color: "rgba(255,255,255,0.9)" }}>
                      {item.label}
                    </p>
                    <p style={{ margin: 0, fontSize: 12, color: "rgba(148,163,184,0.6)" }}>
                      {item.sub}
                    </p>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(148,163,184,0.3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </Link>
              ))}
              <div style={{ borderTop: "0.5px solid rgba(255,255,255,0.06)" }}>
                <button
                  onClick={() => { setMoreOpen(false); logout(); }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: "13px 16px",
                    width: "100%",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <div style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: "rgba(239,68,68,0.12)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
                    </svg>
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: 15, fontWeight: 500, color: "#ef4444" }}>
                      Çıkış Yap
                    </p>
                    <p style={{ margin: 0, fontSize: 12, color: "rgba(148,163,184,0.6)" }}>
                      Oturumu kapat
                    </p>
                  </div>
                </button>
              </div>
              <div style={{ height: 8 }} />
            </div>
          </div>
        </div>
      )}

      {/* Tab bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-[80] md:hidden"
        style={{
          background: "rgba(11,16,32,0.96)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderTop: "0.5px solid rgba(255,255,255,0.08)",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        <div className="flex items-end justify-around px-2 pt-2 pb-1">
          {visibleTabs.map((item) => {
            if (item.fab) {
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex flex-col items-center justify-center mb-2"
                  aria-label="Yeni İş Ekle"
                  data-onboarding-target={item.onboardingTarget}
                >
                  <div style={{
                    width: 52,
                    height: 52,
                    borderRadius: 18,
                    background: "linear-gradient(135deg, #3b82f6, #6366f1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 4px 20px rgba(99,102,241,0.45)",
                  }}>
                    {item.icon(false)}
                  </div>
                </Link>
              );
            }

            if (item.more) {
              const active = moreActive || moreOpen;
              return (
                <button
                  key="more"
                  onClick={() => setMoreOpen((v) => !v)}
                  className="flex flex-col items-center gap-1 px-3 py-1 min-w-[48px] bg-transparent border-0"
                  aria-label="Daha Fazla"
                  data-onboarding-target={item.onboardingTarget}
                >
                  {item.icon(active)}
                  <span style={{
                    fontSize: 10,
                    fontWeight: active ? 600 : 400,
                    color: active ? "#60a5fa" : "rgba(148,163,184,0.6)",
                    transition: "all 0.15s",
                  }}>
                    {item.label}
                  </span>
                  {active && <div style={{ width: 4, height: 4, borderRadius: "50%", background: "#60a5fa", marginTop: -2 }} />}
                </button>
              );
            }

            const active = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center gap-1 px-3 py-1 min-w-[48px]"
                aria-label={item.label}
                data-onboarding-target={item.onboardingTarget}
              >
                {item.icon(active)}
                <span style={{
                  fontSize: 10,
                  fontWeight: active ? 600 : 400,
                  color: active ? "#60a5fa" : "rgba(148,163,184,0.6)",
                  transition: "all 0.15s",
                  letterSpacing: "0.02em",
                }}>
                  {item.label}
                </span>
                {active && <div style={{ width: 4, height: 4, borderRadius: "50%", background: "#60a5fa", marginTop: -2 }} />}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
