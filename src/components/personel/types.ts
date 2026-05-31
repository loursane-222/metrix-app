export type Personel = {
  id: string
  ad: string
  soyad: string
  gorevi: string
  calismaYili: number
  telefon: string
  email: string
  aktif: boolean
  isPatron?: boolean
  bagliOldugu?: { id: string; ad: string; soyad: string } | null
  performansNotu: number | null
  toplamGorev: number
  tamamlananGorev?: number
  zamanindaTamamlanan?: number
  // Faz 1 — maliyet & rol alanları
  rolGrubu?: string
  brutMaas?: number
  sgkOrani?: number
  iseBaslamaTarihi?: string | null
  gunlukCalismaGun?: number
}

export type PersonelYetki = {
  personelId?: string
  isProgramiGorebilir: boolean
  isProgramiDuzenleyebilir: boolean
  imalatTamamlayabilir: boolean
  maliyetGorebilir: boolean
  musteriGorebilir: boolean
  teklifOlusturabilir: boolean
  atolyeAyarGorebilir: boolean
}

export const ROL_META: Record<string, { label: string; tw: string }> = {
  OLCU:    { label: 'Ölçücü',    tw: 'border-blue-500/30 bg-blue-500/10 text-blue-300' },
  KESIM:   { label: 'Kesimci',   tw: 'border-amber-500/30 bg-amber-500/10 text-amber-300' },
  TOPLAMA: { label: 'Toplamacı', tw: 'border-purple-500/30 bg-purple-500/10 text-purple-300' },
  MONTAJ:  { label: 'Montajcı',  tw: 'border-green-500/30 bg-green-500/10 text-green-300' },
  OFIS:    { label: 'Ofis',      tw: 'border-slate-500/30 bg-slate-500/10 text-slate-300' },
  DIGER:   { label: 'Diğer',     tw: 'border-zinc-600/30 bg-zinc-700/20 text-zinc-400' },
}

export const GOREVLER = [
  'Patron', 'Usta', 'Kalfa', 'Çırak', 'Ustabaşı', 'Kesimci',
  'Montajcı', 'Ölçücü', 'Mimar', 'Satış', 'Muhasebe',
  'Yardımcı', 'Şoför', 'Ofis', 'Diğer',
]

export const ROL_OPTIONS = Object.entries(ROL_META).map(([value, { label }]) => ({ value, label }))
