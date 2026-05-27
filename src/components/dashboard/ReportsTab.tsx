"use client";

function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(".", ",") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(0) + "K";
  return n.toLocaleString("tr-TR");
}

type FinansBlok = {
  verilen: number; onaylanan: number; kaybedilen: number;
  devam: number; donusumOrani: number; teklifSayisi: number;
};
type OperasyonKpi = { planlanan: number; islemde: number; tamamlanan: number; geciken: number };

type ReportRow = {
  donem: string;
  isFallback: boolean;
  fallbackMsg: string;
  highlight: boolean;
  satis: string;
  tahsilat: string;
  aktifIs: string;
  tamamlanan: string;
  geciken: string;
  takilan: string;
  sicakTeklif: string;
  donusumPct: string;
  operasyonYuku: string;
  performans: number;
  trend: string;
};

type Insight = { icon: string; text: string; accent: string };

type Props = {
  aylikFinans: FinansBlok;
  yillikFinans: FinansBlok;
  vadesiGelenler: any[];
  vadesiGelenToplam: number;
  operasyonPlan: any[];
  operasyonKpi: OperasyonKpi;
  sicakTeklifler: any[];
  liveToplamAktif: number;
  liveToplamPaused: number;
  liveToplamBlocked: number;
  atelye: any;
  operasyonSaglikSkoru: number;
  performansLabel: string;
  raporDonem: string;
};

function makeTrend(cond1: boolean, cond2: boolean): string {
  if (cond1) return "up";
  if (cond2) return "down";
  return "neutral";
}

function emptyRow(donem: string, fallbackMsg: string): ReportRow {
  return { donem, isFallback: true, fallbackMsg, highlight: false, satis: "", tahsilat: "", aktifIs: "", tamamlanan: "", geciken: "", takilan: "", sicakTeklif: "", donusumPct: "", operasyonYuku: "", performans: 0, trend: "neutral" };
}

export default function ReportsTab({
  aylikFinans, yillikFinans, vadesiGelenler, vadesiGelenToplam,
  operasyonPlan, operasyonKpi, sicakTeklifler,
  liveToplamAktif, liveToplamPaused, liveToplamBlocked,
  atelye, operasyonSaglikSkoru, performansLabel, raporDonem,
}: Props) {

  const rows: ReportRow[] = [
    {
      donem: "Bu Hafta", isFallback: false, highlight: false, fallbackMsg: "",
      satis: "—",
      tahsilat: vadesiGelenler.length > 0 ? `${vadesiGelenler.length} ödeme açık` : "—",
      aktifIs: String(liveToplamAktif),
      tamamlanan: String(operasyonKpi.tamamlanan),
      geciken: String(operasyonKpi.geciken),
      takilan: String(liveToplamBlocked),
      sicakTeklif: String(sicakTeklifler.length),
      donusumPct: aylikFinans.donusumOrani > 0 ? `%${aylikFinans.donusumOrani}` : "—",
      operasyonYuku: String(operasyonPlan.length),
      performans: operasyonSaglikSkoru,
      trend: makeTrend(liveToplamBlocked === 0 && operasyonKpi.geciken === 0, liveToplamBlocked > 2),
    },
    emptyRow("Geçen Hafta", "Baz veri bekleniyor"),
    {
      donem: "Bu Ay", isFallback: false, highlight: true, fallbackMsg: "",
      satis: aylikFinans.onaylanan > 0 ? `₺${fmt(aylikFinans.onaylanan)}` : "—",
      tahsilat: vadesiGelenToplam > 0 ? `₺${fmt(vadesiGelenToplam)}` : "Risk yok",
      aktifIs: String(liveToplamAktif || operasyonKpi.islemde),
      tamamlanan: String(operasyonKpi.tamamlanan),
      geciken: String(operasyonKpi.geciken),
      takilan: String(liveToplamBlocked),
      sicakTeklif: String(sicakTeklifler.length),
      donusumPct: `%${aylikFinans.donusumOrani}`,
      operasyonYuku: String(operasyonPlan.length),
      performans: operasyonSaglikSkoru,
      trend: makeTrend(aylikFinans.donusumOrani > 50, aylikFinans.donusumOrani < 25),
    },
    emptyRow("Geçen Ay", "Karşılaştırma oluşuyor"),
    emptyRow("Son 3 Ay", "Takip başlıyor"),
    {
      donem: "Bu Yıl", isFallback: false, highlight: false, fallbackMsg: "",
      satis: yillikFinans.onaylanan > 0 ? `₺${fmt(yillikFinans.onaylanan)}` : "—",
      tahsilat: vadesiGelenToplam > 0 ? `₺${fmt(vadesiGelenToplam)} izleniyor` : "Risk yok",
      aktifIs: String(liveToplamAktif || operasyonKpi.islemde),
      tamamlanan: String(operasyonKpi.tamamlanan),
      geciken: String(operasyonKpi.geciken),
      takilan: String(liveToplamBlocked),
      sicakTeklif: String(sicakTeklifler.length),
      donusumPct: `%${yillikFinans.donusumOrani}`,
      operasyonYuku: String(atelye.bugunOperasyon ?? operasyonPlan.length),
      performans: Math.max(0, Math.min(100, operasyonSaglikSkoru + Math.round(Number(yillikFinans.donusumOrani || 0) / 5))),
      trend: makeTrend(yillikFinans.donusumOrani > 50, yillikFinans.donusumOrani < 25),
    },
    emptyRow("Geçen Yıl", "Karşılaştırma yok"),
    {
      donem: "Genel Ortalama", isFallback: false, highlight: false, fallbackMsg: "",
      satis: yillikFinans.onaylanan > 0 ? `₺${fmt(Math.round(yillikFinans.onaylanan / 12))}/ay` : "—",
      tahsilat: vadesiGelenToplam > 0 ? `₺${fmt(vadesiGelenToplam)} risk` : "stabil",
      aktifIs: String(liveToplamAktif),
      tamamlanan: String(operasyonKpi.tamamlanan),
      geciken: String(operasyonKpi.geciken + liveToplamBlocked),
      takilan: String(liveToplamBlocked),
      sicakTeklif: String(sicakTeklifler.length),
      donusumPct: (aylikFinans.donusumOrani > 0 || yillikFinans.donusumOrani > 0)
        ? `%${Math.round((aylikFinans.donusumOrani + yillikFinans.donusumOrani) / 2)}`
        : "—",
      operasyonYuku: String(operasyonPlan.length),
      performans: operasyonSaglikSkoru,
      trend: makeTrend(operasyonSaglikSkoru >= 68, operasyonSaglikSkoru < 45),
    },
  ];

  const riskSkoru = Math.max(0, Math.min(100,
    100
    - Math.min(vadesiGelenler.length * 8, 40)
    - Math.min(liveToplamBlocked * 10, 30)
    - Math.min(operasyonKpi.geciken * 5, 20)
  ));
  const riskSkoruLabel = riskSkoru >= 80 ? "Düşük Risk" : riskSkoru >= 55 ? "Orta Risk" : "Yüksek Risk";
  const riskSkoruColor = riskSkoru >= 80 ? "text-emerald-300" : riskSkoru >= 55 ? "text-amber-300" : "text-red-300";

  const satisAnaliz: string[] = [];
  if (sicakTeklifler.length > 5) satisAnaliz.push("Sıcak teklif yoğunluğu yüksek — önceliklendirme önerilir.");
  else if (sicakTeklifler.length > 0) satisAnaliz.push(`${sicakTeklifler.length} sıcak teklif aktif olarak takip ediliyor.`);
  else satisAnaliz.push("Satış sinyalleri zayıf; yeni teklif hareketi bekleniyor.");
  if (aylikFinans.donusumOrani > 60) satisAnaliz.push("Teklif dönüşüm oranı güçlü seyrediyor.");
  else if (aylikFinans.donusumOrani > 25) satisAnaliz.push("Teklif dönüşüm oranı stabil görünüyor.");
  else if (aylikFinans.donusumOrani > 0) satisAnaliz.push("Düşük dönüşüm oranı dikkat gerektiriyor.");

  const nakitAnaliz: string[] = [];
  if (vadesiGelenler.length > 3) nakitAnaliz.push("Vadesi geçen ödeme sayısı artıyor — tahsilat takibi kritik.");
  else if (vadesiGelenler.length > 0) nakitAnaliz.push(`${vadesiGelenler.length} vadesi gelen ödeme için WhatsApp hatırlatması önerilir.`);
  else nakitAnaliz.push("Nakit akışında vadesi gelen risk görünmüyor.");
  if (vadesiGelenToplam > 50000) nakitAnaliz.push("Açık tahsilat tutarı dikkat çekici seviyede.");
  else if (vadesiGelenToplam > 0) nakitAnaliz.push("Tahsilat performansı dengeli seyrediyor.");
  else nakitAnaliz.push("Nakit pozisyonu temiz görünüyor.");

  const operasyonAnaliz: string[] = [];
  if (liveToplamBlocked > 3) operasyonAnaliz.push("Yüksek sayıda takılma operasyon verimliliğini düşürüyor.");
  else if (liveToplamBlocked > 0) operasyonAnaliz.push("Takılan işler operasyon yoğunluğunu etkiliyor.");
  else operasyonAnaliz.push("Operasyon akışında kritik darboğaz görünmüyor.");
  if (operasyonKpi.geciken > 5) operasyonAnaliz.push("Geciken işler kritik seviyeye ulaşmış.");
  else if (operasyonKpi.geciken > 0) operasyonAnaliz.push("Geciken işler takip altında.");
  else operasyonAnaliz.push("Tüm işler zamanında seyrediyor.");

  const insights: Insight[] = [];
  if (sicakTeklifler.length > 0 && (liveToplamAktif > 3 || operasyonPlan.length > 5))
    insights.push({ icon: "↑", text: "Satış artışı operasyon yükünü yükseltmeye başladı.", accent: "border-amber-400/20 bg-amber-500/[0.07] text-amber-200" });
  if (vadesiGelenToplam > 0 && aylikFinans.onaylanan > vadesiGelenToplam)
    insights.push({ icon: "⚡", text: "Tahsilat hızı satış büyümesinin gerisinde kalıyor.", accent: "border-red-400/20 bg-red-500/[0.07] text-red-200" });
  if (sicakTeklifler.length > 3)
    insights.push({ icon: "◈", text: "Sıcak teklifler önümüzdeki dönemde yoğun üretim oluşturabilir.", accent: "border-violet-400/20 bg-violet-500/[0.07] text-violet-200" });
  if (liveToplamBlocked > 0)
    insights.push({ icon: "▲", text: "Takılan işler operasyon verimliliğini düşürüyor.", accent: "border-red-400/20 bg-red-500/[0.07] text-red-200" });
  if (operasyonSaglikSkoru >= 68 && insights.length < 3)
    insights.push({ icon: "✦", text: "Operasyon sağlığı güçlü — büyüme fırsatı değerlendirilebilir.", accent: "border-emerald-400/20 bg-emerald-500/[0.07] text-emerald-200" });
  if (operasyonKpi.geciken > 0 && insights.length < 5)
    insights.push({ icon: "!", text: "Geciken işler müşteri memnuniyetini olumsuz etkileyebilir.", accent: "border-amber-400/20 bg-amber-500/[0.07] text-amber-200" });
  if (insights.length === 0)
    insights.push({ icon: "✦", text: "Operasyon ve satış verileri normal seyrediyor — izleme devam ediyor.", accent: "border-blue-400/20 bg-blue-500/[0.07] text-blue-200" });

  const healthCls = operasyonSaglikSkoru >= 68
    ? "border-emerald-400/20 bg-emerald-500/[0.08] text-emerald-300"
    : operasyonSaglikSkoru >= 45
    ? "border-amber-400/20 bg-amber-500/[0.08] text-amber-300"
    : "border-red-400/20 bg-red-500/[0.08] text-red-300";

  const stripItems = [
    {
      label: "Bu Ay Satış",
      value: aylikFinans.onaylanan > 0 ? `₺${fmt(aylikFinans.onaylanan)}` : "—",
      sub: `${aylikFinans.teklifSayisi} teklif · %${aylikFinans.donusumOrani} dönüşüm`,
      badge: aylikFinans.onaylanan > 0 ? "Aktif" : "Bekleniyor",
      badgeCls: aylikFinans.onaylanan > 0 ? "text-emerald-400" : "text-slate-500",
      valueCls: "text-emerald-300",
    },
    {
      label: "Tahsilat Riski",
      value: vadesiGelenler.length > 0 ? `₺${fmt(vadesiGelenToplam)}` : "Risk yok",
      sub: `${vadesiGelenler.length} vadesi gelen kayıt`,
      badge: vadesiGelenler.length > 3 ? "Yüksek" : vadesiGelenler.length > 0 ? "Orta" : "Temiz",
      badgeCls: vadesiGelenler.length > 3 ? "text-red-400" : vadesiGelenler.length > 0 ? "text-amber-400" : "text-emerald-400",
      valueCls: vadesiGelenler.length > 3 ? "text-red-300" : vadesiGelenler.length > 0 ? "text-amber-300" : "text-emerald-300",
    },
    {
      label: "Aktif Operasyon",
      value: String(liveToplamAktif || operasyonKpi.islemde || 0),
      sub: liveToplamPaused > 0
        ? `${liveToplamPaused} beklemede · ${liveToplamBlocked} takılan`
        : `${liveToplamBlocked} takılan iş`,
      badge: liveToplamAktif > 0 ? "Canlı" : "Beklemede",
      badgeCls: "text-blue-400",
      valueCls: "text-blue-300",
    },
    {
      label: "Risk Skoru",
      value: `${riskSkoru} / 100`,
      sub: riskSkoruLabel,
      badge: riskSkoruLabel,
      badgeCls: riskSkoruColor,
      valueCls: riskSkoruColor,
    },
    {
      label: "Operasyon Sağlığı",
      value: `${operasyonSaglikSkoru} / 100`,
      sub: performansLabel,
      badge: performansLabel,
      badgeCls: operasyonSaglikSkoru >= 68 ? "text-emerald-400" : operasyonSaglikSkoru >= 45 ? "text-amber-400" : "text-red-400",
      valueCls: operasyonSaglikSkoru >= 68 ? "text-emerald-300" : operasyonSaglikSkoru >= 45 ? "text-amber-300" : "text-red-300",
    },
  ];

  const matrixCols = ["Dönem","Satış","Tahsilat","Aktif İş","Tamamlanan","Geciken","Takılan","Sıcak Teklif","Dönüşüm %","Op. Yükü","Performans","Trend"];

  return (
    <section
      data-onboarding-target="dashboard-reports-full"
      className="flex min-h-0 flex-1 flex-col overflow-y-auto rounded-[30px] border border-white/[0.08] bg-[#040c18] shadow-[0_26px_90px_rgba(0,0,0,0.32)] backdrop-blur-xl"
    >
      {/* HEADER */}
      <div className="flex shrink-0 items-center justify-between border-b border-white/[0.06] px-5 py-3.5">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.22em] text-emerald-400/70">İşletme Sağlık Merkezi</p>
          <h2 className="mt-0.5 text-[17px] font-black tracking-[-0.02em] text-white">Yönetici Rapor Paneli</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-[10px] font-black text-slate-500">{raporDonem}</span>
          <span className={`rounded-full border px-3 py-1 text-[10px] font-black ${healthCls}`}>
            Sağlık {operasyonSaglikSkoru}/100
          </span>
        </div>
      </div>

      {/* 1. EXECUTIVE STRIP */}
      <div
        data-onboarding-target="dashboard-report-finance"
        className="grid shrink-0 grid-cols-5 divide-x divide-white/[0.06] border-b border-white/[0.06]"
      >
        {stripItems.map((item) => (
          <div key={item.label} className="px-4 py-3.5">
            <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-600">{item.label}</p>
            <p className={`mt-1.5 text-[22px] font-black leading-none tabular-nums ${item.valueCls}`}>{item.value}</p>
            <p className="mt-1 text-[10px] text-slate-500">{item.sub}</p>
            <p className={`mt-1.5 text-[9px] font-black uppercase tracking-[0.12em] ${item.badgeCls}`}>{item.badge}</p>
          </div>
        ))}
      </div>

      {/* 2. ANA RAPOR MATRİSİ */}
      <div
        data-onboarding-target="dashboard-report-matrix"
        className="shrink-0 overflow-x-auto border-b border-white/[0.06]"
      >
        <table className="w-full min-w-[1080px] border-collapse text-left">
          <thead>
            <tr className="border-b border-white/[0.08] bg-slate-950/80">
              {matrixCols.map((col, ci) => (
                <th
                  key={col}
                  className={`whitespace-nowrap px-3 py-2 text-[9px] font-black uppercase tracking-[0.14em] text-slate-600${ci === 0 ? " sticky left-0 z-10 min-w-[96px] bg-slate-950/90" : ""}`}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              if (row.isFallback) {
                return (
                  <tr key={row.donem} className="border-b border-white/[0.04] last:border-0">
                    <td className="sticky left-0 z-10 min-w-[96px] bg-[#040c18] px-3 py-2.5 text-[11px] font-black text-slate-500">{row.donem}</td>
                    <td colSpan={11} className="px-3 py-2.5 text-[10px] italic text-slate-700">{row.fallbackMsg}</td>
                  </tr>
                );
              }
              const perf = row.performans;
              const perfLabel = perf >= 85 ? "Çok Güçlü" : perf >= 68 ? "Güçlü" : perf >= 45 ? "Dengeli" : "Zayıf";
              const perfCls = perf >= 68 ? "text-emerald-300" : perf >= 45 ? "text-amber-300" : "text-red-300";
              const trendIcon = row.trend === "up" ? "▲" : row.trend === "down" ? "▼" : "▬";
              const trendCls = row.trend === "up" ? "text-emerald-400" : row.trend === "down" ? "text-red-400" : "text-amber-400";
              const tahsilRisk = row.tahsilat !== "Risk yok" && row.tahsilat !== "—" && row.tahsilat !== "stabil";
              const rowCls = row.highlight ? "bg-blue-500/[0.055]" : "hover:bg-white/[0.02]";
              const stickyBg = row.highlight ? "bg-blue-950/30 text-blue-100" : "bg-[#040c18] text-slate-200";
              return (
                <tr key={row.donem} className={`border-b border-white/[0.04] transition last:border-0 ${rowCls}`}>
                  <td className={`sticky left-0 z-10 min-w-[96px] px-3 py-2.5 text-[11px] font-black ${stickyBg}`}>
                    {row.donem}
                    {row.highlight && <span className="ml-1.5 rounded bg-blue-500/20 px-1 py-0.5 text-[8px] font-black text-blue-400">CANLI</span>}
                  </td>
                  <td className="px-3 py-2.5 text-[11px] tabular-nums text-slate-200">{row.satis}</td>
                  <td className={`px-3 py-2.5 text-[11px] tabular-nums ${tahsilRisk ? "text-amber-300" : "text-emerald-400"}`}>{row.tahsilat}</td>
                  <td className="px-3 py-2.5 text-[11px] tabular-nums text-blue-300">{row.aktifIs}</td>
                  <td className="px-3 py-2.5 text-[11px] tabular-nums text-emerald-300">{row.tamamlanan}</td>
                  <td className={`px-3 py-2.5 text-[11px] tabular-nums ${Number(row.geciken) > 0 ? "text-red-300" : "text-slate-600"}`}>{row.geciken}</td>
                  <td className={`px-3 py-2.5 text-[11px] tabular-nums font-black ${Number(row.takilan) > 0 ? "text-red-400" : "text-slate-600"}`}>{row.takilan}</td>
                  <td className="px-3 py-2.5 text-[11px] tabular-nums text-violet-300">{row.sicakTeklif}</td>
                  <td className="px-3 py-2.5 text-[11px] tabular-nums text-slate-300">{row.donusumPct}</td>
                  <td className="px-3 py-2.5 text-[11px] tabular-nums text-slate-300">{row.operasyonYuku}</td>
                  <td className="px-3 py-2.5 text-[11px]">
                    <span className={`font-black tabular-nums ${perfCls}`}>{perf}</span>
                    <span className="ml-1 text-[9px] text-slate-600">{perfLabel}</span>
                  </td>
                  <td className="px-3 py-2.5 text-[13px]">
                    <span className={`font-black ${trendCls}`}>{trendIcon}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 3. ANALİZ ŞERİDİ */}
      <div className="grid shrink-0 grid-cols-3 divide-x divide-white/[0.06] border-b border-white/[0.06]">
        <div data-onboarding-target="dashboard-report-sales" className="px-5 py-4">
          <p className="mb-2.5 text-[9px] font-black uppercase tracking-[0.18em] text-blue-400">Satış Analizi</p>
          <div className="space-y-2">
            {satisAnaliz.map((t) => (
              <p key={t} className="flex items-start gap-2 text-[11px] leading-snug text-slate-300">
                <span className="mt-0.5 shrink-0 text-[8px] text-blue-500">◈</span>{t}
              </p>
            ))}
          </div>
        </div>
        <div className="px-5 py-4">
          <p className="mb-2.5 text-[9px] font-black uppercase tracking-[0.18em] text-amber-400">Nakit Analizi</p>
          <div className="space-y-2">
            {nakitAnaliz.map((t) => (
              <p key={t} className="flex items-start gap-2 text-[11px] leading-snug text-slate-300">
                <span className="mt-0.5 shrink-0 text-[8px] text-amber-500">◈</span>{t}
              </p>
            ))}
          </div>
        </div>
        <div data-onboarding-target="dashboard-report-operations" className="px-5 py-4">
          <p className="mb-2.5 text-[9px] font-black uppercase tracking-[0.18em] text-violet-400">Operasyon Analizi</p>
          <div className="space-y-2">
            {operasyonAnaliz.map((t) => (
              <p key={t} className="flex items-start gap-2 text-[11px] leading-snug text-slate-300">
                <span className="mt-0.5 shrink-0 text-[8px] text-violet-500">◈</span>{t}
              </p>
            ))}
          </div>
        </div>
      </div>

      {/* 4. İÇGÖRÜLER */}
      <div data-onboarding-target="dashboard-report-insights" className="px-5 py-4">
        <p className="mb-3 text-[9px] font-black uppercase tracking-[0.2em] text-slate-600">Metrix İşletme İçgörüleri</p>
        <div className="flex flex-wrap gap-2">
          {insights.map((insight, i) => (
            <div key={i} className={`flex min-w-[190px] flex-1 items-start gap-2.5 rounded-2xl border p-3.5 ${insight.accent}`}>
              <span className="mt-0.5 shrink-0 text-base font-black leading-none">{insight.icon}</span>
              <p className="text-[11px] font-semibold leading-snug">{insight.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
