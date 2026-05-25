function roundTo(value: unknown, decimals: number): number {
  const n = typeof value === "number" ? value : Number(value || 0);
  if (!Number.isFinite(n)) return 0;
  const factor = 10 ** decimals;
  return Math.round((n + Number.EPSILON) * factor) / factor;
}

export function roundMoney(value: unknown): number {
  return roundTo(value, 2);
}

export function roundMinutes(value: unknown): number {
  return roundTo(value, 2);
}

export function roundPercent(value: unknown): number {
  return roundTo(value, 2);
}
