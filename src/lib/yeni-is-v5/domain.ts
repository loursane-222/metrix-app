export type JobDraftStatus = "draft" | "ready" | "quoted";

export type AreaType = "kitchen" | "bathroom" | "island" | "countertop" | "other";

export type ProductType =
  | "countertop"
  | "backsplash"
  | "island"
  | "sink"
  | "skirting"
  | "other";

export type PieceType =
  | "main_piece"
  | "front_edge"
  | "skirting"
  | "backsplash"
  | "island"
  | "other";

export type ShapeType = "rectangle" | "l_shape" | "u_shape" | "custom";

export type VeinDirection = "none" | "horizontal" | "vertical" | "continuous";

export type MaterialType = "quartz" | "granite" | "marble" | "porcelain" | "other";

export type MaterialSource = "stock" | "purchase" | "customer_owned" | "unknown";

export type Currency = "TRY" | "EUR" | "USD";

export type MaterialGroupStatus = "incomplete" | "ready_for_layout" | "layout_done" | "needs_purchase" | "allocated";

export type QuoteLineType = "material" | "labor" | "operation" | "discount" | "extra";

export type QuoteUnit = "piece" | "linear_meter" | "square_meter" | "package";

export type JobCustomerDraft = {
  id?: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  customerType?: "individual" | "company";
};

export type JobDraft = {
  id: string;
  customer: JobCustomerDraft;
  areas: JobAreaDraft[];
  materialGroups: MaterialGroupDraft[];
  quotePreview: QuotePreviewLine[];
  costPreview: CostPreview;
  totals: JobTotalsPreview;
  status: JobDraftStatus;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type JobAreaDraft = {
  id: string;
  name: string;
  areaType: AreaType;
  sortOrder: number;
  products: AreaProductDraft[];
  notes?: string;
  copiedFromAreaId?: string;
};

export type AreaProductDraft = {
  id: string;
  areaId: string;
  name: string;
  productType: ProductType;
  quantity: number;
  defaultMaterialSelection: MaterialSelectionDraft;
  pieces: CuttingPieceDraft[];
  sortOrder: number;
  notes?: string;
};

export type CuttingPieceDraft = {
  id: string;
  areaId: string;
  productId: string;
  materialGroupKey?: string;
  label: string;
  pieceType: PieceType;
  widthCm: number;
  heightCm: number;
  quantity: number;
  edgeType?: string;
  veinDirection: VeinDirection;
  shapeType: ShapeType;
  materialSelection?: MaterialSelectionDraft;
  areaCm2: number;
  linearMeter?: number;
  notes?: string;
  metadata?: Record<string, unknown>;
};

export type MaterialSelectionDraft = {
  materialName: string;
  brand?: string;
  series?: string;
  color?: string;
  materialType?: MaterialType;
  source: MaterialSource;
  slabWidthCm?: number;
  slabHeightCm?: number;
  slabPrice?: number;
  currency?: Currency;
  shadeCode?: string;
  lotNo?: string;
  stockPlateId?: string;
  requiresVeinMatch: boolean;
};

export type MaterialGroupDraft = {
  key: string;
  displayName: string;
  material: MaterialSelectionDraft;
  pieceIds: string[];
  areaIds: string[];
  productIds: string[];
  totalPieceAreaCm2: number;
  estimatedSlabCount: number;
  plateLayout?: PlateLayoutDraft;
  costPreview: CostPreview;
  quoteLines: QuotePreviewLine[];
  status: MaterialGroupStatus;
};

export type PlateLayoutDraft = {
  materialGroupKey: string;
  slabWidthCm: number;
  slabHeightCm: number;
  slabCount: number;
  totalSlabAreaCm2: number;
  usedAreaCm2: number;
  wasteAreaCm2: number;
  wasteRatio: number;
  layoutJson?: unknown;
  algorithmVersion?: string;
  warnings?: string[];
};

export type CostPreviewItem = {
  id: string;
  label: string;
  costType: "material" | "labor" | "operation" | "waste" | "extra";
  amount: number;
  currency: Currency;
  source?: string;
  metadata?: Record<string, unknown>;
};

export type CostPreview = {
  materialCost: number;
  laborCost: number;
  operationCost: number;
  wasteCost: number;
  extraCost: number;
  totalCost: number;
  currency: Currency;
  details: CostPreviewItem[];
};

export type QuotePreviewLine = {
  id: string;
  areaId?: string;
  materialGroupKey?: string;
  label: string;
  description: string;
  unit: QuoteUnit;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  costAmount?: number;
  marginAmount?: number;
  areaNameSnapshot?: string;
  materialNameSnapshot?: string;
  lineType: QuoteLineType;
};

export type JobTotalsPreview = {
  totalCost: number;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  grandTotal: number;
  marginAmount: number;
  marginPercent: number;
  currency: Currency;
};

const DEFAULT_CURRENCY: Currency = "TRY";
const DEFAULT_TAX_RATE = 20;

export function normalizeMaterialKeyPart(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined || value === "") {
    return "none";
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : "none";
  }

  if (typeof value === "boolean") {
    return value ? "yes" : "no";
  }

  return value
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replace(/\s+/g, "-")
    .replace(/[^\p{L}\p{N}._-]+/gu, "");
}

export function buildMaterialGroupKey(
  material: MaterialSelectionDraft,
  piece?: Pick<CuttingPieceDraft, "veinDirection">,
): string {
  const slabSize =
    material.slabWidthCm && material.slabHeightCm
      ? `${material.slabWidthCm}x${material.slabHeightCm}`
      : undefined;

  const needsVeinMatch = material.requiresVeinMatch || piece?.veinDirection === "continuous";

  return [
    material.materialName,
    material.brand,
    material.series,
    material.color,
    material.materialType,
    slabSize,
    material.source,
    material.shadeCode,
    material.lotNo,
    material.stockPlateId,
    material.currency,
    needsVeinMatch,
  ]
    .map(normalizeMaterialKeyPart)
    .join("|");
}

export function calculatePieceAreaCm2(piece: Pick<CuttingPieceDraft, "widthCm" | "heightCm" | "quantity">): number {
  const width = Math.max(0, piece.widthCm);
  const height = Math.max(0, piece.heightCm);
  const quantity = Math.max(0, piece.quantity);

  return width * height * quantity;
}

export function rebuildMaterialGroups(jobDraft: JobDraft): MaterialGroupDraft[] {
  const groups = new Map<string, MaterialGroupDraft>();

  for (const area of jobDraft.areas) {
    for (const product of area.products) {
      for (const piece of product.pieces) {
        const effectiveMaterial = getEffectiveMaterialSelection(product, piece);
        const key = buildMaterialGroupKey(effectiveMaterial, piece);
        const existingGroup = groups.get(key);
        const pieceAreaCm2 = calculatePieceAreaCm2(piece);

        if (existingGroup) {
          addUnique(existingGroup.pieceIds, piece.id);
          addUnique(existingGroup.areaIds, area.id);
          addUnique(existingGroup.productIds, product.id);
          existingGroup.totalPieceAreaCm2 += pieceAreaCm2;
          existingGroup.estimatedSlabCount = estimateSlabCount(existingGroup);
          existingGroup.status = getMaterialGroupStatus(existingGroup);
          continue;
        }

        const group: MaterialGroupDraft = {
          key,
          displayName: getMaterialDisplayName(effectiveMaterial),
          material: { ...effectiveMaterial },
          pieceIds: [piece.id],
          areaIds: [area.id],
          productIds: [product.id],
          totalPieceAreaCm2: pieceAreaCm2,
          estimatedSlabCount: 0,
          costPreview: createEmptyCostPreview(effectiveMaterial.currency),
          quoteLines: [],
          status: "incomplete",
        };

        group.estimatedSlabCount = estimateSlabCount(group);
        group.status = getMaterialGroupStatus(group);
        groups.set(key, group);
      }
    }
  }

  return Array.from(groups.values());
}

export function createEmptyJobDraft(): JobDraft {
  return {
    id: createDraftId("job"),
    customer: {
      name: "",
    },
    areas: [],
    materialGroups: [],
    quotePreview: [],
    costPreview: createEmptyCostPreview(),
    totals: createEmptyJobTotalsPreview(),
    status: "draft",
  };
}

export function createEmptyAreaDraft(): JobAreaDraft {
  return {
    id: createDraftId("area"),
    name: "",
    areaType: "kitchen",
    sortOrder: 0,
    products: [],
  };
}

export function createEmptyProductDraft(areaId: string): AreaProductDraft {
  return {
    id: createDraftId("product"),
    areaId,
    name: "",
    productType: "countertop",
    quantity: 1,
    defaultMaterialSelection: createEmptyMaterialSelectionDraft(),
    pieces: [],
    sortOrder: 0,
  };
}

export function createEmptyPieceDraft(areaId: string, productId: string): CuttingPieceDraft {
  const piece: CuttingPieceDraft = {
    id: createDraftId("piece"),
    areaId,
    productId,
    label: "",
    pieceType: "main_piece",
    widthCm: 0,
    heightCm: 0,
    quantity: 1,
    veinDirection: "none",
    shapeType: "rectangle",
    areaCm2: 0,
  };

  return {
    ...piece,
    areaCm2: calculatePieceAreaCm2(piece),
  };
}

export function createEmptyMaterialSelectionDraft(): MaterialSelectionDraft {
  return {
    materialName: "",
    source: "unknown",
    currency: DEFAULT_CURRENCY,
    requiresVeinMatch: false,
  };
}

function createEmptyCostPreview(currency: Currency = DEFAULT_CURRENCY): CostPreview {
  return {
    materialCost: 0,
    laborCost: 0,
    operationCost: 0,
    wasteCost: 0,
    extraCost: 0,
    totalCost: 0,
    currency,
    details: [],
  };
}

function createEmptyJobTotalsPreview(currency: Currency = DEFAULT_CURRENCY): JobTotalsPreview {
  return {
    totalCost: 0,
    subtotal: 0,
    taxRate: DEFAULT_TAX_RATE,
    taxAmount: 0,
    grandTotal: 0,
    marginAmount: 0,
    marginPercent: 0,
    currency,
  };
}

function estimateSlabCount(group: Pick<MaterialGroupDraft, "material" | "totalPieceAreaCm2">): number {
  const slabWidthCm = group.material.slabWidthCm ?? 0;
  const slabHeightCm = group.material.slabHeightCm ?? 0;
  const slabAreaCm2 = slabWidthCm * slabHeightCm;

  if (slabAreaCm2 <= 0 || group.totalPieceAreaCm2 <= 0) {
    return 0;
  }

  return Math.ceil(group.totalPieceAreaCm2 / slabAreaCm2);
}

function getMaterialGroupStatus(group: Pick<MaterialGroupDraft, "material" | "totalPieceAreaCm2">): MaterialGroupStatus {
  const hasMaterialName = group.material.materialName.trim().length > 0;
  const hasSlabSize = Boolean(group.material.slabWidthCm && group.material.slabHeightCm);
  const hasPieces = group.totalPieceAreaCm2 > 0;

  if (!hasMaterialName || !hasSlabSize || !hasPieces || group.material.source === "unknown") {
    return "incomplete";
  }

  return "ready_for_layout";
}

function getMaterialDisplayName(material: MaterialSelectionDraft): string {
  const parts = [material.materialName, material.brand, material.series].filter((part): part is string =>
    Boolean(part?.trim()),
  );

  return parts.length > 0 ? parts.join(" / ") : "Unnamed material";
}

function addUnique(target: string[], value: string): void {
  if (!target.includes(value)) {
    target.push(value);
  }
}

function getEffectiveMaterialSelection(
  product: Pick<AreaProductDraft, "defaultMaterialSelection">,
  piece: Pick<CuttingPieceDraft, "materialSelection">,
): MaterialSelectionDraft {
  return piece.materialSelection ?? product.defaultMaterialSelection;
}

function createDraftId(prefix: string): string {
  return `${prefix}_draft`;
}
