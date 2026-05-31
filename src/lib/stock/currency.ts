export function n(value: unknown) {
  if (value == null) return 0;
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

export function normalizeCurrency(value: unknown) {
  const currency = String(value ?? "TRY").trim().toUpperCase();
  return currency || "TRY";
}

export function normalizeFxRate(currency: unknown, value: unknown) {
  const normalizedCurrency = normalizeCurrency(currency);
  if (normalizedCurrency === "TRY") return 1;
  const rate = n(value);
  return rate > 0 ? rate : 0;
}

export function stockCostFields(input: {
  currency: unknown;
  originalCost: unknown;
  fxRate?: unknown;
  quantity?: unknown;
  totalAreaCm2?: unknown;
}) {
  const currency = normalizeCurrency(input.currency);
  const originalCost = n(input.originalCost);
  const fxRate = normalizeFxRate(currency, input.fxRate);
  const quantity = Math.max(1, Math.floor(n(input.quantity) || 1));
  const totalAreaCm2 = n(input.totalAreaCm2);
  const totalCostTry = currency === "TRY" ? originalCost : originalCost * fxRate;
  const originalUnitCost = originalCost / quantity;
  const unitCostTry = totalCostTry / quantity;
  const purchaseUnitCost = totalAreaCm2 > 0 ? unitCostTry / (totalAreaCm2 / 10_000) : 0;

  return {
    currency,
    fxRate,
    originalCost,
    totalCostTry,
    originalUnitCost,
    unitCostTry,
    purchaseUnitCost,
    quantity,
  };
}

export function fxRateMissing(currency: unknown, fxRate: unknown) {
  const normalizedCurrency = normalizeCurrency(currency);
  return normalizedCurrency !== "TRY" && n(fxRate) <= 1;
}
