"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { SkeletonCard, SkeletonLine, Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import Link from "next/link";
import InAppToast, { showToast } from "@/components/push/InAppToast";
import TaskDetailModal from "@/components/schedule/TaskDetailModal";
import OnboardingChecklist from "@/components/onboarding/OnboardingChecklist";

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
  const [activeDashboardTab, setActiveDashboardTab] = useState<"live" | "operations" | "sales" | "cash" | "reports">("live");
  const [selectedActivity, setSelectedActivity] = useState<any | null>(null);
  const [dashboardCoachWelcome, setDashboardCoachWelcome] = useState(false);
  const [dashboardCoachActive, setDashboardCoachActive] = useState(false);
  const [dashboardCoachIndex, setDashboardCoachIndex] = useState(0);
  const [dashboardCoachRect, setDashboardCoachRect] = useState<DOMRect | null>(null);
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

  useEffect(() => {
    if (typeof window === "undefined" || window.innerWidth < 768) return;
    const dismissed = localStorage.getItem("metrix-dashboard-coach-dismissed") === "1";
    const completed = localStorage.getItem("metrix-dashboard-coach-completed") === "1";
    if (!dismissed && !completed) setDashboardCoachWelcome(true);
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

  const desktopKpis = [
    { label: "Bugünkü Operasyon", value: String(atelye.bugunOperasyon ?? operasyonPlan.length), sub: `${operasyonKpi.tamamlanan} tamamlandı`, tone: "text-slate-950" },
    { label: "İşlemde", value: String(liveToplamAktif || operasyonKpi.islemde || 0), sub: liveToplamPaused > 0 ? `${liveToplamPaused} beklemede` : "canlı takip", tone: "text-blue-600" },
    { label: "Takılan İş", value: String(liveToplamBlocked), sub: liveToplamBlocked > 0 ? "kontrol gerekli" : "engel yok", tone: liveToplamBlocked > 0 ? "text-red-600" : "text-emerald-600" },
    { label: "Vadesi Gelen", value: String(vadesiGelenler.length), sub: "tahsilat", tone: vadesiGelenler.length > 0 ? "text-amber-600" : "text-emerald-600" },
    { label: "Sıcak Teklif", value: String(sicakTeklifler.length), sub: "satış fırsatı", tone: "text-violet-600" },
    { label: "Aylık Onaylanan", value: "₺" + fmt(finans.onaylanan), sub: `%${finans.donusumOrani} dönüşüm`, tone: "text-emerald-600" },
  ];

  const desktopActions = [
    { label: "Yeni İş", href: "/dashboard/yeni-is-v3", target: "dashboard-action-new-job" },
    { label: "İş Programı", href: "/dashboard/is-programi", target: "dashboard-action-schedule" },
    { label: "Tahsilatlar", href: "/dashboard/tahsilatlar", target: "dashboard-action-tahsilat" },
    { label: "Müşteriler", href: "/dashboard/musteriler" },
    { label: "Atölye", href: "/dashboard/atolye" },
    { label: "Raporlar", href: "/dashboard" },
  ];

  const dashboardTabs = [
    { id: "live" as const, label: "Canlı Operasyon Akışı", target: "dashboard-tab-live" },
    { id: "operations" as const, label: "Günün Operasyonları", target: "dashboard-tab-operations" },
    { id: "sales" as const, label: "Satış Sinyali", target: "dashboard-tab-sales" },
    { id: "cash" as const, label: "Nakit Akışı", target: "dashboard-tab-cash" },
    { id: "reports" as const, label: "Raporlar", target: "dashboard-tab-reports" },
  ];

  const dashboardCoachSteps = [
    {
      target: "dashboard-kpi-strip",
      tab: "live" as const,
      title: "İşletmenin günlük nabzı.",
      copy: "Operasyon, tahsilat ve satış yoğunluğunu gün içinde ilk buradan okuyun.",
    },
    {
      target: "dashboard-tab-live",
      tab: "live" as const,
      title: "Canlı akış kontrol masasıdır.",
      copy: "Atölyede ve sahada olan biteni gerçek zamanlı takip etmek için bu sekmeyi açık tutun.",
    },
    {
      target: "dashboard-tab-operations",
      tab: "operations" as const,
      title: "Günün operasyonlarını yönetin.",
      copy: "Bugünkü programı, aktif işleri ve takılan operasyonları aynı ekranda kontrol edin.",
    },
    {
      target: "dashboard-tab-sales",
      tab: "sales" as const,
      title: "Sıcak fırsatları kaçırmayın.",
      copy: "Görüntülenen ve hareket alan teklifler öncelikli satış fırsatlarına dönüşür.",
    },
    {
      target: "dashboard-tab-cash",
      tab: "cash" as const,
      title: "Nakit takibini hızlandırın.",
      copy: "Vadesi gelen ödemeleri görün ve müşterilere tek tıkla WhatsApp hatırlatması gönderin.",
    },
    {
      target: "dashboard-tab-reports",
      tab: "reports" as const,
      title: "Yönetici raporlarını okuyun.",
      copy: "Satış, tahsilat ve operasyon performansını tek noktadan analiz edin.",
    },
  ];

  const activeDashboardCoachStep = dashboardCoachSteps[dashboardCoachIndex];

  const bottomSummary: Record<"live" | "operations" | "sales" | "cash" | "reports", string> = {
    live: "Canlı akışta son hareketler takip ediliyor.",
    operations: `Bugün ${atelye.bugunOperasyon ?? operasyonPlan.length} operasyon, ${liveToplamAktif || operasyonKpi.islemde || 0} aktif, ${liveToplamBlocked} takılan iş.`,
    sales: `Sıcak tekliflerde ${sicakTeklifler.length} fırsat takip ediliyor.`,
    cash: `Vadesi gelen ${vadesiGelenler.length} ödeme takip ediliyor.`,
    reports: "Yıl, ay ve performans özetleri görüntüleniyor.",
  };

  function dismissDashboardCoach() {
    localStorage.setItem("metrix-dashboard-coach-dismissed", "1");
    setDashboardCoachWelcome(false);
    setDashboardCoachActive(false);
    setDashboardCoachRect(null);
  }

  function completeDashboardCoach() {
    localStorage.setItem("metrix-dashboard-coach-completed", "1");
    setDashboardCoachWelcome(false);
    setDashboardCoachActive(false);
    setDashboardCoachRect(null);
  }

  function startDashboardCoach() {
    localStorage.removeItem("metrix-dashboard-coach-dismissed");
    setDashboardCoachWelcome(false);
    setDashboardCoachIndex(0);
    setDashboardCoachActive(true);
  }

  function teklifSicaklikSkoru(t: any) {
    const goruntulenme = Number(t.goruntulenme || 0);
    const pdf = Number(t.pdf || 0);
    const tutar = Number(t.tutar || 0);
    const mevcutSkor = Number(t.ihtimal || 0);
    const goruntuPuan = Math.min(goruntulenme * 14 + pdf * 12, 42);
    const tutarPuan = tutar >= 250000 ? 22 : tutar >= 100000 ? 16 : tutar >= 50000 ? 10 : tutar > 0 ? 6 : 0;
    const aksiyonPuan = t.aksiyonTipi ? 14 : 6;
    const fallbackPuan = mevcutSkor > 0 ? Math.round(mevcutSkor * 0.35) : 18;
    return Math.max(0, Math.min(100, goruntuPuan + tutarPuan + aksiyonPuan + fallbackPuan));
  }

  function sicaklikMeta(score: number) {
    if (score >= 70) return { label: "Sıcak fırsat", bar: "bg-red-400", text: "text-red-300", border: "border-red-400/20", bg: "from-red-500/[0.11]" };
    if (score >= 40) return { label: "Isınıyor", bar: "bg-amber-400", text: "text-amber-300", border: "border-amber-400/20", bg: "from-amber-500/[0.10]" };
    return { label: "Soğuk", bar: "bg-blue-400", text: "text-blue-300", border: "border-blue-400/20", bg: "from-blue-500/[0.09]" };
  }

  const yillikFinans = data?.finans?.yillik ?? { verilen: 0, onaylanan: 0, kaybedilen: 0, devam: 0, donusumOrani: 0, teklifSayisi: 0 };
  const aylikFinans = data?.finans?.aylik ?? { verilen: 0, onaylanan: 0, kaybedilen: 0, devam: 0, donusumOrani: 0, teklifSayisi: 0 };
  const vadesiGelenToplam = vadesiGelenler.reduce((s: number, v: any) => s + Number(v.tutar || 0), 0);
  const operasyonYogunlugu = Number(atelye.doluluk ?? operasyonPlan.length ?? 0);
  const operasyonSaglikSkoru = Math.max(0, Math.min(100,
    58 +
    Math.min(sicakTeklifler.length * 4, 14) -
    Math.min(vadesiGelenler.length * 3, 18) -
    Math.min(liveToplamBlocked * 8, 24) +
    Math.min((liveToplamAktif || operasyonKpi.islemde || 0) * 3, 12)
  ));
  const performansLabel =
    operasyonSaglikSkoru >= 85 ? "Çok Güçlü" :
    operasyonSaglikSkoru >= 68 ? "Güçlü" :
    operasyonSaglikSkoru >= 45 ? "Dengeli" : "Zayıf";
  const raporDonem = `${_bugun.toLocaleDateString("tr-TR", { month: "long" })} ${_bugun.getFullYear()}`;
  const raporRows = [
    {
      donem: "Bu Ay",
      satis: `₺${fmt(aylikFinans.onaylanan)}`,
      tahsilat: vadesiGelenler.length > 0 ? `₺${fmt(vadesiGelenToplam)} vadesi gelen` : "Risk yok",
      uretim: `${operasyonPlan.length} operasyon`,
      geciken: `${operasyonKpi.geciken} geciken / ${liveToplamBlocked} takılan`,
      sicak: `${sicakTeklifler.length} fırsat`,
      skor: operasyonSaglikSkoru,
      degisim: "baz veri yok",
      trend: "neutral",
    },
    {
      donem: "Geçen Ay",
      satis: "veri yok",
      tahsilat: "veri yok",
      uretim: "veri yok",
      geciken: "veri yok",
      sicak: "veri yok",
      skor: null,
      degisim: "karşılaştırma yok",
      trend: "none",
    },
    {
      donem: "Son 3 Ay",
      satis: "takip başlıyor",
      tahsilat: "takip başlıyor",
      uretim: `${operasyonPlan.length} güncel operasyon`,
      geciken: `${liveToplamBlocked} takılma`,
      sicak: `${sicakTeklifler.length} sinyal`,
      skor: operasyonSaglikSkoru,
      degisim: "baz oluşuyor",
      trend: "neutral",
    },
    {
      donem: "Bu Yıl",
      satis: `₺${fmt(yillikFinans.onaylanan)}`,
      tahsilat: vadesiGelenToplam > 0 ? `₺${fmt(vadesiGelenToplam)} açık takip` : "açık takip yok",
      uretim: `${atelye.bugunOperasyon ?? operasyonPlan.length} bugünkü operasyon`,
      geciken: `${operasyonKpi.geciken} geciken`,
      sicak: `${sicakTeklifler.length} aktif fırsat`,
      skor: Math.max(0, Math.min(100, operasyonSaglikSkoru + Math.round(Number(yillikFinans.donusumOrani || 0) / 5))),
      degisim: Number(yillikFinans.donusumOrani || 0) > 50 ? "güçlü" : "takipte",
      trend: Number(yillikFinans.donusumOrani || 0) > 50 ? "up" : "neutral",
    },
    {
      donem: "Geçen Yıl",
      satis: "veri yok",
      tahsilat: "veri yok",
      uretim: "veri yok",
      geciken: "veri yok",
      sicak: "veri yok",
      skor: null,
      degisim: "karşılaştırma yok",
      trend: "none",
    },
    {
      donem: "Genel Toplam",
      satis: `₺${fmt(yillikFinans.onaylanan + yillikFinans.devam)}`,
      tahsilat: `₺${fmt(vadesiGelenToplam)} izleniyor`,
      uretim: `${operasyonPlan.length} plan satırı`,
      geciken: `${operasyonKpi.geciken + liveToplamBlocked} risk`,
      sicak: `${sicakTeklifler.length} fırsat`,
      skor: operasyonSaglikSkoru,
      degisim: "anlık görünüm",
      trend: "neutral",
    },
  ];

  useEffect(() => {
    if (!dashboardCoachActive || !activeDashboardCoachStep) {
      setDashboardCoachRect(null);
      return;
    }

    setActiveDashboardTab(activeDashboardCoachStep.tab);
    let timeout: ReturnType<typeof setTimeout> | null = null;

    function updateTargetRect() {
      const el = document.querySelector(
        `[data-onboarding-target="${activeDashboardCoachStep.target}"]`
      ) as HTMLElement | null;
      if (!el) {
        setDashboardCoachRect(null);
        return;
      }
      el.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
      setDashboardCoachRect(el.getBoundingClientRect());
    }

    timeout = setTimeout(updateTargetRect, 180);
    window.addEventListener("resize", updateTargetRect);
    window.addEventListener("scroll", updateTargetRect, true);

    return () => {
      if (timeout) clearTimeout(timeout);
      window.removeEventListener("resize", updateTargetRect);
      window.removeEventListener("scroll", updateTargetRect, true);
    };
  }, [dashboardCoachActive, dashboardCoachIndex, activeDashboardCoachStep?.target, activeDashboardCoachStep?.tab]);

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
    <main className="min-h-screen bg-[#030712] px-3 pb-tab-bar pt-0 md:h-[100dvh] md:overflow-hidden md:bg-[radial-gradient(circle_at_12%_8%,rgba(37,99,235,0.18),transparent_28%),radial-gradient(circle_at_78%_0%,rgba(16,185,129,0.12),transparent_26%),#07111f] md:px-4 md:pb-0 md:pt-3 lg:px-6">
      <InAppToast />

      <div className="mx-auto hidden h-full min-h-0 w-full max-w-[1840px] flex-col gap-3 md:flex">
        <header
          data-onboarding-target="dashboard-header"
          className="flex shrink-0 items-center justify-between gap-5 rounded-[28px] border border-white/10 bg-slate-950/42 px-5 py-3.5 shadow-[0_24px_90px_rgba(0,0,0,0.24)] backdrop-blur-xl"
        >
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">Metrix Cockpit</p>
            <h1 className="mt-1 text-2xl font-black tracking-[-0.03em] text-white">Operasyon Merkezi</h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-400">
              Bugünkü üretim, tahsilat ve satış akışını tek ekrandan yönetin.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap justify-end gap-2">
            <span className="rounded-2xl border border-blue-400/20 bg-blue-500/10 px-3 py-2 text-xs font-black text-blue-300 shadow-[0_0_24px_rgba(59,130,246,0.12)]">
              {liveToplamAktif} aktif operasyon
            </span>
            <span className={`rounded-2xl border px-3 py-2 text-xs font-black ${liveToplamBlocked > 0 ? "border-red-400/25 bg-red-500/10 text-red-300 shadow-[0_0_24px_rgba(239,68,68,0.12)]" : "border-emerald-400/20 bg-emerald-500/10 text-emerald-300"}`}>
              {liveToplamBlocked} takılan iş
            </span>
            <span className={`rounded-2xl border px-3 py-2 text-xs font-black ${vadesiGelenler.length > 0 ? "border-amber-400/25 bg-amber-500/10 text-amber-300 shadow-[0_0_24px_rgba(245,158,11,0.12)]" : "border-emerald-400/20 bg-emerald-500/10 text-emerald-300"}`}>
              {vadesiGelenler.length} vadesi gelen ödeme
            </span>
          </div>
        </header>

        <section data-onboarding-target="dashboard-kpi-strip" className="grid shrink-0 grid-cols-6 gap-2">
          {desktopKpis.map((kpi, index) => (
            <div key={kpi.label} className="group relative min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.055] p-3 shadow-[0_16px_50px_rgba(0,0,0,0.18)] backdrop-blur-xl">
              <div className={`absolute -right-7 -top-7 h-20 w-20 rounded-full blur-2xl ${
                index === 1 ? "bg-blue-500/20" :
                index === 2 ? "bg-red-500/18" :
                index === 3 ? "bg-amber-500/18" :
                index === 4 ? "bg-violet-500/18" :
                index === 5 ? "bg-emerald-500/18" : "bg-sky-500/16"
              }`} />
              <p className="relative truncate text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">{kpi.label}</p>
              <p className={`relative mt-2 truncate text-[clamp(17px,1.25vw,25px)] font-black leading-none tabular-nums ${
                index === 1 ? "text-blue-300" :
                index === 2 ? "text-red-300" :
                index === 3 ? "text-amber-300" :
                index === 4 ? "text-violet-300" :
                index === 5 ? "text-emerald-300" : "text-white"
              }`}>
                {kpi.value}
              </p>
              <p className="relative mt-1 truncate text-[10px] font-semibold text-slate-500">{kpi.sub}</p>
            </div>
          ))}
        </section>

        <nav className="grid shrink-0 grid-cols-5 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.045] p-1 shadow-[0_14px_45px_rgba(0,0,0,0.16)] backdrop-blur-xl">
          {dashboardTabs.map((tab) => (
            <button key={tab.id} type="button" data-onboarding-target={tab.target}
              onClick={() => setActiveDashboardTab(tab.id)}
              className={`rounded-xl px-3 py-2 text-xs font-black transition ${
                activeDashboardTab === tab.id
                  ? "bg-blue-500/18 text-white shadow-[inset_0_0_0_1px_rgba(96,165,250,0.25)]"
                  : "text-slate-400 hover:bg-white/[0.055] hover:text-slate-100"
              }`}>
              {tab.label}
            </button>
          ))}
        </nav>

        {activeDashboardTab === "live" && (
          <section data-onboarding-target="dashboard-live-full" className="flex min-h-0 flex-1 flex-col rounded-[30px] border border-white/10 bg-slate-950/48 p-5 shadow-[0_26px_90px_rgba(0,0,0,0.28)] backdrop-blur-xl">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-300">Canlı Operasyon Akışı</p>
                <h2 className="mt-1 text-2xl font-black tracking-[-0.02em] text-white">Ekip Hareketleri</h2>
                <p className="mt-1 text-sm text-slate-500">Son hareketler, üretim ve finans sinyalleri geniş operasyon zaman çizelgesinde akar.</p>
              </div>
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-black text-emerald-300">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                Canlı
              </span>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
              {anaAkis.length === 0 ? (
                <div className="flex h-full items-center justify-center rounded-3xl border border-dashed border-white/10 bg-white/[0.035] text-sm font-semibold text-slate-500">
                  Henüz aktivite yok. İşlemler başladıkça burada görünecek.
                </div>
              ) : (
                <div className="grid gap-2">
                  {anaAkis.map((a: any, i: number) => (
                    <button key={a.id || i} type="button" onClick={() => setSelectedActivity(a)}
                      className="grid grid-cols-[72px_28px_minmax(0,1fr)_auto] gap-4 rounded-2xl border border-white/[0.075] bg-white/[0.045] px-4 py-3 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition hover:border-blue-400/25 hover:bg-blue-500/[0.06]">
                      <span className="pt-0.5 text-[12px] font-black tabular-nums text-slate-500">{timeAgo(a.createdAt)}</span>
                      <span className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-slate-900">
                        <span className="h-3 w-3 rounded-full shadow-[0_0_18px_currentColor]" style={{ background: activityColor(a.type), color: activityColor(a.type) }} />
                      </span>
                      <div className="min-w-0">
                        <p className="text-[14px] font-semibold leading-snug text-slate-100">{a.message || "Dashboard hareketi"}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          {a.actorAdi && <span className="rounded-full border border-white/8 bg-white/[0.055] px-2 py-0.5 text-[10px] font-bold text-slate-400">{a.actorAdi}</span>}
                          <span className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-600">{a.type?.replace(/_/g, " ") || "activity"}</span>
                        </div>
                      </div>
                      <span className="mt-1 h-px w-10 bg-gradient-to-r from-white/20 to-transparent" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {activeDashboardTab === "operations" && (
          <section data-onboarding-target="dashboard-operations-full" className="grid min-h-0 flex-1 grid-cols-3 gap-3 overflow-hidden">
            <div data-onboarding-target="dashboard-today-plan" className="flex min-h-0 flex-col rounded-[28px] border border-white/10 bg-white/[0.055] p-4 shadow-[0_22px_70px_rgba(0,0,0,0.22)] backdrop-blur-xl">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-300">Program</p>
                  <h2 className="mt-1 text-lg font-black text-white">Bugünün Programı</h2>
                </div>
                <Link href="/dashboard/is-programi" className="rounded-full border border-white/10 bg-white/[0.055] px-3 py-1.5 text-xs font-bold text-slate-300">Program</Link>
              </div>
              <div className="mb-3 grid grid-cols-4 gap-2">
                {[
                  ["Plan", operasyonKpi.planlanan, "text-slate-100"],
                  ["Aktif", operasyonKpi.islemde, "text-blue-300"],
                  ["Bitti", operasyonKpi.tamamlanan, "text-emerald-300"],
                  ["Geç", operasyonKpi.geciken, operasyonKpi.geciken > 0 ? "text-red-300" : "text-slate-500"],
                ].map(([label, value, color]) => (
                  <div key={String(label)} className="rounded-2xl border border-white/8 bg-slate-950/38 px-2 py-2">
                    <p className="text-[8px] font-black uppercase tracking-[0.12em] text-slate-500">{label}</p>
                    <p className={`mt-1 text-lg font-black tabular-nums ${color}`}>{value}</p>
                  </div>
                ))}
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                {operasyonPlan.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/30 p-4 text-sm font-semibold text-slate-500">Bugün için plan yok.</div>
                ) : operasyonPlan.map((o: any) => (
                  <div key={o.id} className="flex items-start gap-3 border-b border-white/[0.055] py-3 last:border-0">
                    <span className="w-12 shrink-0 pt-0.5 text-[12px] font-black tabular-nums text-slate-500">{o.saat}</span>
                    <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full shadow-[0_0_18px_currentColor]" style={{ background: phaseColor(o.phase), color: phaseColor(o.phase) }} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-black text-slate-100">{o.tip}</p>
                      <p className="mt-0.5 truncate text-xs text-slate-500">{o.musteri}{o.urun ? " · " + o.urun : ""}</p>
                    </div>
                    {o.tamamlandi && <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2 py-1 text-[9px] font-black text-emerald-300">Tamam</span>}
                  </div>
                ))}
              </div>
            </div>

            <div data-onboarding-target="dashboard-active-ops" className="flex min-h-0 flex-col rounded-[28px] border border-blue-400/15 bg-white/[0.055] p-4 shadow-[0_22px_70px_rgba(0,0,0,0.22)] backdrop-blur-xl">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-300">Canlı</p>
                  <h2 className="mt-1 text-lg font-black text-white">Aktif Operasyonlar</h2>
                </div>
                <span className="text-xs font-black text-emerald-300">{liveToplamAktif} canlı</span>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                {aktifEkip.length === 0 ? (
                  <p className="rounded-2xl border border-white/8 bg-slate-950/30 p-4 text-sm font-semibold text-slate-500">Şu an çalışan operasyon yok.</p>
                ) : aktifEkip.map((e) => (
                  <button key={e.execId} onClick={() => setLiveTask({ id: e.phaseId, phase: e.phaseType, title: e.musteriAdi, subtitle: e.urunAdi, completed: false, schedule: {} })}
                    className="mb-2 w-full rounded-2xl border border-blue-400/15 bg-slate-950/58 px-4 py-3 text-left text-white last:mb-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black">{e.musteriAdi}</p>
                        <p className="mt-0.5 truncate text-xs text-slate-500">{e.personelAd} · {e.phaseType}</p>
                      </div>
                      <p className="shrink-0 text-xl font-black tabular-nums text-blue-200">{e.elapsedMinutes}<span className="text-[10px] text-slate-500"> dk</span></p>
                    </div>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full rounded-full bg-blue-400" style={{ width: `${Math.min(Math.round((e.progressRatio ?? 0.42) * 100), 100)}%` }} />
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div data-onboarding-target="dashboard-blocked-jobs" className="flex min-h-0 flex-col rounded-[28px] border border-red-400/20 bg-red-950/[0.20] p-4 shadow-[0_22px_70px_rgba(0,0,0,0.22)] backdrop-blur-xl">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-red-300">Alarm</p>
                  <h2 className="mt-1 text-lg font-black text-white">Takılan İşler</h2>
                </div>
                <span className={`text-xs font-black ${liveToplamBlocked > 0 ? "text-red-300" : "text-emerald-300"}`}>{liveToplamBlocked} kayıt</span>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                {blockedItems.length === 0 ? (
                  <p className="rounded-2xl border border-emerald-400/15 bg-emerald-500/10 p-4 text-sm font-bold text-emerald-300">Kritik takılma yok.</p>
                ) : blockedItems.map((item) => (
                  <button key={item.execId} onClick={() => setLiveTask({ id: item.phaseId, phase: item.phaseType, title: item.musteriAdi, subtitle: item.urunAdi, completed: false, schedule: {} })}
                    className="mb-2 flex w-full items-center justify-between gap-3 rounded-2xl border border-red-400/15 bg-red-500/10 px-4 py-3 text-left last:mb-0">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-black text-slate-100">{item.musteriAdi}</span>
                      <span className="block truncate text-xs font-semibold text-red-300">{item.cannotStartReason ? (CANNOT_START_REASON_LABELS[item.cannotStartReason] ?? item.cannotStartReason) : "Kontrol gerekli"}</span>
                    </span>
                    <span className="shrink-0 text-sm font-black text-red-300">{item.elapsedBlockedMinutes} dk</span>
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}

        {activeDashboardTab === "sales" && (
          <section data-onboarding-target="dashboard-sales-full" className="flex min-h-0 flex-1 flex-col rounded-[30px] border border-violet-400/15 bg-white/[0.055] p-5 shadow-[0_26px_90px_rgba(0,0,0,0.24)] backdrop-blur-xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-violet-300">Satış Sinyali</p>
                <h2 className="mt-1 text-2xl font-black text-white">Sıcak Teklifler</h2>
              </div>
              <Link href="/dashboard/isler" className="rounded-full border border-violet-400/20 bg-violet-500/10 px-4 py-2 text-xs font-black text-violet-300">İşlere Git</Link>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
              {sicakTeklifler.length === 0 ? (
                <div className="flex h-full items-center justify-center rounded-3xl border border-dashed border-white/10 bg-slate-950/30 text-sm font-semibold text-slate-500">Takip gerektiren teklif yok.</div>
              ) : (
                <div className="grid gap-3">
                  {sicakTeklifler.map((t: any) => {
                    const score = teklifSicaklikSkoru(t);
                    const heat = sicaklikMeta(score);
                    const phone = phoneClean(t.telefon);
                    const goruntulenme = Number(t.goruntulenme || 0);
                    const durum = t.aksiyonMesaji || t.aksiyonTipi || "Takip bekliyor";
                    const msg = `Merhaba ${t.musteri || "müşterimiz"}, Metrix üzerinden hazırladığımız teklifinizle ilgili sizi bilgilendirmek istedim. Uygunsa detayları birlikte netleştirebiliriz.`;
                    return (
                      <div key={t.teklifNo} className={`rounded-3xl border ${heat.border} bg-gradient-to-r ${heat.bg} to-white/[0.035] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]`}>
                        <div className="grid grid-cols-[minmax(0,1fr)_140px_120px_auto] items-start gap-4">
                          <div className="min-w-0">
                            <p className="truncate text-base font-black text-slate-100">{t.musteri || "Müşteri"}</p>
                            <p className="mt-0.5 truncate text-xs text-slate-500">{t.urun || "İş adı yok"} · {t.teklifNo || "Teklif kodu yok"}</p>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              <span className="rounded-full border border-white/10 bg-white/[0.055] px-2 py-1 text-[10px] font-black text-slate-400">{durum}</span>
                              <span className="rounded-full border border-white/10 bg-white/[0.055] px-2 py-1 text-[10px] font-black text-slate-400">
                                {goruntulenme > 0 ? `${goruntulenme} görüntülenme` : "Görüntülenme verisi yok"}
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-600">Teklif</p>
                            <p className="mt-1 text-base font-black tabular-nums text-slate-100">₺{fmt(t.tutar)}</p>
                          </div>
                          <div className="text-right">
                            <p className={`text-sm font-black ${heat.text}`}>%{score}</p>
                            <p className="mt-0.5 text-[10px] font-bold text-slate-500">{heat.label}</p>
                          </div>
                          {phone.length > 0 ? (
                            <a href={waHref(phone, msg)} target="_blank" rel="noopener noreferrer" className="rounded-full bg-violet-500/20 px-4 py-2 text-xs font-black text-violet-100">WhatsApp mesajı</a>
                          ) : (
                            <span className="rounded-full border border-white/10 bg-white/[0.035] px-4 py-2 text-xs font-black text-slate-500">telefon yok</span>
                          )}
                        </div>
                        <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-950/70">
                          <div className={`h-full rounded-full ${heat.bar} shadow-[0_0_20px_currentColor]`} style={{ width: `${score}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        )}

        {activeDashboardTab === "cash" && (
          <section data-onboarding-target="dashboard-cash-full" className="flex min-h-0 flex-1 flex-col rounded-[30px] border border-amber-400/15 bg-white/[0.055] p-5 shadow-[0_26px_90px_rgba(0,0,0,0.24)] backdrop-blur-xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-300">Nakit Akışı</p>
                <h2 className="mt-1 text-2xl font-black text-white">Vadesi Gelen Ödemeler</h2>
              </div>
              <Link href="/dashboard/tahsilatlar" className="rounded-full border border-amber-400/20 bg-amber-500/10 px-4 py-2 text-xs font-black text-amber-300">Tahsilatlara Git</Link>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
              {vadesiGelenler.length === 0 ? (
                <div className="flex h-full items-center justify-center rounded-3xl border border-dashed border-white/10 bg-slate-950/30 text-sm font-semibold text-slate-500">Vadesi gelen ödeme yok.</div>
              ) : (
                <div className="grid gap-2">
                  {vadesiGelenler.map((v: any) => {
                    const phone = phoneClean(v.musteriTelefon);
                    const isGecmis = v.durum === "gecmis";
                    const msg = `Merhaba ${v.musteriAdi || "müşterimiz"}, Metrix kayıtlarımıza göre ₺${fmt(Number(v.tutar || 0))} tutarındaki ödemenizin vadesi geçmiş görünüyor. Uygun olduğunuzda ödeme planınızı netleştirebilir miyiz?`;
                    return (
                      <div key={v.id} className="grid grid-cols-[minmax(0,1fr)_120px_90px_120px_auto] items-center gap-4 rounded-2xl border border-white/[0.075] bg-gradient-to-r from-amber-500/[0.08] to-white/[0.035] p-4">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-slate-100">{v.musteriAdi}</p>
                          <p className="mt-0.5 truncate text-xs text-slate-500">{v.teklifNo || "Genel"} · {new Date(v.vadeTarihi).toLocaleDateString("tr-TR")}</p>
                        </div>
                        <p className="text-sm font-bold text-slate-400">{new Date(v.vadeTarihi).toLocaleDateString("tr-TR")}</p>
                        <p className={`text-right text-sm font-black ${isGecmis ? "text-red-300" : "text-amber-300"}`}>{isGecmis ? `${v.gecenGun}g` : "Bugün"}</p>
                        <p className="text-right text-base font-black tabular-nums text-amber-300">₺{fmt(v.tutar)}</p>
                        {phone.length > 0 ? (
                          <a href={waHref(phone, msg)} target="_blank" rel="noopener noreferrer" className="rounded-full bg-amber-500/15 px-4 py-2 text-xs font-black text-amber-200">WhatsApp hatırlat</a>
                        ) : (
                          <span className="rounded-full border border-white/10 bg-white/[0.035] px-4 py-2 text-xs font-black text-slate-500">telefon yok</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        )}

        {activeDashboardTab === "reports" && (
          <section data-onboarding-target="dashboard-reports-full" className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden rounded-[30px] border border-white/10 bg-slate-950/44 p-5 shadow-[0_26px_90px_rgba(0,0,0,0.24)] backdrop-blur-xl">
            <div className="flex shrink-0 items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-300">Executive Insight</p>
                <h2 className="mt-1 text-2xl font-black text-white">Yönetici Rapor Tablosu</h2>
                <p className="mt-1 text-sm text-slate-500">Satış, tahsilat, üretim ve performans değişimlerini tek tabloda izleyin.</p>
              </div>
              <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-black text-emerald-300">{raporDonem}</span>
            </div>
            <div className="grid shrink-0 grid-cols-4 gap-2">
              {[
                ["Yıl Toplam Onaylanan", yillikFinans.onaylanan, "text-emerald-300", "satış"],
                ["Ay Toplam Onaylanan", aylikFinans.onaylanan, "text-blue-300", "aylık"],
                ["Vadesi Gelen Tahsilat", vadesiGelenToplam, "text-amber-300", `${vadesiGelenler.length} kayıt`],
                ["Operasyon Yoğunluğu", operasyonYogunlugu, "text-violet-300", "anlık"],
              ].map(([label, value, color, sub]) => (
                <div key={String(label)} className="rounded-2xl border border-white/10 bg-white/[0.055] p-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">{label}</p>
                  <p className={`mt-1 text-xl font-black tabular-nums ${color}`}>{typeof value === "number" && String(label) !== "Operasyon Yoğunluğu" ? `₺${fmt(value)}` : String(value)}</p>
                  <p className="mt-0.5 text-[10px] font-bold text-slate-600">{String(sub || "")}</p>
                </div>
              ))}
            </div>
            <div className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035]">
              <div className="grid grid-cols-[1fr_1.15fr_1.15fr_1.1fr_1.05fr_.9fr_.9fr_.9fr] gap-0 border-b border-white/10 bg-slate-950/70 px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
                <span>Dönem</span>
                <span>Satış / Onaylanan</span>
                <span>Tahsilat / Vadesi Gelen</span>
                <span>Üretim / Operasyon</span>
                <span>Geciken / Takılan</span>
                <span>Sıcak Teklif</span>
                <span>Performans</span>
                <span>Değişim</span>
              </div>
              <div className="max-h-full overflow-y-auto">
                {raporRows.map((row) => {
                  const score = typeof row.skor === "number" ? row.skor : null;
                  const scoreLabel = score == null ? "veri yok" : score >= 85 ? "Çok Güçlü" : score >= 68 ? "Güçlü" : score >= 45 ? "Dengeli" : "Zayıf";
                  const trendCls =
                    row.trend === "up" ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-300" :
                    row.trend === "down" ? "border-red-400/20 bg-red-500/10 text-red-300" :
                    row.trend === "none" ? "border-slate-400/10 bg-white/[0.035] text-slate-500" :
                    "border-amber-400/20 bg-amber-500/10 text-amber-300";
                  const trendIcon = row.trend === "up" ? "↑" : row.trend === "down" ? "↓" : row.trend === "none" ? "–" : "→";
                  return (
                    <div key={row.donem} className="grid grid-cols-[1fr_1.15fr_1.15fr_1.1fr_1.05fr_.9fr_.9fr_.9fr] gap-0 border-b border-white/[0.055] px-3 py-3 text-sm text-slate-300 transition hover:bg-white/[0.045] last:border-0">
                      <strong className="text-slate-100">{row.donem}</strong>
                      <span className="tabular-nums">{row.satis}</span>
                      <span className="tabular-nums">{row.tahsilat}</span>
                      <span>{row.uretim}</span>
                      <span>{row.geciken}</span>
                      <span>{row.sicak}</span>
                      <span>
                        {score == null ? (
                          <span className="text-slate-500">veri yok</span>
                        ) : (
                          <span className="inline-flex items-center gap-2">
                            <span className="font-black tabular-nums text-white">{score}</span>
                            <span className="text-[11px] text-slate-500">{scoreLabel}</span>
                          </span>
                        )}
                      </span>
                      <span><span className={`rounded-full border px-2 py-1 text-[11px] font-black ${trendCls}`}>{trendIcon} {row.degisim}</span></span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="grid shrink-0 grid-cols-3 gap-3">
              {[
                ["Satış Yorumu", sicakTeklifler.length > 0 ? "Satış tarafında takip edilmesi gereken fırsatlar var." : "Satış sinyalleri düşük; yeni teklif hareketleri takip edilmeli."],
                ["Nakit Yorumu", vadesiGelenler.length > 0 ? "Nakit tarafında takip gerektiren açık ödeme var." : "Nakit tarafında vadesi gelen açık ödeme görünmüyor."],
                ["Operasyon Yorumu", liveToplamBlocked > 0 ? "Operasyon tarafında darboğaz oluşmuş görünüyor." : "Operasyon akışında kritik takılma görünmüyor."],
              ].map(([title, copy]) => (
                <div key={title} className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">{title}</p>
                  <p className="mt-2 text-sm font-semibold leading-5 text-slate-300">{copy}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {false && (
        <section data-onboarding-target="dashboard-operations-full" className="grid min-h-0 flex-1 grid-cols-3 gap-3 overflow-hidden">
          <aside data-onboarding-target="dashboard-operation-panel" className="flex min-h-0 flex-col gap-3 overflow-hidden">
            <div data-onboarding-target="dashboard-today-plan" className="flex min-h-0 flex-[1.08] flex-col rounded-[26px] border border-white/10 bg-white/[0.055] p-4 shadow-[0_18px_60px_rgba(0,0,0,0.20)] backdrop-blur-xl">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-300">Günün Operasyonu</p>
                  <h2 className="mt-1 text-base font-black text-white">Bugünün Programı</h2>
                </div>
                <Link href="/dashboard/is-programi" className="rounded-full border border-white/10 bg-white/[0.055] px-3 py-1.5 text-xs font-bold text-slate-300 hover:bg-white/10 hover:text-white">
                  Program
                </Link>
              </div>
              <div className="mb-3 grid grid-cols-4 gap-1.5">
                {[
                  ["Plan", operasyonKpi.planlanan, "text-slate-100"],
                  ["Aktif", operasyonKpi.islemde, "text-blue-300"],
                  ["Bitti", operasyonKpi.tamamlanan, "text-emerald-300"],
                  ["Geç", operasyonKpi.geciken, operasyonKpi.geciken > 0 ? "text-red-300" : "text-slate-500"],
                ].map(([label, value, color]) => (
                  <div key={String(label)} className="rounded-2xl border border-white/8 bg-slate-950/38 px-2 py-2">
                    <p className="text-[8px] font-black uppercase tracking-[0.12em] text-slate-500">{label}</p>
                    <p className={`mt-1 text-base font-black tabular-nums ${color}`}>{value}</p>
                  </div>
                ))}
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                {operasyonPlan.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/30 p-4 text-sm font-semibold text-slate-500">
                    Bugün için plan yok. İş programından operasyon ekleyebilirsin.
                  </div>
                ) : (
                  operasyonPlan.map((o: any) => (
                    <div key={o.id} className="flex items-start gap-3 border-b border-white/[0.055] py-2.5 last:border-0">
                      <span className="w-10 shrink-0 pt-0.5 text-[11px] font-black tabular-nums text-slate-500">{o.saat}</span>
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: phaseColor(o.phase) }} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-black text-slate-100">{o.tip}</p>
                        <p className="mt-0.5 truncate text-[11px] text-slate-500">{o.musteri}{o.urun ? " · " + o.urun : ""}</p>
                      </div>
                      {o.tamamlandi && <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2 py-1 text-[9px] font-black text-emerald-300">Tamam</span>}
                    </div>
                  ))
                )}
              </div>
            </div>

            <div data-onboarding-target="dashboard-active-ops" className="rounded-[26px] border border-white/10 bg-white/[0.055] p-4 shadow-[0_18px_60px_rgba(0,0,0,0.20)] backdrop-blur-xl">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-300">Aktif Operasyonlar</p>
                <span className="text-xs font-black text-emerald-300">{liveToplamAktif} canlı</span>
              </div>
              {aktifEkip.length === 0 ? (
                <p className="rounded-2xl border border-white/8 bg-slate-950/30 p-3 text-xs font-semibold text-slate-500">Şu an çalışan operasyon yok.</p>
              ) : (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {aktifEkip.slice(0, 5).map((e) => (
                    <button key={e.execId} onClick={() => setLiveTask({ id: e.phaseId, phase: e.phaseType, title: e.musteriAdi, subtitle: e.urunAdi, completed: false, schedule: {} })}
                      className="min-w-[142px] rounded-2xl border border-blue-400/15 bg-slate-950/72 px-3 py-3 text-left text-white shadow-[0_12px_35px_rgba(0,0,0,0.20)]">
                      <p className="truncate text-[11px] font-black">{e.musteriAdi}</p>
                      <p className="mt-0.5 truncate text-[10px] text-slate-400">{e.personelAd}</p>
                      <p className="mt-2 text-2xl font-black tabular-nums text-blue-200">{e.elapsedMinutes}<span className="text-[10px] text-slate-500"> dk</span></p>
                      <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
                        <div className="h-full rounded-full bg-blue-400" style={{ width: `${Math.min(Math.round((e.progressRatio ?? 0.42) * 100), 100)}%` }} />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div data-onboarding-target="dashboard-blocked-jobs" className="rounded-[26px] border border-red-400/15 bg-red-950/[0.18] p-4 shadow-[0_18px_60px_rgba(0,0,0,0.20)] backdrop-blur-xl">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-red-300">Takılan İşler</p>
                <span className={`text-xs font-black ${liveToplamBlocked > 0 ? "text-red-300" : "text-emerald-300"}`}>{liveToplamBlocked} kayıt</span>
              </div>
              {blockedItems.length === 0 ? (
                <p className="rounded-2xl border border-emerald-400/15 bg-emerald-500/10 p-3 text-xs font-bold text-emerald-300">Kritik takılma yok.</p>
              ) : (
                <div className="grid gap-2">
                  {blockedItems.slice(0, 3).map((item) => (
                    <button key={item.execId} onClick={() => setLiveTask({ id: item.phaseId, phase: item.phaseType, title: item.musteriAdi, subtitle: item.urunAdi, completed: false, schedule: {} })}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-red-400/15 bg-red-500/10 px-3 py-2 text-left">
                      <span className="min-w-0">
                        <span className="block truncate text-xs font-black text-slate-100">{item.musteriAdi}</span>
                        <span className="block truncate text-[10px] font-semibold text-red-300">{item.cannotStartReason ? (CANNOT_START_REASON_LABELS[item.cannotStartReason] ?? item.cannotStartReason) : "Kontrol gerekli"}</span>
                      </span>
                      <span className="shrink-0 text-[11px] font-black text-red-300">{item.elapsedBlockedMinutes} dk</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </aside>

          <section data-onboarding-target="dashboard-activity-feed" className="flex min-h-0 flex-col rounded-[30px] border border-white/10 bg-slate-950/48 p-4 shadow-[0_26px_90px_rgba(0,0,0,0.28)] backdrop-blur-xl">
            <div className="mb-3 flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-300">Canlı Operasyon Akışı</p>
                <h2 className="mt-1 text-xl font-black tracking-[-0.02em] text-white">Ekip Hareketleri</h2>
                <p className="mt-1 text-sm text-slate-500">Son hareketler, üretim ve finans sinyalleri burada akar.</p>
              </div>
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-black text-emerald-300">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                Canlı
              </span>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
              {anaAkis.length === 0 ? (
                <div className="flex h-full items-center justify-center rounded-3xl border border-dashed border-white/10 bg-white/[0.035] text-sm font-semibold text-slate-500">
                  Henüz aktivite yok. İşlemler başladıkça burada görünecek.
                </div>
              ) : (
                <div className="grid gap-1.5">
                  {anaAkis.map((a: any, i: number) => (
                    <div key={a.id || i} className="grid grid-cols-[54px_24px_minmax(0,1fr)_auto] gap-3 rounded-2xl border border-white/[0.075] bg-white/[0.045] px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                      <span className="pt-0.5 text-[11px] font-black tabular-nums text-slate-500">{timeAgo(a.createdAt)}</span>
                      <span className="flex h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-slate-900">
                        <span className="h-2.5 w-2.5 rounded-full shadow-[0_0_18px_currentColor]" style={{ background: activityColor(a.type), color: activityColor(a.type) }} />
                      </span>
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold leading-snug text-slate-100">{a.message}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          {a.actorAdi && <span className="rounded-full border border-white/8 bg-white/[0.055] px-2 py-0.5 text-[10px] font-bold text-slate-400">{a.actorAdi}</span>}
                          <span className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-600">{a.type?.replace(/_/g, " ")}</span>
                        </div>
                      </div>
                      <span className="mt-1 h-px w-5 bg-gradient-to-r from-white/20 to-transparent" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          <aside className="flex min-h-0 flex-col gap-3 overflow-hidden">
            <div data-onboarding-target="dashboard-cash-panel" className="flex min-h-0 flex-[1.22] flex-col rounded-[26px] border border-amber-400/15 bg-white/[0.055] p-4 shadow-[0_18px_60px_rgba(0,0,0,0.20)] backdrop-blur-xl">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-300">Nakit Akışı</p>
                  <h2 className="mt-1 text-base font-black text-white">Vadesi Gelen Ödemeler</h2>
                </div>
                <Link href="/dashboard/tahsilatlar" className="rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-300 hover:bg-amber-500/15">
                  Tümü
                </Link>
              </div>
              <div data-onboarding-target="dashboard-due-payments" className="min-h-0 flex-1 overflow-y-auto pr-1">
                {vadesiGelenler.length === 0 ? (
                  <p className="rounded-2xl border border-emerald-400/15 bg-emerald-500/10 p-3 text-xs font-bold text-emerald-300">Vadesi gelen ödeme yok.</p>
                ) : (
                  <div className="grid gap-2">
                    {vadesiGelenler.slice(0, 6).map((v: any) => {
                      const phone = phoneClean(v.musteriTelefon);
                      const isGecmis = v.durum === "gecmis";
                      return (
                        <div key={v.id} className="rounded-2xl border border-white/[0.075] bg-gradient-to-r from-amber-500/[0.08] to-white/[0.035] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-[13px] font-black text-slate-100">{v.musteriAdi}</p>
                              <p className="mt-0.5 truncate text-[10px] font-semibold text-slate-500">{new Date(v.vadeTarihi).toLocaleDateString("tr-TR")}{v.teklifNo ? " · " + v.teklifNo : ""}</p>
                            </div>
                            <div className="shrink-0 text-right">
                              <p className={`text-[15px] font-black tabular-nums ${isGecmis ? "text-red-300" : "text-amber-300"}`}>₺{fmt(v.tutar)}</p>
                              <p className={`text-[10px] font-black ${isGecmis ? "text-red-400" : "text-amber-400"}`}>{isGecmis ? `${v.gecenGun}g geçti` : "Bugün"}</p>
                            </div>
                          </div>
                          <div className="mt-2">
                            {phone.length > 0 ? (
                              <AiWaButon
                                label="WA Mesaj"
                                phone={phone}
                                payload={{ musteriAdi: v.musteriAdi, tutar: v.tutar, vadeTarihi: v.vadeTarihi, gecenGun: v.gecenGun, teklifNo: v.teklifNo }}
                                tip="tahsilat"
                                className="rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-1.5 text-[10px] font-black text-amber-300 hover:bg-amber-500/15 disabled:opacity-50"
                              />
                            ) : (
                              <Link href={v.musteriId ? `/dashboard/musteriler?musteriId=${v.musteriId}&duzenle=1` : "/dashboard/musteriler"} className="rounded-full border border-white/10 bg-white/[0.055] px-3 py-1.5 text-[10px] font-black text-slate-400">
                                Telefon ekle
                              </Link>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div data-onboarding-target="dashboard-sales-panel" className="flex min-h-0 flex-1 flex-col rounded-[26px] border border-violet-400/15 bg-white/[0.055] p-4 shadow-[0_18px_60px_rgba(0,0,0,0.20)] backdrop-blur-xl">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-violet-300">Satış Sinyali</p>
                  <h2 className="mt-1 text-base font-black text-white">Sıcak Teklifler</h2>
                </div>
                <Link href="/dashboard/isler" className="rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1.5 text-xs font-bold text-violet-300 hover:bg-violet-500/15">
                  Tümü
                </Link>
              </div>
              <div data-onboarding-target="dashboard-hot-leads" className="min-h-0 flex-1 overflow-y-auto pr-1">
                {sicakTeklifler.length === 0 ? (
                  <p className="rounded-2xl border border-white/8 bg-slate-950/30 p-3 text-xs font-semibold text-slate-500">Takip gerektiren teklif yok.</p>
                ) : (
                  <div className="grid gap-2">
                    {sicakTeklifler.slice(0, 5).map((t: any) => {
                      const score = Number(t.ihtimal || 0);
                      const phone = phoneClean(t.telefon);
                      return (
                        <div key={t.teklifNo} className="rounded-2xl border border-white/[0.075] bg-gradient-to-r from-violet-500/[0.08] to-white/[0.035] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-[13px] font-black text-slate-100">{t.musteri}</p>
                              <p className="mt-0.5 truncate text-[10px] font-semibold text-slate-500">{t.teklifNo}</p>
                            </div>
                            <div className="shrink-0 text-right">
                              <p className="text-sm font-black text-violet-300">%{score}</p>
                              <p className="text-[11px] font-bold text-slate-300">₺{fmt(t.tutar)}</p>
                            </div>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {phone.length > 0 && (
                              <AiWaButon
                                label="AI WhatsApp"
                                phone={phone}
                                payload={{ musteri: t.musteri, tutar: t.tutar, goruntulenme: t.goruntulenme, pdf: t.pdf, aksiyonTipi: t.aksiyonTipi, aksiyonSaati: t.aksiyonSaati, ihtimal: score }}
                                tip="satis"
                                className="rounded-full bg-violet-500/20 px-3 py-1.5 text-[10px] font-black text-violet-100 disabled:opacity-50"
                              />
                            )}
                            <Link href="/dashboard/isler" className="rounded-full border border-violet-400/20 bg-white/[0.055] px-3 py-1.5 text-[10px] font-black text-violet-300">
                              Detay
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

          </aside>
        </section>
        )}

        <footer data-onboarding-target="dashboard-action-bar" className="flex shrink-0 items-center justify-between gap-4 rounded-[22px] border border-white/10 bg-slate-950/48 px-4 py-2.5 shadow-[0_16px_55px_rgba(0,0,0,0.20)] backdrop-blur-xl">
          <p className="min-w-0 truncate text-sm font-bold text-slate-400">
            {bottomSummary[activeDashboardTab]}
          </p>
          <div className="flex shrink-0 gap-2">
            {desktopActions.slice(0, 3).map((action) => (
              <Link key={action.label} href={action.href} data-onboarding-target={action.target}
                className="rounded-full border border-white/10 bg-white/[0.055] px-4 py-2 text-xs font-black text-slate-200 shadow-sm transition hover:bg-blue-500/20 hover:text-white">
                {action.label}
              </Link>
            ))}
          </div>
        </footer>
      </div>

      {dashboardCoachWelcome && (
        <div className="fixed bottom-6 right-6 z-[240] hidden w-[390px] rounded-[30px] border border-blue-300/20 bg-slate-950/92 p-5 text-white shadow-[0_28px_90px_rgba(0,0,0,0.42)] backdrop-blur-2xl md:block">
          <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-blue-500/20 blur-3xl" />
          <div className="relative">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-300">Dashboard Coach</p>
            <h3 className="mt-2 text-2xl font-black tracking-[-0.03em]">Metrix Operasyon Merkezi</h3>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Bugünkü operasyon, tahsilat, satış ve darboğazları tek ekrandan yönetin.
            </p>
            <div className="mt-5 flex gap-2">
              <button type="button" onClick={startDashboardCoach}
                className="rounded-full bg-blue-500 px-4 py-2 text-xs font-black text-white shadow-[0_0_28px_rgba(59,130,246,0.28)]">
                Dashboard'u Tanı
              </button>
              <button type="button" onClick={dismissDashboardCoach}
                className="rounded-full border border-white/10 bg-white/[0.055] px-4 py-2 text-xs font-black text-slate-300">
                Daha Sonra
              </button>
            </div>
          </div>
        </div>
      )}

      {dashboardCoachActive && activeDashboardCoachStep && (
        <div className="pointer-events-none fixed inset-0 z-[250] hidden md:block">
          <div className="absolute inset-0 bg-black/18" />
          {dashboardCoachRect && (
            <div
              className="absolute rounded-2xl border border-blue-300/80 shadow-[0_0_0_9999px_rgba(2,6,23,0.20),0_0_34px_rgba(96,165,250,0.75)] transition-all duration-200"
              style={{
                left: dashboardCoachRect.left - 6,
                top: dashboardCoachRect.top - 6,
                width: dashboardCoachRect.width + 12,
                height: dashboardCoachRect.height + 12,
              }}
            />
          )}
          <div
            className="pointer-events-auto absolute w-[360px] rounded-[26px] border border-white/10 bg-slate-950/95 p-4 text-white shadow-[0_26px_90px_rgba(0,0,0,0.42)] backdrop-blur-2xl"
            style={{
              left: dashboardCoachRect
                ? Math.min(Math.max(16, dashboardCoachRect.right + 16), Math.max(16, window.innerWidth - 376))
                : undefined,
              top: dashboardCoachRect
                ? Math.min(Math.max(16, dashboardCoachRect.top), Math.max(16, window.innerHeight - 260))
                : 96,
              right: dashboardCoachRect ? undefined : 24,
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-300">
                  {dashboardCoachIndex + 1}/{dashboardCoachSteps.length}
                </p>
                <h3 className="mt-1 text-lg font-black tracking-[-0.02em]">{activeDashboardCoachStep.title}</h3>
              </div>
              <button type="button" onClick={dismissDashboardCoach}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.055] text-lg text-slate-400 hover:text-white">
                ×
              </button>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-300">{activeDashboardCoachStep.copy}</p>
            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-blue-400 transition-all" style={{ width: `${((dashboardCoachIndex + 1) / dashboardCoachSteps.length) * 100}%` }} />
            </div>
            <div className="mt-4 flex items-center justify-between gap-2">
              <button type="button" disabled={dashboardCoachIndex === 0}
                onClick={() => setDashboardCoachIndex((i) => Math.max(0, i - 1))}
                className="rounded-full border border-white/10 bg-white/[0.055] px-4 py-2 text-xs font-black text-slate-300 disabled:opacity-35">
                Geri
              </button>
              <button type="button"
                onClick={() => {
                  if (dashboardCoachIndex >= dashboardCoachSteps.length - 1) {
                    completeDashboardCoach();
                    return;
                  }
                  setDashboardCoachIndex((i) => i + 1);
                }}
                className="rounded-full bg-blue-500 px-4 py-2 text-xs font-black text-white">
                {dashboardCoachIndex >= dashboardCoachSteps.length - 1 ? "Tamamla" : "İleri"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-4xl md:hidden">

        <div className="sticky top-0 z-30 -mx-3 flex items-center justify-between border-b border-white/[0.06] bg-[#030712]/90 px-3 py-3 backdrop-blur-md md:-mx-6 md:px-6 md:py-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Operasyon Merkezi</p>
            <h1 className="mt-0.5 text-lg font-bold text-white">Dashboard</h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-xs font-semibold capitalize text-white">{gunAdi}</p>
              <p className="mt-0.5 text-[10px] text-slate-500">{tamTarih}</p>
            </div>
          </div>
        </div>

        <div className="space-y-4 pt-4">
        <OnboardingChecklist />

        {/* ── 1. GÜNÜN PROGRAMI ────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-white/10 bg-[#0B1120] p-4" data-onboarding-target="is-programi">
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

      {selectedActivity && (
        <div className="fixed inset-0 z-[260] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={() => setSelectedActivity(null)}>
          <div className="w-full max-w-lg rounded-[28px] border border-white/10 bg-slate-950 p-5 text-white shadow-[0_28px_90px_rgba(0,0,0,0.45)]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-300">Activity Detail</p>
                <h3 className="mt-1 text-xl font-black tracking-[-0.02em]">{selectedActivity.message || "Operasyon hareketi"}</h3>
              </div>
              <button type="button" onClick={() => setSelectedActivity(null)} className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.055] text-xl text-slate-400 hover:text-white">
                ×
              </button>
            </div>
            <div className="mt-5 grid gap-2">
              {[
                ["Kişi", selectedActivity.actorAdi || "Sistem"],
                ["Event Türü", selectedActivity.type?.replace(/_/g, " ") || "activity"],
                ["Zaman", selectedActivity.createdAt ? new Date(selectedActivity.createdAt).toLocaleString("tr-TR") : "Zaman yok"],
                ["Açıklama", selectedActivity.message || "Detay bilgisi bulunmuyor"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-white/8 bg-white/[0.045] p-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">{label}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-200">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
