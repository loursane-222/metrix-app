export function paraBiçim(tutar: number, ondalik = 2): string {
  return tutar.toLocaleString('tr-TR', {
    minimumFractionDigits: ondalik,
    maximumFractionDigits: ondalik,
  })
}

export function paraGoster(tutar: number, ondalik = 2): string {
  return `₺${paraBiçim(tutar, ondalik)}`
}

export function yuzdeGoster(oran: number, ondalik = 1): string {
  return `%${oran.toLocaleString('tr-TR', { minimumFractionDigits: ondalik, maximumFractionDigits: ondalik })}`
}

export function formatDecimalTR(v: number | string | null | undefined, digits = 2): string {
  return Number(v || 0).toLocaleString('tr-TR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}

export function formatMtulTR(v: number | string | null | undefined, digits = 2): string {
  return `${formatDecimalTR(v, digits)} mtül`
}