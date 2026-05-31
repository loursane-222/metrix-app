import { Prisma } from "@prisma/client";
import { normalizeCurrency } from "@/lib/stock/currency";

export const STOCK_PURCHASE_STATUSES = ["PLANNED", "ORDERED", "RECEIVED", "CANCELLED"] as const;

export type StockPurchaseStatus = (typeof STOCK_PURCHASE_STATUSES)[number];

export function n(value: unknown) {
  if (value == null) return 0;
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

export function optionalText(value: unknown) {
  const s = String(value ?? "").trim();
  return s || null;
}

export function requiredText(value: unknown) {
  return String(value ?? "").trim();
}

export function normalizeStatus(value: unknown): StockPurchaseStatus | null {
  const status = String(value ?? "").trim().toUpperCase();
  return STOCK_PURCHASE_STATUSES.includes(status as StockPurchaseStatus) ? (status as StockPurchaseStatus) : null;
}

export function purchaseCode() {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const token = Date.now().toString(36).toUpperCase().slice(-6);
  return `SA-${date}-${token}`;
}

export function jsonPlateIds(value: Prisma.JsonValue | null | undefined) {
  return Array.isArray(value) ? value.map((id) => String(id)).filter(Boolean) : [];
}

export function plateCodeForPurchase(code: string, index: number) {
  return `${code}-${String(index + 1).padStart(3, "0")}`;
}

export function parsePurchaseInput(body: any) {
  const productName = requiredText(body?.productName);
  const materialType = optionalText(body?.materialType);
  const supplierName = optionalText(body?.supplierName);
  const widthCm = n(body?.widthCm);
  const heightCm = n(body?.heightCm);
  const quantity = Math.floor(n(body?.quantity) || 1);
  const currency = normalizeCurrency(body?.currency);
  const unitCost = n(body?.unitCost);
  const totalCost = body?.totalCost != null && body?.totalCost !== "" ? n(body.totalCost) : unitCost * quantity;
  const purchaseFxRate = currency === "TRY" ? 1 : n(body?.purchaseFxRate);
  const warehouseId = optionalText(body?.warehouseId);
  const isId = optionalText(body?.isId);
  const expectedDate = body?.expectedDate ? new Date(String(body.expectedDate)) : null;

  const errors: string[] = [];
  if (!productName) errors.push("Ürün adı zorunlu.");
  if (widthCm <= 0) errors.push("Genişlik 0'dan büyük olmalı.");
  if (heightCm <= 0) errors.push("Yükseklik 0'dan büyük olmalı.");
  if (quantity < 1) errors.push("Adet en az 1 olmalı.");
  if (unitCost < 0 || totalCost < 0) errors.push("Maliyet negatif olamaz.");
  if (currency !== "TRY" && purchaseFxRate <= 0) errors.push("Dövizli satın alma için alış kuru zorunlu.");
  if (expectedDate && Number.isNaN(expectedDate.getTime())) errors.push("Beklenen tarih geçersiz.");

  return {
    data: {
      productName,
      materialType,
      supplierName,
      widthCm,
      heightCm,
      quantity,
      currency,
      unitCost,
      totalCost,
      purchaseFxRate,
      warehouseId,
      isId,
      expectedDate,
    },
    errors,
  };
}
