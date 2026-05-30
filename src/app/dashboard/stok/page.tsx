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

type StockMovementRow = {
  id: string;
  stockPlateId: string | null;
  offcutId: string | null;
  movementType: string;
  quantityAreaCm2: number | null;
  warehouseName: string | null;
  fromWarehouseName: string | null;
  toWarehouseName: string | null;
  isId: string | null;
  jobId: string | null;
  customerName: string | null;
  jobProductName: string | null;
  offerNo: string | null;
  plateCode: string | null;
  offcutCode: string | null;
  productName: string | null;
  materialType: string | null;
  shadeCode: string | null;
  offcutWidthCm: number | null;
  offcutHeightCm: number | null;
  reasonCode: string | null;
  note: string | null;
  createdAt: string;
};

type StockOffcutRow = {
  id: string;
  parentPlateId: string;
  parentPlateCode: string | null;
  parentOffcutId: string | null;
  offcutCode: string;
  warehouseId: string | null;
  warehouseName: string | null;
  productName: string;
  materialType: string | null;
  shadeCode: string | null;
  widthCm: number;
  heightCm: number;
  areaCm2: number;
  areaM2: number;
  remainingAreaCm2: number;
  remainingAreaM2: number;
  costPerM2: number;
  totalCost: number;
  currency: string;
  status: string;
  sourceJobId: string | null;
  consumedAt: string | null;
  scrappedAt: string | null;
  notes: string | null;
  createdAt: string;
};

type OffcutFormState = {
  parentPlateId: string;
  widthCm: string;
  heightCm: string;
  notes: string;
};

type StockPurchaseRow = {
  id: string;
  purchaseCode: string;
  isId: string | null;
  jobId: string | null;
  customerName: string | null;
  jobProductName: string | null;
  offerNo: string | null;
  supplierName: string | null;
  productName: string;
  materialType: string | null;
  widthCm: number;
  heightCm: number;
  quantity: number;
  currency: string;
  unitCost: number;
  totalCost: number;
  warehouseId: string | null;
  warehouseName: string | null;
  status: string;
  expectedDate: string | null;
  completedAt: string | null;
  createdStockPlateIds: string[];
  createdAt: string;
};

type PurchaseFormState = {
  productName: string;
  materialType: string;
  widthCm: string;
  heightCm: string;
  quantity: string;
  supplierName: string;
  expectedDate: string;
  unitCost: string;
  currency: string;
  warehouseId: string;
  isId: string;
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
  recentPurchases: Array<{ id: string; purchaseCode: string; productName: string; supplierName: string | null; quantity: number; status: string; totalCost: number; currency: string; expectedDate?: string | null; completedAt?: string | null }>;
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

const EMPTY_PURCHASE_FORM: PurchaseFormState = {
  productName: "",
  materialType: "",
  widthCm: "",
  heightCm: "",
  quantity: "1",
  supplierName: "",
  expectedDate: "",
  unitCost: "",
  currency: "TRY",
  warehouseId: "",
  isId: "",
};

const EMPTY_OFFCUT_FORM: OffcutFormState = {
  parentPlateId: "",
  widthCm: "",
  heightCm: "",
  notes: "",
};

const OFFCUT_STATUS_LABELS: Record<string, string> = {
  AVAILABLE: "Kullanılabilir",
  RESERVED: "Rezerve",
  PARTIAL_CONSUMED: "Kısmi Tüketildi",
  CONSUMED: "Tüketildi",
  SCRAPPED: "Hurda",
};

const OFFCUT_STATUS_CLASS: Record<string, string> = {
  AVAILABLE: "border-emerald-400/25 bg-emerald-500/10 text-emerald-300",
  RESERVED: "border-blue-400/25 bg-blue-500/10 text-blue-300",
  PARTIAL_CONSUMED: "border-amber-400/25 bg-amber-500/10 text-amber-300",
  CONSUMED: "border-red-400/25 bg-red-500/10 text-red-300",
  SCRAPPED: "border-slate-400/15 bg-slate-500/10 text-slate-300",
};

const PURCHASE_FILTERS = [
  { value: "", label: "Tümü" },
  { value: "PLANNED", label: "Planlandı" },
  { value: "ORDERED", label: "Siparişte" },
  { value: "RECEIVED", label: "Teslim Alındı" },
  { value: "CANCELLED", label: "İptal" },
] as const;

const PURCHASE_META: Record<string, { label: string; className: string }> = {
  PLANNED: { label: "Planlandı", className: "border-blue-400/25 bg-blue-500/10 text-blue-300" },
  ORDERED: { label: "Siparişte", className: "border-amber-400/25 bg-amber-500/10 text-amber-300" },
  RECEIVED: { label: "Teslim Alındı", className: "border-emerald-400/25 bg-emerald-500/10 text-emerald-300" },
  CANCELLED: { label: "İptal", className: "border-slate-400/15 bg-slate-500/10 text-slate-300" },
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

function purchaseMeta(status: string) {
  return PURCHASE_META[String(status || "").toUpperCase()] ?? {
    label: status || "Durum yok",
    className: "border-white/10 bg-white/[0.055] text-slate-300",
  };
}

function offcutMeta(status: string) {
  const key = String(status || "").toUpperCase();
  return {
    label: OFFCUT_STATUS_LABELS[key] ?? status ?? "Durum yok",
    className: OFFCUT_STATUS_CLASS[key] ?? "border-white/10 bg-white/[0.055] text-slate-300",
  };
}

function isPurchaseOverdue(purchase: StockPurchaseRow) {
  if (!purchase.expectedDate || ["RECEIVED", "CANCELLED"].includes(String(purchase.status).toUpperCase())) return false;
  const expected = new Date(purchase.expectedDate);
  if (Number.isNaN(expected.getTime())) return false;
  expected.setHours(23, 59, 59, 999);
  return expected.getTime() < Date.now();
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
  const [movements, setMovements] = useState<StockMovementRow[]>([]);
  const [purchases, setPurchases] = useState<StockPurchaseRow[]>([]);
  const [offcuts, setOffcuts] = useState<StockOffcutRow[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<StockProduct | null>(null);
  const [selectedProductPlates, setSelectedProductPlates] = useState<StockPlate[]>([]);
  const [activeTab, setActiveTab] = useState<"overview" | "products" | "plates" | "offcuts" | "purchases" | "movements">("overview");
  const [purchaseForm, setPurchaseForm] = useState<PurchaseFormState>(EMPTY_PURCHASE_FORM);
  const [purchaseError, setPurchaseError] = useState("");
  const [offcutForm, setOffcutForm] = useState<OffcutFormState>(EMPTY_OFFCUT_FORM);
  const [offcutError, setOffcutError] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [importFileName, setImportFileName] = useState("");
  const [importPreview, setImportPreview] = useState<StockImportPreview | null>(null);
  const [importResult, setImportResult] = useState<StockImportResult | null>(null);
  const [importError, setImportError] = useState("");
  const [importLoading, setImportLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [platesLoading, setPlatesLoading] = useState(false);
  const [movementsLoading, setMovementsLoading] = useState(false);
  const [purchasesLoading, setPurchasesLoading] = useState(false);
  const [purchaseSaving, setPurchaseSaving] = useState(false);
  const [offcutsLoading, setOffcutsLoading] = useState(false);
  const [offcutSaving, setOffcutSaving] = useState(false);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [materialType, setMaterialType] = useState("");
  const [movementType, setMovementType] = useState("");
  const [purchaseStatus, setPurchaseStatus] = useState("");
  const [offcutProduct, setOffcutProduct] = useState("");
  const [offcutShade, setOffcutShade] = useState("");
  const [offcutStatus, setOffcutStatus] = useState("");
  const [offcutMinWidth, setOffcutMinWidth] = useState("");
  const [offcutMinHeight, setOffcutMinHeight] = useState("");

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

  async function loadMovements(type = movementType) {
    setMovementsLoading(true);
    try {
      const params = new URLSearchParams();
      if (type) params.set("movementType", type);
      const json = await fetch(`/api/stock/movements?${params.toString()}`, { credentials: "include" }).then((r) => r.json());
      setMovements(Array.isArray(json?.movements) ? json.movements : []);
    } finally {
      setMovementsLoading(false);
    }
  }

  async function loadPurchases() {
    setPurchasesLoading(true);
    try {
      const json = await fetch("/api/stock/purchases", { credentials: "include" }).then((r) => r.json());
      setPurchases(Array.isArray(json?.purchases) ? json.purchases : []);
    } finally {
      setPurchasesLoading(false);
    }
  }

  async function loadOffcuts() {
    setOffcutsLoading(true);
    try {
      const params = new URLSearchParams();
      if (offcutProduct.trim()) params.set("productName", offcutProduct.trim());
      if (offcutShade.trim()) params.set("shadeCode", offcutShade.trim());
      if (offcutStatus) params.set("status", offcutStatus);
      if (offcutMinWidth) params.set("minWidthCm", offcutMinWidth);
      if (offcutMinHeight) params.set("minHeightCm", offcutMinHeight);
      const json = await fetch(`/api/stock/offcuts?${params.toString()}`, { credentials: "include" }).then((r) => r.json());
      setOffcuts(Array.isArray(json?.offcuts) ? json.offcuts : []);
    } finally {
      setOffcutsLoading(false);
    }
  }

  useEffect(() => {
    loadSummary();
    loadPlates();
    loadMovements("");
    loadPurchases();
    loadOffcuts();
  }, []);

  useEffect(() => {
    const id = setTimeout(() => loadPlates(), 250);
    return () => clearTimeout(id);
  }, [q, status, warehouseId, materialType]);

  useEffect(() => {
    if (activeTab !== "movements") return;
    loadMovements();
  }, [activeTab, movementType]);

  useEffect(() => {
    if (activeTab !== "purchases") return;
    loadPurchases();
  }, [activeTab, purchaseStatus]);

  useEffect(() => {
    if (activeTab !== "offcuts") return;
    const id = setTimeout(() => loadOffcuts(), 250);
    return () => clearTimeout(id);
  }, [activeTab, offcutProduct, offcutShade, offcutStatus, offcutMinWidth, offcutMinHeight]);

  async function createOffcut() {
    setOffcutError("");
    setOffcutSaving(true);
    try {
      const res = await fetch("/api/stock/offcuts", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parentPlateId: offcutForm.parentPlateId,
          widthCm: Number(offcutForm.widthCm),
          heightCm: Number(offcutForm.heightCm),
          notes: offcutForm.notes || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Offcut oluşturulamadı.");
      setOffcutForm(EMPTY_OFFCUT_FORM);
      await Promise.all([loadOffcuts(), loadSummary(), loadPlates(), loadMovements("")]);
    } catch (error) {
      setOffcutError(error instanceof Error ? error.message : "Offcut oluşturulamadı.");
    } finally {
      setOffcutSaving(false);
    }
  }

  async function createPurchase() {
    setPurchaseError("");
    setPurchaseSaving(true);
    try {
      const quantity = Number(purchaseForm.quantity || 1);
      const unitCost = Number(purchaseForm.unitCost || 0);
      const res = await fetch("/api/stock/purchases", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...purchaseForm,
          widthCm: Number(purchaseForm.widthCm),
          heightCm: Number(purchaseForm.heightCm),
          quantity,
          unitCost,
          totalCost: unitCost * quantity,
          warehouseId: purchaseForm.warehouseId || null,
          isId: purchaseForm.isId || null,
          materialType: purchaseForm.materialType || null,
          supplierName: purchaseForm.supplierName || null,
          expectedDate: purchaseForm.expectedDate || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Satın alma kaydı oluşturulamadı.");
      setPurchaseForm(EMPTY_PURCHASE_FORM);
      await Promise.all([loadPurchases(), loadSummary()]);
    } catch (error) {
      setPurchaseError(error instanceof Error ? error.message : "Satın alma kaydı oluşturulamadı.");
    } finally {
      setPurchaseSaving(false);
    }
  }

  async function updatePurchaseStatus(id: string, nextStatus: string) {
    setPurchaseError("");
    setPurchaseSaving(true);
    try {
      const res = await fetch(`/api/stock/purchases/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Satın alma durumu güncellenemedi.");
      await Promise.all([loadPurchases(), loadSummary()]);
    } catch (error) {
      setPurchaseError(error instanceof Error ? error.message : "Satın alma durumu güncellenemedi.");
    } finally {
      setPurchaseSaving(false);
    }
  }

  async function receivePurchase(id: string) {
    setPurchaseError("");
    setPurchaseSaving(true);
    try {
      const res = await fetch(`/api/stock/purchases/${id}/receive`, {
        method: "POST",
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Satın alma teslim alınamadı.");
      await Promise.all([loadPurchases(), loadSummary(), loadPlates(), loadMovements("")]);
    } catch (error) {
      setPurchaseError(error instanceof Error ? error.message : "Satın alma teslim alınamadı.");
    } finally {
      setPurchaseSaving(false);
    }
  }

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
              activeTab === "movements" ? (
                <MovementList
                  movements={movements}
                  loading={movementsLoading}
                  movementType={movementType}
                  onMovementTypeChange={setMovementType}
                />
              ) : activeTab === "offcuts" ? (
                <OffcutList
                  offcuts={offcuts}
                  plates={plates}
                  loading={offcutsLoading}
                  saving={offcutSaving}
                  error={offcutError}
                  form={offcutForm}
                  filters={{ product: offcutProduct, shade: offcutShade, status: offcutStatus, minWidth: offcutMinWidth, minHeight: offcutMinHeight }}
                  onFormChange={(patch) => setOffcutForm((prev) => ({ ...prev, ...patch }))}
                  onFilterChange={(patch) => {
                    if (patch.product !== undefined) setOffcutProduct(patch.product);
                    if (patch.shade !== undefined) setOffcutShade(patch.shade);
                    if (patch.status !== undefined) setOffcutStatus(patch.status);
                    if (patch.minWidth !== undefined) setOffcutMinWidth(patch.minWidth);
                    if (patch.minHeight !== undefined) setOffcutMinHeight(patch.minHeight);
                  }}
                  onCreate={createOffcut}
                />
              ) : activeTab === "purchases" ? (
                <PurchaseList
                  purchases={purchases}
                  warehouses={summary.warehouses}
                  loading={purchasesLoading}
                  saving={purchaseSaving}
                  error={purchaseError}
                  statusFilter={purchaseStatus}
                  form={purchaseForm}
                  onStatusFilterChange={setPurchaseStatus}
                  onFormChange={(patch) => setPurchaseForm((prev) => ({ ...prev, ...patch }))}
                  onCreate={createPurchase}
                  onOrder={(id) => updatePurchaseStatus(id, "ORDERED")}
                  onCancel={(id) => updatePurchaseStatus(id, "CANCELLED")}
                  onReceive={receivePurchase}
                />
              ) : (
                <PlaceholderPanel tab={activeTab} purchases={summary.recentPurchases} fireRecords={summary.recentFireRecords} />
              )
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
        plates={plates}
        platesLoading={platesLoading}
        movements={movements}
        movementsLoading={movementsLoading}
        offcuts={offcuts}
        offcutsLoading={offcutsLoading}
        offcutSaving={offcutSaving}
        offcutError={offcutError}
        offcutForm={offcutForm}
        offcutFilters={{ product: offcutProduct, shade: offcutShade, status: offcutStatus, minWidth: offcutMinWidth, minHeight: offcutMinHeight }}
        purchases={purchases}
        purchasesLoading={purchasesLoading}
        purchaseSaving={purchaseSaving}
        purchaseError={purchaseError}
        purchaseStatus={purchaseStatus}
        purchaseForm={purchaseForm}
        movementType={movementType}
        onMovementTypeChange={setMovementType}
        onOffcutFormChange={(patch) => setOffcutForm((prev) => ({ ...prev, ...patch }))}
        onOffcutFilterChange={(patch) => {
          if (patch.product !== undefined) setOffcutProduct(patch.product);
          if (patch.shade !== undefined) setOffcutShade(patch.shade);
          if (patch.status !== undefined) setOffcutStatus(patch.status);
          if (patch.minWidth !== undefined) setOffcutMinWidth(patch.minWidth);
          if (patch.minHeight !== undefined) setOffcutMinHeight(patch.minHeight);
        }}
        onCreateOffcut={createOffcut}
        onPurchaseStatusChange={setPurchaseStatus}
        onPurchaseFormChange={(patch) => setPurchaseForm((prev) => ({ ...prev, ...patch }))}
        onCreatePurchase={createPurchase}
        onOrderPurchase={(id) => updatePurchaseStatus(id, "ORDERED")}
        onCancelPurchase={(id) => updatePurchaseStatus(id, "CANCELLED")}
        onReceivePurchase={receivePurchase}
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
          <div key={plate.id} className="grid gap-2 rounded-2xl border border-white/8 bg-white/[0.045] px-4 py-3 md:grid-cols-[120px_minmax(0,1fr)_120px_120px_120px] md:items-center md:gap-3">
            <p className="text-sm font-black text-white">{plate.plateCode}</p>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-slate-100">{plate.productName}</p>
              <p className="truncate text-xs text-slate-500">{plate.materialType || "Malzeme tipi yok"} · {plate.warehouse?.name || "Depo yok"}{plate.shadeCode ? ` · Shade ${plate.shadeCode}` : ""}</p>
            </div>
            <p className="text-xs font-bold text-slate-400">{plate.widthCm} x {plate.heightCm} cm</p>
            <p className="text-sm font-black tabular-nums text-blue-200">{fmtArea(plate.remainingAreaCm2)}</p>
            <div className="text-left md:text-right">
              <span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-black ${statusClass(plate.status)}`}>{statusLabel(plate.status)}</span>
              <p className="mt-1 text-xs font-bold text-emerald-300">{fmtMoney(plate.purchaseTotalCost, plate.purchaseCurrency)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const MOVEMENT_FILTERS = [
  { value: "", label: "Tümü" },
  { value: "IN", label: "Giriş" },
  { value: "RESERVE", label: "Rezervasyon" },
  { value: "RELEASE", label: "Serbest Bırakma" },
  { value: "CONSUME", label: "Tüketim" },
  { value: "OFFCUT_CREATE", label: "Offcut" },
] as const;

const MOVEMENT_META: Record<string, { label: string; className: string }> = {
  IN: { label: "Giriş", className: "border-emerald-400/25 bg-emerald-500/10 text-emerald-300" },
  RESERVE: { label: "Rezervasyon", className: "border-blue-400/25 bg-blue-500/10 text-blue-300" },
  RELEASE: { label: "Serbest", className: "border-amber-400/25 bg-amber-500/10 text-amber-300" },
  CONSUME: { label: "Tüketim", className: "border-red-400/25 bg-red-500/10 text-red-300" },
  OFFCUT_CREATE: { label: "Offcut", className: "border-violet-400/25 bg-violet-500/10 text-violet-300" },
  OFFCUT_RESERVE: { label: "Offcut Rezerve", className: "border-blue-400/25 bg-blue-500/10 text-blue-300" },
  OFFCUT_RELEASE: { label: "Offcut Serbest", className: "border-amber-400/25 bg-amber-500/10 text-amber-300" },
  OFFCUT_CONSUME: { label: "Offcut Tüketim", className: "border-red-400/25 bg-red-500/10 text-red-300" },
  OFFCUT_SCRAP: { label: "Offcut Hurda", className: "border-slate-400/15 bg-slate-500/10 text-slate-300" },
  PLATE_PARTIAL_CONSUME: { label: "Kısmi Plaka", className: "border-cyan-400/25 bg-cyan-500/10 text-cyan-300" },
};

function movementMeta(type: string) {
  return MOVEMENT_META[String(type || "").toUpperCase()] ?? {
    label: type || "Hareket",
    className: "border-white/10 bg-white/[0.055] text-slate-300",
  };
}

function MovementList({
  movements,
  loading,
  movementType,
  onMovementTypeChange,
}: {
  movements: StockMovementRow[];
  loading: boolean;
  movementType: string;
  onMovementTypeChange: (type: string) => void;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-300">Stok Hareketleri</p>
          <h2 className="mt-1 text-xl font-black tracking-[-0.02em] text-white">Plaka Zaman Çizelgesi</h2>
        </div>
        <div className="flex gap-1 overflow-x-auto rounded-2xl border border-white/10 bg-slate-950/45 p-1">
          {MOVEMENT_FILTERS.map((filter) => (
            <button
              key={filter.value || "all"}
              type="button"
              onClick={() => onMovementTypeChange(filter.value)}
              className={[
                "shrink-0 rounded-xl px-3 py-2 text-[11px] font-black transition",
                movementType === filter.value ? "bg-blue-500/20 text-white" : "text-slate-500 hover:bg-white/[0.055] hover:text-slate-200",
              ].join(" ")}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-500">Hareketler yükleniyor...</p>
      ) : movements.length === 0 ? (
        <div className="flex min-h-[260px] items-center justify-center rounded-3xl border border-dashed border-white/10 bg-white/[0.035] p-8 text-center">
          <div>
            <p className="text-sm font-black text-white">Hareket kaydı yok.</p>
            <p className="mt-1 max-w-sm text-xs leading-5 text-slate-500">Stok girişi, rezervasyon, serbest bırakma veya tüketim oluştuğunda burada listelenecek.</p>
          </div>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          <div className="grid gap-2">
            {movements.map((movement) => {
              const meta = movementMeta(movement.movementType);
              const title = movement.plateCode || movement.productName || "Stok hareketi";
              const product = movement.productName || movement.jobProductName || "Ürün bilgisi yok";
              const warehouse = movement.warehouseName || movement.toWarehouseName || movement.fromWarehouseName;
              return (
                <div key={movement.id} className="grid gap-3 rounded-2xl border border-white/8 bg-white/[0.045] px-4 py-3 md:grid-cols-[140px_minmax(0,1fr)_150px_150px] md:items-center">
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${meta.className}`}>{meta.label}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-white">{title}</p>
                    <p className="mt-0.5 truncate text-xs text-slate-500">
                      {product}{movement.materialType ? ` · ${movement.materialType}` : ""}{movement.shadeCode ? ` · Shade ${movement.shadeCode}` : ""}
                    </p>
                    {(movement.customerName || movement.note) && (
                      <p className="mt-1 truncate text-[11px] font-semibold text-slate-400">
                        {movement.customerName ? `${movement.customerName}${movement.offerNo ? ` · ${movement.offerNo}` : ""}` : movement.note}
                      </p>
                    )}
                  </div>
                  <div className="text-xs font-bold text-slate-400">
                    <p>{fmtArea(movement.quantityAreaCm2 ?? 0)}</p>
                    {warehouse && <p className="mt-0.5 truncate text-slate-500">{warehouse}</p>}
                  </div>
                  <div className="text-left md:text-right">
                    <p className="text-xs font-black text-slate-300">{new Date(movement.createdAt).toLocaleDateString("tr-TR")}</p>
                    <p className="mt-0.5 text-[11px] font-semibold text-slate-500">{new Date(movement.createdAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function OffcutList({
  offcuts,
  plates,
  loading,
  saving,
  error,
  form,
  filters,
  onFormChange,
  onFilterChange,
  onCreate,
}: {
  offcuts: StockOffcutRow[];
  plates: StockPlate[];
  loading: boolean;
  saving: boolean;
  error: string;
  form: OffcutFormState;
  filters: { product: string; shade: string; status: string; minWidth: string; minHeight: string };
  onFormChange: (patch: Partial<OffcutFormState>) => void;
  onFilterChange: (patch: Partial<{ product: string; shade: string; status: string; minWidth: string; minHeight: string }>) => void;
  onCreate: () => void;
}) {
  const parentOptions = plates.filter((plate) => ["AVAILABLE", "RESERVED", "PARTIAL"].includes(String(plate.status).toUpperCase()));
  const canCreate = form.parentPlateId && Number(form.widthCm) > 0 && Number(form.heightCm) > 0;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-violet-300">Offcut Foundation</p>
          <h2 className="mt-1 text-xl font-black tracking-[-0.02em] text-white">Fiziksel Parça Stoku</h2>
        </div>
        <div className="grid grid-cols-3 gap-1 md:w-[340px]">
          <KpiMini label="Offcut" value={String(offcuts.length)} />
          <KpiMini label="Alan" value={fmtArea(offcuts.reduce((sum, row) => sum + row.remainingAreaCm2, 0))} />
          <KpiMini label="Değer" value={fmtMoney(offcuts.reduce((sum, row) => sum + row.totalCost, 0), offcuts[0]?.currency || "TRY")} />
        </div>
      </div>

      <div className="mb-3 rounded-3xl border border-white/10 bg-white/[0.035] p-3">
        <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_110px_110px_minmax(0,1fr)_120px]">
          <select value={form.parentPlateId} onChange={(e) => onFormChange({ parentPlateId: e.target.value })} className="h-10 rounded-2xl border border-white/10 bg-slate-950/60 px-3 text-sm text-white outline-none">
            <option value="">Parent plaka seç</option>
            {parentOptions.map((plate) => (
              <option key={plate.id} value={plate.id}>
                {plate.plateCode} · {plate.productName} · {fmtArea(plate.remainingAreaCm2)}
              </option>
            ))}
          </select>
          <input value={form.widthCm} onChange={(e) => onFormChange({ widthCm: e.target.value })} placeholder="En cm" inputMode="decimal" className="h-10 rounded-2xl border border-white/10 bg-slate-950/60 px-3 text-sm text-white outline-none focus:border-violet-400/50" />
          <input value={form.heightCm} onChange={(e) => onFormChange({ heightCm: e.target.value })} placeholder="Boy cm" inputMode="decimal" className="h-10 rounded-2xl border border-white/10 bg-slate-950/60 px-3 text-sm text-white outline-none focus:border-violet-400/50" />
          <input value={form.notes} onChange={(e) => onFormChange({ notes: e.target.value })} placeholder="Not" className="h-10 rounded-2xl border border-white/10 bg-slate-950/60 px-3 text-sm text-white outline-none focus:border-violet-400/50" />
          <button type="button" onClick={onCreate} disabled={!canCreate || saving} className="h-10 rounded-2xl border border-violet-400/25 bg-violet-500/16 px-3 text-xs font-black text-violet-100 disabled:border-white/10 disabled:bg-white/[0.035] disabled:text-slate-600">
            Oluştur
          </button>
        </div>
        {error && <p className="mt-2 rounded-2xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-200">{error}</p>}
      </div>

      <div className="mb-3 grid gap-2 md:grid-cols-[minmax(0,1fr)_120px_160px_120px_120px]">
        <input value={filters.product} onChange={(e) => onFilterChange({ product: e.target.value })} placeholder="Ürün" className="h-10 rounded-2xl border border-white/10 bg-slate-950/60 px-3 text-sm text-white outline-none focus:border-violet-400/50" />
        <input value={filters.shade} onChange={(e) => onFilterChange({ shade: e.target.value })} placeholder="Ton" className="h-10 rounded-2xl border border-white/10 bg-slate-950/60 px-3 text-sm text-white outline-none focus:border-violet-400/50" />
        <select value={filters.status} onChange={(e) => onFilterChange({ status: e.target.value })} className="h-10 rounded-2xl border border-white/10 bg-slate-950/60 px-3 text-sm text-white outline-none">
          <option value="">Tüm durumlar</option>
          {Object.entries(OFFCUT_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <input value={filters.minWidth} onChange={(e) => onFilterChange({ minWidth: e.target.value })} placeholder="Min en" inputMode="decimal" className="h-10 rounded-2xl border border-white/10 bg-slate-950/60 px-3 text-sm text-white outline-none focus:border-violet-400/50" />
        <input value={filters.minHeight} onChange={(e) => onFilterChange({ minHeight: e.target.value })} placeholder="Min boy" inputMode="decimal" className="h-10 rounded-2xl border border-white/10 bg-slate-950/60 px-3 text-sm text-white outline-none focus:border-violet-400/50" />
      </div>

      {loading ? (
        <p className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-500">Offcutlar yükleniyor...</p>
      ) : offcuts.length === 0 ? (
        <div className="flex min-h-[260px] items-center justify-center rounded-3xl border border-dashed border-white/10 bg-white/[0.035] p-8 text-center">
          <div>
            <p className="text-sm font-black text-white">Offcut kaydı yok.</p>
            <p className="mt-1 max-w-sm text-xs leading-5 text-slate-500">Parent plaka seçip fiziksel ölçü girerek kalan parçaları stokta ayrı takip edebilirsin.</p>
          </div>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          <div className="grid gap-2">
            {offcuts.map((offcut) => {
              const meta = offcutMeta(offcut.status);
              return (
                <div key={offcut.id} className="grid gap-3 rounded-2xl border border-white/8 bg-white/[0.045] px-4 py-3 md:grid-cols-[130px_minmax(0,1fr)_140px_120px_120px] md:items-center">
                  <div>
                    <p className="text-sm font-black text-white">{offcut.offcutCode}</p>
                    <p className="mt-0.5 text-[11px] font-semibold text-slate-500">{offcut.parentPlateCode || "Parent yok"}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-white">{offcut.productName}</p>
                    <p className="mt-0.5 truncate text-xs text-slate-500">
                      {offcut.materialType || "Malzeme tipi yok"}{offcut.shadeCode ? ` · Ton ${offcut.shadeCode}` : ""}{offcut.warehouseName ? ` · ${offcut.warehouseName}` : ""}
                    </p>
                  </div>
                  <p className="text-xs font-bold text-slate-400">{offcut.widthCm} x {offcut.heightCm} cm</p>
                  <div>
                    <p className="text-sm font-black text-blue-200">{fmtArea(offcut.remainingAreaCm2)}</p>
                    <p className="mt-0.5 text-[11px] font-semibold text-emerald-300">{fmtMoney(offcut.totalCost, offcut.currency)}</p>
                  </div>
                  <div className="text-left md:text-right">
                    <span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-black ${meta.className}`}>{meta.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function PurchaseList({
  purchases,
  warehouses,
  loading,
  saving,
  error,
  statusFilter,
  form,
  onStatusFilterChange,
  onFormChange,
  onCreate,
  onOrder,
  onCancel,
  onReceive,
}: {
  purchases: StockPurchaseRow[];
  warehouses: SummaryResponse["warehouses"];
  loading: boolean;
  saving: boolean;
  error: string;
  statusFilter: string;
  form: PurchaseFormState;
  onStatusFilterChange: (status: string) => void;
  onFormChange: (patch: Partial<PurchaseFormState>) => void;
  onCreate: () => void;
  onOrder: (id: string) => void;
  onCancel: (id: string) => void;
  onReceive: (id: string) => void;
}) {
  const counts = PURCHASE_FILTERS.reduce<Record<string, number>>((acc, filter) => {
    acc[filter.value || "ALL"] = filter.value ? purchases.filter((p) => p.status === filter.value).length : purchases.length;
    return acc;
  }, {});
  const visiblePurchases = statusFilter ? purchases.filter((purchase) => purchase.status === statusFilter) : purchases;
  const canCreate =
    form.productName.trim() &&
    Number(form.widthCm) > 0 &&
    Number(form.heightCm) > 0 &&
    Number(form.quantity || 1) > 0;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-300">Satın Alma Workflow</p>
          <h2 className="mt-1 text-xl font-black tracking-[-0.02em] text-white">Plaka Alım Takibi</h2>
        </div>
        <div className="grid grid-cols-4 gap-1 md:w-[460px]">
          <KpiMini label="Planlandı" value={String(counts.PLANNED ?? 0)} />
          <KpiMini label="Siparişte" value={String(counts.ORDERED ?? 0)} />
          <KpiMini label="Teslim" value={String(counts.RECEIVED ?? 0)} />
          <KpiMini label="İptal" value={String(counts.CANCELLED ?? 0)} />
        </div>
      </div>

      <div className="mb-3 rounded-3xl border border-white/10 bg-white/[0.035] p-3">
        <div className="grid gap-2 md:grid-cols-[minmax(0,1.3fr)_120px_120px_88px_120px]">
          <input value={form.productName} onChange={(e) => onFormChange({ productName: e.target.value })} placeholder="Ürün" className="h-10 rounded-2xl border border-white/10 bg-slate-950/60 px-3 text-sm text-white outline-none focus:border-blue-400/50" />
          <input value={form.widthCm} onChange={(e) => onFormChange({ widthCm: e.target.value })} placeholder="En cm" inputMode="decimal" className="h-10 rounded-2xl border border-white/10 bg-slate-950/60 px-3 text-sm text-white outline-none focus:border-blue-400/50" />
          <input value={form.heightCm} onChange={(e) => onFormChange({ heightCm: e.target.value })} placeholder="Boy cm" inputMode="decimal" className="h-10 rounded-2xl border border-white/10 bg-slate-950/60 px-3 text-sm text-white outline-none focus:border-blue-400/50" />
          <input value={form.quantity} onChange={(e) => onFormChange({ quantity: e.target.value })} placeholder="Adet" inputMode="numeric" className="h-10 rounded-2xl border border-white/10 bg-slate-950/60 px-3 text-sm text-white outline-none focus:border-blue-400/50" />
          <input value={form.unitCost} onChange={(e) => onFormChange({ unitCost: e.target.value })} placeholder="Birim maliyet" inputMode="decimal" className="h-10 rounded-2xl border border-white/10 bg-slate-950/60 px-3 text-sm text-white outline-none focus:border-blue-400/50" />
        </div>
        <div className="mt-2 grid gap-2 md:grid-cols-[minmax(0,1fr)_160px_160px_minmax(0,1fr)_120px]">
          <input value={form.materialType} onChange={(e) => onFormChange({ materialType: e.target.value })} placeholder="Malzeme tipi" className="h-10 rounded-2xl border border-white/10 bg-slate-950/60 px-3 text-sm text-white outline-none focus:border-blue-400/50" />
          <input value={form.supplierName} onChange={(e) => onFormChange({ supplierName: e.target.value })} placeholder="Tedarikçi" className="h-10 rounded-2xl border border-white/10 bg-slate-950/60 px-3 text-sm text-white outline-none focus:border-blue-400/50" />
          <input value={form.expectedDate} onChange={(e) => onFormChange({ expectedDate: e.target.value })} type="date" className="h-10 rounded-2xl border border-white/10 bg-slate-950/60 px-3 text-sm text-white outline-none focus:border-blue-400/50" />
          <select value={form.warehouseId} onChange={(e) => onFormChange({ warehouseId: e.target.value })} className="h-10 rounded-2xl border border-white/10 bg-slate-950/60 px-3 text-sm text-white outline-none">
            <option value="">Depo yok</option>
            {warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}
          </select>
          <button type="button" onClick={onCreate} disabled={!canCreate || saving} className="h-10 rounded-2xl border border-emerald-400/25 bg-emerald-500/16 px-3 text-xs font-black text-emerald-100 disabled:border-white/10 disabled:bg-white/[0.035] disabled:text-slate-600">
            Oluştur
          </button>
        </div>
        <input value={form.isId} onChange={(e) => onFormChange({ isId: e.target.value })} placeholder="İlişkili iş ID (opsiyonel)" className="mt-2 h-10 w-full rounded-2xl border border-white/10 bg-slate-950/60 px-3 text-sm text-white outline-none focus:border-blue-400/50" />
        {error && <p className="mt-2 rounded-2xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-200">{error}</p>}
      </div>

      <div className="mb-3 flex gap-1 overflow-x-auto rounded-2xl border border-white/10 bg-slate-950/45 p-1">
        {PURCHASE_FILTERS.map((filter) => (
          <button
            key={filter.value || "all"}
            type="button"
            onClick={() => onStatusFilterChange(filter.value)}
            className={[
              "shrink-0 rounded-xl px-3 py-2 text-[11px] font-black transition",
              statusFilter === filter.value ? "bg-blue-500/20 text-white" : "text-slate-500 hover:bg-white/[0.055] hover:text-slate-200",
            ].join(" ")}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-500">Satın alma kayıtları yükleniyor...</p>
      ) : visiblePurchases.length === 0 ? (
        <div className="flex min-h-[260px] items-center justify-center rounded-3xl border border-dashed border-white/10 bg-white/[0.035] p-8 text-center">
          <div>
            <p className="text-sm font-black text-white">Satın alma kaydı yok.</p>
            <p className="mt-1 max-w-sm text-xs leading-5 text-slate-500">Planlanan taş alımları oluşturulduğunda teslim alma ve stok girişi buradan yönetilecek.</p>
          </div>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          <div className="grid gap-2">
            {visiblePurchases.map((purchase) => {
              const meta = purchaseMeta(purchase.status);
              const overdue = isPurchaseOverdue(purchase);
              const canOrder = purchase.status === "PLANNED";
              const canReceive = purchase.status === "PLANNED" || purchase.status === "ORDERED";
              const canCancel = purchase.status === "PLANNED" || purchase.status === "ORDERED";
              return (
                <div key={purchase.id} className={`grid gap-3 rounded-2xl border px-4 py-3 md:grid-cols-[minmax(0,1fr)_140px_150px_210px] md:items-center ${overdue ? "border-red-400/30 bg-red-500/[0.07]" : "border-white/8 bg-white/[0.045]"}`}>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${meta.className}`}>{meta.label}</span>
                      {overdue && <span className="rounded-full border border-red-400/25 bg-red-500/10 px-2.5 py-1 text-[10px] font-black text-red-200">Tarih geçti</span>}
                    </div>
                    <p className="mt-2 truncate text-sm font-black text-white">{purchase.productName}</p>
                    <p className="mt-0.5 truncate text-xs text-slate-500">
                      {purchase.purchaseCode} · {purchase.widthCm} x {purchase.heightCm} cm · {purchase.quantity} adet{purchase.materialType ? ` · ${purchase.materialType}` : ""}
                    </p>
                    {(purchase.customerName || purchase.offerNo) && (
                      <p className="mt-1 truncate text-[11px] font-semibold text-blue-200">{purchase.customerName || "İş"}{purchase.offerNo ? ` · ${purchase.offerNo}` : ""}</p>
                    )}
                  </div>
                  <div className="text-xs font-bold text-slate-400">
                    <p>{purchase.supplierName || "Tedarikçi yok"}</p>
                    <p className="mt-0.5 text-slate-500">{purchase.warehouseName || "Depo yok"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-black text-emerald-300">{fmtMoney(purchase.totalCost, purchase.currency)}</p>
                    <p className={`mt-0.5 text-[11px] font-semibold ${overdue ? "text-red-200" : "text-slate-500"}`}>
                      {purchase.expectedDate ? new Date(purchase.expectedDate).toLocaleDateString("tr-TR") : "Tarih yok"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5 md:justify-end">
                    {canOrder && <button type="button" disabled={saving} onClick={() => onOrder(purchase.id)} className="rounded-xl border border-blue-400/20 bg-blue-500/12 px-3 py-2 text-[11px] font-black text-blue-100 disabled:opacity-50">Siparişe Al</button>}
                    {canReceive && <button type="button" disabled={saving} onClick={() => onReceive(purchase.id)} className="rounded-xl border border-emerald-400/20 bg-emerald-500/12 px-3 py-2 text-[11px] font-black text-emerald-100 disabled:opacity-50">Teslim Al</button>}
                    {canCancel && <button type="button" disabled={saving} onClick={() => onCancel(purchase.id)} className="rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-[11px] font-black text-red-100 disabled:opacity-50">İptal Et</button>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
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

function MobileStockView({
  summary,
  plates,
  platesLoading,
  movements,
  movementsLoading,
  offcuts,
  offcutsLoading,
  offcutSaving,
  offcutError,
  offcutForm,
  offcutFilters,
  purchases,
  purchasesLoading,
  purchaseSaving,
  purchaseError,
  purchaseStatus,
  purchaseForm,
  movementType,
  onMovementTypeChange,
  onOffcutFormChange,
  onOffcutFilterChange,
  onCreateOffcut,
  onPurchaseStatusChange,
  onPurchaseFormChange,
  onCreatePurchase,
  onOrderPurchase,
  onCancelPurchase,
  onReceivePurchase,
  tabs,
  activeTab,
  setActiveTab,
  hasStock,
  openProduct,
  onImportClick,
}: {
  summary: SummaryResponse;
  plates: StockPlate[];
  platesLoading: boolean;
  movements: StockMovementRow[];
  movementsLoading: boolean;
  offcuts: StockOffcutRow[];
  offcutsLoading: boolean;
  offcutSaving: boolean;
  offcutError: string;
  offcutForm: OffcutFormState;
  offcutFilters: { product: string; shade: string; status: string; minWidth: string; minHeight: string };
  purchases: StockPurchaseRow[];
  purchasesLoading: boolean;
  purchaseSaving: boolean;
  purchaseError: string;
  purchaseStatus: string;
  purchaseForm: PurchaseFormState;
  movementType: string;
  onMovementTypeChange: (type: string) => void;
  onOffcutFormChange: (patch: Partial<OffcutFormState>) => void;
  onOffcutFilterChange: (patch: Partial<{ product: string; shade: string; status: string; minWidth: string; minHeight: string }>) => void;
  onCreateOffcut: () => void;
  onPurchaseStatusChange: (status: string) => void;
  onPurchaseFormChange: (patch: Partial<PurchaseFormState>) => void;
  onCreatePurchase: () => void;
  onOrderPurchase: (id: string) => void;
  onCancelPurchase: (id: string) => void;
  onReceivePurchase: (id: string) => void;
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
            {tabs.map(([id, label]) => (
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
        {activeTab === "overview" ? (
          !hasStock ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-5 text-center">
              <p className="text-[12px] font-bold text-white">Stok modülü hazır.</p>
              <p className="mt-1 text-[11px] leading-5 text-slate-500">Genel özet, ilk Excel yüklemesinden sonra stok değeri, plaka sayısı ve fire durumunu gösterecek.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <KpiMini label="Ürün" value={String(summary.totals.productCount)} />
              <KpiMini label="Depo" value={String(summary.totals.warehouseCount)} />
              <KpiMini label="Rezerve" value={String(summary.totals.reservedPlateCount)} />
              <KpiMini label="Fire / Kırık" value={String(summary.totals.openFireRecordCount || summary.totals.brokenPlateCount)} />
            </div>
          )
        ) : activeTab === "products" ? (
          !hasStock ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-5 text-center">
              <p className="text-[12px] font-bold text-white">Henüz ürün yok.</p>
              <p className="mt-1 text-[11px] leading-5 text-slate-500">Excel yüklediğinde ürünler burada ürün adı, malzeme tipi, shade ve stok değeriyle listelenecek.</p>
            </div>
          ) : (
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
          )
        ) : activeTab === "plates" ? (
          <PlateList plates={plates} loading={platesLoading} />
        ) : activeTab === "movements" ? (
          <MovementList
            movements={movements}
            loading={movementsLoading}
            movementType={movementType}
            onMovementTypeChange={onMovementTypeChange}
          />
        ) : activeTab === "offcuts" ? (
          <OffcutList
            offcuts={offcuts}
            plates={plates}
            loading={offcutsLoading}
            saving={offcutSaving}
            error={offcutError}
            form={offcutForm}
            filters={offcutFilters}
            onFormChange={onOffcutFormChange}
            onFilterChange={onOffcutFilterChange}
            onCreate={onCreateOffcut}
          />
        ) : activeTab === "purchases" ? (
          <PurchaseList
            purchases={purchases}
            warehouses={summary.warehouses}
            loading={purchasesLoading}
            saving={purchaseSaving}
            error={purchaseError}
            statusFilter={purchaseStatus}
            form={purchaseForm}
            onStatusFilterChange={onPurchaseStatusChange}
            onFormChange={onPurchaseFormChange}
            onCreate={onCreatePurchase}
            onOrder={onOrderPurchase}
            onCancel={onCancelPurchase}
            onReceive={onReceivePurchase}
          />
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
