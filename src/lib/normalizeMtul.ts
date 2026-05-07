export function normalizeMtulInput(value: unknown): number {
  if (value === null || value === undefined) return 0;

  let raw = String(value).trim();
  if (!raw) return 0;

  // Binlik ayırıcı nokta varsa temizle (örn: 1.029 -> 1029), virgülü noktaya çevir
  raw = raw.replace(/\s/g, "");

  // Virgüllü format: "4,90" -> "4.90"
  if (raw.includes(",")) {
    raw = raw.replace(",", ".");
  }

  // Sadece rakam ve nokta bırak
  raw = raw.replace(/[^\d.]/g, "");
  if (!raw) return 0;

  // Birden fazla nokta varsa sadece ilkini tut
  const parts = raw.split(".");
  if (parts.length > 2) {
    raw = parts[0] + "." + parts.slice(1).join("");
  }

  const n = Number(raw);
  if (!Number.isFinite(n)) return 0;

  return Math.round(n * 1000) / 1000;
}

export function normalizeMtulDisplay(value: unknown): string {
  const n = normalizeMtulInput(value);
  return n ? String(n) : "";
}
