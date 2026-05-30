import { Prisma } from "@prisma/client";

export const OFFCUT_STATUSES = ["AVAILABLE", "RESERVED", "PARTIAL_CONSUMED", "CONSUMED", "SCRAPPED"] as const;
export type OffcutStatus = (typeof OFFCUT_STATUSES)[number];

export const OFFCUT_PARENT_PLATE_STATUSES = ["AVAILABLE", "RESERVED", "PARTIAL"] as const;

export function n(value: unknown) {
  if (value == null) return 0;
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

export function optionalText(value: unknown) {
  const s = String(value ?? "").trim();
  return s || null;
}

export function normalizeOffcutStatus(value: unknown): OffcutStatus | null {
  const status = String(value ?? "").trim().toUpperCase();
  return OFFCUT_STATUSES.includes(status as OffcutStatus) ? (status as OffcutStatus) : null;
}

export function calculateOffcutMetrics(input: {
  widthCm: number;
  heightCm: number;
  parentTotalAreaCm2: number;
  parentPurchaseTotalCost: number;
}) {
  const areaCm2 = input.widthCm * input.heightCm;
  const parentCostPerCm2 =
    input.parentTotalAreaCm2 > 0 ? input.parentPurchaseTotalCost / input.parentTotalAreaCm2 : 0;
  const totalCost = areaCm2 * parentCostPerCm2;
  const areaM2 = areaCm2 / 10_000;
  const costPerM2 = areaM2 > 0 ? totalCost / areaM2 : 0;
  return { areaCm2, areaM2, totalCost, costPerM2 };
}

export function offcutCode(parentPlateCode: string, index: number) {
  const safeParent = parentPlateCode.replace(/[^A-Z0-9-]/gi, "").toUpperCase().slice(0, 32) || "OFF";
  return `${safeParent}-OF-${String(index + 1).padStart(3, "0")}`;
}

export function decimal(value: number) {
  return new Prisma.Decimal(Number.isFinite(value) ? value : 0);
}

export function serializeOffcut(offcut: any, parentPlate?: any, warehouse?: any) {
  return {
    id: offcut.id,
    atolyeId: offcut.atolyeId,
    parentPlateId: offcut.parentPlateId,
    parentPlateCode: parentPlate?.plateCode ?? offcut.parentPlate?.plateCode ?? null,
    parentOffcutId: offcut.parentOffcutId,
    offcutCode: offcut.offcutCode,
    warehouseId: offcut.warehouseId,
    warehouseName: warehouse?.name ?? offcut.warehouse?.name ?? null,
    productName: offcut.productName,
    materialType: offcut.materialType,
    shadeCode: parentPlate?.shadeCode ?? offcut.parentPlate?.shadeCode ?? null,
    widthCm: n(offcut.widthCm),
    heightCm: n(offcut.heightCm),
    areaCm2: n(offcut.areaCm2),
    areaM2: n(offcut.areaCm2) / 10_000,
    remainingAreaCm2: n(offcut.remainingAreaCm2),
    remainingAreaM2: n(offcut.remainingAreaCm2) / 10_000,
    costPerM2: n(offcut.costPerM2),
    totalCost: n(offcut.totalCost),
    currency: offcut.currency,
    status: offcut.status,
    sourceJobId: offcut.sourceJobId,
    consumedAt: offcut.consumedAt,
    scrappedAt: offcut.scrappedAt,
    notes: offcut.notes,
    createdAt: offcut.createdAt,
    updatedAt: offcut.updatedAt,
  };
}
