import type {
  AreaProductDraft,
  CuttingPieceDraft,
  JobAreaDraft,
  JobDraft,
  MaterialSelectionDraft,
} from "./domain";

export type JobV5MaterialSelectionSnapshot = {
  schemaVersion: 1;
  source: "job-draft";
  materialSelection: MaterialSelectionDraft;
};

export type JobV5PersistenceJobRecord = {
  id: string;
  atolyeId: string;
  musteriId: string | null;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerAddress: string;
  customerType: string;
  title: string;
  name: string;
  status: JobDraft["status"];
  notes: string | null;
};

export type JobV5PersistenceAreaRecord = {
  id: string;
  jobId: string;
  name: string;
  areaType: JobAreaDraft["areaType"] | null;
  sortOrder: number;
};

export type JobV5PersistenceProductRecord = {
  id: string;
  jobId: string;
  areaId: string;
  name: string;
  productType: AreaProductDraft["productType"] | null;
  quantity: number;
  sortOrder: number;
  defaultMaterialSelectionId: string | null;
};

export type JobV5PersistencePieceRecord = {
  id: string;
  jobId: string;
  areaId: string;
  productId: string;
  label: string;
  name: string;
  pieceType: CuttingPieceDraft["pieceType"] | null;
  widthCm: number;
  heightCm: number;
  quantity: number;
  areaCm2: number | null;
  linearMeter: number | null;
  sortOrder: number;
  materialSelectionId: string | null;
};

export type JobV5PersistenceMaterialSelectionRecord = {
  id: string;
  jobId: string;
  source: MaterialSelectionDraft["source"];
  materialName: string;
  brand: string | null;
  collection: string | null;
  color: string | null;
  finish: string | null;
  thicknessMm: number | null;
  slabWidthCm: number | null;
  slabHeightCm: number | null;
  unitCost: number | null;
  currency: MaterialSelectionDraft["currency"] | null;
  stockPlateId: string | null;
  stockOffcutId: string | null;
  stockPurchaseId: string | null;
  snapshotJson: JobV5MaterialSelectionSnapshot;
};

export type JobV5PersistencePlan = {
  job: JobV5PersistenceJobRecord;
  areas: JobV5PersistenceAreaRecord[];
  products: JobV5PersistenceProductRecord[];
  pieces: JobV5PersistencePieceRecord[];
  materialSelections: JobV5PersistenceMaterialSelectionRecord[];
  productDefaultMaterialSelectionId: Record<string, string>;
  pieceOverrideMaterialSelectionId: Record<string, string>;
};

export type BuildJobV5PersistencePlanInput = {
  job: JobDraft;
  atolyeId: string;
  title: string;
};

export function buildJobV5PersistencePlan(input: BuildJobV5PersistencePlanInput): JobV5PersistencePlan {
  const title = requireNonEmpty(input.title, "title");
  const atolyeId = requireNonEmpty(input.atolyeId, "atolyeId");
  const jobId = buildPersistId("job", input.job.id, ["job"]);
  const areas: JobV5PersistenceAreaRecord[] = [];
  const products: JobV5PersistenceProductRecord[] = [];
  const pieces: JobV5PersistencePieceRecord[] = [];
  const materialSelections: JobV5PersistenceMaterialSelectionRecord[] = [];
  const productDefaultMaterialSelectionId: Record<string, string> = {};
  const pieceOverrideMaterialSelectionId: Record<string, string> = {};

  for (let areaIndex = 0; areaIndex < input.job.areas.length; areaIndex += 1) {
    const area = input.job.areas[areaIndex];
    const areaId = buildPersistId("area", area.id, ["area", String(areaIndex)]);

    areas.push({
      id: areaId,
      jobId,
      name: area.name,
      areaType: area.areaType ?? null,
      sortOrder: area.sortOrder,
    });

    for (let productIndex = 0; productIndex < area.products.length; productIndex += 1) {
      const product = area.products[productIndex];
      const productId = buildPersistId("product", product.id, [
        "area",
        String(areaIndex),
        "product",
        String(productIndex),
      ]);
      const defaultMaterialSelectionId = buildPersistId("material", `${product.id}_default`, [
        "area",
        String(areaIndex),
        "product",
        String(productIndex),
        "default-material",
      ]);

      productDefaultMaterialSelectionId[product.id] = defaultMaterialSelectionId;
      materialSelections.push(
        buildMaterialSelectionRecord(defaultMaterialSelectionId, jobId, product.defaultMaterialSelection),
      );

      products.push({
        id: productId,
        jobId,
        areaId,
        name: product.name,
        productType: product.productType ?? null,
        quantity: product.quantity,
        sortOrder: product.sortOrder,
        defaultMaterialSelectionId,
      });

      for (let pieceIndex = 0; pieceIndex < product.pieces.length; pieceIndex += 1) {
        const piece = product.pieces[pieceIndex];
        const pieceId = buildPersistId("piece", piece.id, [
          "area",
          String(areaIndex),
          "product",
          String(productIndex),
          "piece",
          String(pieceIndex),
        ]);
        const overrideMaterialSelectionId = piece.materialSelection
          ? buildPersistId("material", `${piece.id}_override`, [
              "area",
              String(areaIndex),
              "product",
              String(productIndex),
              "piece",
              String(pieceIndex),
              "override-material",
            ])
          : null;

        if (piece.materialSelection && overrideMaterialSelectionId) {
          pieceOverrideMaterialSelectionId[piece.id] = overrideMaterialSelectionId;
          materialSelections.push(buildMaterialSelectionRecord(overrideMaterialSelectionId, jobId, piece.materialSelection));
        }

        pieces.push({
          id: pieceId,
          jobId,
          areaId,
          productId,
          label: piece.label,
          name: piece.label,
          pieceType: piece.pieceType ?? null,
          widthCm: piece.widthCm,
          heightCm: piece.heightCm,
          quantity: piece.quantity,
          areaCm2: piece.areaCm2 ?? null,
          linearMeter: piece.linearMeter ?? null,
          sortOrder: pieceIndex,
          materialSelectionId: overrideMaterialSelectionId,
        });
      }
    }
  }

  return {
    job: {
      id: jobId,
      atolyeId,
      musteriId: input.job.customer.id ?? null,
      customerName: input.job.customer.name,
      customerPhone: input.job.customer.phone ?? "",
      customerEmail: input.job.customer.email ?? "",
      customerAddress: input.job.customer.address ?? "",
      customerType: input.job.customer.customerType ?? "",
      title,
      name: title,
      status: input.job.status,
      notes: input.job.notes ?? null,
    },
    areas,
    products,
    pieces,
    materialSelections,
    productDefaultMaterialSelectionId,
    pieceOverrideMaterialSelectionId,
  };
}

function buildMaterialSelectionRecord(
  id: string,
  jobId: string,
  materialSelection: MaterialSelectionDraft,
): JobV5PersistenceMaterialSelectionRecord {
  return {
    id,
    jobId,
    source: materialSelection.source,
    materialName: materialSelection.materialName,
    brand: materialSelection.brand ?? null,
    collection: materialSelection.series ?? null,
    color: materialSelection.color ?? null,
    finish: null,
    thicknessMm: null,
    slabWidthCm: materialSelection.slabWidthCm ?? null,
    slabHeightCm: materialSelection.slabHeightCm ?? null,
    unitCost: materialSelection.slabPrice ?? null,
    currency: materialSelection.currency ?? null,
    stockPlateId: materialSelection.stockPlateId ?? null,
    stockOffcutId: null,
    stockPurchaseId: null,
    snapshotJson: {
      schemaVersion: 1,
      source: "job-draft",
      materialSelection: { ...materialSelection },
    },
  };
}

function buildPersistId(prefix: string, sourceId: string | undefined, path: string[]): string {
  if (sourceId && !isDraftId(sourceId)) {
    return sourceId;
  }

  return `${prefix}_${path.map(normalizePersistIdPart).join("_")}`;
}

function isDraftId(value: string): boolean {
  return value.trim().length === 0 || value.endsWith("_draft");
}

function normalizePersistIdPart(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]+/gi, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function requireNonEmpty(value: string, fieldName: string): string {
  const trimmed = value.trim();

  if (trimmed.length === 0) {
    throw new Error(`${fieldName} is required`);
  }

  return trimmed;
}
