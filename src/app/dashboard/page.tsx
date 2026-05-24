"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { SkeletonCard, SkeletonLine, Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import Link from "next/link";
import InAppToast, { showToast } from "@/components/push/InAppToast";
import TaskDetailModal from "@/components/schedule/TaskDetailModal";

// ─── Live Ops types ───────────────────────────────────────────────────────────
type RiskState = "NO_PLAN" | "NORMAL" | "OVERRUN" | "CRITICAL" | "STALE";

type AktifEkipItem = {
  execId: string;
  phaseId: string;
  personelAd: string;
  phaseType: "OLCU" | "IMALAT" | "MONTAJ";
  musteriAdi: string;
  urunAdi: string;
  status: "STARTED" | "PAUSED";
  actualStartedAt: string | null;
  elapsedMinutes: number;
  expectedMinutes: number | null;
  varianceMinutes: number | null;
  progressRatio: number | null;
  riskState: RiskState;
  cannotStartReason: string | null;
};

type BlockedItem = {
  execId: string;
  phaseId: string;
  phaseType: "OLCU" | "IMALAT" | "MONTAJ";
  musteriAdi: string;
  urunAdi: string;
  cannotStartReason: string | null;
  materialLossCost: string | null;
  elapsedBlockedMinutes: number;
};

const CANNOT_START_REASON_LABELS: Record<string, string> = {
  CUSTOMER_NOT_READY:      "Müşteri hazır değil",
  MATERIAL_MISSING:        "Malzeme eksik",
  MEASUREMENT_MISSING:     "Ölçü eksik",
  MACHINE_BUSY:            "Makine meşgul",
  PERSONNEL_UNAVAILABLE:   "Personel yok",
  SITE_NOT_READY:          "Saha hazır değil",
  STONE_BROKEN_IN_CUTTING: "Kesimde taş kırıldı",
  OTHER:                   "Diğer",
};

// ─── Risk state config ────────────────────────────────────────────────────────
const RISK_META: Record<RiskState, { label: string; bar: string; text: string; badge: string }> = {
  NO_PLAN:  { label: "Plan yok",        bar: "bg-slate-700",    text: "text-slate-500",  badge: "text-slate-600 bg-slate-800/60" },
  NORMAL:   { label: "",                bar: "bg-emerald-500",  text: "text-emerald-400",badge: "" },
  OVERRUN:  { label: "+{v} dk geçti",   bar: "bg-amber-400",    text: "text-amber-300",  badge: "text-amber-400 bg-amber-500/10" },
  CRITICAL: { label: "Kontrol gerekli", bar: "bg-red-500",      text: "text-red-400",    badge: "text-red-400 bg-red-500/10 animate-pulse" },
  STALE:    { label: "Dünden açık",     bar: "bg-red-600",      text: "text-red-400",    badge: "text-red-400 bg-red-500/10 animate-pulse" },
};

// ─── Live Ops card ────────────────────────────────────────────────────────────
// Server-computed work-calendar elapsed. Poll (10s) keeps this current.
function LiveCard({ item, onClick }: { item: AktifEkipItem; onClick: () => void }) {
  const [mins, setMins] = useState(item.elapsedMinutes);

  useEffect(() => {
    setMins(item.elapsedMinutes);
  }, [item.elapsedMinutes]);

  // Tick every minute for STARTED; server corrects value on every poll
  useEffect(() => {
    if (item.status !== "STARTED") return;
    const id = setInterval(() => setMins((m) => m + 1), 60_000);
    return () => clearInterval(id);
  }, [item.status]);

  const phaseLabel =
    item.phaseType === "IMALAT" ? "İmalat" :
    item.phaseType === "MONTAJ" ? "Montaj" : "Ölçü";

  const phaseCls =
    item.phaseType === "IMALAT" ? "bg-amber-500/15 text-amber-400" :
    item.phaseType === "MONTAJ" ? "bg-emerald-500/15 text-emerald-400" :
    "bg-blue-500/15 text-blue-400";

  const risk = item.riskState;
  const meta = RISK_META[risk];

  // Progress bar genişliği: max %100 visually, overflow kırmızı gösterim için clamp
  const barPct = item.progressRatio != null
    ? Math.min(Math.round(item.progressRatio * 100), 100)
    : null;

  // variance label: "+X dk geçti" şeklinde interpolate
  const varianceLabel = risk === "OVERRUN" && item.varianceMinutes != null
    ? `+${item.varianceMinutes} dk geçti`
    : risk === "CRITICAL" && item.varianceMinutes != null
    ? `+${item.varianceMinutes} dk`
    : meta.label;

  // Elapsed rengi: risk state'e göre
  const elapsedColor =
    risk === "CRITICAL" || risk === "STALE" ? "text-red-400" :
    risk === "OVERRUN" ? "text-amber-300" :
    item.status === "PAUSED" ? "text-amber-300" :
    "text-white";

  return (
    <button
      onClick={onClick}
      style={{ scrollSnapAlign: "start", minWidth: 152 }}
      className={`flex-shrink-0 rounded-2xl border p-3 cursor-pointer text-left transition-colors active:scale-[0.98] ${
        item.status === "PAUSED"
          ? "border-amber-500/30 bg-amber-500/[0.04] opacity-80 hover:border-amber-500/40 hover:bg-amber-500/[0.07]"
          : "border-white/10 bg-[#0c1322] hover:border-white/20 hover:bg-[#111c30]"
      }`}
    >
      {/* Phase badge + status dot */}
      <div className="mb-2 flex items-center justify-between gap-1">
        <span className={`rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${phaseCls}`}>
          {phaseLabel}
        </span>
        <span
          className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${
            item.status === "STARTED" ? "animate-pulse bg-emerald-400" : "bg-amber-400"
          }`}
        />
      </div>

      {/* Customer primary, personel secondary */}
      <p className="truncate text-[13px] font-bold leading-tight text-white">
        {item.musteriAdi || "İsimsiz iş"}
      </p>
      <p className="mt-0.5 truncate text-[10px] text-slate-500">
        {item.personelAd && item.personelAd !== "Atanmamış" ? item.personelAd : "Personel atanmamış"}
      </p>
      {item.urunAdi ? (
        <p className="truncate text-[9px] text-slate-600">{item.urunAdi}</p>
      ) : null}

      {/* Elapsed timer */}
      <p className={`mt-2.5 text-[28px] font-black leading-none tabular-nums ${elapsedColor}`}>
        {mins}
        {item.expectedMinutes != null && (
          <span className="ml-0.5 text-[10px] font-semibold text-slate-600">
            /{item.expectedMinutes}
          </span>
        )}
        <span className="ml-0.5 text-[11px] font-semibold text-slate-500">dk</span>
      </p>

      {/* Progress bar — sadece plan varsa */}
      {barPct != null && (
        <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className={`h-full rounded-full transition-all duration-700 ${meta.bar}`}
            style={{ width: `${barPct}%` }}
          />
        </div>
      )}

      {/* Risk badge / variance */}
      {risk === "NORMAL" && item.status === "PAUSED" && (
        <p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-amber-500/60">
          Beklemede
        </p>
      )}
      {risk === "NORMAL" && item.status !== "PAUSED" && barPct != null && (
        <p className={`mt-1 text-[9px] font-semibold tabular-nums ${meta.text}`}>
          %{barPct}
        </p>
      )}
      {(risk === "OVERRUN" || risk === "CRITICAL" || risk === "STALE") && (
        <p className={`mt-1 rounded-md px-1.5 py-0.5 text-[9px] font-bold inline-block ${meta.badge}`}>
          {varianceLabel || meta.label}
        </p>
      )}
      {risk === "NO_PLAN" && (
        <p className={`mt-1 text-[9px] font-semibold ${meta.text}`}>Plan yok</p>
      )}
    </button>
  );
}

function fmt(n: number) {
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace(".", ",") + "M";
  if (n >= 1000) return (n / 1000).toFixed(0) + "K";
  return n.toLocaleString("tr-TR");
}

function phoneClean(tel: string) {
  let clean = String(tel || "").replace(/\D/g, "");
  if (clean.startsWith("0")) clean = "90" + clean.slice(1);
  if (clean.length === 10) clean = "90" + clean;
  return clean;
}

function timeAgo(dateStr: string) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return "simdi";
  if (diff < 3600) return Math.floor(diff / 60) + "dk";
  if (diff < 86400) return Math.floor(diff / 3600) + "sa";
  return Math.floor(diff / 86400) + "g";
}

function activityColor(type: string) {
  if (type?.includes("onayla") || type?.includes("tahsilat")) return "#22c55e";
  if (type?.includes("teklif") || type?.includes("yeni")) return "#60a5fa";
  if (type?.includes("kayb") || type?.includes("iptal")) return "#f87171";
  if (type?.includes("montaj") || type?.includes("imalat") || type?.includes("olcu")) return "#a78bfa";
  return "#94a3b8";
}

function phaseColor(phase: string) {
  if (phase === "OLCU") return "#60a5fa";
  if (phase === "IMALAT") return "#f59e0b";
  if (phase === "MONTAJ") return "#22c55e";
  if (phase === "TAS_ALINACAK") return "#f87171";
  return "#94a3b8";
}

function telHref(phone: string) {
  return "tel:" + phone;
}

function waHref(phone: string, msg: string) {
  const encoded = encodeURIComponent(msg);
  if (phone) return "https://wa.me/" + phone + "?text=" + encoded;
  return "https://wa.me/?text=" + encoded;
}

type FinansBlok = {
  verilen: number;
  onaylanan: number;
  kaybedilen: number;
  devam: number;
  donusumOrani: number;
  teklifSayisi: number;
};

function AiWaButon({
  label,
  phone,
  payload,
  tip,
  className,
}: {
  label: string;
  phone: string;
  payload: Record<string, any>;
  tip: "satis" | "tahsilat";
  className?: string;
}) {
  const [durum, setDurum] = useState<"idle" | "loading" | "done">("idle");
  const [mesaj, setMesaj] = useState("");

  async function tikla() {
    if (durum === "loading") return;

    if (mesaj) {
      const a = document.createElement("a");
      a.href = waHref(phone, mesaj);
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }

    // Open the window synchronously inside the user gesture so mobile
    // Safari does not block it as a popup after the async API call.
    const win = window.open("", "_blank");
    setDurum("loading");
    const fallbackMesaj = tip === "tahsilat"
      ? `Merhaba ${payload.musteriAdi}, ödeme planınız hakkında bilgi vermek için ulaşıyoruz.`
      : `Merhaba ${payload.musteriAdi}, teklifiniz hakkında görüşmek istiyoruz.`;
    try {
      const res = await fetch("/api/ai-sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, tip }),
      });
      const json = await res.json();
      const m: string = (!json.error && json.mesaj) ? json.mesaj : fallbackMesaj;
      setMesaj(m);
      setDurum("done");
      if (win) win.location.href = waHref(phone, m);
    } catch {
      setMesaj(fallbackMesaj);
      setDurum("done");
      if (win) win.location.href = waHref(phone, fallbackMesaj);
    }
  }

  if (durum === "done" && mesaj) {
    const waUrl = waHref(phone, mesaj);
    return (
      <a href={waUrl} target="_blank" rel="noopener noreferrer" className={className} style={{ display: "inline-block", textAlign: "center" }}>
        WA Mesaj Gonder
      </a>
    );
  }

  return (
    <button
      onClick={tikla}
      disabled={durum === "loading"}
      className={className}
    >
      {durum === "loading" ? "Hazirlaniyor..." : label}
    </button>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const [sekme, setSekme] = useState<"yillik" | "aylik">("aylik");
  const [liveOps, setLiveOps] = useState<{
    aktifEkip: AktifEkipItem[];
    toplamAktif: number;
    toplamPaused: number;
    blockedItems: BlockedItem[];
    toplamBlocked: number;
  } | null>(null);
  const [liveTask, setLiveTask] = useState<any | null>(null);

  const lastAkisIdRef = useRef<string | null>(null);
  const seenIdsRef = useRef<Set<string>>(new Set());

  // SSE invalidation için fetch ref'leri — window event handler'ı kapalı scope'tan erişir
  const fetchLiveOpsRef = useRef<(() => void) | null>(null);
  const fetchDashboardRef = useRef<(() => void) | null>(null);


  useEffect(() => {
    async function fetchDashboard(first: boolean) {
      try {
        const r = await fetch("/api/dashboard");
        const json = await r.json();
        if (json?.error) { setError(json.error); return; }

        if (!first && json?.anaAkis?.length > 0) {
          // Daha önce görülmemiş tüm yeni aktiviteleri toast olarak göster
          const yeniler = json.anaAkis.filter(
            (a: any) => a.id && !seenIdsRef.current.has(a.id)
          );
          // En fazla 3 toast göster (fazlası rahatsız edici)
          yeniler.slice(0, 3).forEach((a: any) => {
            showToast("Metrix — Yeni Hareket", a.message);
          });
        }

        // Tüm görülen id'leri kaydet
        if (json?.anaAkis?.length > 0) {
          json.anaAkis.forEach((a: any) => {
            if (a.id) seenIdsRef.current.add(a.id);
          });
          lastAkisIdRef.current = json.anaAkis[0].id;
        }

        setData(json);
      } catch {
        setError("Dashboard verisi alinamadi.");
      }
    }

    fetchDashboardRef.current = () => fetchDashboard(false);
    fetchDashboard(true);
    const interval = setInterval(() => fetchDashboard(false), 10000);
    return () => clearInterval(interval);
  }, []);

  // Live Ops polling — bağımsız interval, ileride SSE invalidation'a bağlanabilir
  useEffect(() => {
    async function fetchLiveOps() {
      try {
        const r = await fetch("/api/dashboard/live-ops");
        if (r.ok) setLiveOps(await r.json());
      } catch {}
    }
    fetchLiveOpsRef.current = fetchLiveOps;
    fetchLiveOps();
    const id = setInterval(fetchLiveOps, 10_000);
    return () => clearInterval(id);
  }, []);

  // SSE execution_status → immediate refetch (2s debounce guard)
  useEffect(() => {
    let lastFire = 0;
    function handleExecutionUpdate() {
      const now = Date.now();
      if (now - lastFire < 2000) return;
      lastFire = now;
      fetchLiveOpsRef.current?.();
      fetchDashboardRef.current?.();
    }
    window.addEventListener("metrix:execution_update", handleExecutionUpdate);
    return () => window.removeEventListener("metrix:execution_update", handleExecutionUpdate);
  }, []);

  const finans: FinansBlok = useMemo(
    () =>
      data?.finans?.[sekme] ?? {
        verilen: 0,
        onaylanan: 0,
        kaybedilen: 0,
        devam: 0,
        donusumOrani: 0,
        teklifSayisi: 0,
      },
    [data, sekme]
  );

  const sicakTeklifler = useMemo(() => data?.sicakTeklifler || [], [data]);
  const anaAkis = useMemo(() => data?.anaAkis || [], [data]);
  const operasyonPlan = useMemo(() => data?.operasyonPlan || [], [data]);
  const operasyonKpi = useMemo(() => data?.operasyonKpi ?? { planlanan: 0, islemde: 0, tamamlanan: 0, geciken: 0 }, [data]);
  const aktifEkip = useMemo(() => liveOps?.aktifEkip ?? [], [liveOps]);
  const liveToplamAktif = useMemo(() => liveOps?.toplamAktif ?? 0, [liveOps]);
  const liveToplamPaused = useMemo(() => liveOps?.toplamPaused ?? 0, [liveOps]);
  const blockedItems = useMemo(() => liveOps?.blockedItems ?? [], [liveOps]);
  const liveToplamBlocked = useMemo(() => liveOps?.toplamBlocked ?? 0, [liveOps]);
  const vadesiGelenler = useMemo(() => data?.vadesiGelenler || [], [data]);
  const atelye = useMemo(() => data?.atelye || {}, [data]);

  const toplamBar = finans.onaylanan + finans.kaybedilen + finans.devam;
  const onayPct = toplamBar > 0 ? Math.round((finans.onaylanan / toplamBar) * 100) : 0;
  const devamPct = toplamBar > 0 ? Math.round((finans.devam / toplamBar) * 100) : 0;
  const kaybPct = toplamBar > 0 ? 100 - onayPct - devamPct : 0;

  const _bugun = new Date();
  const gunAdi = _bugun.toLocaleDateString("tr-TR", { weekday: "long" });
  const tamTarih = _bugun.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });

  const kartlar = [
    { label: "Verilen Teklif", val: finans.verilen, sub: finans.teklifSayisi + " teklif", color: "text-white", border: "border-white/10" },
    { label: "Onaylanan", val: finans.onaylanan, sub: "%" + finans.donusumOrani + " donusum", color: "text-emerald-400", border: "border-emerald-500/20" },
    { label: "Devam Eden", val: finans.devam, sub: (atelye.bekleyenOperasyon ?? 0) + " bekliyor", color: "text-blue-400", border: "border-blue-500/20" },
    { label: "Kaybedilen", val: finans.kaybedilen, sub: "%" + kaybPct + " kayip", color: "text-red-400", border: "border-red-500/20" },
  ];

  if (!data && !error) {
    return (
      <main className="min-h-screen bg-[#030712] px-3 pb-tab-bar pt-0 md:px-6 md:pb-8 md:pt-0">
        <div className="mx-auto max-w-4xl">
          {/* Header skeleton */}
          <div className="-mx-3 flex items-center justify-between border-b border-white/[0.06] px-3 py-3 md:-mx-6 md:px-6 md:py-4">
            <div className="space-y-1.5">
              <SkeletonLine className="w-24 bg-white/[0.04]" />
              <Skeleton className="h-5 w-28 bg-white/[0.06]" />
            </div>
            <div className="space-y-1.5 text-right">
              <SkeletonLine className="ml-auto w-16 bg-white/[0.04]" />
              <SkeletonLine className="ml-auto w-24 bg-white/[0.03]" />
            </div>
          </div>
          {/* Card skeletons */}
          <div className="space-y-4 pt-4">
            {/* KPI card */}
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
              <div className="mb-4 flex items-center justify-between">
                <SkeletonLine className="w-32 bg-white/[0.06]" />
                <Skeleton className="h-6 w-16 rounded-lg bg-white/[0.04]" />
              </div>
              <div className="mb-4 grid grid-cols-2 gap-2">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="rounded-xl border border-white/[0.04] bg-white/[0.02] px-3 py-2.5">
                    <SkeletonLine className="mb-2 w-16 bg-white/[0.05]" />
                    <Skeleton className="h-7 w-10 bg-white/[0.06]" />
                  </div>
                ))}
              </div>
              <div className="space-y-2.5">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex items-center gap-3 border-b border-white/[0.04] py-2 last:border-0">
                    <SkeletonLine className="w-8 shrink-0 bg-white/[0.04]" />
                    <Skeleton className="h-2 w-2 shrink-0 rounded-full bg-white/[0.05]" />
                    <div className="flex-1 space-y-1">
                      <SkeletonLine className="w-3/4 bg-white/[0.05]" />
                      <SkeletonLine className="w-1/2 bg-white/[0.03]" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* Activity card */}
            <SkeletonCard />
            {/* Tahsilat card */}
            <SkeletonCard />
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#030712]">
        <p className="text-sm text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#030712] px-3 pb-tab-bar pt-0 md:px-6 md:pb-8 md:pt-0">
      <InAppToast />
      <div className="mx-auto max-w-4xl">

        <div className="sticky top-0 z-30 -mx-3 flex items-center justify-between border-b border-white/[0.06] bg-[#030712]/90 px-3 py-3 backdrop-blur-md md:-mx-6 md:px-6 md:py-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Operasyon Merkezi</p>
            <h1 className="mt-0.5 text-lg font-bold text-white">Dashboard</h1>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold capitalize text-white">{gunAdi}</p>
            <p className="mt-0.5 text-[10px] text-slate-500">{tamTarih}</p>
          </div>
        </div>

        <div className="space-y-4 pt-4">
        {/* ── 1. GÜNÜN PROGRAMI ────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-white/10 bg-[#0B1120] p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500">Gunluk Operasyon</p>
              <p className="mt-0.5 text-sm font-semibold text-white">Bugunun Programi</p>
            </div>
            <Link href="/dashboard/is-programi" className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] text-slate-400 transition-colors hover:text-white">
              Program
            </Link>
          </div>

          {/* 4 KPI kart — 2×2 grid */}
          <div className="mb-4 grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5">
              <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Planlanan</p>
              <p className="mt-1 text-2xl font-black leading-none text-white tabular-nums">{operasyonKpi.planlanan}</p>
              <p className="mt-0.5 text-[10px] text-slate-600">operasyon</p>
            </div>
            <div className="rounded-xl border border-blue-500/20 bg-blue-500/[0.06] px-3 py-2.5">
              <p className="text-[10px] uppercase tracking-[0.14em] text-blue-400">İşlemde</p>
              <p className="mt-1 text-2xl font-black leading-none text-blue-300 tabular-nums">{operasyonKpi.islemde}</p>
              <p className="mt-0.5 text-[10px] text-blue-400/50">aktif</p>
            </div>
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] px-3 py-2.5">
              <p className="text-[10px] uppercase tracking-[0.14em] text-emerald-500">Tamamlanan</p>
              <p className="mt-1 text-2xl font-black leading-none text-emerald-400 tabular-nums">{operasyonKpi.tamamlanan}</p>
              <p className="mt-0.5 text-[10px] text-emerald-500/50">bitti</p>
            </div>
            <div className="rounded-xl border border-red-500/20 bg-red-500/[0.06] px-3 py-2.5">
              <p className="text-[10px] uppercase tracking-[0.14em] text-red-400">Geciken</p>
              <p className={`mt-1 text-2xl font-black leading-none tabular-nums ${operasyonKpi.geciken > 0 ? "text-red-400" : "text-slate-600"}`}>{operasyonKpi.geciken}</p>
              <p className="mt-0.5 text-[10px] text-red-400/50">suresi gecti</p>
            </div>
          </div>

          {operasyonPlan.length === 0 && (
            <EmptyState
              icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>}
              title="Bugün için plan yok"
              description="İş programından operasyon ekleyebilirsin."
              action={{ label: "İş Programına Git", href: "/dashboard/is-programi" }}
            />
          )}
          <div className="space-y-0">
            {operasyonPlan.map((o: any) => (
              <div key={o.id} className="flex items-start gap-3 border-b border-white/5 py-2.5 last:border-0">
                <span className="w-10 flex-shrink-0 pt-0.5 text-[11px] font-semibold tabular-nums text-slate-500">{o.saat}</span>
                <div className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full" style={{ background: phaseColor(o.phase) }} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-[12px] font-semibold text-white">{o.tip}</p>
                    {o.tamamlandi && (
                      <span className="rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-bold text-emerald-400">Tamam</span>
                    )}
                  </div>
                  <p className="mt-0.5 text-[11px] text-slate-500">{o.musteri}{o.urun ? " · " + o.urun : ""}</p>
                </div>
              </div>
            ))}
          </div>
          {atelye.bugunOperasyon > 0 && (
            <div className="mt-3 flex items-center justify-between rounded-xl border border-white/5 bg-white/5 px-3 py-2">
              <span className="text-[11px] text-slate-500">
                {atelye.bugunOperasyon - atelye.bekleyenOperasyon}/{atelye.bugunOperasyon} görev tamamlandı
              </span>
              <span className={`text-[11px] font-semibold ${atelye.bekleyenOperasyon === 0 ? "text-emerald-400" : "text-amber-400"}`}>
                {atelye.bekleyenOperasyon === 0 ? "Tümü tamam" : `${atelye.bekleyenOperasyon} aktif`}
              </span>
            </div>
          )}
        </div>

        {/* ── 2. AKTİF OPERASYON STRIP — sadece aktif varsa ───────────────── */}
        {aktifEkip.length > 0 && (
          <div>
            <div className="mb-2.5 flex items-center justify-between">
              <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500">Aktif Operasyon</p>
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                <span className="text-[10px] font-semibold text-emerald-400">{liveToplamAktif} çalışıyor</span>
                {liveToplamPaused > 0 && (
                  <span className="text-[10px] font-semibold text-amber-400">· {liveToplamPaused} beklemede</span>
                )}
              </span>
            </div>
            <div
              className="flex gap-3 overflow-x-auto pb-1"
              style={{ scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch" } as React.CSSProperties}
            >
              {aktifEkip.map((e) => (
                <LiveCard
                  key={e.execId}
                  item={e}
                  onClick={() => setLiveTask({ id: e.phaseId, phase: e.phaseType, title: e.musteriAdi, subtitle: e.urunAdi, completed: false, schedule: {} })}
                />
              ))}
              {/* Sağ tarafta hafif fade — peek hissi */}
              <div className="flex-shrink-0" style={{ minWidth: 8 }} />
            </div>
          </div>
        )}

        {/* ── 3. CANLI AKIŞ — geçmiş hareketler ───────────────────────────── */}
        <div className="rounded-2xl border border-blue-500/15 bg-[#090f1d] p-4">
          <div className="mb-4 flex items-start justify-between gap-2">
            <div>
              <p className="text-[11px] uppercase tracking-[0.12em] text-blue-400">Canli Akis</p>
              <p className="mt-0.5 text-base font-bold text-white">Ekip Hareketleri</p>
            </div>
            <span className="flex items-center gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold text-emerald-400">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
              Canli
            </span>
          </div>
          {anaAkis.length === 0 && (
            <EmptyState
              icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>}
              title="Henüz aktivite yok"
              description="İşlemler başladıkça burada görünecek."
            />
          )}
          <div className="overflow-y-auto" style={{ maxHeight: 360 }}>
            {anaAkis.map((a: any, i: number) => (
              <div key={a.id || i} className="-mx-1 flex items-start gap-3 rounded-lg border-b border-white/5 px-1 py-3 last:border-0 transition-colors hover:bg-white/[0.03]">
                <div className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full" style={{ background: activityColor(a.type) }} />
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] leading-snug text-slate-200">{a.message}</p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                    {a.actorAdi && (
                      <span className="rounded-md bg-white/5 px-1.5 py-0.5 text-[10px] font-semibold text-slate-400">{a.actorAdi}</span>
                    )}
                    <p className="text-[10px] uppercase tracking-wider text-slate-600">{a.type?.replace(/_/g, " ")}</p>
                  </div>
                </div>
                <span className="flex-shrink-0 whitespace-nowrap text-[10px] text-slate-600">{timeAgo(a.createdAt)}</span>
              </div>
            ))}
          </div>
          {anaAkis.length > 0 && (
            <p className="mt-3 text-center text-[10px] text-slate-700">Son 5 is gunu · {anaAkis.length} hareket</p>
          )}
        </div>

        {/* ── 4. TAKİLAN İŞLER ─────────────────────────────────────────────── */}
        {blockedItems.length > 0 && (
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[11px] uppercase tracking-[0.12em] text-red-400">Takılan İşler</p>
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                <span className="text-[10px] font-semibold text-red-400">{liveToplamBlocked} takılı</span>
              </span>
            </div>
            <div className="space-y-2">
              {blockedItems.map((item) => {
                const phaseLabel =
                  item.phaseType === "IMALAT" ? "İmalat" :
                  item.phaseType === "MONTAJ" ? "Montaj" : "Ölçü";
                const phaseCls =
                  item.phaseType === "IMALAT" ? "bg-amber-500/15 text-amber-400" :
                  item.phaseType === "MONTAJ" ? "bg-emerald-500/15 text-emerald-400" :
                  "bg-blue-500/15 text-blue-400";
                const reasonLabel = item.cannotStartReason
                  ? (CANNOT_START_REASON_LABELS[item.cannotStartReason] ?? item.cannotStartReason)
                  : null;
                const hasCost = item.materialLossCost && Number(item.materialLossCost) > 0;
                const blockedHours = item.elapsedBlockedMinutes >= 60
                  ? `${Math.floor(item.elapsedBlockedMinutes / 60)} sa ${item.elapsedBlockedMinutes % 60} dk`
                  : `${item.elapsedBlockedMinutes} dk`;

                return (
                  <button
                    key={item.execId}
                    onClick={() => setLiveTask({ id: item.phaseId, phase: item.phaseType, title: item.musteriAdi, subtitle: item.urunAdi, completed: false, schedule: {} })}
                    className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-2.5 cursor-pointer text-left transition-colors active:scale-[0.98] ${
                      item.elapsedBlockedMinutes >= 240
                        ? "border-red-500/40 bg-red-500/[0.08] hover:border-red-500/50 hover:bg-red-500/[0.12]"
                        : item.elapsedBlockedMinutes >= 120
                        ? "border-red-500/25 bg-red-500/[0.06] hover:border-red-500/35 hover:bg-red-500/[0.09]"
                        : "border-red-500/15 bg-red-500/[0.04] hover:border-red-500/25 hover:bg-red-500/[0.07]"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className={`rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${phaseCls}`}>
                          {phaseLabel}
                        </span>
                        <p className="truncate text-[12px] font-bold text-white">{item.musteriAdi}</p>
                      </div>
                      {reasonLabel && (
                        <p className="mt-0.5 text-[10px] text-red-300/70">{reasonLabel}</p>
                      )}
                      {hasCost && (
                        <p className="mt-0.5 text-[10px] font-bold text-red-400">
                          ₺{Number(item.materialLossCost).toLocaleString("tr-TR")} maliyet
                        </p>
                      )}
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <p className={`text-[11px] font-bold tabular-nums ${item.elapsedBlockedMinutes >= 240 ? "animate-pulse text-red-300" : "text-red-300"}`}>{blockedHours}</p>
                      <p className="text-[9px] text-red-500/50">takılı</p>
                      {item.elapsedBlockedMinutes >= 240 && (
                        <span className="mt-0.5 inline-block rounded-md bg-red-500/20 px-1.5 py-0.5 text-[8px] font-bold text-red-400 animate-pulse">Acil</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── 5. TAHSİLAT ──────────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-amber-500/15 bg-[#0B1120] p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.12em] text-amber-600">Tahsilat</p>
              <p className="mt-0.5 text-sm font-semibold text-white">Vadesi Gelen Odemeler</p>
            </div>
            <Link href="/dashboard/tahsilatlar" className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] text-slate-400 transition-colors hover:text-white">
              Tumu
            </Link>
          </div>
          {vadesiGelenler.length === 0 && (
            <EmptyState
              icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>}
              title="Vadesi gelen ödeme yok"
              description="Tüm ödemeler zamanında."
            />
          )}
          <div className="space-y-0">
            {vadesiGelenler.map((v: any) => {
              const phone = phoneClean(v.musteriTelefon);
              const isGecmis = v.durum === "gecmis";
              const aiPayload = {
                musteriAdi: v.musteriAdi,
                tutar: v.tutar,
                vadeTarihi: v.vadeTarihi,
                gecenGun: v.gecenGun,
                teklifNo: v.teklifNo,
              };
              return (
                <div key={v.id} className="border-b border-white/5 py-3 last:border-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12px] font-semibold text-white">{v.musteriAdi}</p>
                      <p className="mt-0.5 text-[10px] text-slate-600">
                        {new Date(v.vadeTarihi).toLocaleDateString("tr-TR")}{v.teklifNo ? " · " + v.teklifNo : ""}
                      </p>
                    </div>
                    <div className="flex flex-shrink-0 flex-col items-end gap-1.5">
                      <p className={"text-[13px] font-black " + (isGecmis ? "text-red-400" : "text-amber-400")}>{"₺" + fmt(v.tutar)}</p>
                      {isGecmis ? (
                        <span className="rounded-md bg-red-500/10 px-1.5 py-0.5 text-[9px] font-bold text-red-400">{v.gecenGun}g gecti</span>
                      ) : (
                        <span className="rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-bold text-amber-400">Bugun</span>
                      )}
                    </div>
                  </div>
                  <div className="mt-1.5">
                    {phone.length > 0 ? (
                      <AiWaButon
                        label="WA Mesaj Gonder"
                        phone={phone}
                        payload={aiPayload}
                        tip="tahsilat"
                        className="rounded-md bg-amber-500/10 px-2 py-1 text-[10px] font-semibold text-amber-400 transition-colors hover:bg-amber-500/20 disabled:opacity-50 border border-amber-500/20"
                      />
                    ) : (
                      <Link
                        href={v.musteriId ? `/dashboard/musteriler?musteriId=${v.musteriId}&duzenle=1` : "/dashboard/musteriler"}
                        className="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-slate-800/60 px-2 py-1 text-[10px] text-slate-500 hover:text-slate-300 transition-colors"
                      >
                        <span>Telefon kayitli degil</span>
                        <span className="text-slate-600">· Ekle</span>
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── 6. SICAK SATIŞLAR ────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-emerald-500/15 bg-[#08111f] p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.12em] text-emerald-500">Satis Skoru</p>
              <p className="mt-0.5 text-sm font-semibold text-white">Takip Edilmesi Gerekenler</p>
            </div>
            <Link href="/dashboard/isler" className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] text-slate-400 transition-colors hover:text-white">
              Tumu
            </Link>
          </div>
          <div className="space-y-3">
            {sicakTeklifler.length === 0 && (
              <EmptyState
                icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></svg>}
                title="Takip gerektiren teklif yok"
                description="Aktif teklifler burada listelenecek."
                action={{ label: "İşlere Git", href: "/dashboard/isler" }}
              />
            )}
            {sicakTeklifler.map((t: any) => {
              const score = Number(t.ihtimal || 0);
              const phone = phoneClean(t.telefon);
              const borderColor = score >= 85 ? "border-red-500/40" : score >= 65 ? "border-amber-500/30" : "border-white/10";
              const badgeBg = score >= 85 ? "bg-red-500/15 text-red-400" : score >= 65 ? "bg-amber-500/15 text-amber-400" : "bg-slate-800 text-slate-400";
              const badgeLabel = score >= 85 ? "Cok Sicak" : score >= 65 ? "Sicak" : "Takip";
              const aiPayload = {
                musteri: t.musteri,
                tutar: t.tutar,
                goruntulenme: t.goruntulenme,
                pdf: t.pdf,
                aksiyonTipi: t.aksiyonTipi,
                aksiyonSaati: t.aksiyonSaati,
                ihtimal: score,
              };
              return (
                <div key={t.teklifNo} className={"rounded-xl border " + borderColor + " bg-[#0B1120] p-3"}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-white">{t.musteri}</p>
                      <p className="mt-0.5 text-[11px] text-slate-500">{t.teklifNo}</p>
                    </div>
                    <div className="flex flex-shrink-0 flex-col items-end gap-1">
                      <span className={"rounded-lg px-2 py-0.5 text-[11px] font-bold " + badgeBg}>
                        %{score} · {badgeLabel}
                      </span>
                      <p className="text-[11px] font-semibold text-white">{"₺" + fmt(t.tutar)}</p>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <span className="rounded-md bg-slate-800/80 px-2 py-0.5 text-[10px] text-slate-400">{t.goruntulenme}x goruntulendi</span>
                    <span className="rounded-md bg-blue-950/60 px-2 py-0.5 text-[10px] text-blue-400">PDF {t.pdf}x</span>
                    {t.aksiyonMesaji && (
                      <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-400">{t.aksiyonMesaji}</span>
                    )}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {t.aksiyonTipi === "ara" && phone.length > 0 && (
                      <a href={telHref(phone)} className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-[11px] font-bold text-white">
                        Hemen Ara
                      </a>
                    )}
                    <AiWaButon
                      label="AI WhatsApp"
                      phone={phone}
                      payload={aiPayload}
                      tip="satis"
                      className="flex items-center gap-1.5 rounded-lg bg-emerald-600/90 px-3 py-1.5 text-[11px] font-bold text-white disabled:opacity-60"
                    />
                    <Link href="/dashboard/isler" className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] text-slate-300">
                      Detay
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── 6. FİNANS — compact, at bottom ──────────────────────────────── */}
        <div className="flex items-center justify-between pt-2">
          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Finans Ozeti</p>
          <div className="flex gap-1 rounded-xl border border-white/10 bg-white/5 p-1">
            <button
              onClick={() => setSekme("aylik")}
              className={"rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-all " + (sekme === "aylik" ? "bg-blue-600 text-white shadow" : "text-slate-400 hover:text-white")}
            >
              Bu Ay
            </button>
            <button
              onClick={() => setSekme("yillik")}
              className={"rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-all " + (sekme === "yillik" ? "bg-blue-600 text-white shadow" : "text-slate-400 hover:text-white")}
            >
              Bu Yil
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {kartlar.map((k) => (
            <div key={k.label} className={"rounded-2xl border " + k.border + " bg-[#0B1120] p-3"}>
              <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500">{k.label}</p>
              <p className={"mt-1.5 text-xl font-black leading-none " + k.color}>{"₺" + fmt(k.val)}</p>
              <p className="mt-1 text-[10px] text-slate-600">{k.sub}</p>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#0B1120] p-4">
          <p className="mb-3 text-[11px] uppercase tracking-[0.12em] text-slate-500">Teklif dagilimi</p>
          <div className="flex h-2.5 w-full overflow-hidden rounded-full">
            <div style={{ width: onayPct + "%", background: "#22c55e" }} className="transition-all duration-700" />
            <div style={{ width: devamPct + "%", background: "#3b82f6" }} className="transition-all duration-700" />
            <div style={{ width: kaybPct + "%", background: "#ef4444" }} className="transition-all duration-700" />
          </div>
          <div className="mt-3 flex flex-wrap gap-3">
            {[
              { color: "#22c55e", label: "Onaylanan", pct: onayPct },
              { color: "#3b82f6", label: "Devam", pct: devamPct },
              { color: "#ef4444", label: "Kaybedilen", pct: kaybPct },
            ].map((l) => (
              <span key={l.label} className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ background: l.color }} />
                {l.label} %{l.pct}
              </span>
            ))}
          </div>
        </div>

        </div>{/* space-y-4 wrapper */}
      </div>

      {liveTask && (
        <TaskDetailModal
          task={liveTask}
          canEdit={false}
          onClose={() => { setLiveTask(null); fetchLiveOpsRef.current?.(); }}
          onUpdated={() => {
            setLiveTask(null);
            fetchLiveOpsRef.current?.();
            fetchDashboardRef.current?.();
          }}
        />
      )}
    </main>
  );
}
