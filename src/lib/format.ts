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