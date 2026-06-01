"use client";

import {
  calculatePieceAreaCm2,
  createEmptyAreaDraft,
  createEmptyJobDraft,
  createEmptyMaterialSelectionDraft,
  createEmptyPieceDraft,
  createEmptyProductDraft,
  rebuildMaterialGroups,
  summarizeMaterialGroup,
  type AreaProductDraft,
  type CuttingPieceDraft,
  type JobAreaDraft,
  type JobDraft,
  type MaterialSelectionDraft,
} from "@/lib/yeni-is-v5/domain";
import { useMemo, useState } from "react";

const DEFAULT_MATERIALS: MaterialSelectionDraft[] = [
  {
    materialName: "Calacatta",
    brand: "Belenco",
    series: "Royal",
    materialType: "quartz",
    source: "stock",
    slabWidthCm: 320,
    slabHeightCm: 160,
    slabPrice: 1000,
    currency: "EUR",
    shadeCode: "A",
    lotNo: "L1",
    stockPlateId: "stock-calacatta-demo",
    requiresVeinMatch: false,
  },
  {
    materialName: "Nero",
    brand: "Coante",
    series: "Absolute",
    materialType: "quartz",
    source: "purchase",
    slabWidthCm: 320,
    slabHeightCm: 160,
    slabPrice: 900,
    currency: "EUR",
    shadeCode: "N",
    lotNo: "N1",
    requiresVeinMatch: false,
  },
  {
    materialName: "Müşteri Taşı",
    source: "customer_owned",
    slabWidthCm: 300,
    slabHeightCm: 140,
    currency: "TRY",
    requiresVeinMatch: false,
  },
];

export default function YeniIsV5Page() {
  const [jobDraft, setJobDraft] = useState<JobDraft>(() => createInitialJobDraft());

  const materialGroups = useMemo(() => rebuildMaterialGroups(jobDraft), [jobDraft]);
  const jobWithGroups = useMemo<JobDraft>(() => ({ ...jobDraft, materialGroups }), [jobDraft, materialGroups]);
  const summaries = useMemo(
    () =>
      materialGroups.map((group) => ({
        group,
        summary: summarizeMaterialGroup(jobWithGroups, group),
      })),
    [jobWithGroups, materialGroups],
  );

  const addArea = () => {
    setJobDraft((current) => {
      const area = createAreaDraft(`Mahal ${current.areas.length + 1}`, current.areas.length);
      return { ...current, areas: [...current.areas, area] };
    });
  };

  const addProduct = (areaId: string) => {
    setJobDraft((current) => ({
      ...current,
      areas: current.areas.map((area) =>
        area.id === areaId ? { ...area, products: [...area.products, createProductDraft(area.id, area.products.length)] } : area,
      ),
    }));
  };

  const addPiece = (areaId: string, productId: string) => {
    setJobDraft((current) => ({
      ...current,
      areas: current.areas.map((area) =>
        area.id === areaId
          ? {
              ...area,
              products: area.products.map((product) =>
                product.id === productId
                  ? { ...product, pieces: [...product.pieces, createPieceDraft(areaId, productId, product.pieces.length)] }
                  : product,
              ),
            }
          : area,
      ),
    }));
  };

  const updateAreaName = (areaId: string, name: string) => {
    setJobDraft((current) => ({
      ...current,
      areas: current.areas.map((area) => (area.id === areaId ? { ...area, name } : area)),
    }));
  };

  const updateProductName = (areaId: string, productId: string, name: string) => {
    setJobDraft((current) => ({
      ...current,
      areas: current.areas.map((area) =>
        area.id === areaId
          ? {
              ...area,
              products: area.products.map((product) => (product.id === productId ? { ...product, name } : product)),
            }
          : area,
      ),
    }));
  };

  const updateProductMaterial = (areaId: string, productId: string, materialName: string) => {
    const material = DEFAULT_MATERIALS.find((candidate) => candidate.materialName === materialName) ?? createEmptyMaterialSelectionDraft();

    setJobDraft((current) => ({
      ...current,
      areas: current.areas.map((area) =>
        area.id === areaId
          ? {
              ...area,
              products: area.products.map((product) =>
                product.id === productId ? { ...product, defaultMaterialSelection: material } : product,
              ),
            }
          : area,
      ),
    }));
  };

  const updatePiece = (
    areaId: string,
    productId: string,
    pieceId: string,
    field: "label" | "widthCm" | "heightCm" | "quantity" | "linearMeter",
    value: string,
  ) => {
    setJobDraft((current) => ({
      ...current,
      areas: current.areas.map((area) =>
        area.id === areaId
          ? {
              ...area,
              products: area.products.map((product) =>
                product.id === productId
                  ? {
                      ...product,
                      pieces: product.pieces.map((piece) =>
                        piece.id === pieceId ? applyPieceChange(piece, field, value) : piece,
                      ),
                    }
                  : product,
              ),
            }
          : area,
      ),
    }));
  };

  return (
    <main className="min-h-dvh bg-slate-950 px-4 py-6 text-white">
      <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="space-y-5">
          <header className="rounded-2xl border border-white/10 bg-slate-900/80 p-5 shadow-2xl shadow-black/20">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-emerald-300">Metrix V5</p>
            <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h1 className="text-2xl font-black tracking-tight">Yeni İş V5 Domain İskeleti</h1>
                <p className="mt-2 max-w-2xl text-sm text-slate-400">
                  Gizli local-state route. Kayıt, API, Prisma ve V3 bağlantısı yoktur.
                </p>
              </div>
              <button
                type="button"
                onClick={addArea}
                className="h-11 rounded-xl bg-emerald-400 px-4 text-sm font-black text-slate-950 transition hover:bg-emerald-300"
              >
                Mahal Ekle
              </button>
            </div>
          </header>

          {jobDraft.areas.map((area) => (
            <AreaCard
              key={area.id}
              area={area}
              onAddProduct={() => addProduct(area.id)}
              onAddPiece={addPiece}
              onAreaNameChange={updateAreaName}
              onProductNameChange={updateProductName}
              onProductMaterialChange={updateProductMaterial}
              onPieceChange={updatePiece}
            />
          ))}
        </section>

        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <section className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-200">Material Groups</p>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <Metric label="Grup" value={materialGroups.length} />
              <Metric label="Mahal" value={jobDraft.areas.length} />
              <Metric label="Ürün" value={jobDraft.areas.reduce((sum, area) => sum + area.products.length, 0)} />
            </div>
          </section>

          <section className="space-y-3">
            {summaries.map(({ group, summary }) => (
              <div key={group.key} className="rounded-2xl border border-white/10 bg-slate-900 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-base font-black">{group.displayName}</h2>
                    <p className="mt-1 text-xs text-slate-400">
                      {group.material.source} · {group.status}
                    </p>
                  </div>
                  <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-xs font-bold text-slate-300">
                    {group.estimatedSlabCount} plaka
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Metric label="Parça" value={summary.totalPieceCount} />
                  <Metric label="Alan" value={`${summary.totalAreaCm2} cm²`} />
                  <Metric label="Mtül" value={summary.totalLinearMeter} />
                  <Metric label="Mahal" value={summary.areaCount} />
                  <Metric label="Ürün" value={summary.productCount} />
                </div>
              </div>
            ))}
          </section>
        </aside>
      </div>
    </main>
  );
}

type AreaCardProps = {
  area: JobAreaDraft;
  onAddProduct: () => void;
  onAddPiece: (areaId: string, productId: string) => void;
  onAreaNameChange: (areaId: string, name: string) => void;
  onProductNameChange: (areaId: string, productId: string, name: string) => void;
  onProductMaterialChange: (areaId: string, productId: string, materialName: string) => void;
  onPieceChange: (
    areaId: string,
    productId: string,
    pieceId: string,
    field: "label" | "widthCm" | "heightCm" | "quantity" | "linearMeter",
    value: string,
  ) => void;
};

function AreaCard({
  area,
  onAddProduct,
  onAddPiece,
  onAreaNameChange,
  onProductNameChange,
  onProductMaterialChange,
  onPieceChange,
}: AreaCardProps) {
  return (
    <section className="rounded-2xl border border-white/10 bg-slate-900/80 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="block min-w-0 flex-1">
          <span className="label">Mahal</span>
          <input className="input mt-1" value={area.name} onChange={(event) => onAreaNameChange(area.id, event.target.value)} />
        </label>
        <button
          type="button"
          onClick={onAddProduct}
          className="h-10 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-3 text-sm font-black text-emerald-200 transition hover:bg-emerald-400/20"
        >
          Ürün Ekle
        </button>
      </div>

      <div className="mt-4 space-y-4">
        {area.products.map((product) => (
          <div key={product.id} className="rounded-xl border border-white/10 bg-slate-950/70 p-3">
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_auto] md:items-end">
              <label>
                <span className="label">Ürün</span>
                <input
                  className="input mt-1"
                  value={product.name}
                  onChange={(event) => onProductNameChange(area.id, product.id, event.target.value)}
                />
              </label>
              <label>
                <span className="label">Varsayılan Taş</span>
                <select
                  className="input mt-1"
                  value={product.defaultMaterialSelection.materialName}
                  onChange={(event) => onProductMaterialChange(area.id, product.id, event.target.value)}
                >
                  {DEFAULT_MATERIALS.map((material) => (
                    <option key={`${material.materialName}-${material.source}`} value={material.materialName}>
                      {material.materialName}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={() => onAddPiece(area.id, product.id)}
                className="h-10 rounded-xl border border-white/10 bg-white/5 px-3 text-sm font-black text-slate-200 transition hover:bg-white/10"
              >
                Parça Ekle
              </button>
            </div>

            <div className="mt-3 space-y-2">
              {product.pieces.map((piece) => (
                <PieceRow key={piece.id} areaId={area.id} productId={product.id} piece={piece} onPieceChange={onPieceChange} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

type PieceRowProps = {
  areaId: string;
  productId: string;
  piece: CuttingPieceDraft;
  onPieceChange: AreaCardProps["onPieceChange"];
};

function PieceRow({ areaId, productId, piece, onPieceChange }: PieceRowProps) {
  return (
    <div className="grid gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-2 sm:grid-cols-[minmax(0,1fr)_90px_90px_80px_90px]">
      <input
        className="input"
        value={piece.label}
        onChange={(event) => onPieceChange(areaId, productId, piece.id, "label", event.target.value)}
      />
      <NumberInput value={piece.widthCm} onChange={(value) => onPieceChange(areaId, productId, piece.id, "widthCm", value)} />
      <NumberInput value={piece.heightCm} onChange={(value) => onPieceChange(areaId, productId, piece.id, "heightCm", value)} />
      <NumberInput value={piece.quantity} onChange={(value) => onPieceChange(areaId, productId, piece.id, "quantity", value)} />
      <NumberInput value={piece.linearMeter ?? 0} onChange={(value) => onPieceChange(areaId, productId, piece.id, "linearMeter", value)} />
    </div>
  );
}

function NumberInput({ value, onChange }: { value: number; onChange: (value: string) => void }) {
  return <input className="input" inputMode="decimal" value={String(value)} onChange={(event) => onChange(event.target.value)} />;
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2">
      <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-black text-white">{value}</div>
    </div>
  );
}

function createInitialJobDraft(): JobDraft {
  const area = createAreaDraft("Mutfak", 0);
  const product = createProductDraft(area.id, 0);
  const piece = createPieceDraft(area.id, product.id, 0);

  return {
    ...createEmptyJobDraft(),
    areas: [{ ...area, products: [{ ...product, pieces: [piece] }] }],
  };
}

function createAreaDraft(name: string, index: number): JobAreaDraft {
  return {
    ...createEmptyAreaDraft(),
    id: createLocalId("area"),
    name,
    sortOrder: index,
  };
}

function createProductDraft(areaId: string, index: number): AreaProductDraft {
  return {
    ...createEmptyProductDraft(areaId),
    id: createLocalId("product"),
    name: `Ürün ${index + 1}`,
    defaultMaterialSelection: DEFAULT_MATERIALS[0],
    sortOrder: index,
  };
}

function createPieceDraft(areaId: string, productId: string, index: number): CuttingPieceDraft {
  const piece = {
    ...createEmptyPieceDraft(areaId, productId),
    id: createLocalId("piece"),
    label: `Parça ${index + 1}`,
    widthCm: 100,
    heightCm: 60,
    quantity: 1,
    linearMeter: 1.6,
  };

  return {
    ...piece,
    areaCm2: calculatePieceAreaCm2(piece),
  };
}

function applyPieceChange(
  piece: CuttingPieceDraft,
  field: "label" | "widthCm" | "heightCm" | "quantity" | "linearMeter",
  value: string,
): CuttingPieceDraft {
  const nextPiece = {
    ...piece,
    [field]: field === "label" ? value : toNumber(value),
  };

  return {
    ...nextPiece,
    areaCm2: calculatePieceAreaCm2(nextPiece),
  };
}

function toNumber(value: string): number {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

function createLocalId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
