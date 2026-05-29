"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type StockProduct = {
  productName: string;
  materialType: string | null;
  totalPlateCount: number;
  availablePlateCount: number;
  reservedPlateCount: number;
  partialPlateCount: number;
  brokenPlateCount: number;
  offcutCount: number;
  totalRemainingAreaCm2: number;
  totalRemainingAreaM2: number;
  totalStockValue: number;
  shadeGroups: Array<{ shadeCode: string; plateCount: number }>;
  warehouses: Array<{ warehouseId: string | null; name: string; plateCount: number }>;
};

type StockPlate = {
  id: string;
  plateCode: string;
  productName: string;
  materialType: string | null;
  shadeCode: string | null;
  warehouse: { id: string; name: string; code: string | null } | null;
  widthCm: number;
  heightCm: number;
  remainingAreaCm2: number;
  remainingAreaM2: number;
  purchaseTotalCost: number;
  purchaseCurrency: string;
  status: string;
  sourceType: string | null;
  createdAt: string;
};

type SummaryResponse = {
  totals: {
    productCount: number;
    warehouseCount: number;
    totalPlateCount: number;
    availablePlateCount: number;
    reservedPlateCount: number;
    partialPlateCount: number;
    brokenPlateCount: number;
    offcutCount: number;
    fireRecordCount: number;
    openFireRecordCount: number;
    pendingPurchaseCount: number;
    totalRemainingAreaCm2: number;
    totalStockValue: number;
  };
  products: StockProduct[];
  warehouses: Array<{ id: string; name: string; code: string | null; isDefault: boolean; isActive: boolean }>;
  recentPurchases: Array<{ id: string; purchaseCode: string; productName: string; supplierName: string | null; quantity: number; status: string; totalCost: number; currency: string }>;
  recentFireRecords: Array<{ id: string; fireType: string; status: string; reasonCode: string | null; finalCost: number | null; estimatedCost: number | null; currency: string; createdAt: string }>;
};

type StockImportRow = {
  rowNumber: number;
  productName: string;
  materialType: string | null;
  shadeCode: string | null;
  widthCm: number;
  heightCm: number;
  quantity: number;
  warehouseName: string;
  purchaseCurrency: string;
  purchaseTotalCost: number;
  supplierName: string | null;
  batchNo: string | null;
  errors: string[];
  warnings: string[];
};

type StockImportPreview = {
  validRows: StockImportRow[];
  invalidRows: StockImportRow[];
  warnings: string[];
  totalPlateCount: number;
  estimatedTotalValue: number;
};

type StockImportResult = {
  createdPlateCount: number;
  createdWarehouseCount: number;
  totalValue: number;
  warehouses: string[];
};

const EMPTY_SUMMARY: SummaryResponse = {
  totals: {
    productCount: 0,
    warehouseCount: 0,
    totalPlateCount: 0,
    availablePlateCount: 0,
    reservedPlateCount: 0,
    partialPlateCount: 0,
    brokenPlateCount: 0,
    offcutCount: 0,
    fireRecordCount: 0,
    openFireRecordCount: 0,
    pendingPurchaseCount: 0,
    totalRemainingAreaCm2: 0,
    totalStockValue: 0,
  },
  products: [],
  warehouses: [],
  recentPurchases: [],
  recentFireRecords: [],
};

const STATUS_LABELS: Record<string, string> = {
  AVAILABLE: "Kullanılabilir",
  RESERVED: "Rezerve",
  PARTIAL: "Kısmi",
  USED: "Kullanıldı",
  BROKEN: "Kırık",
  SCRAPPED: "Hurda",
};

const STATUS_CLASS: Record<string, string> = {
  AVAILABLE: "border-emerald-400/20 bg-emerald-500/10 text-emerald-300",
  RESERVED: "border-blue-400/20 bg-blue-500/10 text-blue-300",
  PARTIAL: "border-amber-400/25 bg-amber-500/10 text-amber-300",
  USED: "border-slate-400/15 bg-slate-500/10 text-slate-300",
  BROKEN: "border-red-400/25 bg-red-500/10 text-red-300",
  SCRAPPED: "border-red-400/25 bg-red-500/10 text-red-300",
};

function fmtMoney(v: number, currency = "TRY") {
  const prefix = currency === "TRY" ? "₺" : `${currency} `;
  return prefix + Number(v || 0).toLocaleString("tr-TR", { maximumFractionDigits: 0 });
}

function fmtArea(cm2: number) {
  return (Number(cm2 || 0) / 10_000).toLocaleString("tr-TR", { maximumFractionDigits: 1 }) + " m²";
}

function statusLabel(status: string) {
  return STATUS_LABELS[String(status || "").toUpperCase()] ?? status ?? "Durum yok";
}

function statusClass(status: string) {
  return STATUS_CLASS[String(status || "").toUpperCase()] ?? "border-white/10 bg-white/[0.055] text-slate-300";
}

function KpiCard({ label, value, sub, tone = "text-white" }: { label: string; value: string; sub: string; tone?: string }) {
  return (
    <div className="relative min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.055] p-3 shadow-[0_16px_50px_rgba(0,0,0,0.18)] backdrop-blur-xl">
      <div className="absolute -right-7 -top-7 h-20 w-20 rounded-full bg-blue-500/10 blur-2xl" />
      <p className="relative truncate text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className={`relative mt-2 truncate text-[clamp(17px,1.3vw,25px)] font-black leading-none tabular-nums ${tone}`}>{value}</p>
      <p className="relative mt-1 truncate text-[10px] font-semibold text-slate-500">{sub}</p>
    </div>
  );
}

function SoonButton({ children }: { children: React.ReactNode }) {
  return (
    <button
      type="button"
      disabled
      className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs font-black text-slate-500"
    >
      {children} · yakında
    </button>
  );
}

function ActionButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-2xl border border-blue-400/25 bg-blue-500/16 px-4 py-2.5 text-xs font-black text-blue-100 shadow-[0_14px_38px_rgba(37,99,235,0.16)] transition hover:bg-blue-500/24"
    >
      {children}
    </button>
  );
}

export default function StokPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [summary, setSummary] = useState<SummaryResponse>(EMPTY_SUMMARY);
  const [plates, setPlates] = useState<StockPlate[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<StockProduct | null>(null);
  const [selectedProductPlates, setSelectedProductPlates] = useState<StockPlate[]>([]);
  const [activeTab, setActiveTab] = useState<"overview" | "products" | "plates" | "offcuts" | "purchases" | "movements">("overview");
  const [importOpen, setImportOpen] = useState(false);
  const [importFileName, setImportFileName] = useState("");
  const [importPreview, setImportPreview] = useState<StockImportPreview | null>(null);
  const [importResult, setImportResult] = useState<StockImportResult | null>(null);
  const [importError, setImportError] = useState("");
  const [importLoading, setImportLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [platesLoading, setPlatesLoading] = useState(false);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [materialType, setMaterialType] = useState("");

  async function loadSummary() {
    setLoading(true);
    try {
      const json = await fetch("/api/stock/summary", { credentials: "include" }).then((r) => r.json());
      if (!json?.error) setSummary({ ...EMPTY_SUMMARY, ...json });
    } finally {
      setLoading(false);
    }
  }

  async function loadPlates(extra?: { productName?: string }) {
    setPlatesLoading(true);
    try {
      const params = new URLSearchParams();
      if (extra?.productName) params.set("productName", extra.productName);
      if (!extra?.productName && q.trim()) params.set("q", q.trim());
      if (!extra?.productName && status) params.set("status", status);
      if (!extra?.productName && warehouseId) params.set("warehouseId", warehouseId);
      if (!extra?.productName && materialType) params.set("materialType", materialType);
      const json = await fetch(`/api/stock/plates?${params.toString()}`, { credentials: "include" }).then((r) => r.json());
      const rows = json?.plates || [];
      if (extra?.productName) setSelectedProductPlates(rows);
      else setPlates(rows);
    } finally {
      setPlatesLoading(false);
    }
  }

  useEffect(() => {
    loadSummary();
    loadPlates();
  }, []);

  useEffect(() => {
    const id = setTimeout(() => loadPlates(), 250);
    return () => clearTimeout(id);
  }, [q, status, warehouseId, materialType]);

  async function openProduct(product: StockProduct) {
    setSelectedProduct(product);
    setSelectedProductPlates([]);
    await loadPlates({ productName: product.productName });
  }

  function openImportPicker() {
    setImportError("");
    fileInputRef.current?.click();
  }

  function downloadTemplate() {
    window.location.href = "/api/stock/import/template";
  }

  async function handleImportFile(file: File | null) {
    if (!file) return;
    setImportOpen(true);
    setImportFileName(file.name);
    setImportPreview(null);
    setImportResult(null);
    setImportError("");
    setImportLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/stock/import/preview", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Dosya önizlenemedi.");
      setImportPreview(json);
    } catch (error) {
      setImportError(error instanceof Error ? error.message : "Dosya önizlenemedi.");
    } finally {
      setImportLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function commitImport() {
    if (!importPreview?.validRows.length) return;
    setImportError("");
    setImportLoading(true);
    try {
      const res = await fetch("/api/stock/import/commit", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: importPreview.validRows }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "İçe aktarma tamamlanamadı.");
      setImportResult(json);
      await Promise.all([loadSummary(), loadPlates()]);
    } catch (error) {
      setImportError(error instanceof Error ? error.message : "İçe aktarma tamamlanamadı.");
    } finally {
      setImportLoading(false);
    }
  }

  const materialTypes = useMemo(
    () => [...new Set(summary.products.map((p) => p.materialType).filter(Boolean))] as string[],
    [summary.products]
  );

  const hasStock = summary.totals.totalPlateCount > 0 || summary.totals.offcutCount > 0;
  const tabs = [
    ["overview", "Genel Bakış"],
    ["products", "Ürünler"],
    ["plates", "Plakalar"],
    ["offcuts", "Offcut"],
    ["purchases", "Satın Alma"],
    ["movements", "Hareketler"],
  ] as const;

  return (
    <main className="min-h-[100dvh] bg-[#030712] px-3 pb-tab-bar pt-0 text-white md:h-[100dvh] md:overflow-hidden md:bg-[radial-gradient(circle_at_12%_8%,rgba(37,99,235,0.18),transparent_28%),radial-gradient(circle_at_78%_0%,rgba(16,185,129,0.12),transparent_26%),#07111f] md:px-4 md:pb-0 md:pt-3 lg:px-6">
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.csv"
        className="hidden"
        onChange={(e) => handleImportFile(e.target.files?.[0] ?? null)}
      />
      <div className="mx-auto hidden h-full min-h-0 w-full max-w-[1840px] flex-col gap-3 md:flex">
        <header className="flex shrink-0 items-center justify-between gap-5 rounded-[28px] border border-white/10 bg-slate-950/42 px-5 py-3.5 shadow-[0_24px_90px_rgba(0,0,0,0.24)] backdrop-blur-xl">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">Metrix Stok Cockpit</p>
            <h1 className="mt-1 text-2xl font-black tracking-[-0.03em] text-white">Stok & Malzeme Yönetimi</h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-400">Ürün bazlı stok görünümü, plaka kaderi ve gerçek malzeme maliyeti için temel ekran.</p>
          </div>
          <div className="flex shrink-0 gap-2">
            <ActionButton onClick={downloadTemplate}>Şablon İndir</ActionButton>
            <ActionButton onClick={openImportPicker}>Excel Yükle</ActionButton>
            <SoonButton>Manuel Stok Ekle</SoonButton>
          </div>
        </header>

        <section className="grid shrink-0 grid-cols-6 gap-2">
          <KpiCard label="Toplam Stok Değeri" value={fmtMoney(summary.totals.totalStockValue)} sub={`${summary.totals.productCount} ürün`} tone="text-emerald-300" />
          <KpiCard label="Toplam Tam Plaka" value={String(summary.totals.totalPlateCount)} sub={`${summary.totals.warehouseCount} depo`} />
          <KpiCard label="Kullanılabilir" value={String(summary.totals.availablePlateCount)} sub="kesime hazır" tone="text-blue-300" />
          <KpiCard label="Rezerve" value={String(summary.totals.reservedPlateCount)} sub="işe bağlı" tone="text-amber-300" />
          <KpiCard label="Offcut" value={String(summary.totals.offcutCount)} sub="kalan parça" tone="text-violet-300" />
          <KpiCard label="Fire / Kırık" value={String(summary.totals.openFireRecordCount || summary.totals.brokenPlateCount)} sub="takipte" tone={summary.totals.openFireRecordCount || summary.totals.brokenPlateCount ? "text-red-300" : "text-emerald-300"} />
        </section>

        <nav className="grid shrink-0 grid-cols-6 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.045] p-1 shadow-[0_14px_45px_rgba(0,0,0,0.16)] backdrop-blur-xl">
          {tabs.map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={`rounded-xl px-3 py-2 text-xs font-black transition ${activeTab === id ? "bg-blue-500/18 text-white shadow-[inset_0_0_0_1px_rgba(96,165,250,0.25)]" : "text-slate-400 hover:bg-white/[0.055] hover:text-slate-100"}`}
            >
              {label}
            </button>
          ))}
        </nav>

        <section className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_320px] gap-3 overflow-hidden">
          <div className="min-h-0 overflow-hidden rounded-[30px] border border-white/10 bg-slate-950/48 p-5 shadow-[0_26px_90px_rgba(0,0,0,0.28)] backdrop-blur-xl">
            {(activeTab === "overview" || activeTab === "products") && (
              <div className="flex h-full min-h-0 flex-col">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-300">Ürün Bazlı Görünüm</p>
                    <h2 className="mt-1 text-xl font-black tracking-[-0.02em] text-white">Stok Özeti</h2>
                  </div>
                  <div className="flex gap-2">
                    <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ürün, plaka, renk ara" className="h-10 w-64 rounded-2xl border border-white/10 bg-slate-950/60 px-4 text-sm text-white outline-none focus:border-blue-400/50" />
                  </div>
                </div>
                {!hasStock && !loading ? (
                  <EmptyStockState onImportClick={openImportPicker} />
                ) : (
                  <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                    <div className="grid gap-2">
                      {summary.products.map((product) => (
                        <button key={`${product.productName}-${product.materialType ?? ""}`} onClick={() => openProduct(product)} className="grid grid-cols-[minmax(0,1fr)_150px_140px_120px] items-center gap-4 rounded-2xl border border-white/8 bg-white/[0.045] px-4 py-3 text-left transition hover:border-blue-400/25 hover:bg-blue-500/[0.06]">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-black text-white">{product.productName}</p>
                            <p className="mt-0.5 truncate text-xs text-slate-500">{product.materialType || "Malzeme tipi yok"} · {product.warehouses.map((w) => w.name).join(", ") || "Depo belirtilmedi"}</p>
                            {product.shadeGroups.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {product.shadeGroups.slice(0, 3).map((shade) => (
                                  <span key={shade.shadeCode} className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-black text-cyan-200">
                                    {shade.shadeCode}: {shade.plateCount} plaka
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2 py-1 text-[10px] font-black text-emerald-300">{product.availablePlateCount} tam</span>
                            <span className="rounded-full border border-violet-400/20 bg-violet-500/10 px-2 py-1 text-[10px] font-black text-violet-300">{product.offcutCount} offcut</span>
                          </div>
                          <p className="text-sm font-black tabular-nums text-blue-200">{fmtArea(product.totalRemainingAreaCm2)}</p>
                          <p className="text-right text-sm font-black tabular-nums text-emerald-300">{fmtMoney(product.totalStockValue)}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "plates" && (
              <div className="flex h-full min-h-0 flex-col">
                <div className="mb-4 grid grid-cols-[minmax(0,1fr)_160px_160px_160px] gap-2">
                  <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Plaka veya ürün ara" className="h-10 rounded-2xl border border-white/10 bg-slate-950/60 px-4 text-sm text-white outline-none focus:border-blue-400/50" />
                  <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-10 rounded-2xl border border-white/10 bg-slate-950/60 px-3 text-sm text-white outline-none">
                    <option value="">Tüm durumlar</option>
                    {Object.keys(STATUS_LABELS).map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                  </select>
                  <select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} className="h-10 rounded-2xl border border-white/10 bg-slate-950/60 px-3 text-sm text-white outline-none">
                    <option value="">Tüm depolar</option>
                    {summary.warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                  <select value={materialType} onChange={(e) => setMaterialType(e.target.value)} className="h-10 rounded-2xl border border-white/10 bg-slate-950/60 px-3 text-sm text-white outline-none">
                    <option value="">Tüm malzemeler</option>
                    {materialTypes.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <PlateList plates={plates} loading={platesLoading} />
              </div>
            )}

            {["offcuts", "purchases", "movements"].includes(activeTab) && (
              <PlaceholderPanel tab={activeTab} purchases={summary.recentPurchases} fireRecords={summary.recentFireRecords} />
            )}
          </div>

          <aside className="flex min-h-0 flex-col gap-3 overflow-hidden">
            <div className="rounded-[26px] border border-white/10 bg-white/[0.055] p-4 shadow-[0_22px_70px_rgba(0,0,0,0.22)] backdrop-blur-xl">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Depolar</p>
              <div className="mt-3 space-y-2">
                {summary.warehouses.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-white/10 bg-slate-950/35 p-3 text-xs text-slate-500">Henüz depo tanımı yok.</p>
                ) : summary.warehouses.map((w) => (
                  <div key={w.id} className="rounded-2xl border border-white/8 bg-slate-950/35 px-3 py-2">
                    <p className="text-sm font-black text-white">{w.name}</p>
                    <p className="text-xs text-slate-500">{w.code || "Kod yok"}{w.isDefault ? " · varsayılan" : ""}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-[26px] border border-white/10 bg-white/[0.055] p-4 shadow-[0_22px_70px_rgba(0,0,0,0.22)] backdrop-blur-xl">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Foundation Durumu</p>
              <div className="mt-3 space-y-2 text-xs leading-5 text-slate-400">
                <p>Plaka bazlı stok modeli hazır.</p>
                <p>Excel import ve shade/ton kodu takibi açık.</p>
                <p>Satın alma ve rezervasyon entegrasyonu sonraki fazlarda bağlanacak.</p>
              </div>
            </div>
          </aside>
        </section>
      </div>

      <MobileStockView
        summary={summary}
        tabs={tabs}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        hasStock={hasStock}
        openProduct={openProduct}
        onImportClick={openImportPicker}
      />

      {selectedProduct && (
        <ProductDrawer
          product={selectedProduct}
          plates={selectedProductPlates}
          loading={platesLoading}
          onClose={() => setSelectedProduct(null)}
        />
      )}
      {importOpen && (
        <ImportModal
          fileName={importFileName}
          preview={importPreview}
          result={importResult}
          error={importError}
          loading={importLoading}
          onClose={() => setImportOpen(false)}
          onSelectFile={openImportPicker}
          onCommit={commitImport}
        />
      )}
    </main>
  );
}

function EmptyStockState({ onImportClick }: { onImportClick: () => void }) {
  return (
    <div className="flex h-full min-h-[360px] items-center justify-center rounded-3xl border border-dashed border-white/10 bg-white/[0.035] p-8 text-center">
      <div className="max-w-md">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-300">Stok Foundation Hazır</p>
        <h3 className="mt-3 text-2xl font-black tracking-[-0.02em] text-white">İlk plakalarını Excel ile yükleyerek başlayacaksın.</h3>
        <p className="mt-2 text-sm leading-6 text-slate-500">Metrix stokları ürün bazında gösterir, ama her plakayı ayrı takip eder. Aynı üründe farklı shade/ton kodları olabilir; aynı işte farklı tonları karıştırmamak için shade kodunu gir.</p>
        <div className="mt-5 flex justify-center gap-2">
          <ActionButton onClick={onImportClick}>Excel Yükle</ActionButton>
          <SoonButton>Manuel Stok Ekle</SoonButton>
        </div>
      </div>
    </div>
  );
}

function PlateList({ plates, loading }: { plates: StockPlate[]; loading: boolean }) {
  if (loading) return <p className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-500">Plakalar yükleniyor...</p>;
  if (plates.length === 0) return <p className="rounded-2xl border border-dashed border-white/10 bg-white/[0.035] p-4 text-sm text-slate-500">Filtreye uygun plaka bulunamadı.</p>;
  return (
    <div className="min-h-0 flex-1 overflow-y-auto pr-1">
      <div className="grid gap-2">
        {plates.map((plate) => (
          <div key={plate.id} className="grid grid-cols-[120px_minmax(0,1fr)_120px_120px_120px] items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.045] px-4 py-3">
            <p className="text-sm font-black text-white">{plate.plateCode}</p>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-slate-100">{plate.productName}</p>
              <p className="truncate text-xs text-slate-500">{plate.materialType || "Malzeme tipi yok"} · {plate.warehouse?.name || "Depo yok"}{plate.shadeCode ? ` · Shade ${plate.shadeCode}` : ""}</p>
            </div>
            <p className="text-xs font-bold text-slate-400">{plate.widthCm} x {plate.heightCm} cm</p>
            <p className="text-sm font-black tabular-nums text-blue-200">{fmtArea(plate.remainingAreaCm2)}</p>
            <div className="text-right">
              <span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-black ${statusClass(plate.status)}`}>{statusLabel(plate.status)}</span>
              <p className="mt-1 text-xs font-bold text-emerald-300">{fmtMoney(plate.purchaseTotalCost, plate.purchaseCurrency)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PlaceholderPanel({ tab, purchases, fireRecords }: { tab: string; purchases: SummaryResponse["recentPurchases"]; fireRecords: SummaryResponse["recentFireRecords"] }) {
  const title = tab === "offcuts" ? "Offcut Yönetimi" : tab === "purchases" ? "Satın Alma Takibi" : "Stok Hareketleri";
  const copy = tab === "offcuts"
    ? "Offcut parçaları veri modelinde hazır. Kesim ve consumption akışı bağlandığında burada listelenecek."
    : tab === "purchases"
    ? "Satın alma kayıtları Faz 1E'de iş programı ve otomatik plaka oluşumu ile bağlanacak."
    : "Plaka giriş, rezervasyon, tüketim, transfer ve fire hareketleri burada zaman çizelgesi olarak izlenecek.";
  return (
    <div className="flex h-full min-h-[360px] items-center justify-center rounded-3xl border border-dashed border-white/10 bg-white/[0.035] p-8 text-center">
      <div className="max-w-lg">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-300">{title}</p>
        <h3 className="mt-3 text-2xl font-black tracking-[-0.02em] text-white">Foundation hazır, yazma akışı sonraki fazda.</h3>
        <p className="mt-2 text-sm leading-6 text-slate-500">{copy}</p>
        {(purchases.length > 0 || fireRecords.length > 0) && (
          <p className="mt-4 text-xs font-bold text-slate-400">{purchases.length} satın alma, {fireRecords.length} fire kaydı okunabilir durumda.</p>
        )}
      </div>
    </div>
  );
}

function ProductDrawer({ product, plates, loading, onClose }: { product: StockProduct; plates: StockPlate[]; loading: boolean; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[220] bg-black/55 backdrop-blur-sm" onClick={onClose}>
      <div className="absolute bottom-0 right-0 top-auto flex max-h-[88dvh] w-full flex-col rounded-t-[30px] border border-white/10 bg-slate-950 p-4 shadow-[0_-24px_80px_rgba(0,0,0,0.45)] md:bottom-4 md:right-4 md:top-4 md:max-h-none md:w-[560px] md:rounded-[30px]" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-300">Plaka Detayı</p>
            <h3 className="mt-1 truncate text-xl font-black text-white">{product.productName}</h3>
            <p className="mt-1 text-sm text-slate-500">{product.totalPlateCount} plaka · {product.offcutCount} offcut · {fmtArea(product.totalRemainingAreaCm2)}</p>
            {product.shadeGroups.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {product.shadeGroups.map((shade) => (
                  <span key={shade.shadeCode} className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-black text-cyan-200">
                    {shade.shadeCode}: {shade.plateCount}
                  </span>
                ))}
              </div>
            )}
          </div>
          <button type="button" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.055] text-slate-300">×</button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <KpiMini label="Kullanılabilir" value={String(product.availablePlateCount)} />
          <KpiMini label="Rezerve" value={String(product.reservedPlateCount)} />
          <KpiMini label="Değer" value={fmtMoney(product.totalStockValue)} />
        </div>
        <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
          {loading ? (
            <p className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-500">Plakalar yükleniyor...</p>
          ) : plates.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-white/10 bg-white/[0.035] p-4 text-sm text-slate-500">Bu ürün için plaka kaydı yok.</p>
          ) : (
            <div className="space-y-2">
              {plates.map((plate) => (
                <div key={plate.id} className="rounded-2xl border border-white/8 bg-white/[0.045] p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-black text-white">{plate.plateCode}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{plate.warehouse?.name || "Depo yok"} · {plate.widthCm} x {plate.heightCm} cm{plate.shadeCode ? ` · Shade ${plate.shadeCode}` : ""}</p>
                    </div>
                    <span className={`rounded-full border px-2 py-1 text-[10px] font-black ${statusClass(plate.status)}`}>{statusLabel(plate.status)}</span>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                    <KpiMini label="Kalan" value={fmtArea(plate.remainingAreaCm2)} />
                    <KpiMini label="Maliyet" value={fmtMoney(plate.purchaseTotalCost, plate.purchaseCurrency)} />
                    <KpiMini label="Kaynak" value={plate.sourceType || "Manuel"} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function KpiMini({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-white/[0.06] bg-slate-950/35 px-3 py-2">
      <p className="truncate text-[9px] text-slate-500">{label}</p>
      <p className="mt-0.5 truncate text-xs font-black tabular-nums text-white">{value}</p>
    </div>
  );
}

function ImportModal({
  fileName,
  preview,
  result,
  error,
  loading,
  onClose,
  onSelectFile,
  onCommit,
}: {
  fileName: string;
  preview: StockImportPreview | null;
  result: StockImportResult | null;
  error: string;
  loading: boolean;
  onClose: () => void;
  onSelectFile: () => void;
  onCommit: () => void;
}) {
  const canCommit = !!preview?.validRows.length && !loading && !result;
  return (
    <div className="fixed inset-0 z-[260] bg-black/65 backdrop-blur-sm" onClick={onClose}>
      <div
        className="absolute bottom-0 left-0 right-0 flex max-h-[92dvh] flex-col rounded-t-[30px] border border-white/10 bg-[#07111f] p-4 shadow-[0_-24px_80px_rgba(0,0,0,0.48)] md:bottom-6 md:left-1/2 md:right-auto md:top-6 md:w-[880px] md:-translate-x-1/2 md:rounded-[30px] md:p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-300">Excel Import Preview</p>
            <h3 className="mt-1 truncate text-xl font-black tracking-[-0.02em] text-white">Stok başlangıç yüklemesi</h3>
            <p className="mt-1 truncate text-sm text-slate-500">{fileName || "XLSX veya CSV dosyası seç"}</p>
          </div>
          <button type="button" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.055] text-slate-300">×</button>
        </div>

        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <KpiMini label="Geçerli Satır" value={String(preview?.validRows.length ?? 0)} />
          <KpiMini label="Hatalı Satır" value={String(preview?.invalidRows.length ?? 0)} />
          <KpiMini label="Oluşacak Plaka" value={String(preview?.totalPlateCount ?? result?.createdPlateCount ?? 0)} />
          <KpiMini label="Tahmini Değer" value={fmtMoney(preview?.estimatedTotalValue ?? result?.totalValue ?? 0)} />
        </div>

        {error && (
          <div className="mt-3 rounded-2xl border border-red-400/20 bg-red-500/10 p-3 text-sm font-bold text-red-200">{error}</div>
        )}

        {result && (
          <div className="mt-3 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-3">
            <p className="text-sm font-black text-emerald-200">İçe aktarma tamamlandı.</p>
            <p className="mt-1 text-xs text-emerald-100/80">
              {result.createdPlateCount} plaka oluşturuldu · {result.createdWarehouseCount} yeni depo · {fmtMoney(result.totalValue)} stok değeri
            </p>
          </div>
        )}

        <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
          {loading && !preview ? (
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 text-center text-sm font-bold text-slate-400">Dosya okunuyor ve satırlar doğrulanıyor...</div>
          ) : !preview ? (
            <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.035] p-6 text-center">
              <p className="text-sm font-black text-white">XLSX veya CSV dosyası seç.</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">Veri hemen DB'ye yazılmaz; önce validation preview gösterilir.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {preview.warnings.length > 0 && (
                <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-3">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-200">Uyarılar</p>
                  <div className="mt-2 space-y-1">
                    {preview.warnings.slice(0, 5).map((warning) => (
                      <p key={warning} className="text-xs leading-5 text-amber-100/85">{warning}</p>
                    ))}
                  </div>
                </div>
              )}

              {preview.invalidRows.length > 0 && (
                <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-3">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-red-200">Hatalı Satırlar</p>
                  <div className="mt-2 grid gap-2">
                    {preview.invalidRows.slice(0, 8).map((row) => (
                      <div key={row.rowNumber} className="rounded-xl border border-red-300/10 bg-slate-950/35 p-3">
                        <p className="text-xs font-black text-white">Satır {row.rowNumber} · {row.productName || "Ürün adı yok"}</p>
                        <p className="mt-1 text-[11px] leading-5 text-red-100/80">{row.errors.join(" ")}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-200">Geçerli Satırlar</p>
                {preview.validRows.length === 0 ? (
                  <p className="mt-2 text-sm text-slate-500">Import edilebilir satır yok.</p>
                ) : (
                  <div className="mt-2 grid gap-2">
                    {preview.validRows.slice(0, 10).map((row) => (
                      <div key={row.rowNumber} className="grid gap-2 rounded-xl border border-white/[0.06] bg-slate-950/35 p-3 md:grid-cols-[minmax(0,1fr)_100px_90px_110px] md:items-center">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-white">{row.productName}</p>
                          <p className="truncate text-xs text-slate-500">{row.warehouseName} · {row.materialType || "Malzeme tipi yok"}{row.shadeCode ? ` · Shade ${row.shadeCode}` : ""} · {row.widthCm} x {row.heightCm} cm</p>
                        </div>
                        <p className="text-xs font-black text-blue-200">{row.quantity} plaka</p>
                        <p className="text-xs font-bold text-slate-400">{row.purchaseCurrency}</p>
                        <p className="text-sm font-black text-emerald-300 md:text-right">{fmtMoney(row.purchaseTotalCost, row.purchaseCurrency)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 md:flex md:justify-end">
          <button type="button" onClick={onSelectFile} disabled={loading} className="rounded-2xl border border-white/10 bg-white/[0.055] px-4 py-3 text-xs font-black text-slate-200 disabled:opacity-50">Dosya Seç</button>
          <button
            type="button"
            onClick={onCommit}
            disabled={!canCommit}
            className="rounded-2xl border border-emerald-400/25 bg-emerald-500/16 px-4 py-3 text-xs font-black text-emerald-100 disabled:border-white/10 disabled:bg-white/[0.035] disabled:text-slate-600"
          >
            {loading ? "İşleniyor..." : "İçe Aktar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function MobileStockView({ summary, tabs, activeTab, setActiveTab, hasStock, openProduct, onImportClick }: {
  summary: SummaryResponse;
  tabs: readonly (readonly [string, string])[];
  activeTab: string;
  setActiveTab: (tab: any) => void;
  hasStock: boolean;
  openProduct: (product: StockProduct) => void;
  onImportClick: () => void;
}) {
  return (
    <div className="mx-auto max-w-lg md:hidden">
      <div className="sticky top-0 z-30 -mx-3 border-b border-white/[0.06] bg-[#030712]/95 backdrop-blur-md">
        <div className="px-4 pb-2 pt-3">
          <p className="text-[9px] font-black uppercase tracking-[0.22em] text-blue-400">Metrix · Stok Cockpit</p>
          <h1 className="mt-0.5 text-[17px] font-black tracking-[-0.02em] text-white">Stok & Malzeme</h1>
          <p className="mb-3 mt-0.5 text-[11px] text-slate-500">{summary.totals.totalPlateCount} plaka · {fmtArea(summary.totals.totalRemainingAreaCm2)} kalan alan</p>
          <div className="flex gap-1 overflow-x-auto rounded-2xl border border-white/[0.08] bg-white/[0.04] p-1">
            {tabs.slice(0, 4).map(([id, label]) => (
              <button key={id} type="button" onClick={() => setActiveTab(id)} className={`whitespace-nowrap rounded-xl px-3 py-2 text-[12px] font-bold transition-all ${activeTab === id ? "bg-blue-500 text-white" : "text-slate-400"}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="space-y-3 pb-[calc(88px+env(safe-area-inset-bottom))] pt-3">
        <div className="grid grid-cols-2 gap-2">
          <KpiCard label="Stok Değeri" value={fmtMoney(summary.totals.totalStockValue)} sub={`${summary.totals.productCount} ürün`} tone="text-emerald-300" />
          <KpiCard label="Kullanılabilir" value={String(summary.totals.availablePlateCount)} sub="tam plaka" tone="text-blue-300" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <ActionButton onClick={() => { window.location.href = "/api/stock/import/template"; }}>Şablon İndir</ActionButton>
          <ActionButton onClick={onImportClick}>Excel Yükle</ActionButton>
        </div>
        {!hasStock ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-5 text-center">
            <p className="text-[12px] font-bold text-white">Stok modülü hazır.</p>
            <p className="mt-1 text-[11px] leading-5 text-slate-500">Metrix stokları ürün bazında gösterir, ama her plakayı ayrı takip eder. Shade/ton kodunu girerek aynı işte ton karışmasını önleyebilirsin.</p>
          </div>
        ) : activeTab === "products" || activeTab === "overview" ? (
          <div className="space-y-2">
            {summary.products.map((product) => (
              <button key={`${product.productName}-${product.materialType ?? ""}`} onClick={() => openProduct(product)} className="w-full rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 text-left active:bg-white/[0.055]">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-black text-white">{product.productName}</p>
                    <p className="mt-0.5 truncate text-[11px] text-slate-500">{product.materialType || "Malzeme tipi yok"}</p>
                    {product.shadeGroups.length > 0 && (
                      <p className="mt-1 truncate text-[10px] font-bold text-cyan-200">
                        {product.shadeGroups.slice(0, 2).map((s) => `${s.shadeCode}: ${s.plateCount}`).join(" · ")}
                      </p>
                    )}
                  </div>
                  <p className="text-[13px] font-black text-emerald-300">{fmtMoney(product.totalStockValue)}</p>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2 py-1 text-[10px] font-black text-emerald-300">{product.availablePlateCount} tam</span>
                  <span className="rounded-full border border-blue-400/20 bg-blue-500/10 px-2 py-1 text-[10px] font-black text-blue-300">{fmtArea(product.totalRemainingAreaCm2)}</span>
                  <span className="rounded-full border border-violet-400/20 bg-violet-500/10 px-2 py-1 text-[10px] font-black text-violet-300">{product.offcutCount} offcut</span>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-5 text-center">
            <p className="text-[12px] font-bold text-white">Bu segment read-only foundation.</p>
            <p className="mt-1 text-[11px] leading-5 text-slate-500">Detay yazma akışları sonraki fazlarda açılacak.</p>
          </div>
        )}
      </div>
    </div>
  );
}
