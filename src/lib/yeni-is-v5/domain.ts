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

export type CostPreviewMeasurement = {
  widthCm?: number;
  heightCm?: number;
  areaCm2?: number;
  squareMeter?: number;
  linearMeter?: number;
};

export type CostPreviewWaste = {
  areaCm2: number;
  ratio?: number;
  cost: number;
  currency: Currency;
};

export type CostPreviewTotals = {
  materialCost: number;
  laborCost: number;
  operationCost: number;
  wasteCost: number;
  extraCost: number;
  totalCost: number;
  currency: Currency;
};

export type MaterialGroupCostBreakdown = {
  materialGroupId: string;
  materialGroupKey?: string;
  materialSelection: MaterialSelectionDraft;
  materialCost: number;
  laborCost: number;
  operationCost: number;
  wasteCost: number;
  extraCost: number;
  totalCost: number;
  currency: Currency;
};

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

export type MaterialGroupSummary = {
  materialGroupKey: string;
  totalPieceCount: number;
  totalAreaCm2: number;
  totalLinearMeter: number;
  areaCount: number;
  productCount: number;
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

export type LayoutPreviewStatus = "ready" | "missing-material" | "empty";

export type LayoutPreviewPiece = {
  areaId: string;
  areaName: string;
  productId: string;
  productName: string;
  pieceId: string;
  pieceName: string;
  widthCm: number;
  heightCm: number;
  areaCm2: number;
  materialSelection: MaterialSelectionDraft;
  materialGroupId: string;
};

export type LayoutPreviewGroup = {
  id: string;
  materialGroupId: string;
  materialSelection: MaterialSelectionDraft;
  areaIds: string[];
  productIds: string[];
  pieces: LayoutPreviewPiece[];
  requiredAreaCm2: number;
  wasteAreaCm2: number;
  totalAreaCm2: number;
  status: LayoutPreviewStatus;
};

export type LayoutPreviewTotals = {
  groupCount: number;
  pieceCount: number;
  requiredAreaCm2: number;
  wasteAreaCm2: number;
  totalAreaCm2: number;
};

export type LayoutPreview = {
  jobId: string;
  groups: LayoutPreviewGroup[];
  totals: LayoutPreviewTotals;
};

export type StockRequirementStatus = "ready" | "insufficient-stock" | "purchase-required";

export type StockRequirementItem = {
  materialGroupId: string;
  materialSelection: MaterialSelectionDraft;
  requiredAreaCm2: number;
  wasteAreaCm2: number;
  totalAreaCm2: number;
  estimatedPlateCount: number;
  status: StockRequirementStatus;
};

export type StockRequirementTotals = {
  requirementCount: number;
  totalRequiredAreaCm2: number;
  totalWasteAreaCm2: number;
  totalAreaCm2: number;
};

export type StockRequirementPreview = {
  jobId: string;
  requirements: StockRequirementItem[];
  totals: StockRequirementTotals;
};

export type PurchaseRequirementStatus = "ready" | "purchase-required" | "stock-covered";

export type PurchaseRequirementItem = {
  materialGroupId: string;
  materialSelection: MaterialSelectionDraft;
  requiredAreaCm2: number;
  estimatedPlateCount: number;
  purchaseAreaCm2: number;
  purchasePlateCount: number;
  status: PurchaseRequirementStatus;
};

export type PurchaseRequirementTotals = {
  requirementCount: number;
  purchaseAreaCm2: number;
  purchasePlateCount: number;
};

export type PurchaseRequirementPreview = {
  jobId: string;
  requirements: PurchaseRequirementItem[];
  totals: PurchaseRequirementTotals;
};

export type CostPreviewItem = {
  id: string;
  areaId: string;
  areaName: string;
  productId: string;
  productName: string;
  pieceId?: string;
  pieceName?: string;
  materialGroupId: string;
  materialGroupKey?: string;
  materialSelection: MaterialSelectionDraft;
  label: string;
  costType: "material" | "labor" | "operation" | "waste" | "extra";
  quantity: number;
  unit: QuoteUnit;
  measurement?: CostPreviewMeasurement;
  waste?: CostPreviewWaste;
  amount: number;
  currency: Currency;
  customerVisible: boolean;
  source?: string;
  metadata?: Record<string, unknown>;
};

export type CostPreview = {
  jobId: string;
  materialCost: number;
  laborCost: number;
  operationCost: number;
  wasteCost: number;
  extraCost: number;
  totalCost: number;
  currency: Currency;
  totals: CostPreviewTotals;
  materialGroupBreakdown: MaterialGroupCostBreakdown[];
  wasteTotal: CostPreviewWaste;
  details: CostPreviewItem[];
};

export type QuotePreviewLine = {
  id: string;
  areaId?: string;
  areaName?: string;
  productId?: string;
  productName?: string;
  materialGroupId?: string;
  materialGroupKey?: string;
  materialSelection?: MaterialSelectionDraft;
  displayName?: string;
  label: string;
  description: string;
  unit: QuoteUnit;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  includesWasteCost?: boolean;
  customerVisible?: boolean;
  costAmount?: number;
  marginAmount?: number;
  areaNameSnapshot?: string;
  productNameSnapshot?: string;
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
export const DEFAULT_COST_PREVIEW_WASTE_RATIO = 0.12;
export const DEFAULT_STOCK_REQUIREMENT_PLATE_WIDTH_CM = 162;
export const DEFAULT_STOCK_REQUIREMENT_PLATE_HEIGHT_CM = 324;
export const PLATE_AREA_CM2 = DEFAULT_STOCK_REQUIREMENT_PLATE_WIDTH_CM * DEFAULT_STOCK_REQUIREMENT_PLATE_HEIGHT_CM;

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
        const effectiveMaterial = effectiveMaterialSelection(product, piece);
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

export function summarizeMaterialGroup(jobDraft: JobDraft, group: MaterialGroupDraft): MaterialGroupSummary {
  const pieces = findPiecesForGroup(jobDraft, group);

  return {
    materialGroupKey: group.key,
    totalPieceCount: pieces.reduce((sum, piece) => sum + Math.max(0, piece.quantity), 0),
    totalAreaCm2: group.totalPieceAreaCm2,
    totalLinearMeter: roundPreviewNumber(pieces.reduce((sum, piece) => sum + Math.max(0, piece.linearMeter ?? 0), 0)),
    areaCount: group.areaIds.length,
    productCount: group.productIds.length,
  };
}

export function summarizeMaterialGroups(jobDraft: JobDraft): MaterialGroupSummary[] {
  return rebuildMaterialGroups(jobDraft).map((group) => summarizeMaterialGroup(jobDraft, group));
}

export function buildCostPreview(jobDraft: JobDraft): CostPreview {
  const materialGroups = rebuildMaterialGroups(jobDraft);
  const currency = resolveCostPreviewCurrency(jobDraft, materialGroups);
  const details: CostPreviewItem[] = [];
  const materialGroupBreakdown: MaterialGroupCostBreakdown[] = [];
  let materialCost = 0;
  let operationCost = 0;
  let wasteCost = 0;
  let wasteAreaCm2 = 0;

  for (const group of materialGroups) {
    const groupMaterialCost = calculateMaterialCost(group);
    const groupWasteAreaCm2 = calculateWasteAreaCm2(group.totalPieceAreaCm2);
    const groupWasteCost = calculateWasteCost(groupMaterialCost);
    const groupOperationCost = calculateOperationCost(group);
    const groupTotalCost = roundPreviewNumber(groupMaterialCost + groupWasteCost + groupOperationCost);
    const itemContext = getCostPreviewItemContext(jobDraft, group);

    materialCost = roundPreviewNumber(materialCost + groupMaterialCost);
    operationCost = roundPreviewNumber(operationCost + groupOperationCost);
    wasteCost = roundPreviewNumber(wasteCost + groupWasteCost);
    wasteAreaCm2 = roundPreviewNumber(wasteAreaCm2 + groupWasteAreaCm2);

    materialGroupBreakdown.push({
      materialGroupId: group.key,
      materialGroupKey: group.key,
      materialSelection: { ...group.material },
      materialCost: groupMaterialCost,
      laborCost: 0,
      operationCost: groupOperationCost,
      wasteCost: groupWasteCost,
      extraCost: 0,
      totalCost: groupTotalCost,
      currency,
    });

    details.push(
      createCostPreviewItem({
        id: `cost-${group.key}-material`,
        group,
        context: itemContext,
        costType: "material",
        label: `${group.displayName} malzeme`,
        quantity: roundPreviewNumber(cm2ToSquareMeter(group.totalPieceAreaCm2)),
        amount: groupMaterialCost,
        currency,
        customerVisible: true,
      }),
      createCostPreviewItem({
        id: `cost-${group.key}-waste`,
        group,
        context: itemContext,
        costType: "waste",
        label: `${group.displayName} fire`,
        quantity: roundPreviewNumber(cm2ToSquareMeter(groupWasteAreaCm2)),
        amount: groupWasteCost,
        currency,
        customerVisible: false,
        waste: {
          areaCm2: groupWasteAreaCm2,
          ratio: DEFAULT_COST_PREVIEW_WASTE_RATIO,
          cost: groupWasteCost,
          currency,
        },
      }),
      createCostPreviewItem({
        id: `cost-${group.key}-operation`,
        group,
        context: itemContext,
        costType: "operation",
        label: `${group.displayName} operasyon`,
        quantity: roundPreviewNumber(cm2ToSquareMeter(group.totalPieceAreaCm2)),
        amount: groupOperationCost,
        currency,
        customerVisible: false,
      }),
    );
  }

  const totalCost = roundPreviewNumber(materialCost + operationCost + wasteCost);
  const totals: CostPreviewTotals = {
    materialCost,
    laborCost: 0,
    operationCost,
    wasteCost,
    extraCost: 0,
    totalCost,
    currency,
  };

  return {
    jobId: jobDraft.id,
    materialCost,
    laborCost: 0,
    operationCost,
    wasteCost,
    extraCost: 0,
    totalCost,
    currency,
    totals,
    materialGroupBreakdown,
    wasteTotal: {
      areaCm2: wasteAreaCm2,
      ratio: DEFAULT_COST_PREVIEW_WASTE_RATIO,
      cost: wasteCost,
      currency,
    },
    details,
  };
}

export function calculateMaterialCost(group: Pick<MaterialGroupDraft, "material" | "totalPieceAreaCm2">): number {
  const slabPrice = Math.max(0, group.material.slabPrice ?? 0);
  const slabWidthCm = Math.max(0, group.material.slabWidthCm ?? 0);
  const slabHeightCm = Math.max(0, group.material.slabHeightCm ?? 0);
  const slabAreaCm2 = slabWidthCm * slabHeightCm;

  if (slabPrice <= 0 || slabAreaCm2 <= 0 || group.totalPieceAreaCm2 <= 0) {
    return 0;
  }

  return roundPreviewNumber((group.totalPieceAreaCm2 / slabAreaCm2) * slabPrice);
}

export function calculateWasteCost(
  materialCost: number,
  wasteRatio: number = DEFAULT_COST_PREVIEW_WASTE_RATIO,
): number {
  return roundPreviewNumber(Math.max(0, materialCost) * Math.max(0, wasteRatio));
}

export function calculateWasteAreaCm2(
  areaCm2: number,
  wasteRatio: number = DEFAULT_COST_PREVIEW_WASTE_RATIO,
): number {
  return roundPreviewNumber(Math.max(0, areaCm2) * Math.max(0, wasteRatio));
}

export function calculateOperationCost(_group: Pick<MaterialGroupDraft, "pieceIds" | "totalPieceAreaCm2">): number {
  return 0;
}

export function buildQuotePreview(jobDraft: JobDraft): QuotePreviewLine[] {
  const costPreview = buildCostPreview(jobDraft);
  const costByMaterialGroupId = new Map(
    costPreview.materialGroupBreakdown.map((breakdown) => [breakdown.materialGroupId, breakdown]),
  );
  const lines = new Map<string, QuotePreviewLine>();

  for (const area of jobDraft.areas) {
    for (const product of area.products) {
      for (const piece of product.pieces) {
        const materialSelection = effectiveMaterialSelection(product, piece);
        const materialGroupId = buildMaterialGroupKey(materialSelection, piece);
        const lineKey = buildQuotePreviewLineKey(area.id, product.id, materialGroupId);
        const pieceQuantity = roundPreviewNumber(cm2ToSquareMeter(calculatePieceAreaCm2(piece)));
        const existingLine = lines.get(lineKey);

        if (existingLine) {
          const quantity = roundPreviewNumber(existingLine.quantity + pieceQuantity);

          lines.set(lineKey, {
            ...existingLine,
            quantity,
            totalPrice: calculateQuoteLineTotalPrice(quantity, existingLine.unitPrice),
          });
          continue;
        }

        const displayName = buildQuoteLineDisplayName({
          areaName: area.name,
          productName: product.name,
          materialSelection,
        });
        const unitPrice = calculateQuoteLineUnitPrice({
          area,
          product,
          materialGroupId,
          materialSelection,
          costPreview,
        });
        const costBreakdown = costByMaterialGroupId.get(materialGroupId);

        lines.set(lineKey, {
          id: `quote-${lineKey}`,
          areaId: area.id,
          areaName: area.name,
          productId: product.id,
          productName: product.name,
          materialGroupId,
          materialGroupKey: materialGroupId,
          materialSelection: { ...materialSelection },
          displayName,
          label: displayName,
          description: "",
          unit: "square_meter",
          quantity: pieceQuantity,
          unitPrice,
          totalPrice: calculateQuoteLineTotalPrice(pieceQuantity, unitPrice),
          includesWasteCost: true,
          customerVisible: true,
          costAmount: costBreakdown?.totalCost,
          areaNameSnapshot: area.name,
          productNameSnapshot: product.name,
          materialNameSnapshot: materialSelection.materialName,
          lineType: "material",
        });
      }
    }
  }

  return Array.from(lines.values());
}

export function buildLayoutPreview(jobDraft: JobDraft): LayoutPreview {
  const materialGroups = rebuildMaterialGroups(jobDraft);
  const groups = materialGroups.map<LayoutPreviewGroup>((group) => {
    const pieces = findLayoutPreviewPiecesForGroup(jobDraft, group);
    const requiredAreaCm2 = roundPreviewNumber(
      pieces.reduce((sum, piece) => sum + Math.max(0, piece.areaCm2), 0),
    );
    const wasteAreaCm2 = calculateWasteAreaCm2(requiredAreaCm2);
    const totalAreaCm2 = roundPreviewNumber(requiredAreaCm2 + wasteAreaCm2);

    return {
      id: `layout-${group.key}`,
      materialGroupId: group.key,
      materialSelection: { ...group.material },
      areaIds: [...group.areaIds],
      productIds: [...group.productIds],
      pieces,
      requiredAreaCm2,
      wasteAreaCm2,
      totalAreaCm2,
      status: getLayoutPreviewGroupStatus(group.material, pieces),
    };
  });

  return {
    jobId: jobDraft.id,
    groups,
    totals: buildLayoutPreviewTotals(groups),
  };
}

export function buildStockRequirementPreview(layoutPreview: LayoutPreview): StockRequirementPreview {
  const requirements = layoutPreview.groups.map<StockRequirementItem>((group) => ({
    materialGroupId: group.materialGroupId,
    materialSelection: { ...group.materialSelection },
    requiredAreaCm2: group.requiredAreaCm2,
    wasteAreaCm2: group.wasteAreaCm2,
    totalAreaCm2: group.totalAreaCm2,
    estimatedPlateCount: calculateEstimatedPlateCount(group.totalAreaCm2),
    status: "ready",
  }));

  return {
    jobId: layoutPreview.jobId,
    requirements,
    totals: buildStockRequirementTotals(requirements),
  };
}

export function calculateEstimatedPlateCount(totalAreaCm2: number, plateAreaCm2: number = PLATE_AREA_CM2): number {
  const normalizedTotalAreaCm2 = Math.max(0, totalAreaCm2);
  const normalizedPlateAreaCm2 = Math.max(0, plateAreaCm2);

  if (normalizedTotalAreaCm2 <= 0 || normalizedPlateAreaCm2 <= 0) {
    return 0;
  }

  return Math.ceil(normalizedTotalAreaCm2 / normalizedPlateAreaCm2);
}

export function buildPurchaseRequirementPreview(
  stockRequirementPreview: StockRequirementPreview,
): PurchaseRequirementPreview {
  const requirements = stockRequirementPreview.requirements.map<PurchaseRequirementItem>((requirement) => ({
    materialGroupId: requirement.materialGroupId,
    materialSelection: { ...requirement.materialSelection },
    requiredAreaCm2: requirement.requiredAreaCm2,
    estimatedPlateCount: requirement.estimatedPlateCount,
    purchaseAreaCm2: requirement.totalAreaCm2,
    purchasePlateCount: requirement.estimatedPlateCount,
    status: "purchase-required",
  }));

  return {
    jobId: stockRequirementPreview.jobId,
    requirements,
    totals: buildPurchaseRequirementTotals(requirements),
  };
}

export function buildPurchaseRequirementTotals(
  requirements: Pick<PurchaseRequirementItem, "purchaseAreaCm2" | "purchasePlateCount">[],
): PurchaseRequirementTotals {
  return {
    requirementCount: requirements.length,
    purchaseAreaCm2: roundPreviewNumber(
      requirements.reduce((sum, requirement) => sum + requirement.purchaseAreaCm2, 0),
    ),
    purchasePlateCount: requirements.reduce((sum, requirement) => sum + requirement.purchasePlateCount, 0),
  };
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
  const totals = createEmptyCostPreviewTotals(currency);

  return {
    jobId: "",
    materialCost: 0,
    laborCost: 0,
    operationCost: 0,
    wasteCost: 0,
    extraCost: 0,
    totalCost: 0,
    currency,
    totals,
    materialGroupBreakdown: [],
    wasteTotal: {
      areaCm2: 0,
      cost: 0,
      currency,
    },
    details: [],
  };
}

function createEmptyCostPreviewTotals(currency: Currency): CostPreviewTotals {
  return {
    materialCost: 0,
    laborCost: 0,
    operationCost: 0,
    wasteCost: 0,
    extraCost: 0,
    totalCost: 0,
    currency,
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

function resolveCostPreviewCurrency(jobDraft: JobDraft, materialGroups: MaterialGroupDraft[]): Currency {
  return jobDraft.costPreview.currency ?? materialGroups[0]?.material.currency ?? DEFAULT_CURRENCY;
}

function getCostPreviewItemContext(
  jobDraft: JobDraft,
  group: Pick<MaterialGroupDraft, "areaIds" | "productIds" | "pieceIds">,
): {
  areaId: string;
  areaName: string;
  productId: string;
  productName: string;
  pieceId?: string;
  pieceName?: string;
} {
  for (const area of jobDraft.areas) {
    if (!group.areaIds.includes(area.id)) {
      continue;
    }

    for (const product of area.products) {
      if (!group.productIds.includes(product.id)) {
        continue;
      }

      const piece = product.pieces.find((candidate) => group.pieceIds.includes(candidate.id));

      return {
        areaId: area.id,
        areaName: area.name,
        productId: product.id,
        productName: product.name,
        pieceId: piece?.id,
        pieceName: piece?.label,
      };
    }
  }

  return {
    areaId: group.areaIds[0] ?? "",
    areaName: "",
    productId: group.productIds[0] ?? "",
    productName: "",
    pieceId: group.pieceIds[0],
  };
}

function createCostPreviewItem(input: {
  id: string;
  group: MaterialGroupDraft;
  context: ReturnType<typeof getCostPreviewItemContext>;
  costType: CostPreviewItem["costType"];
  label: string;
  quantity: number;
  amount: number;
  currency: Currency;
  customerVisible: boolean;
  waste?: CostPreviewWaste;
}): CostPreviewItem {
  return {
    id: input.id,
    areaId: input.context.areaId,
    areaName: input.context.areaName,
    productId: input.context.productId,
    productName: input.context.productName,
    pieceId: input.context.pieceId,
    pieceName: input.context.pieceName,
    materialGroupId: input.group.key,
    materialGroupKey: input.group.key,
    materialSelection: { ...input.group.material },
    label: input.label,
    costType: input.costType,
    quantity: input.quantity,
    unit: "square_meter",
    measurement: {
      areaCm2: input.costType === "waste" ? input.waste?.areaCm2 : input.group.totalPieceAreaCm2,
      squareMeter: input.quantity,
    },
    waste: input.waste,
    amount: input.amount,
    currency: input.currency,
    customerVisible: input.customerVisible,
  };
}

function buildQuotePreviewLineKey(areaId: string, productId: string, materialGroupId: string): string {
  return [areaId, productId, materialGroupId].map(normalizeMaterialKeyPart).join("|");
}

function calculateQuoteLineUnitPrice(_input: {
  area: JobAreaDraft;
  product: AreaProductDraft;
  materialGroupId: string;
  materialSelection: MaterialSelectionDraft;
  costPreview: CostPreview;
}): number {
  return 0;
}

function calculateQuoteLineTotalPrice(quantity: number, unitPrice: number): number {
  return roundPreviewNumber(Math.max(0, quantity) * Math.max(0, unitPrice));
}

function findLayoutPreviewPiecesForGroup(jobDraft: JobDraft, group: MaterialGroupDraft): LayoutPreviewPiece[] {
  const pieceIds = new Set(group.pieceIds);
  const pieces: LayoutPreviewPiece[] = [];

  for (const area of jobDraft.areas) {
    for (const product of area.products) {
      for (const piece of product.pieces) {
        if (!pieceIds.has(piece.id)) {
          continue;
        }

        const materialSelection = effectiveMaterialSelection(product, piece);
        const materialGroupId = buildMaterialGroupKey(materialSelection, piece);

        pieces.push({
          areaId: area.id,
          areaName: area.name,
          productId: product.id,
          productName: product.name,
          pieceId: piece.id,
          pieceName: piece.label,
          widthCm: piece.widthCm,
          heightCm: piece.heightCm,
          areaCm2: calculatePieceAreaCm2(piece),
          materialSelection: { ...materialSelection },
          materialGroupId,
        });
      }
    }
  }

  return pieces;
}

function getLayoutPreviewGroupStatus(
  materialSelection: MaterialSelectionDraft,
  pieces: LayoutPreviewPiece[],
): LayoutPreviewStatus {
  if (pieces.length === 0) {
    return "empty";
  }

  if (isMissingMaterialSelection(materialSelection)) {
    return "missing-material";
  }

  return "ready";
}

function isMissingMaterialSelection(materialSelection: MaterialSelectionDraft): boolean {
  return materialSelection.materialName.trim().length === 0 || materialSelection.source === "unknown";
}

function buildLayoutPreviewTotals(groups: LayoutPreviewGroup[]): LayoutPreviewTotals {
  return {
    groupCount: groups.length,
    pieceCount: groups.reduce((sum, group) => sum + group.pieces.length, 0),
    requiredAreaCm2: roundPreviewNumber(groups.reduce((sum, group) => sum + group.requiredAreaCm2, 0)),
    wasteAreaCm2: roundPreviewNumber(groups.reduce((sum, group) => sum + group.wasteAreaCm2, 0)),
    totalAreaCm2: roundPreviewNumber(groups.reduce((sum, group) => sum + group.totalAreaCm2, 0)),
  };
}

function buildStockRequirementTotals(requirements: StockRequirementItem[]): StockRequirementTotals {
  return {
    requirementCount: requirements.length,
    totalRequiredAreaCm2: roundPreviewNumber(
      requirements.reduce((sum, requirement) => sum + requirement.requiredAreaCm2, 0),
    ),
    totalWasteAreaCm2: roundPreviewNumber(
      requirements.reduce((sum, requirement) => sum + requirement.wasteAreaCm2, 0),
    ),
    totalAreaCm2: roundPreviewNumber(requirements.reduce((sum, requirement) => sum + requirement.totalAreaCm2, 0)),
  };
}

function getMaterialDisplayName(material: Pick<MaterialSelectionDraft, "materialName" | "brand" | "series">): string {
  const parts = [material.materialName, material.brand, material.series].filter((part): part is string =>
    Boolean(part?.trim()),
  );

  return parts.length > 0 ? parts.join(" / ") : "Unnamed material";
}

export function buildQuoteLineDisplayName(input: {
  areaName: string;
  productName: string;
  materialSelection: Pick<MaterialSelectionDraft, "materialName" | "brand" | "series" | "color">;
}): string {
  const materialName = getMaterialDisplayName(input.materialSelection);
  const parts = [input.areaName, input.productName, materialName].filter((part) => part.trim().length > 0);

  return parts.join(" / ");
}

function addUnique(target: string[], value: string): void {
  if (!target.includes(value)) {
    target.push(value);
  }
}

export function effectiveMaterialSelection(
  product: Pick<AreaProductDraft, "defaultMaterialSelection">,
  piece: Pick<CuttingPieceDraft, "materialSelection">,
): MaterialSelectionDraft {
  return piece.materialSelection ?? product.defaultMaterialSelection;
}

function findPiecesForGroup(jobDraft: JobDraft, group: MaterialGroupDraft): CuttingPieceDraft[] {
  const pieceIds = new Set(group.pieceIds);
  const pieces: CuttingPieceDraft[] = [];

  for (const area of jobDraft.areas) {
    for (const product of area.products) {
      for (const piece of product.pieces) {
        if (pieceIds.has(piece.id)) {
          pieces.push(piece);
        }
      }
    }
  }

  return pieces;
}

function roundPreviewNumber(value: number): number {
  return Math.round(value * 100) / 100;
}

function cm2ToSquareMeter(value: number): number {
  return value / 10000;
}

function createDraftId(prefix: string): string {
  return `${prefix}_draft`;
}
