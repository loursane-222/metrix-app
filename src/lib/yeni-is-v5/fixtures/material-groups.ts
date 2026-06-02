import type { AreaProductDraft, JobAreaDraft, JobDraft, MaterialSelectionDraft } from "../domain";

export type MaterialGroupFixture = {
  name: string;
  job: JobDraft;
  expected: {
    groupCount: number;
    summaries: Array<{
      materialName: string;
      source: MaterialSelectionDraft["source"];
      shadeCode?: string;
      areaCount: number;
      productCount: number;
      totalPieceCount: number;
      totalAreaCm2: number;
      totalLinearMeter: number;
    }>;
  };
};

const calacattaStock = createMaterial({
  materialName: "Calacatta",
  brand: "Belenco",
  series: "Royal",
  source: "stock",
  stockPlateId: "stock-calacatta-1",
  shadeCode: "A",
  lotNo: "L1",
});

const calacattaPurchase = createMaterial({
  materialName: "Calacatta",
  brand: "Belenco",
  series: "Royal",
  source: "purchase",
  shadeCode: "A",
  lotNo: "L1",
});

const customerCalacatta = createMaterial({
  materialName: "Calacatta",
  brand: "Belenco",
  series: "Royal",
  source: "customer_owned",
  shadeCode: "A",
  lotNo: "L1",
});

const neroStock = createMaterial({
  materialName: "Nero",
  brand: "Coante",
  series: "Absolute",
  source: "stock",
  stockPlateId: "stock-nero-1",
  shadeCode: "N",
  lotNo: "N1",
});

export const materialGroupFixtures: MaterialGroupFixture[] = [
  {
    name: "same area same material",
    job: createJob([
      createArea("area-kitchen", "Mutfak", [
        createProduct("product-countertop", "area-kitchen", "Mutfak Tezgah", calacattaStock, [
          createPiece("piece-countertop-1", "area-kitchen", "product-countertop", "Tezgah 1", 100, 60, 1, 1.6),
          createPiece("piece-countertop-2", "area-kitchen", "product-countertop", "Tezgah 2", 120, 60, 1, 1.8),
        ]),
      ]),
    ]),
    expected: {
      groupCount: 1,
      summaries: [
        {
          materialName: "Calacatta",
          source: "stock",
          shadeCode: "A",
          areaCount: 1,
          productCount: 1,
          totalPieceCount: 2,
          totalAreaCm2: 13200,
          totalLinearMeter: 3.4,
        },
      ],
    },
  },
  {
    name: "different areas same material",
    job: createJob([
      createArea("area-kitchen", "Mutfak", [
        createProduct("product-kitchen", "area-kitchen", "Mutfak Tezgah", calacattaStock, [
          createPiece("piece-kitchen", "area-kitchen", "product-kitchen", "Mutfak", 100, 60, 1, 1.6),
        ]),
      ]),
      createArea("area-bathroom", "Banyo", [
        createProduct("product-bathroom", "area-bathroom", "Banyo Tezgah", calacattaStock, [
          createPiece("piece-bathroom", "area-bathroom", "product-bathroom", "Banyo", 80, 50, 1, 1.3),
        ]),
      ]),
    ]),
    expected: {
      groupCount: 1,
      summaries: [
        {
          materialName: "Calacatta",
          source: "stock",
          shadeCode: "A",
          areaCount: 2,
          productCount: 2,
          totalPieceCount: 2,
          totalAreaCm2: 10000,
          totalLinearMeter: 2.9,
        },
      ],
    },
  },
  {
    name: "different materials",
    job: createJob([
      createArea("area-kitchen", "Mutfak", [
        createProduct("product-countertop", "area-kitchen", "Mutfak Tezgah", calacattaStock, [
          createPiece("piece-calacatta", "area-kitchen", "product-countertop", "Tezgah", 100, 60, 1, 1.6),
        ]),
        createProduct("product-backsplash", "area-kitchen", "Mutfak Tezgah Arası", neroStock, [
          createPiece("piece-nero", "area-kitchen", "product-backsplash", "Tezgah Arası", 100, 55, 1, 1),
        ]),
      ]),
    ]),
    expected: {
      groupCount: 2,
      summaries: [
        {
          materialName: "Calacatta",
          source: "stock",
          shadeCode: "A",
          areaCount: 1,
          productCount: 1,
          totalPieceCount: 1,
          totalAreaCm2: 6000,
          totalLinearMeter: 1.6,
        },
        {
          materialName: "Nero",
          source: "stock",
          shadeCode: "N",
          areaCount: 1,
          productCount: 1,
          totalPieceCount: 1,
          totalAreaCm2: 5500,
          totalLinearMeter: 1,
        },
      ],
    },
  },
  {
    name: "different shade codes",
    job: createJob([
      createArea("area-kitchen", "Mutfak", [
        createProduct("product-a", "area-kitchen", "Tezgah A", calacattaStock, [
          createPiece("piece-a", "area-kitchen", "product-a", "A", 100, 60, 1, 1.6),
        ]),
        createProduct("product-b", "area-kitchen", "Tezgah B", { ...calacattaStock, stockPlateId: "stock-calacatta-2", shadeCode: "B" }, [
          createPiece("piece-b", "area-kitchen", "product-b", "B", 90, 60, 1, 1.5),
        ]),
      ]),
    ]),
    expected: {
      groupCount: 2,
      summaries: [
        {
          materialName: "Calacatta",
          source: "stock",
          shadeCode: "A",
          areaCount: 1,
          productCount: 1,
          totalPieceCount: 1,
          totalAreaCm2: 6000,
          totalLinearMeter: 1.6,
        },
        {
          materialName: "Calacatta",
          source: "stock",
          shadeCode: "B",
          areaCount: 1,
          productCount: 1,
          totalPieceCount: 1,
          totalAreaCm2: 5400,
          totalLinearMeter: 1.5,
        },
      ],
    },
  },
  {
    name: "stock versus purchase",
    job: createJob([
      createArea("area-kitchen", "Mutfak", [
        createProduct("product-stock", "area-kitchen", "Stok Tezgah", calacattaStock, [
          createPiece("piece-stock", "area-kitchen", "product-stock", "Stok", 100, 60, 1, 1.6),
        ]),
        createProduct("product-purchase", "area-kitchen", "Alınacak Tezgah", calacattaPurchase, [
          createPiece("piece-purchase", "area-kitchen", "product-purchase", "Satın Alma", 100, 60, 1, 1.6),
        ]),
      ]),
    ]),
    expected: {
      groupCount: 2,
      summaries: [
        {
          materialName: "Calacatta",
          source: "stock",
          shadeCode: "A",
          areaCount: 1,
          productCount: 1,
          totalPieceCount: 1,
          totalAreaCm2: 6000,
          totalLinearMeter: 1.6,
        },
        {
          materialName: "Calacatta",
          source: "purchase",
          shadeCode: "A",
          areaCount: 1,
          productCount: 1,
          totalPieceCount: 1,
          totalAreaCm2: 6000,
          totalLinearMeter: 1.6,
        },
      ],
    },
  },
  {
    name: "customer owned material",
    job: createJob([
      createArea("area-kitchen", "Mutfak", [
        createProduct("product-customer", "area-kitchen", "Müşteri Taşı", customerCalacatta, [
          createPiece("piece-customer", "area-kitchen", "product-customer", "Müşteri", 100, 60, 2, 3.2),
        ]),
      ]),
    ]),
    expected: {
      groupCount: 1,
      summaries: [
        {
          materialName: "Calacatta",
          source: "customer_owned",
          shadeCode: "A",
          areaCount: 1,
          productCount: 1,
          totalPieceCount: 2,
          totalAreaCm2: 12000,
          totalLinearMeter: 3.2,
        },
      ],
    },
  },
];

function createJob(areas: JobAreaDraft[]): JobDraft {
  return {
    id: "job-fixture",
    customer: { name: "Fixture Customer" },
    areas,
    materialGroups: [],
    quotePreview: [],
    costPreview: {
      jobId: "job-fixture",
      materialCost: 0,
      laborCost: 0,
      operationCost: 0,
      wasteCost: 0,
      extraCost: 0,
      totalCost: 0,
      currency: "TRY",
      totals: {
        materialCost: 0,
        laborCost: 0,
        operationCost: 0,
        wasteCost: 0,
        extraCost: 0,
        totalCost: 0,
        currency: "TRY",
      },
      materialGroupBreakdown: [],
      wasteTotal: {
        areaCm2: 0,
        cost: 0,
        currency: "TRY",
      },
      details: [],
    },
    totals: {
      totalCost: 0,
      subtotal: 0,
      taxRate: 20,
      taxAmount: 0,
      grandTotal: 0,
      marginAmount: 0,
      marginPercent: 0,
      currency: "TRY",
    },
    status: "draft",
  };
}

function createArea(id: string, name: string, products: AreaProductDraft[]): JobAreaDraft {
  return {
    id,
    name,
    areaType: "kitchen",
    sortOrder: 0,
    products,
  };
}

function createProduct(
  id: string,
  areaId: string,
  name: string,
  defaultMaterialSelection: MaterialSelectionDraft,
  pieces: AreaProductDraft["pieces"],
): AreaProductDraft {
  return {
    id,
    areaId,
    name,
    productType: "countertop",
    quantity: 1,
    defaultMaterialSelection,
    pieces,
    sortOrder: 0,
  };
}

function createPiece(
  id: string,
  areaId: string,
  productId: string,
  label: string,
  widthCm: number,
  heightCm: number,
  quantity: number,
  linearMeter: number,
): AreaProductDraft["pieces"][number] {
  return {
    id,
    areaId,
    productId,
    label,
    pieceType: "main_piece",
    widthCm,
    heightCm,
    quantity,
    veinDirection: "none",
    shapeType: "rectangle",
    areaCm2: widthCm * heightCm * quantity,
    linearMeter,
  };
}

function createMaterial(overrides: Partial<MaterialSelectionDraft>): MaterialSelectionDraft {
  return {
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
    requiresVeinMatch: false,
    ...overrides,
  };
}
