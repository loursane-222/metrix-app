import { normalizeMtulInput, normalizeMtulDisplay } from "@/lib/normalizeMtul";
export function normalizeMtulInput(value: unknown): number {
  if (value === null || value === undefined) return 0;

  let raw = String(value).trim();
  if (!raw) return 0;

  raw = raw.replace(/\s/g, "").replace(",", ".").replace(/[^\d.]/g, "");
  if (!raw) return 0;

  const parts = raw.split(".");
  if (parts.length > 2) {
    raw = parts[0] + "." + parts.slice(1).join("");
  }

  let n = Number(raw);
  if (!Number.isFinite(n)) return 0;

  if (n > 100) n = n / 100;

  return Math.round(n * 1000) / 1000;
}

export function normalizeMtulDisplay(value: unknown): string {
  const n = normalizeMtulInput(value);
  return n ? String(n) : "";
}
