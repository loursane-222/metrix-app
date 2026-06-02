import assert from "node:assert/strict";
import { materialGroupFixtures } from "../fixtures/material-groups";
import {
  JobV5ClientError,
  saveJobV5Draft as saveJobV5DraftFromClient,
} from "../client";
import {
  DEFAULT_COST_PREVIEW_WASTE_RATIO,
  PLATE_AREA_CM2,
  buildMaterialGroupKey,
  buildCostPreview,
  buildLayoutPreview,
  buildPlateAssignmentPreview,
  buildPurchaseRequirementPreview,
  buildQuotePreview,
  buildQuoteLineDisplayName,
  buildStockRequirementPreview,
  calculateEstimatedPlateCount,
  calculateWasteCost,
  effectiveMaterialSelection,
  rebuildMaterialGroups,
  summarizeMaterialGroup,
} from "../domain";
import { buildJobV5PersistencePlan } from "../persistence";
import {
  JobV5SaveError,
  buildSaveJobV5DraftInput,
  mapJobV5SaveError,
  parseSaveJobV5DraftRequest,
  saveJobV5Draft,
} from "../save";
import type {
  AreaProductDraft,
  CostPreview,
  CostPreviewItem,
  JobAreaDraft,
  JobDraft,
  MaterialSelectionDraft,
  QuotePreviewLine,
} from "../domain";
import type { JobV5SaveDbClient, JobV5SaveTransactionClient } from "../save";

export function testMaterialGroupFixtures() {
  for (const fixture of materialGroupFixtures) {
    const groups = rebuildMaterialGroups(fixture.job);

    assert.equal(groups.length, fixture.expected.groupCount, fixture.name);

    const summaries = groups.map((group) => ({
      materialName: group.material.materialName,
      source: group.material.source,
      shadeCode: group.material.shadeCode,
      ...summarizeMaterialGroup(fixture.job, group),
    }));

    const normalizedSummaries = summaries
      .map((summary) => ({
        materialName: summary.materialName,
        source: summary.source,
        shadeCode: summary.shadeCode,
        areaCount: summary.areaCount,
        productCount: summary.productCount,
        totalPieceCount: summary.totalPieceCount,
        totalAreaCm2: summary.totalAreaCm2,
        totalLinearMeter: summary.totalLinearMeter,
      }))
      .sort(compareSummary);

    const expectedSummaries = [...fixture.expected.summaries].sort(compareSummary);

    assert.deepEqual(normalizedSummaries, expectedSummaries, fixture.name);
  }
}

export function testMaterialGroupKeysAreUniquePerGroup() {
  for (const fixture of materialGroupFixtures) {
    const groups = rebuildMaterialGroups(fixture.job);
    const keys = groups.map((group) => group.key);

    assert.equal(new Set(keys).size, keys.length, fixture.name);
  }
}

export function testMaterialGroupSummariesUseUniqueAreaAndProductCounts() {
  const fixture = materialGroupFixtures.find((candidate) => candidate.name === "same area same material");

  assert.ok(fixture);

  const [group] = rebuildMaterialGroups(fixture.job);
  const summary = summarizeMaterialGroup(fixture.job, group);

  assert.equal(summary.areaCount, 1);
  assert.equal(summary.productCount, 1);
  assert.equal(summary.totalPieceCount, 2);
}

export function testEffectiveMaterialSelectionUsesProductDefault() {
  const material = createMaterial({ materialName: "Calacatta", stockPlateId: "stock-calacatta" });
  const product = createProduct("product-countertop", "area-kitchen", "Mutfak Tezgah", material, []);
  const piece = createPiece("piece-countertop", "area-kitchen", product.id, "Tezgah", 100, 60, 1, 1.6);

  assert.deepEqual(effectiveMaterialSelection(product, piece), material);
}

export function testEffectiveMaterialSelectionUsesPieceOverride() {
  const defaultMaterial = createMaterial({ materialName: "Calacatta", stockPlateId: "stock-calacatta" });
  const overrideMaterial = createMaterial({ materialName: "Nero", stockPlateId: "stock-nero", shadeCode: "N" });
  const product = createProduct("product-countertop", "area-kitchen", "Mutfak Tezgah", defaultMaterial, []);
  const piece = {
    ...createPiece("piece-countertop", "area-kitchen", product.id, "Tezgah", 100, 60, 1, 1.6),
    materialSelection: overrideMaterial,
  };

  assert.deepEqual(effectiveMaterialSelection(product, piece), overrideMaterial);
}

export function testQuoteLinesCanSplitSameAreaProductByMaterialGroup() {
  const defaultMaterial = createMaterial({ materialName: "Calacatta", stockPlateId: "stock-calacatta" });
  const overrideMaterial = createMaterial({ materialName: "Nero", stockPlateId: "stock-nero", shadeCode: "N" });
  const area = createArea("area-kitchen", "Mutfak", [
    createProduct("product-countertop", "area-kitchen", "Tezgah", defaultMaterial, [
      createPiece("piece-calacatta", "area-kitchen", "product-countertop", "Sol", 100, 60, 1, 1.6),
      {
        ...createPiece("piece-nero", "area-kitchen", "product-countertop", "Sag", 100, 60, 1, 1.6),
        materialSelection: overrideMaterial,
      },
    ]),
  ]);
  const job = createJob([area]);
  const groups = rebuildMaterialGroups(job);

  assert.equal(groups.length, 2);

  const quoteLines = groups.map<QuotePreviewLine>((group) => ({
    id: `quote-${group.key}`,
    areaId: area.id,
    areaName: area.name,
    productId: area.products[0].id,
    productName: area.products[0].name,
    materialGroupId: group.key,
    materialGroupKey: group.key,
    materialSelection: group.material,
    displayName: buildQuoteLineDisplayName({
      areaName: area.name,
      productName: area.products[0].name,
      materialSelection: group.material,
    }),
    label: group.displayName,
    description: "",
    unit: "square_meter",
    quantity: 1.2,
    unitPrice: 1000,
    totalPrice: 1200,
    customerVisible: true,
    lineType: "material",
  }));

  assert.equal(new Set(quoteLines.map((line) => line.materialGroupId)).size, 2);
  assert.deepEqual(new Set(quoteLines.map((line) => line.areaId)).size, 1);
  assert.deepEqual(new Set(quoteLines.map((line) => line.productId)).size, 1);
  assert.ok(quoteLines.some((line) => line.displayName === "Mutfak / Tezgah / Calacatta / Belenco / Royal"));
  assert.ok(quoteLines.some((line) => line.displayName === "Mutfak / Tezgah / Nero / Belenco / Royal"));
}

export function testWasteIsCostOnlyAndNotSeparateCustomerQuoteLine() {
  const material = createMaterial({ materialName: "Calacatta", stockPlateId: "stock-calacatta" });
  const materialGroupId = buildMaterialGroupKey(material);
  const wasteCost: CostPreviewItem = {
    id: "cost-waste",
    areaId: "area-kitchen",
    areaName: "Mutfak",
    productId: "product-countertop",
    productName: "Tezgah",
    materialGroupId,
    materialGroupKey: materialGroupId,
    materialSelection: material,
    label: "Fire",
    costType: "waste",
    quantity: 0.2,
    unit: "square_meter",
    measurement: {
      areaCm2: 2000,
      squareMeter: 0.2,
    },
    waste: {
      areaCm2: 2000,
      ratio: 0.1,
      cost: 250,
      currency: "TRY",
    },
    amount: 250,
    currency: "TRY",
    customerVisible: false,
  };
  const costPreview: CostPreview = {
    jobId: "job-contract",
    materialCost: 1000,
    laborCost: 0,
    operationCost: 200,
    wasteCost: 250,
    extraCost: 0,
    totalCost: 1450,
    currency: "TRY",
    totals: {
      materialCost: 1000,
      laborCost: 0,
      operationCost: 200,
      wasteCost: 250,
      extraCost: 0,
      totalCost: 1450,
      currency: "TRY",
    },
    materialGroupBreakdown: [
      {
        materialGroupId,
        materialGroupKey: materialGroupId,
        materialSelection: material,
        materialCost: 1000,
        laborCost: 0,
        operationCost: 200,
        wasteCost: 250,
        extraCost: 0,
        totalCost: 1450,
        currency: "TRY",
      },
    ],
    wasteTotal: {
      areaCm2: 2000,
      ratio: 0.1,
      cost: 250,
      currency: "TRY",
    },
    details: [wasteCost],
  };
  const quoteLines: QuotePreviewLine[] = [
    {
      id: "quote-material",
      areaId: "area-kitchen",
      areaName: "Mutfak",
      productId: "product-countertop",
      productName: "Tezgah",
      materialGroupId,
      materialGroupKey: materialGroupId,
      materialSelection: material,
      displayName: "Mutfak / Tezgah / Calacatta / Belenco / Royal",
      label: "Mutfak / Tezgah / Calacatta",
      description: "",
      unit: "square_meter",
      quantity: 1,
      unitPrice: 1450,
      totalPrice: 1450,
      includesWasteCost: true,
      customerVisible: true,
      lineType: "material",
    },
  ];

  assert.equal(costPreview.wasteCost, 250);
  assert.equal(costPreview.wasteTotal.cost, 250);
  assert.equal(costPreview.details.filter((item) => item.costType === "waste").length, 1);
  assert.equal(costPreview.details[0].customerVisible, false);
  assert.equal(quoteLines.filter((line) => line.lineType === "extra" && line.label.toLocaleLowerCase("tr-TR").includes("fire")).length, 0);
  assert.equal(quoteLines[0].includesWasteCost, true);
}

export function testMaterialGroupIdIsDerivedFromEffectiveMaterial() {
  const defaultMaterial = createMaterial({ materialName: "Calacatta", stockPlateId: "stock-calacatta" });
  const overrideMaterial = createMaterial({ materialName: "Nero", stockPlateId: "stock-nero", shadeCode: "N" });
  const area = createArea("area-kitchen", "Mutfak", [
    createProduct("product-countertop", "area-kitchen", "Tezgah", defaultMaterial, [
      {
        ...createPiece("piece-nero", "area-kitchen", "product-countertop", "Sag", 100, 60, 1, 1.6),
        materialSelection: overrideMaterial,
      },
    ]),
  ]);
  const job = createJob([area]);
  const [group] = rebuildMaterialGroups(job);
  const piece = area.products[0].pieces[0];
  const effectiveMaterial = effectiveMaterialSelection(area.products[0], piece);

  assert.equal(group.key, buildMaterialGroupKey(effectiveMaterial, piece));
}

export function testBuildCostPreviewForSingleMaterialGroup() {
  const material = createMaterial({ materialName: "Calacatta", slabPrice: 5120, stockPlateId: "stock-calacatta" });
  const job = createJob([
    createArea("area-kitchen", "Mutfak", [
      createProduct("product-countertop", "area-kitchen", "Tezgah", material, [
        createPiece("piece-left", "area-kitchen", "product-countertop", "Sol", 100, 60, 1, 1.6),
        createPiece("piece-right", "area-kitchen", "product-countertop", "Sag", 100, 40, 1, 1.4),
      ]),
    ]),
  ]);
  const preview = buildCostPreview(job);

  assert.equal(preview.jobId, job.id);
  assert.equal(preview.materialGroupBreakdown.length, 1);
  assert.equal(preview.materialCost, 1000);
  assert.equal(preview.wasteCost, 120);
  assert.equal(preview.operationCost, 0);
  assert.equal(preview.totalCost, 1120);
  assert.equal(preview.details.length, 3);
}

export function testBuildCostPreviewForMultipleMaterialGroups() {
  const calacatta = createMaterial({ materialName: "Calacatta", slabPrice: 5120, stockPlateId: "stock-calacatta" });
  const nero = createMaterial({ materialName: "Nero", slabPrice: 5120, stockPlateId: "stock-nero", shadeCode: "N" });
  const job = createJob([
    createArea("area-kitchen", "Mutfak", [
      createProduct("product-countertop", "area-kitchen", "Tezgah", calacatta, [
        createPiece("piece-calacatta", "area-kitchen", "product-countertop", "Calacatta", 100, 60, 1, 1.6),
      ]),
      createProduct("product-backsplash", "area-kitchen", "Tezgah Arasi", nero, [
        createPiece("piece-nero", "area-kitchen", "product-backsplash", "Nero", 100, 40, 1, 1.4),
      ]),
    ]),
  ]);
  const preview = buildCostPreview(job);

  assert.equal(preview.materialGroupBreakdown.length, 2);
  assert.equal(preview.materialCost, 1000);
  assert.equal(preview.wasteCost, 120);
  assert.equal(preview.totalCost, 1120);
  assert.equal(new Set(preview.materialGroupBreakdown.map((group) => group.materialGroupId)).size, 2);
}

export function testBuildCostPreviewUsesPieceOverrideMaterial() {
  const defaultMaterial = createMaterial({ materialName: "Calacatta", slabPrice: 5120, stockPlateId: "stock-calacatta" });
  const overrideMaterial = createMaterial({ materialName: "Nero", slabPrice: 5120, stockPlateId: "stock-nero", shadeCode: "N" });
  const area = createArea("area-kitchen", "Mutfak", [
    createProduct("product-countertop", "area-kitchen", "Tezgah", defaultMaterial, [
      {
        ...createPiece("piece-override", "area-kitchen", "product-countertop", "Override", 100, 60, 1, 1.6),
        materialSelection: overrideMaterial,
      },
    ]),
  ]);
  const job = createJob([area]);
  const preview = buildCostPreview(job);
  const [breakdown] = preview.materialGroupBreakdown;
  const piece = area.products[0].pieces[0];

  assert.equal(preview.materialGroupBreakdown.length, 1);
  assert.equal(breakdown.materialSelection.materialName, "Nero");
  assert.equal(breakdown.materialGroupId, buildMaterialGroupKey(effectiveMaterialSelection(area.products[0], piece), piece));
}

export function testBuildCostPreviewCalculatesDefaultWaste() {
  const material = createMaterial({ materialName: "Calacatta", slabPrice: 5120, stockPlateId: "stock-calacatta" });
  const job = createJob([
    createArea("area-kitchen", "Mutfak", [
      createProduct("product-countertop", "area-kitchen", "Tezgah", material, [
        createPiece("piece-countertop", "area-kitchen", "product-countertop", "Tezgah", 100, 60, 1, 1.6),
      ]),
    ]),
  ]);
  const preview = buildCostPreview(job);
  const wasteDetail = preview.details.find((detail) => detail.costType === "waste");

  assert.equal(DEFAULT_COST_PREVIEW_WASTE_RATIO, 0.12);
  assert.equal(calculateWasteCost(600), 72);
  assert.equal(preview.wasteCost, 72);
  assert.equal(preview.wasteTotal.areaCm2, 720);
  assert.equal(wasteDetail?.customerVisible, false);
}

export function testBuildCostPreviewAggregatesTotals() {
  const calacatta = createMaterial({ materialName: "Calacatta", slabPrice: 5120, stockPlateId: "stock-calacatta" });
  const nero = createMaterial({ materialName: "Nero", slabPrice: 5120, stockPlateId: "stock-nero", shadeCode: "N" });
  const job = createJob([
    createArea("area-kitchen", "Mutfak", [
      createProduct("product-countertop", "area-kitchen", "Tezgah", calacatta, [
        createPiece("piece-calacatta", "area-kitchen", "product-countertop", "Calacatta", 100, 60, 1, 1.6),
      ]),
      createProduct("product-island", "area-kitchen", "Ada", nero, [
        createPiece("piece-nero", "area-kitchen", "product-island", "Nero", 100, 40, 1, 1.4),
      ]),
    ]),
  ]);
  const preview = buildCostPreview(job);
  const breakdownMaterialCost = preview.materialGroupBreakdown.reduce((sum, group) => sum + group.materialCost, 0);
  const breakdownWasteCost = preview.materialGroupBreakdown.reduce((sum, group) => sum + group.wasteCost, 0);
  const breakdownOperationCost = preview.materialGroupBreakdown.reduce((sum, group) => sum + group.operationCost, 0);
  const breakdownTotalCost = preview.materialGroupBreakdown.reduce((sum, group) => sum + group.totalCost, 0);

  assert.equal(preview.totals.materialCost, breakdownMaterialCost);
  assert.equal(preview.totals.wasteCost, breakdownWasteCost);
  assert.equal(preview.totals.operationCost, breakdownOperationCost);
  assert.equal(preview.totals.totalCost, breakdownTotalCost);
  assert.equal(preview.totalCost, preview.totals.totalCost);
  assert.equal(preview.wasteTotal.cost, preview.totals.wasteCost);
}

export function testBuildQuotePreviewCreatesSingleLineForSingleMaterial() {
  const material = createMaterial({ materialName: "Calacatta", stockPlateId: "stock-calacatta" });
  const job = createJob([
    createArea("area-kitchen", "Mutfak", [
      createProduct("product-countertop", "area-kitchen", "Tezgah", material, [
        createPiece("piece-countertop", "area-kitchen", "product-countertop", "Tezgah", 100, 60, 1, 1.6),
      ]),
    ]),
  ]);
  const [line] = buildQuotePreview(job);

  assert.equal(line.areaId, "area-kitchen");
  assert.equal(line.areaName, "Mutfak");
  assert.equal(line.productId, "product-countertop");
  assert.equal(line.productName, "Tezgah");
  assert.equal(line.materialGroupId, buildMaterialGroupKey(material, job.areas[0].products[0].pieces[0]));
  assert.equal(line.materialSelection?.materialName, "Calacatta");
  assert.equal(line.displayName, "Mutfak / Tezgah / Calacatta / Belenco / Royal");
  assert.equal(line.quantity, 0.6);
  assert.equal(line.unit, "square_meter");
  assert.equal(line.unitPrice, 0);
  assert.equal(line.totalPrice, 0);
}

export function testBuildQuotePreviewMergesSameAreaProductMaterial() {
  const material = createMaterial({ materialName: "Calacatta", stockPlateId: "stock-calacatta" });
  const job = createJob([
    createArea("area-kitchen", "Mutfak", [
      createProduct("product-countertop", "area-kitchen", "Tezgah", material, [
        createPiece("piece-left", "area-kitchen", "product-countertop", "Sol", 100, 60, 1, 1.6),
        createPiece("piece-right", "area-kitchen", "product-countertop", "Sag", 100, 40, 1, 1.4),
      ]),
    ]),
  ]);
  const lines = buildQuotePreview(job);

  assert.equal(lines.length, 1);
  assert.equal(lines[0].quantity, 1);
}

export function testBuildQuotePreviewSplitsSameProductDifferentMaterials() {
  const calacatta = createMaterial({ materialName: "Calacatta", stockPlateId: "stock-calacatta" });
  const nero = createMaterial({ materialName: "Nero", stockPlateId: "stock-nero", shadeCode: "N" });
  const job = createJob([
    createArea("area-kitchen", "Mutfak", [
      createProduct("product-countertop", "area-kitchen", "Tezgah", calacatta, [
        createPiece("piece-calacatta", "area-kitchen", "product-countertop", "Calacatta", 100, 60, 1, 1.6),
        {
          ...createPiece("piece-nero", "area-kitchen", "product-countertop", "Nero", 100, 40, 1, 1.4),
          materialSelection: nero,
        },
      ]),
    ]),
  ]);
  const lines = buildQuotePreview(job);

  assert.equal(lines.length, 2);
  assert.equal(new Set(lines.map((line) => line.areaId)).size, 1);
  assert.equal(new Set(lines.map((line) => line.productId)).size, 1);
  assert.equal(new Set(lines.map((line) => line.materialGroupId)).size, 2);
  assert.deepEqual(
    lines.map((line) => line.materialSelection?.materialName).sort(),
    ["Calacatta", "Nero"],
  );
}

export function testBuildQuotePreviewSplitsPieceOverrideMaterial() {
  const defaultMaterial = createMaterial({ materialName: "Calacatta", stockPlateId: "stock-calacatta" });
  const overrideMaterial = createMaterial({ materialName: "Nero", stockPlateId: "stock-nero", shadeCode: "N" });
  const area = createArea("area-kitchen", "Mutfak", [
    createProduct("product-countertop", "area-kitchen", "Tezgah", defaultMaterial, [
      createPiece("piece-default", "area-kitchen", "product-countertop", "Default", 100, 60, 1, 1.6),
      {
        ...createPiece("piece-override", "area-kitchen", "product-countertop", "Override", 100, 60, 1, 1.6),
        materialSelection: overrideMaterial,
      },
    ]),
  ]);
  const job = createJob([area]);
  const lines = buildQuotePreview(job);
  const overridePiece = area.products[0].pieces[1];
  const overrideLine = lines.find((line) => line.materialSelection?.materialName === "Nero");

  assert.equal(lines.length, 2);
  assert.equal(overrideLine?.materialGroupId, buildMaterialGroupKey(effectiveMaterialSelection(area.products[0], overridePiece), overridePiece));
}

export function testBuildQuotePreviewDoesNotCreateWasteLine() {
  const material = createMaterial({ materialName: "Calacatta", slabPrice: 5120, stockPlateId: "stock-calacatta" });
  const job = createJob([
    createArea("area-kitchen", "Mutfak", [
      createProduct("product-countertop", "area-kitchen", "Tezgah", material, [
        createPiece("piece-countertop", "area-kitchen", "product-countertop", "Tezgah", 100, 60, 1, 1.6),
      ]),
    ]),
  ]);
  const costPreview = buildCostPreview(job);
  const quoteLines = buildQuotePreview(job);

  assert.equal(costPreview.details.some((detail) => detail.costType === "waste"), true);
  assert.equal(quoteLines.some((line) => line.lineType === "extra" && line.label.toLocaleLowerCase("tr-TR").includes("fire")), false);
  assert.equal(quoteLines.every((line) => line.includesWasteCost), true);
}

export function testBuildQuotePreviewUsesDisplayNameHelper() {
  const material = createMaterial({ materialName: "Nero", stockPlateId: "stock-nero", shadeCode: "N" });
  const job = createJob([
    createArea("area-bathroom", "Banyo", [
      createProduct("product-countertop", "area-bathroom", "Lavabo", material, [
        createPiece("piece-countertop", "area-bathroom", "product-countertop", "Lavabo", 80, 50, 1, 1.3),
      ]),
    ]),
  ]);
  const [line] = buildQuotePreview(job);
  const expectedDisplayName = buildQuoteLineDisplayName({
    areaName: "Banyo",
    productName: "Lavabo",
    materialSelection: material,
  });

  assert.equal(line.displayName, expectedDisplayName);
  assert.equal(line.label, expectedDisplayName);
}

export function testBuildLayoutPreviewCreatesSingleGroupForSingleMaterial() {
  const material = createMaterial({ materialName: "Calacatta", stockPlateId: "stock-calacatta" });
  const job = createJob([
    createArea("area-kitchen", "Mutfak", [
      createProduct("product-countertop", "area-kitchen", "Tezgah", material, [
        createPiece("piece-countertop", "area-kitchen", "product-countertop", "Tezgah", 100, 60, 1, 1.6),
      ]),
    ]),
  ]);
  const preview = buildLayoutPreview(job);

  assert.equal(preview.jobId, job.id);
  assert.equal(preview.groups.length, 1);
  assert.equal(preview.groups[0].materialGroupId, buildMaterialGroupKey(material, job.areas[0].products[0].pieces[0]));
  assert.equal(preview.groups[0].pieces.length, 1);
  assert.equal(preview.groups[0].status, "ready");
}

export function testBuildLayoutPreviewCreatesGroupsForDifferentMaterials() {
  const calacatta = createMaterial({ materialName: "Calacatta", stockPlateId: "stock-calacatta" });
  const nero = createMaterial({ materialName: "Nero", stockPlateId: "stock-nero", shadeCode: "N" });
  const job = createJob([
    createArea("area-kitchen", "Mutfak", [
      createProduct("product-countertop", "area-kitchen", "Tezgah", calacatta, [
        createPiece("piece-calacatta", "area-kitchen", "product-countertop", "Calacatta", 100, 60, 1, 1.6),
      ]),
      createProduct("product-island", "area-kitchen", "Ada", nero, [
        createPiece("piece-nero", "area-kitchen", "product-island", "Nero", 100, 40, 1, 1.4),
      ]),
    ]),
  ]);
  const preview = buildLayoutPreview(job);

  assert.equal(preview.groups.length, 2);
  assert.equal(new Set(preview.groups.map((group) => group.materialGroupId)).size, 2);
}

export function testBuildLayoutPreviewSendsPieceOverrideToDifferentGroup() {
  const defaultMaterial = createMaterial({ materialName: "Calacatta", stockPlateId: "stock-calacatta" });
  const overrideMaterial = createMaterial({ materialName: "Nero", stockPlateId: "stock-nero", shadeCode: "N" });
  const area = createArea("area-kitchen", "Mutfak", [
    createProduct("product-countertop", "area-kitchen", "Tezgah", defaultMaterial, [
      createPiece("piece-default", "area-kitchen", "product-countertop", "Default", 100, 60, 1, 1.6),
      {
        ...createPiece("piece-override", "area-kitchen", "product-countertop", "Override", 100, 40, 1, 1.4),
        materialSelection: overrideMaterial,
      },
    ]),
  ]);
  const job = createJob([area]);
  const preview = buildLayoutPreview(job);
  const overridePiece = area.products[0].pieces[1];
  const overrideGroupId = buildMaterialGroupKey(effectiveMaterialSelection(area.products[0], overridePiece), overridePiece);
  const overrideGroup = preview.groups.find((group) => group.materialGroupId === overrideGroupId);

  assert.equal(preview.groups.length, 2);
  assert.equal(overrideGroup?.pieces.length, 1);
  assert.equal(overrideGroup?.pieces[0].pieceId, "piece-override");
}

export function testBuildLayoutPreviewPreservesPieceMetadata() {
  const material = createMaterial({ materialName: "Calacatta", stockPlateId: "stock-calacatta" });
  const job = createJob([
    createArea("area-bathroom", "Banyo", [
      createProduct("product-vanity", "area-bathroom", "Lavabo", material, [
        createPiece("piece-vanity", "area-bathroom", "product-vanity", "Lavabo Tabla", 80, 50, 1, 1.3),
      ]),
    ]),
  ]);
  const preview = buildLayoutPreview(job);
  const [piece] = preview.groups[0].pieces;

  assert.equal(piece.areaId, "area-bathroom");
  assert.equal(piece.areaName, "Banyo");
  assert.equal(piece.productId, "product-vanity");
  assert.equal(piece.productName, "Lavabo");
  assert.equal(piece.pieceId, "piece-vanity");
  assert.equal(piece.pieceName, "Lavabo Tabla");
  assert.equal(piece.widthCm, 80);
  assert.equal(piece.heightCm, 50);
  assert.equal(piece.areaCm2, 4000);
  assert.equal(piece.materialGroupId, preview.groups[0].materialGroupId);
}

export function testBuildLayoutPreviewCalculatesRequiredWasteAndTotalArea() {
  const material = createMaterial({ materialName: "Calacatta", stockPlateId: "stock-calacatta" });
  const job = createJob([
    createArea("area-kitchen", "Mutfak", [
      createProduct("product-countertop", "area-kitchen", "Tezgah", material, [
        createPiece("piece-countertop", "area-kitchen", "product-countertop", "Tezgah", 100, 60, 1, 1.6),
      ]),
    ]),
  ]);
  const preview = buildLayoutPreview(job);
  const [group] = preview.groups;

  assert.equal(group.requiredAreaCm2, 6000);
  assert.equal(group.wasteAreaCm2, 720);
  assert.equal(group.totalAreaCm2, 6720);
  assert.equal(group.wasteAreaCm2, group.requiredAreaCm2 * DEFAULT_COST_PREVIEW_WASTE_RATIO);
}

export function testBuildLayoutPreviewMarksMissingMaterial() {
  const missingMaterial = createMaterial({
    materialName: "",
    source: "unknown",
    stockPlateId: undefined,
    shadeCode: undefined,
    lotNo: undefined,
  });
  const job = createJob([
    createArea("area-kitchen", "Mutfak", [
      createProduct("product-countertop", "area-kitchen", "Tezgah", missingMaterial, [
        createPiece("piece-countertop", "area-kitchen", "product-countertop", "Tezgah", 100, 60, 1, 1.6),
      ]),
    ]),
  ]);
  const preview = buildLayoutPreview(job);

  assert.equal(preview.groups.length, 1);
  assert.equal(preview.groups[0].status, "missing-material");
}

export function testBuildLayoutPreviewAggregatesTotals() {
  const calacatta = createMaterial({ materialName: "Calacatta", stockPlateId: "stock-calacatta" });
  const nero = createMaterial({ materialName: "Nero", stockPlateId: "stock-nero", shadeCode: "N" });
  const job = createJob([
    createArea("area-kitchen", "Mutfak", [
      createProduct("product-countertop", "area-kitchen", "Tezgah", calacatta, [
        createPiece("piece-calacatta", "area-kitchen", "product-countertop", "Calacatta", 100, 60, 1, 1.6),
      ]),
      createProduct("product-island", "area-kitchen", "Ada", nero, [
        createPiece("piece-nero", "area-kitchen", "product-island", "Nero", 100, 40, 1, 1.4),
      ]),
    ]),
  ]);
  const preview = buildLayoutPreview(job);

  assert.equal(preview.totals.groupCount, 2);
  assert.equal(preview.totals.pieceCount, 2);
  assert.equal(preview.totals.requiredAreaCm2, 10000);
  assert.equal(preview.totals.wasteAreaCm2, 1200);
  assert.equal(preview.totals.totalAreaCm2, 11200);
}

export function testBuildStockRequirementPreviewCreatesSingleRequirement() {
  const material = createMaterial({ materialName: "Calacatta", stockPlateId: "stock-calacatta" });
  const layoutPreview = buildLayoutPreview(
    createJob([
      createArea("area-kitchen", "Mutfak", [
        createProduct("product-countertop", "area-kitchen", "Tezgah", material, [
          createPiece("piece-countertop", "area-kitchen", "product-countertop", "Tezgah", 100, 60, 1, 1.6),
        ]),
      ]),
    ]),
  );
  const preview = buildStockRequirementPreview(layoutPreview);
  const [requirement] = preview.requirements;

  assert.equal(preview.jobId, layoutPreview.jobId);
  assert.equal(preview.requirements.length, 1);
  assert.equal(requirement.materialGroupId, layoutPreview.groups[0].materialGroupId);
  assert.equal(requirement.materialSelection.materialName, "Calacatta");
  assert.equal(requirement.status, "ready");
}

export function testBuildStockRequirementPreviewCreatesRequirementPerMaterialGroup() {
  const calacatta = createMaterial({ materialName: "Calacatta", stockPlateId: "stock-calacatta" });
  const nero = createMaterial({ materialName: "Nero", stockPlateId: "stock-nero", shadeCode: "N" });
  const layoutPreview = buildLayoutPreview(
    createJob([
      createArea("area-kitchen", "Mutfak", [
        createProduct("product-countertop", "area-kitchen", "Tezgah", calacatta, [
          createPiece("piece-calacatta", "area-kitchen", "product-countertop", "Calacatta", 100, 60, 1, 1.6),
        ]),
        createProduct("product-island", "area-kitchen", "Ada", nero, [
          createPiece("piece-nero", "area-kitchen", "product-island", "Nero", 100, 40, 1, 1.4),
        ]),
      ]),
    ]),
  );
  const preview = buildStockRequirementPreview(layoutPreview);

  assert.equal(preview.requirements.length, 2);
  assert.equal(new Set(preview.requirements.map((requirement) => requirement.materialGroupId)).size, 2);
}

export function testCalculateEstimatedPlateCountUsesDefaultPlateArea() {
  assert.equal(PLATE_AREA_CM2, 52488);
  assert.equal(calculateEstimatedPlateCount(0), 0);
  assert.equal(calculateEstimatedPlateCount(PLATE_AREA_CM2), 1);
  assert.equal(calculateEstimatedPlateCount(PLATE_AREA_CM2 + 1), 2);
}

export function testBuildStockRequirementPreviewIncludesWasteAreaInTotal() {
  const material = createMaterial({ materialName: "Calacatta", stockPlateId: "stock-calacatta" });
  const layoutPreview = buildLayoutPreview(
    createJob([
      createArea("area-kitchen", "Mutfak", [
        createProduct("product-countertop", "area-kitchen", "Tezgah", material, [
          createPiece("piece-countertop", "area-kitchen", "product-countertop", "Tezgah", 100, 60, 1, 1.6),
        ]),
      ]),
    ]),
  );
  const [requirement] = buildStockRequirementPreview(layoutPreview).requirements;

  assert.equal(requirement.requiredAreaCm2, 6000);
  assert.equal(requirement.wasteAreaCm2, 720);
  assert.equal(requirement.totalAreaCm2, 6720);
}

export function testBuildStockRequirementPreviewAggregatesTotals() {
  const calacatta = createMaterial({ materialName: "Calacatta", stockPlateId: "stock-calacatta" });
  const nero = createMaterial({ materialName: "Nero", stockPlateId: "stock-nero", shadeCode: "N" });
  const layoutPreview = buildLayoutPreview(
    createJob([
      createArea("area-kitchen", "Mutfak", [
        createProduct("product-countertop", "area-kitchen", "Tezgah", calacatta, [
          createPiece("piece-calacatta", "area-kitchen", "product-countertop", "Calacatta", 100, 60, 1, 1.6),
        ]),
        createProduct("product-island", "area-kitchen", "Ada", nero, [
          createPiece("piece-nero", "area-kitchen", "product-island", "Nero", 100, 40, 1, 1.4),
        ]),
      ]),
    ]),
  );
  const preview = buildStockRequirementPreview(layoutPreview);

  assert.equal(preview.totals.requirementCount, 2);
  assert.equal(preview.totals.totalRequiredAreaCm2, 10000);
  assert.equal(preview.totals.totalWasteAreaCm2, 1200);
  assert.equal(preview.totals.totalAreaCm2, 11200);
}

export function testBuildPurchaseRequirementPreviewCreatesSingleRequirement() {
  const material = createMaterial({ materialName: "Calacatta", stockPlateId: "stock-calacatta" });
  const stockRequirementPreview = buildStockRequirementPreview(
    buildLayoutPreview(
      createJob([
        createArea("area-kitchen", "Mutfak", [
          createProduct("product-countertop", "area-kitchen", "Tezgah", material, [
            createPiece("piece-countertop", "area-kitchen", "product-countertop", "Tezgah", 100, 60, 1, 1.6),
          ]),
        ]),
      ]),
    ),
  );
  const preview = buildPurchaseRequirementPreview(stockRequirementPreview);
  const [requirement] = preview.requirements;

  assert.equal(preview.jobId, stockRequirementPreview.jobId);
  assert.equal(preview.requirements.length, 1);
  assert.equal(requirement.materialGroupId, stockRequirementPreview.requirements[0].materialGroupId);
  assert.equal(requirement.materialSelection.materialName, "Calacatta");
}

export function testBuildPurchaseRequirementPreviewCreatesRequirementPerStockRequirement() {
  const calacatta = createMaterial({ materialName: "Calacatta", stockPlateId: "stock-calacatta" });
  const nero = createMaterial({ materialName: "Nero", stockPlateId: "stock-nero", shadeCode: "N" });
  const stockRequirementPreview = buildStockRequirementPreview(
    buildLayoutPreview(
      createJob([
        createArea("area-kitchen", "Mutfak", [
          createProduct("product-countertop", "area-kitchen", "Tezgah", calacatta, [
            createPiece("piece-calacatta", "area-kitchen", "product-countertop", "Calacatta", 100, 60, 1, 1.6),
          ]),
          createProduct("product-island", "area-kitchen", "Ada", nero, [
            createPiece("piece-nero", "area-kitchen", "product-island", "Nero", 100, 40, 1, 1.4),
          ]),
        ]),
      ]),
    ),
  );
  const preview = buildPurchaseRequirementPreview(stockRequirementPreview);

  assert.equal(preview.requirements.length, 2);
  assert.equal(new Set(preview.requirements.map((requirement) => requirement.materialGroupId)).size, 2);
}

export function testBuildPurchaseRequirementPreviewTransfersPlateCount() {
  const material = createMaterial({ materialName: "Calacatta", stockPlateId: "stock-calacatta" });
  const stockRequirementPreview = buildStockRequirementPreview(
    buildLayoutPreview(
      createJob([
        createArea("area-kitchen", "Mutfak", [
          createProduct("product-countertop", "area-kitchen", "Tezgah", material, [
            createPiece("piece-countertop", "area-kitchen", "product-countertop", "Tezgah", 400, 200, 1, 4),
          ]),
        ]),
      ]),
    ),
  );
  const [stockRequirement] = stockRequirementPreview.requirements;
  const [purchaseRequirement] = buildPurchaseRequirementPreview(stockRequirementPreview).requirements;

  assert.equal(stockRequirement.estimatedPlateCount, 2);
  assert.equal(purchaseRequirement.estimatedPlateCount, stockRequirement.estimatedPlateCount);
  assert.equal(purchaseRequirement.purchasePlateCount, stockRequirement.estimatedPlateCount);
}

export function testBuildPurchaseRequirementPreviewTransfersPurchaseArea() {
  const material = createMaterial({ materialName: "Calacatta", stockPlateId: "stock-calacatta" });
  const stockRequirementPreview = buildStockRequirementPreview(
    buildLayoutPreview(
      createJob([
        createArea("area-kitchen", "Mutfak", [
          createProduct("product-countertop", "area-kitchen", "Tezgah", material, [
            createPiece("piece-countertop", "area-kitchen", "product-countertop", "Tezgah", 100, 60, 1, 1.6),
          ]),
        ]),
      ]),
    ),
  );
  const [stockRequirement] = stockRequirementPreview.requirements;
  const [purchaseRequirement] = buildPurchaseRequirementPreview(stockRequirementPreview).requirements;

  assert.equal(purchaseRequirement.requiredAreaCm2, stockRequirement.requiredAreaCm2);
  assert.equal(purchaseRequirement.purchaseAreaCm2, stockRequirement.totalAreaCm2);
}

export function testBuildPurchaseRequirementPreviewAggregatesTotals() {
  const calacatta = createMaterial({ materialName: "Calacatta", stockPlateId: "stock-calacatta" });
  const nero = createMaterial({ materialName: "Nero", stockPlateId: "stock-nero", shadeCode: "N" });
  const stockRequirementPreview = buildStockRequirementPreview(
    buildLayoutPreview(
      createJob([
        createArea("area-kitchen", "Mutfak", [
          createProduct("product-countertop", "area-kitchen", "Tezgah", calacatta, [
            createPiece("piece-calacatta", "area-kitchen", "product-countertop", "Calacatta", 100, 60, 1, 1.6),
          ]),
          createProduct("product-island", "area-kitchen", "Ada", nero, [
            createPiece("piece-nero", "area-kitchen", "product-island", "Nero", 100, 40, 1, 1.4),
          ]),
        ]),
      ]),
    ),
  );
  const preview = buildPurchaseRequirementPreview(stockRequirementPreview);

  assert.equal(preview.totals.requirementCount, 2);
  assert.equal(preview.totals.purchaseAreaCm2, 11200);
  assert.equal(preview.totals.purchasePlateCount, 2);
}

export function testBuildPurchaseRequirementPreviewDefaultsToPurchaseRequired() {
  const material = createMaterial({ materialName: "Calacatta", stockPlateId: "stock-calacatta" });
  const stockRequirementPreview = buildStockRequirementPreview(
    buildLayoutPreview(
      createJob([
        createArea("area-kitchen", "Mutfak", [
          createProduct("product-countertop", "area-kitchen", "Tezgah", material, [
            createPiece("piece-countertop", "area-kitchen", "product-countertop", "Tezgah", 100, 60, 1, 1.6),
          ]),
        ]),
      ]),
    ),
  );
  const preview = buildPurchaseRequirementPreview(stockRequirementPreview);

  assert.equal(preview.requirements.every((requirement) => requirement.status === "purchase-required"), true);
}

export function testBuildPlateAssignmentPreviewCreatesSingleVirtualPlate() {
  const material = createMaterial({ materialName: "Calacatta", stockPlateId: "stock-calacatta" });
  const layoutPreview = buildLayoutPreview(
    createJob([
      createArea("area-kitchen", "Mutfak", [
        createProduct("product-countertop", "area-kitchen", "Tezgah", material, [
          createPiece("piece-countertop", "area-kitchen", "product-countertop", "Tezgah", 100, 60, 1, 1.6),
        ]),
      ]),
    ]),
  );
  const preview = buildPlateAssignmentPreview(layoutPreview);
  const [group] = preview.groups;

  assert.equal(preview.jobId, layoutPreview.jobId);
  assert.equal(group.plates.length, 1);
  assert.equal(group.plates[0].widthCm, 162);
  assert.equal(group.plates[0].heightCm, 324);
  assert.equal(group.plates[0].areaCm2, PLATE_AREA_CM2);
  assert.equal(group.status, "ready");
}

export function testBuildPlateAssignmentPreviewCreatesTwoVirtualPlatesForLargeArea() {
  const material = createMaterial({ materialName: "Calacatta", stockPlateId: "stock-calacatta" });
  const layoutPreview = buildLayoutPreview(
    createJob([
      createArea("area-kitchen", "Mutfak", [
        createProduct("product-countertop", "area-kitchen", "Tezgah", material, [
          createPiece("piece-a", "area-kitchen", "product-countertop", "A", 300, 100, 1, 3),
          createPiece("piece-b", "area-kitchen", "product-countertop", "B", 200, 100, 1, 2),
        ]),
      ]),
    ]),
  );
  const preview = buildPlateAssignmentPreview(layoutPreview);
  const [group] = preview.groups;

  assert.equal(layoutPreview.groups[0].totalAreaCm2, 56000);
  assert.equal(group.plates.length, 2);
  assert.equal(group.plates.reduce((sum, plate) => sum + plate.assignedPieces.length, 0), 2);
}

export function testBuildPlateAssignmentPreviewSendsPieceOverrideToDifferentGroup() {
  const defaultMaterial = createMaterial({ materialName: "Calacatta", stockPlateId: "stock-calacatta" });
  const overrideMaterial = createMaterial({ materialName: "Nero", stockPlateId: "stock-nero", shadeCode: "N" });
  const area = createArea("area-kitchen", "Mutfak", [
    createProduct("product-countertop", "area-kitchen", "Tezgah", defaultMaterial, [
      createPiece("piece-default", "area-kitchen", "product-countertop", "Default", 100, 60, 1, 1.6),
      {
        ...createPiece("piece-override", "area-kitchen", "product-countertop", "Override", 100, 40, 1, 1.4),
        materialSelection: overrideMaterial,
      },
    ]),
  ]);
  const layoutPreview = buildLayoutPreview(createJob([area]));
  const preview = buildPlateAssignmentPreview(layoutPreview);
  const overridePiece = area.products[0].pieces[1];
  const overrideGroupId = buildMaterialGroupKey(effectiveMaterialSelection(area.products[0], overridePiece), overridePiece);
  const overrideGroup = preview.groups.find((group) => group.materialGroupId === overrideGroupId);

  assert.equal(preview.groups.length, 2);
  assert.equal(overrideGroup?.plates[0].assignedPieces.length, 1);
  assert.equal(overrideGroup?.plates[0].assignedPieces[0].pieceId, "piece-override");
}

export function testBuildPlateAssignmentPreviewPreservesAssignedPieceMetadata() {
  const material = createMaterial({ materialName: "Calacatta", stockPlateId: "stock-calacatta" });
  const layoutPreview = buildLayoutPreview(
    createJob([
      createArea("area-bathroom", "Banyo", [
        createProduct("product-vanity", "area-bathroom", "Lavabo", material, [
          createPiece("piece-vanity", "area-bathroom", "product-vanity", "Lavabo Tabla", 80, 50, 1, 1.3),
        ]),
      ]),
    ]),
  );
  const preview = buildPlateAssignmentPreview(layoutPreview);
  const [piece] = preview.groups[0].plates[0].assignedPieces;

  assert.equal(piece.areaId, "area-bathroom");
  assert.equal(piece.areaName, "Banyo");
  assert.equal(piece.productId, "product-vanity");
  assert.equal(piece.productName, "Lavabo");
  assert.equal(piece.pieceId, "piece-vanity");
  assert.equal(piece.pieceName, "Lavabo Tabla");
  assert.equal(piece.widthCm, 80);
  assert.equal(piece.heightCm, 50);
  assert.equal(piece.areaCm2, 4000);
  assert.equal(piece.virtualPlateId, preview.groups[0].plates[0].id);
}

export function testBuildPlateAssignmentPreviewMarksOverflow() {
  const material = createMaterial({ materialName: "Calacatta", stockPlateId: "stock-calacatta" });
  const layoutPreview = buildLayoutPreview(
    createJob([
      createArea("area-kitchen", "Mutfak", [
        createProduct("product-countertop", "area-kitchen", "Tezgah", material, [
          createPiece("piece-oversize", "area-kitchen", "product-countertop", "Oversize", 400, 200, 1, 4),
        ]),
      ]),
    ]),
  );
  const preview = buildPlateAssignmentPreview(layoutPreview);

  assert.equal(preview.groups[0].status, "overflow");
  assert.equal(preview.groups[0].plates.some((plate) => plate.status === "overflow"), true);
}

export function testBuildPlateAssignmentPreviewMarksMissingMaterial() {
  const missingMaterial = createMaterial({
    materialName: "",
    source: "unknown",
    stockPlateId: undefined,
    shadeCode: undefined,
    lotNo: undefined,
  });
  const layoutPreview = buildLayoutPreview(
    createJob([
      createArea("area-kitchen", "Mutfak", [
        createProduct("product-countertop", "area-kitchen", "Tezgah", missingMaterial, [
          createPiece("piece-countertop", "area-kitchen", "product-countertop", "Tezgah", 100, 60, 1, 1.6),
        ]),
      ]),
    ]),
  );
  const preview = buildPlateAssignmentPreview(layoutPreview);

  assert.equal(preview.groups[0].status, "missing-material");
}

export function testBuildPlateAssignmentPreviewAggregatesTotals() {
  const calacatta = createMaterial({ materialName: "Calacatta", stockPlateId: "stock-calacatta" });
  const nero = createMaterial({ materialName: "Nero", stockPlateId: "stock-nero", shadeCode: "N" });
  const layoutPreview = buildLayoutPreview(
    createJob([
      createArea("area-kitchen", "Mutfak", [
        createProduct("product-countertop", "area-kitchen", "Tezgah", calacatta, [
          createPiece("piece-calacatta", "area-kitchen", "product-countertop", "Calacatta", 100, 60, 1, 1.6),
        ]),
        createProduct("product-island", "area-kitchen", "Ada", nero, [
          createPiece("piece-nero", "area-kitchen", "product-island", "Nero", 100, 40, 1, 1.4),
        ]),
      ]),
    ]),
  );
  const preview = buildPlateAssignmentPreview(layoutPreview);

  assert.equal(preview.totals.groupCount, 2);
  assert.equal(preview.totals.plateCount, 2);
  assert.equal(preview.totals.assignedPieceCount, 2);
  assert.equal(preview.totals.usedAreaCm2, 10000);
  assert.equal(preview.totals.remainingAreaCm2, 94976);
}

export function testBuildJobV5PersistencePlanMapsSingleAreaProductPiece() {
  const material = createMaterial({ materialName: "Calacatta", stockPlateId: "stock-calacatta" });
  const job = createJob([
    createArea("area-kitchen", "Mutfak", [
      createProduct("product-countertop", "area-kitchen", "Tezgah", material, [
        createPiece("piece-countertop", "area-kitchen", "product-countertop", "Tezgah", 100, 60, 1, 1.6),
      ]),
    ]),
  ]);
  const plan = buildJobV5PersistencePlan({ job, atolyeId: "atolye-1", title: "Mutfak Tezgah" });

  assert.deepEqual(plan.job, {
    id: "job-contract",
    atolyeId: "atolye-1",
    musteriId: null,
    customerName: "Contract Customer",
    customerPhone: "",
    customerEmail: "",
    customerAddress: "",
    customerType: "",
    title: "Mutfak Tezgah",
    name: "Mutfak Tezgah",
    status: "draft",
    notes: null,
  });
  assert.deepEqual(plan.areas[0], {
    id: "area-kitchen",
    jobId: "job-contract",
    name: "Mutfak",
    areaType: "kitchen",
    sortOrder: 0,
  });
  assert.equal(plan.products[0].id, "product-countertop");
  assert.equal(plan.products[0].areaId, "area-kitchen");
  assert.equal(plan.pieces[0].id, "piece-countertop");
  assert.equal(plan.pieces[0].areaCm2, 6000);
}

export function testBuildJobV5PersistencePlanMapsProductDefaultMaterialSelection() {
  const material = createMaterial({ materialName: "Calacatta", stockPlateId: "stock-calacatta" });
  const job = createJob([
    createArea("area-kitchen", "Mutfak", [
      createProduct("product-countertop", "area-kitchen", "Tezgah", material, [
        createPiece("piece-countertop", "area-kitchen", "product-countertop", "Tezgah", 100, 60, 1, 1.6),
      ]),
    ]),
  ]);
  const plan = buildJobV5PersistencePlan({ job, atolyeId: "atolye-1", title: "Mutfak Tezgah" });
  const materialSelectionId = plan.productDefaultMaterialSelectionId["product-countertop"];
  const materialSelection = plan.materialSelections.find((record) => record.id === materialSelectionId);

  assert.ok(materialSelection);
  assert.equal(plan.products[0].defaultMaterialSelectionId, materialSelectionId);
  assert.equal(materialSelection.materialName, "Calacatta");
  assert.equal(materialSelection.stockPlateId, "stock-calacatta");
}

export function testBuildJobV5PersistencePlanMapsPieceOverrideMaterialSelection() {
  const defaultMaterial = createMaterial({ materialName: "Calacatta", stockPlateId: "stock-calacatta" });
  const overrideMaterial = createMaterial({ materialName: "Nero", stockPlateId: "stock-nero", shadeCode: "N" });
  const piece = {
    ...createPiece("piece-countertop", "area-kitchen", "product-countertop", "Tezgah", 100, 60, 1, 1.6),
    materialSelection: overrideMaterial,
  };
  const job = createJob([
    createArea("area-kitchen", "Mutfak", [
      createProduct("product-countertop", "area-kitchen", "Tezgah", defaultMaterial, [piece]),
    ]),
  ]);
  const plan = buildJobV5PersistencePlan({ job, atolyeId: "atolye-1", title: "Mutfak Tezgah" });
  const overrideMaterialSelectionId = plan.pieceOverrideMaterialSelectionId["piece-countertop"];
  const overrideRecord = plan.materialSelections.find((record) => record.id === overrideMaterialSelectionId);

  assert.equal(plan.pieces[0].materialSelectionId, overrideMaterialSelectionId);
  assert.ok(overrideRecord);
  assert.equal(overrideRecord.materialName, "Nero");
  assert.equal(overrideRecord.stockPlateId, "stock-nero");
}

export function testBuildJobV5PersistencePlanLeavesPieceOverrideNullWhenMissing() {
  const material = createMaterial({ materialName: "Calacatta", stockPlateId: "stock-calacatta" });
  const job = createJob([
    createArea("area-kitchen", "Mutfak", [
      createProduct("product-countertop", "area-kitchen", "Tezgah", material, [
        createPiece("piece-countertop", "area-kitchen", "product-countertop", "Tezgah", 100, 60, 1, 1.6),
      ]),
    ]),
  ]);
  const plan = buildJobV5PersistencePlan({ job, atolyeId: "atolye-1", title: "Mutfak Tezgah" });

  assert.equal(plan.pieces[0].materialSelectionId, null);
  assert.deepEqual(plan.pieceOverrideMaterialSelectionId, {});
}

export function testBuildJobV5PersistencePlanDoesNotDedupeSameMaterialAcrossProducts() {
  const material = createMaterial({ materialName: "Calacatta", stockPlateId: "stock-calacatta" });
  const job = createJob([
    createArea("area-kitchen", "Mutfak", [
      createProduct("product-countertop", "area-kitchen", "Tezgah", material, [
        createPiece("piece-countertop", "area-kitchen", "product-countertop", "Tezgah", 100, 60, 1, 1.6),
      ]),
      createProduct("product-island", "area-kitchen", "Ada", material, [
        createPiece("piece-island", "area-kitchen", "product-island", "Ada", 120, 80, 1, 2.4),
      ]),
    ]),
  ]);
  const plan = buildJobV5PersistencePlan({ job, atolyeId: "atolye-1", title: "Mutfak Tezgah" });

  assert.equal(plan.materialSelections.length, 2);
  assert.notEqual(
    plan.productDefaultMaterialSelectionId["product-countertop"],
    plan.productDefaultMaterialSelectionId["product-island"],
  );
}

export function testBuildJobV5PersistencePlanPreservesOriginalMaterialSelectionSnapshot() {
  const material = createMaterial({
    materialName: "Calacatta",
    materialType: "quartz",
    shadeCode: "A",
    lotNo: "L1",
    requiresVeinMatch: true,
  });
  const job = createJob([
    createArea("area-kitchen", "Mutfak", [
      createProduct("product-countertop", "area-kitchen", "Tezgah", material, [
        createPiece("piece-countertop", "area-kitchen", "product-countertop", "Tezgah", 100, 60, 1, 1.6),
      ]),
    ]),
  ]);
  const plan = buildJobV5PersistencePlan({ job, atolyeId: "atolye-1", title: "Mutfak Tezgah" });
  const [record] = plan.materialSelections;

  assert.equal(record.snapshotJson.schemaVersion, 1);
  assert.equal(record.snapshotJson.source, "job-draft");
  assert.deepEqual(record.snapshotJson.materialSelection, material);
}

export function testBuildJobV5PersistencePlanMapsSeriesToCollectionAndSlabPriceToUnitCost() {
  const material = createMaterial({ series: "Royal", slabPrice: 1250 });
  const job = createJob([
    createArea("area-kitchen", "Mutfak", [
      createProduct("product-countertop", "area-kitchen", "Tezgah", material, [
        createPiece("piece-countertop", "area-kitchen", "product-countertop", "Tezgah", 100, 60, 1, 1.6),
      ]),
    ]),
  ]);
  const plan = buildJobV5PersistencePlan({ job, atolyeId: "atolye-1", title: "Mutfak Tezgah" });

  assert.equal(plan.materialSelections[0].collection, "Royal");
  assert.equal(plan.materialSelections[0].unitCost, 1250);
}

export function testBuildJobV5PersistencePlanDoesNotPersistDerivedPreviewFields() {
  const material = createMaterial({ materialName: "Calacatta", stockPlateId: "stock-calacatta" });
  const job = {
    ...createJob([
      createArea("area-kitchen", "Mutfak", [
        createProduct("product-countertop", "area-kitchen", "Tezgah", material, [
          createPiece("piece-countertop", "area-kitchen", "product-countertop", "Tezgah", 100, 60, 1, 1.6),
        ]),
      ]),
    ]),
    materialGroups: [{ key: "derived" }],
    quotePreview: [{ id: "derived" }],
    totals: { derived: true },
  } as unknown as JobDraft;
  const plan = buildJobV5PersistencePlan({ job, atolyeId: "atolye-1", title: "Mutfak Tezgah" });

  assert.equal(Object.prototype.hasOwnProperty.call(plan, "materialGroups"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(plan, "quotePreview"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(plan, "costPreview"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(plan, "totals"), false);
}

export function testBuildJobV5PersistencePlanRequiresTitle() {
  const job = createJob([]);

  assert.throws(() => buildJobV5PersistencePlan({ job, atolyeId: "atolye-1", title: "" }), /title is required/);
}

export function testBuildJobV5PersistencePlanRequiresAtolyeId() {
  const job = createJob([]);

  assert.throws(
    () => buildJobV5PersistencePlan({ job, atolyeId: " ", title: "Mutfak Tezgah" }),
    /atolyeId is required/,
  );
}

export function testBuildJobV5PersistencePlanReplacesUnsafeDraftIds() {
  const material = createMaterial({ materialName: "Calacatta" });
  const job = createJob([
    createArea("area_draft", "Mutfak", [
      createProduct("product_draft", "area_draft", "Tezgah", material, [
        createPiece("piece_draft", "area_draft", "product_draft", "Tezgah", 100, 60, 1, 1.6),
      ]),
    ]),
  ]);
  const draftJob = { ...job, id: "job_draft" };
  const plan = buildJobV5PersistencePlan({ job: draftJob, atolyeId: "atolye-1", title: "Mutfak Tezgah" });

  assert.equal(plan.job.id, "job_job");
  assert.equal(plan.areas[0].id, "area_area_0");
  assert.equal(plan.products[0].id, "product_area_0_product_0");
  assert.equal(plan.pieces[0].id, "piece_area_0_product_0_piece_0");
}

export async function testSaveJobV5DraftCreateUsesSingleTransactionAndSafeCreateOrder() {
  const material = createMaterial({ materialName: "Calacatta" });
  const job = createJob([
    createArea("area-kitchen", "Mutfak", [
      createProduct("product-countertop", "area-kitchen", "Tezgah", material, [
        createPiece("piece-countertop", "area-kitchen", "product-countertop", "Tezgah", 100, 60, 1, 1.6),
      ]),
    ]),
  ]);
  const db = createMockSaveDb();

  const result = await saveJobV5Draft(db, {
    mode: "create",
    job,
    atolyeId: "atolye-1",
    title: "Mutfak Tezgah",
  });

  assert.equal(db.transactionCount, 1);
  assert.deepEqual(db.calls, [
    "transaction:start",
    "jobV5.create",
    "jobV5Area.createMany",
    "jobV5MaterialSelection.createMany",
    "jobV5Product.createMany",
    "jobV5Piece.createMany",
    "transaction:commit",
  ]);
  assert.deepEqual(result.counts, {
    areas: 1,
    products: 1,
    pieces: 1,
    materialSelections: 1,
  });
}

export async function testSaveJobV5DraftUpdateChecksOwnershipBeforeReplacingChildren() {
  const material = createMaterial({ materialName: "Calacatta" });
  const job = createJob([
    createArea("area-kitchen", "Mutfak", [
      createProduct("product-countertop", "area-kitchen", "Tezgah", material, [
        createPiece("piece-countertop", "area-kitchen", "product-countertop", "Tezgah", 100, 60, 1, 1.6),
      ]),
    ]),
  ]);
  const db = createMockSaveDb();

  await saveJobV5Draft(db, {
    mode: "update",
    job,
    jobId: "persisted-job",
    atolyeId: "atolye-1",
    title: "Mutfak Tezgah",
  });

  assert.deepEqual(db.calls.slice(0, 3), [
    "transaction:start",
    "jobV5.findFirst",
    "jobV5Piece.deleteMany",
  ]);
  assert.deepEqual(db.calls.slice(2, 11), [
    "jobV5Piece.deleteMany",
    "jobV5Product.deleteMany",
    "jobV5MaterialSelection.deleteMany",
    "jobV5Area.deleteMany",
    "jobV5.update",
    "jobV5Area.createMany",
    "jobV5MaterialSelection.createMany",
    "jobV5Product.createMany",
    "jobV5Piece.createMany",
  ]);
  assert.equal(db.deletedJobIds.every((jobId) => jobId === "persisted-job"), true);
  assert.equal(db.created.jobId, "persisted-job");
}

export async function testSaveJobV5DraftUpdateRollsBackWhenOwnershipFails() {
  const job = createJob([]);
  const db = createMockSaveDb({ jobFound: false });

  await assert.rejects(
    () =>
      saveJobV5Draft(db, {
        mode: "update",
        job,
        jobId: "other-job",
        atolyeId: "atolye-1",
        title: "Mutfak Tezgah",
      }),
    (error) => error instanceof JobV5SaveError && error.code === "not-found",
  );

  assert.deepEqual(db.calls, [
    "transaction:start",
    "jobV5.findFirst",
    "transaction:rollback",
  ]);
}

export async function testSaveJobV5DraftValidatesCustomerOwnership() {
  const job = {
    ...createJob([]),
    customer: { id: "customer-1", name: "Contract Customer" },
  };
  const db = createMockSaveDb({ customerFound: false });

  await assert.rejects(
    () =>
      saveJobV5Draft(db, {
        mode: "create",
        job,
        atolyeId: "atolye-1",
        title: "Mutfak Tezgah",
      }),
    (error) => error instanceof JobV5SaveError && error.code === "forbidden",
  );

  assert.deepEqual(db.calls, ["transaction:start", "musteri.findFirst", "transaction:rollback"]);
}

export async function testSaveJobV5DraftCreateDoesNotPartiallyWriteOutsideTransaction() {
  const material = createMaterial({ materialName: "Calacatta" });
  const job = createJob([
    createArea("area-kitchen", "Mutfak", [
      createProduct("product-countertop", "area-kitchen", "Tezgah", material, [
        createPiece("piece-countertop", "area-kitchen", "product-countertop", "Tezgah", 100, 60, 1, 1.6),
      ]),
    ]),
  ]);
  const db = createMockSaveDb({ failOn: "jobV5Product.createMany" });

  await assert.rejects(() =>
    saveJobV5Draft(db, {
      mode: "create",
      job,
      atolyeId: "atolye-1",
      title: "Mutfak Tezgah",
    }),
  );

  assert.equal(db.transactionCount, 1);
  assert.equal(db.calls.includes("transaction:rollback"), true);
  assert.equal(db.calls.includes("transaction:commit"), false);
}

export function testParseSaveJobV5DraftRequestAcceptsCreatePayload() {
  const material = createMaterial({ materialName: "Calacatta" });
  const job = createJob([
    createArea("area-kitchen", "Mutfak", [
      createProduct("product-countertop", "area-kitchen", "Tezgah", material, [
        createPiece("piece-countertop", "area-kitchen", "product-countertop", "Tezgah", 100, 60, 1, 1.6),
      ]),
    ]),
  ]);

  const request = parseSaveJobV5DraftRequest({ title: "Mutfak Tezgah", job });
  const input = buildSaveJobV5DraftInput(request, "atolye-1");

  assert.equal(request.title, "Mutfak Tezgah");
  assert.equal(request.jobId, undefined);
  assert.equal(input.mode, "create");
  assert.equal(input.atolyeId, "atolye-1");
}

export function testParseSaveJobV5DraftRequestDerivesUpdateFromJobId() {
  const request = parseSaveJobV5DraftRequest({ title: "Mutfak Tezgah", jobId: "job-v5-1", job: createJob([]) });
  const input = buildSaveJobV5DraftInput(request, "atolye-1");

  assert.equal(input.mode, "update");
  assert.equal(input.jobId, "job-v5-1");
}

export function testParseSaveJobV5DraftRequestRejectsInvalidPayload() {
  assert.throws(
    () => parseSaveJobV5DraftRequest({ title: "", job: createJob([]) }),
    (error) => error instanceof JobV5SaveError && error.code === "invalid-input",
  );
  assert.throws(
    () => parseSaveJobV5DraftRequest({ title: "Mutfak Tezgah", job: { ...createJob([]), areas: "bad" } }),
    /job.areas must be an array/,
  );
}

export function testMapJobV5SaveErrorMapsRouteResponses() {
  assert.deepEqual(mapJobV5SaveError(new JobV5SaveError("bad payload", "invalid-input")), {
    status: 400,
    body: { success: false, error: "bad payload" },
  });
  assert.deepEqual(mapJobV5SaveError(new JobV5SaveError("missing job", "not-found")), {
    status: 404,
    body: { success: false, error: "missing job" },
  });
  assert.deepEqual(mapJobV5SaveError(new JobV5SaveError("wrong customer", "forbidden")), {
    status: 403,
    body: { success: false, error: "wrong customer" },
  });
  assert.equal(mapJobV5SaveError(new Error("unexpected")).status, 500);
}

export async function testSaveJobV5DraftClientPostsTypedPayload() {
  const job = createJob([]);
  const calls: Array<{ input: string; init?: { method?: string; headers?: Record<string, string>; body?: string } }> = [];
  const fetch = createMockFetch({
    status: 200,
    body: { success: true, jobId: "job-v5-1", mode: "create" },
    calls,
  });

  const result = await saveJobV5DraftFromClient({
    job,
    title: "Mutfak Tezgah",
    fetch,
  });

  assert.deepEqual(result, { success: true, jobId: "job-v5-1", mode: "create" });
  assert.equal(calls[0].input, "/api/yeni-is-v5/save");
  assert.equal(calls[0].init?.method, "POST");
  assert.equal(calls[0].init?.headers?.["Content-Type"], "application/json");
  assert.deepEqual(JSON.parse(calls[0].init?.body ?? ""), {
    job,
    title: "Mutfak Tezgah",
  });
}

export async function testSaveJobV5DraftClientSendsJobIdForUpdate() {
  const calls: Array<{ input: string; init?: { method?: string; headers?: Record<string, string>; body?: string } }> = [];
  const fetch = createMockFetch({
    status: 200,
    body: { success: true, jobId: "job-v5-1", mode: "update" },
    calls,
  });

  const result = await saveJobV5DraftFromClient({
    job: createJob([]),
    title: "Mutfak Tezgah",
    jobId: "job-v5-1",
    fetch,
  });
  const payload = JSON.parse(calls[0].init?.body ?? "");

  assert.equal(result.mode, "update");
  assert.equal(payload.jobId, "job-v5-1");
}

export async function testSaveJobV5DraftClientNormalizesHttpErrors() {
  for (const status of [400, 401, 403, 404, 500] as const) {
    const fetch = createMockFetch({
      status,
      body: { success: false, error: `error-${status}` },
    });

    await assert.rejects(
      () => saveJobV5DraftFromClient({ job: createJob([]), title: "Mutfak Tezgah", fetch }),
      (error) => error instanceof JobV5ClientError && error.status === status && error.message === `error-${status}`,
    );
  }
}

export async function testSaveJobV5DraftClientMapsUnknownHttpErrorTo500() {
  const fetch = createMockFetch({
    status: 418,
    body: { success: false, error: "teapot" },
  });

  await assert.rejects(
    () => saveJobV5DraftFromClient({ job: createJob([]), title: "Mutfak Tezgah", fetch }),
    (error) => error instanceof JobV5ClientError && error.status === 500 && error.message === "teapot",
  );
}

export async function testSaveJobV5DraftClientRejectsInvalidSuccessResponse() {
  const fetch = createMockFetch({
    status: 200,
    body: { success: true, jobId: "job-v5-1", mode: "bad" },
  });

  await assert.rejects(
    () => saveJobV5DraftFromClient({ job: createJob([]), title: "Mutfak Tezgah", fetch }),
    (error) => error instanceof JobV5ClientError && error.status === 500,
  );
}

type ComparableSummary = {
  materialName: string;
  source: string;
  shadeCode?: string;
};

function compareSummary(left: ComparableSummary, right: ComparableSummary): number {
  return `${left.materialName}|${left.source}|${left.shadeCode ?? ""}`.localeCompare(
    `${right.materialName}|${right.source}|${right.shadeCode ?? ""}`,
  );
}

function createJob(areas: JobAreaDraft[]): JobDraft {
  return {
    id: "job-contract",
    customer: { name: "Contract Customer" },
    areas,
    materialGroups: [],
    quotePreview: [],
    costPreview: {
      jobId: "job-contract",
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
    currency: "TRY",
    shadeCode: "A",
    lotNo: "L1",
    requiresVeinMatch: false,
    ...overrides,
  };
}

type MockSaveDbOptions = {
  jobFound?: boolean;
  customerFound?: boolean;
  failOn?: string;
};

type MockSaveDb = JobV5SaveDbClient & {
  calls: string[];
  transactionCount: number;
  deletedJobIds: string[];
  created: {
    jobId: string | null;
  };
};

function createMockSaveDb(options: MockSaveDbOptions = {}): MockSaveDb {
  const calls: string[] = [];
  const deletedJobIds: string[] = [];
  const created = { jobId: null as string | null };
  let transactionCount = 0;
  const tx = createMockSaveTx(calls, deletedJobIds, created, options);

  return {
    calls,
    deletedJobIds,
    created,
    get transactionCount() {
      return transactionCount;
    },
    async $transaction<T>(run: (transaction: JobV5SaveTransactionClient) => Promise<T>): Promise<T> {
      transactionCount += 1;
      calls.push("transaction:start");

      try {
        const result = await run(tx);
        calls.push("transaction:commit");
        return result;
      } catch (error) {
        calls.push("transaction:rollback");
        throw error;
      }
    },
  };
}

function createMockSaveTx(
  calls: string[],
  deletedJobIds: string[],
  created: { jobId: string | null },
  options: MockSaveDbOptions,
): JobV5SaveTransactionClient {
  function record(call: string) {
    calls.push(call);

    if (options.failOn === call) {
      throw new Error(`${call} failed`);
    }
  }

  return {
    jobV5: {
      async findFirst() {
        record("jobV5.findFirst");
        return options.jobFound === false ? null : { id: "job-1" };
      },
      async create(args: unknown) {
        record("jobV5.create");
        created.jobId = readDataJobId(args);
        return {};
      },
      async update(args: unknown) {
        record("jobV5.update");
        created.jobId = readWhereJobId(args);
        return {};
      },
    },
    jobV5Area: {
      async createMany() {
        record("jobV5Area.createMany");
        return {};
      },
      async deleteMany(args: unknown) {
        record("jobV5Area.deleteMany");
        deletedJobIds.push(readWhereJobId(args));
        return {};
      },
    },
    jobV5MaterialSelection: {
      async createMany() {
        record("jobV5MaterialSelection.createMany");
        return {};
      },
      async deleteMany(args: unknown) {
        record("jobV5MaterialSelection.deleteMany");
        deletedJobIds.push(readWhereJobId(args));
        return {};
      },
    },
    jobV5Product: {
      async createMany(args: unknown) {
        record("jobV5Product.createMany");
        created.jobId = readFirstDataJobId(args);
        return {};
      },
      async deleteMany(args: unknown) {
        record("jobV5Product.deleteMany");
        deletedJobIds.push(readWhereJobId(args));
        return {};
      },
    },
    jobV5Piece: {
      async createMany() {
        record("jobV5Piece.createMany");
        return {};
      },
      async deleteMany(args: unknown) {
        record("jobV5Piece.deleteMany");
        deletedJobIds.push(readWhereJobId(args));
        return {};
      },
    },
    musteri: {
      async findFirst(args: unknown) {
        if (readWhereCustomerId(args)) {
          record("musteri.findFirst");
          return options.customerFound === false ? null : { id: "customer-1" };
        }

        return null;
      },
    },
  };
}

function readDataJobId(args: unknown): string {
  return ((args as { data: { id: string } }).data.id);
}

function readFirstDataJobId(args: unknown): string {
  return ((args as { data: Array<{ jobId: string }> }).data[0].jobId);
}

function readWhereJobId(args: unknown): string {
  return ((args as { where: { id?: string; jobId?: string } }).where.id ?? (args as { where: { jobId: string } }).where.jobId);
}

function readWhereCustomerId(args: unknown): string | null {
  return ((args as { where: { id?: string } }).where.id ?? null);
}

type MockFetchCall = {
  input: string;
  init?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
  };
};

function createMockFetch(options: {
  status: number;
  body: unknown;
  calls?: MockFetchCall[];
}) {
  return async (
    input: string,
    init?: {
      method?: string;
      headers?: Record<string, string>;
      body?: string;
    },
  ) => {
    options.calls?.push({ input, init });

    return {
      ok: options.status >= 200 && options.status < 300,
      status: options.status,
      async json() {
        return options.body;
      },
    };
  };
}
