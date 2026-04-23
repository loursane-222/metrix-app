'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { paraGoster, yuzdeGoster } from '@/lib/format'

type IsKaydi = {
  id: string
  teklifNo: string
  satisFiyati: number
  durum: string
  tahsilat: number
}

type Tahsilat = {
  id: string
  tarih: string
  tutar: number
}

type Musteri = {
  id: string
  firmaAdi: string
  ad: string
  soyad: string
  telefon: string
  email: string
  acilisBakiyesi: number
  bakiyeTipi: string
  isler: IsKaydi[]
  tahsilatlar: Tahsilat[]
}

type FormState = {
  firmaAdi: string
  ad: string
  soyad: string
  telefon: string
  email: string
  acilisBakiyesi: string
  bakiyeTipi: string
}


function getQueryParam(key: string) {
  if (typeof window === 'undefined') return null
  return new URLSearchParams(window.location.search).get(key)
}

function cls(...c: Array<string | false | null | undefined>) {
  return c.filter(Boolean).join(' ')
}

function tamAd(m: Musteri) {
  const kisimlar = [m.firmaAdi, m.ad, m.soyad].filter(Boolean)
  return kisimlar.join(' / ')
}

function acilisBakiyeYazisi(m: Musteri) {
  const tip = m.bakiyeTipi === 'alacak' ? 'Alacak' : 'Borç'
  return `${paraGoster(Number(m.acilisBakiyesi || 0))} (${tip})`
}

function bosForm(): FormState {
  return {
    firmaAdi: '',
    ad: '',
    soyad: '',
    telefon: '',
    email: '',
    acilisBakiyesi: '',
    bakiyeTipi: 'borc',
  }
}

function formDoldur(m: Musteri): FormState {
  return {
    firmaAdi: m.firmaAdi || '',
    ad: m.ad || '',
    soyad: m.soyad || '',
    telefon: m.telefon || '',
    email: m.email || '',
    acilisBakiyesi: String(Number(m.acilisBakiyesi || 0)),
    bakiyeTipi: m.bakiyeTipi || 'borc',
  }
}

export default function MusterilerPage() {
  const router = useRouter()
const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [musteriler, setMusteriler] = useState<Musteri[]>([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const [excelYukleniyor, setExcelYukleniyor] = useState(false)
  const [excelMesaji, setExcelMesaji] = useState('')
  const [arama, setArama] = useState('')

  const [yeniMusteriAcik, setYeniMusteriAcik] = useState(false)
  const [detayMusteri, setDetayMusteri] = useState<Musteri | null>(null)
  const [tahsilatPopup, setTahsilatPopup] = useState<Musteri | null>(null)
  const [duzenlePopup, setDuzenlePopup] = useState<Musteri | null>(null)

  const [kaydediliyor, setKaydediliyor] = useState(false)
  const [tahsilatKaydediliyor, setTahsilatKaydediliyor] = useState(false)
  const [duzenleKaydediliyor, setDuzenleKaydediliyor] = useState(false)

  const [yeniMusteriForm, setYeniMusteriForm] = useState<FormState>(bosForm())
  const [duzenleForm, setDuzenleForm] = useState<FormState>(bosForm())

  const [tahsilatForm, setTahsilatForm] = useState({
    tarih: new Date().toISOString().slice(0, 10),
    tutar: '',
  })

  async function listeYukle() {
    setYukleniyor(true)
    try {
      const r = await fetch('/api/musteriler')
      const v = await r.json()
      setMusteriler(Array.isArray(v?.musteriler) ? v.musteriler : [])
    } finally {
      setYukleniyor(false)
    }
  }

  useEffect(() => {
    listeYukle()
  }, [])

  useEffect(() => {
    if (getQueryParam('yeni') === '1') {
      setYeniMusteriAcik(true)
    }
  }, [])

  const ciroSiralamasi = useMemo(() => {
    const sirali = [...musteriler]
      .map(m => ({
        id: m.id,
        ciro: m.isler
          .filter(i => i.durum === 'onaylandi')
          .reduce((a, i) => a + Number(i.satisFiyati || 0), 0)
      }))
      .sort((a, b) => b.ciro - a.ciro)

    const map = new Map<string, number>()
    sirali.forEach((item, index) => map.set(item.id, index + 1))
    return map
  }, [musteriler])

  const filtrelenmisMusteriler = useMemo(() => {
    const q = arama.trim().toLocaleLowerCase('tr-TR')
    if (!q) return musteriler

    return musteriler.filter(m => {
      const alan = [
        m.firmaAdi,
        m.ad,
        m.soyad,
        m.telefon,
        m.email
      ].join(' ').toLocaleLowerCase('tr-TR')

      return alan.includes(q)
    })
  }, [arama, musteriler])

  const genelOzet = useMemo(() => {
    let toplamCiro = 0
    let toplamTahsilat = 0
    let toplamTeklif = 0
    let acikBakiye = 0

    musteriler.forEach(m => {
      const onayliCiro = m.isler
        .filter(i => i.durum === 'onaylandi')
        .reduce((a, i) => a + Number(i.satisFiyati || 0), 0)

      const tahsilat = m.tahsilatlar.reduce((a, t) => a + Number(t.tutar || 0), 0)
      const acilis = Number(m.acilisBakiyesi || 0) * (m.bakiyeTipi === 'alacak' ? -1 : 1)

      toplamCiro += onayliCiro
      toplamTahsilat += tahsilat
      toplamTeklif += m.isler.length
      acikBakiye += (onayliCiro - tahsilat) + acilis
    })

    return {
      musteri: musteriler.length,
      teklif: toplamTeklif,
      ciro: toplamCiro,
      tahsilat: toplamTahsilat,
      acikBakiye,
    }
  }, [musteriler])

  async function yeniMusteriKaydet(e: React.FormEvent) {
    e.preventDefault()
    setKaydediliyor(true)
    try {
      await fetch('/api/musteriler', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...yeniMusteriForm,
          acilisBakiyesi: Number(yeniMusteriForm.acilisBakiyesi || 0)
        })
      })
      setYeniMusteriAcik(false)
      setYeniMusteriForm(bosForm())
      router.replace('/dashboard/musteriler')
      await listeYukle()
    } finally {
      setKaydediliyor(false)
    }
  }

  async function musteriGuncelle(e: React.FormEvent) {
    e.preventDefault()
    if (!duzenlePopup) return

    setDuzenleKaydediliyor(true)
    try {
      await fetch('/api/musteriler', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: duzenlePopup.id,
          ...duzenleForm,
          acilisBakiyesi: Number(duzenleForm.acilisBakiyesi || 0)
        })
      })
      setDuzenlePopup(null)
      setDuzenleForm(bosForm())
      await listeYukle()
    } finally {
      setDuzenleKaydediliyor(false)
    }
  }

  async function tahsilatKaydet(e: React.FormEvent) {
    e.preventDefault()
    if (!tahsilatPopup) return
    setTahsilatKaydediliyor(true)
    try {
      await fetch('/api/tahsilat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          musteriId: tahsilatPopup.id,
          tarih: tahsilatForm.tarih,
          tutar: Number(tahsilatForm.tutar || 0)
        })
      })
      setTahsilatPopup(null)
      setTahsilatForm({
        tarih: new Date().toISOString().slice(0, 10),
        tutar: '',
      })
      await listeYukle()
    } finally {
      setTahsilatKaydediliyor(false)
    }
  }

  async function excelSecildi(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setExcelYukleniyor(true)
    setExcelMesaji('')

    try {
      const formData = new FormData()
      formData.append('file', file)

      const r = await fetch('/api/musteriler/import', {
        method: 'POST',
        body: formData
      })

      const v = await r.json()

      if (!r.ok) {
        const detay = Array.isArray(v.hatalar) && v.hatalar.length > 0
          ? `\n\n${v.hatalar.join('\n')}`
          : ''
        setExcelMesaji(v.hata ? `${v.hata}${detay}` : 'İçe aktarma başarısız.')
      } else {
        const detay = Array.isArray(v.hatalar) && v.hatalar.length > 0
          ? `\n\nUyarılar:\n${v.hatalar.join('\n')}`
          : ''
        setExcelMesaji(`İçe aktarma tamamlandı. Eklenen: ${v.eklenen}, Atlanan: ${v.atlanan}${detay}`)
        await listeYukle()
      }
    } finally {
      setExcelYukleniyor(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  function teklifVer(m: Musteri) {
    const gosterilecekAd = m.firmaAdi || [m.ad, m.soyad].filter(Boolean).join(' ')
    router.push(`/dashboard/yeni-is?musteriId=${encodeURIComponent(m.id)}&musteriAdi=${encodeURIComponent(gosterilecekAd)}`)
  }

  function detayAc(m: Musteri) {
    setDetayMusteri(m)
  }

  function duzenleAc(m: Musteri) {
    setDuzenleForm(formDoldur(m))
    setDuzenlePopup(m)
  }

  function yeniMusteriModalAc() {
    setYeniMusteriAcik(true)
    router.replace('/dashboard/musteriler?yeni=1')
  }

  function yeniMusteriModalKapat() {
    setYeniMusteriAcik(false)
    router.replace('/dashboard/musteriler')
  }

  if (yukleniyor) {
    return <div className="p-8 text-slate-500">Yükleniyor...</div>
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl border border-slate-200 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
        <div className="relative bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.35),_transparent_35%),radial-gradient(circle_at_top_right,_rgba(124,58,237,0.35),_transparent_35%),linear-gradient(135deg,#0f172a_0%,#111827_45%,#1e1b4b_100%)] p-7 text-white">
          <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 h-32 w-32 rounded-full bg-cyan-400/10 blur-3xl" />

          <div className="relative z-10 grid gap-6 xl:grid-cols-[1.35fr_0.9fr]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-300">
                Premium CRM Görünümü
              </p>
              <h2 className="mt-3 max-w-2xl text-3xl font-bold tracking-tight lg:text-4xl">
                Müşterilerini yönet, ciroyu büyüt
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300">
                Tüm müşteriler, teklif geçmişi, tahsilatlar, dönüşüm performansı ve ciro sıralaması tek ekranda.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  onClick={yeniMusteriModalAc}
                  className="rounded-2xl border border-white/15 bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
                >
                  + Yeni Müşteri
                </button>

                <a
                  href="/api/musteriler/sablon"
                  className="rounded-2xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
                >
                  Excel Şablon İndir
                </a>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={excelYukleniyor}
                  className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-5 py-3 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-400/15 disabled:opacity-60"
                >
                  {excelYukleniyor ? 'Excel Yükleniyor...' : 'Excel Yükle'}
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx"
                  onChange={excelSecildi}
                  className="hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-300">Toplam Müşteri</p>
                <p className="mt-3 text-2xl font-bold">{genelOzet.musteri}</p>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-300">Toplam Teklif</p>
                <p className="mt-3 text-2xl font-bold">{genelOzet.teklif}</p>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-300">Onaylı Ciro</p>
                <p className="mt-3 text-2xl font-bold">{paraGoster(genelOzet.ciro)}</p>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-300">Tahsilat</p>
                <p className="mt-3 text-2xl font-bold">{paraGoster(genelOzet.tahsilat)}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {excelMesaji && (
        <div className="whitespace-pre-wrap rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
          {excelMesaji}
        </div>
      )}

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Müşteri Arama</p>
            <h3 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
              Müşteri portföyün
            </h3>
          </div>

          <div className="w-full max-w-xl">
            <input
              value={arama}
              onChange={e => setArama(e.target.value)}
              placeholder="Firma, kişi, telefon veya e-posta ara..."
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white"
            />
          </div>
        </div>
      </section>

      <section className="grid gap-4">
        {filtrelenmisMusteriler.map((m) => {
          const toplamTeklifAdeti = m.isler.length
          const onaylananlar = m.isler.filter(i => i.durum === 'onaylandi')
          const bekleyenler = m.isler.filter(i => i.durum === 'teklif_verildi')
          const kaybedilenler = m.isler.filter(i => i.durum === 'kaybedildi')

          const onaylananToplam = onaylananlar.reduce((a, i) => a + Number(i.satisFiyati || 0), 0)
          const toplamTahsilat = m.tahsilatlar.reduce((a, t) => a + Number(t.tutar || 0), 0)

          const acilisEtkisi = Number(m.acilisBakiyesi || 0) * (m.bakiyeTipi === 'alacak' ? -1 : 1)
          const netBakiye = (onaylananToplam - toplamTahsilat) + acilisEtkisi
          const bakiyeDurumu = netBakiye > 0 ? 'Borçlu' : netBakiye < 0 ? 'Alacaklı' : 'Kapalı'

          const onaylananAdet = onaylananlar.length
          const kaybedilenAdet = kaybedilenler.length
          const bekleyenAdet = bekleyenler.length

          const onayYuzdesi = toplamTeklifAdeti > 0 ? (onaylananAdet / toplamTeklifAdeti) * 100 : 0
          const kayipYuzdesi = toplamTeklifAdeti > 0 ? (kaybedilenAdet / toplamTeklifAdeti) * 100 : 0
          const sira = ciroSiralamasi.get(m.id) || 0

          return (
            <div
              key={m.id}
              className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_10px_30px_rgba(15,23,42,0.06)] transition hover:shadow-[0_18px_40px_rgba(15,23,42,0.08)]"
            >
              <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-2xl font-bold tracking-tight text-slate-900">
                      {tamAd(m)}
                    </h3>

                    <span className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
                      #{sira} ciro sırası
                    </span>

                    <span className={cls(
                      'rounded-full px-3 py-1 text-xs font-semibold',
                      m.bakiyeTipi === 'alacak'
                        ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                        : 'border border-rose-200 bg-rose-50 text-rose-700'
                    )}>
                      Açılış: {acilisBakiyeYazisi(m)}
                    </span>
                  </div>

                  <p className="mt-2 text-sm text-slate-500">
                    {m.telefon || 'Telefon yok'} {m.email ? `• ${m.email}` : ''}
                  </p>

                  <div className="mt-5 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
                    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-500">Satış Pipeline</p>
                          <h4 className="mt-1 text-xl font-bold text-slate-900">Teklif performansı</h4>
                        </div>
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 border border-slate-200">
                          {yuzdeGoster(onayYuzdesi)} onay
                        </span>
                      </div>

                      <div className="mt-5 grid grid-cols-4 gap-3">
                        <div className="rounded-2xl bg-white p-4">
                          <p className="text-xs uppercase tracking-[0.12em] text-slate-400">Toplam</p>
                          <p className="mt-2 text-2xl font-bold text-slate-900">{toplamTeklifAdeti}</p>
                        </div>

                        <div className="rounded-2xl bg-emerald-50 p-4">
                          <p className="text-xs uppercase tracking-[0.12em] text-emerald-600">Onay</p>
                          <p className="mt-2 text-2xl font-bold text-emerald-700">{onaylananAdet}</p>
                          <p className="mt-1 text-xs text-emerald-700/80">{yuzdeGoster(onayYuzdesi)}</p>
                        </div>

                        <div className="rounded-2xl bg-amber-50 p-4">
                          <p className="text-xs uppercase tracking-[0.12em] text-amber-600">Bekleyen</p>
                          <p className="mt-2 text-2xl font-bold text-amber-700">{bekleyenAdet}</p>
                        </div>

                        <div className="rounded-2xl bg-rose-50 p-4">
                          <p className="text-xs uppercase tracking-[0.12em] text-rose-600">Kayıp</p>
                          <p className="mt-2 text-2xl font-bold text-rose-700">{kaybedilenAdet}</p>
                          <p className="mt-1 text-xs text-rose-700/80">{yuzdeGoster(kayipYuzdesi)}</p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-500">Finans</p>
                          <h4 className="mt-1 text-xl font-bold text-slate-900">Müşteri bakiyesi</h4>
                        </div>
                      </div>

                      <div className="mt-5 grid grid-cols-2 gap-3">
                        <div className="rounded-2xl bg-blue-50 p-4">
                          <p className="text-xs uppercase tracking-[0.12em] text-blue-600">Onaylı Ciro</p>
                          <p className="mt-2 text-lg font-bold text-blue-700">{paraGoster(onaylananToplam)}</p>
                        </div>

                        <div className="rounded-2xl bg-cyan-50 p-4">
                          <p className="text-xs uppercase tracking-[0.12em] text-cyan-600">Tahsilat</p>
                          <p className="mt-2 text-lg font-bold text-cyan-700">{paraGoster(toplamTahsilat)}</p>
                        </div>

                        <div className={cls(
                          'rounded-2xl p-4 col-span-2',
                          netBakiye > 0
                            ? 'bg-rose-50'
                            : netBakiye < 0
                            ? 'bg-emerald-50'
                            : 'bg-white'
                        )}>
                          <p className={cls(
                            'text-xs font-semibold uppercase tracking-[0.12em]',
                            netBakiye > 0
                              ? 'text-rose-600'
                              : netBakiye < 0
                              ? 'text-emerald-600'
                              : 'text-slate-500'
                          )}>
                            Açık Bakiye
                          </p>
                          <p className={cls(
                            'mt-2 text-2xl font-bold',
                            netBakiye > 0
                              ? 'text-rose-700'
                              : netBakiye < 0
                              ? 'text-emerald-700'
                              : 'text-slate-700'
                          )}>
                            {paraGoster(Math.abs(netBakiye))}
                          </p>
                          <p className={cls(
                            'mt-1 text-sm font-semibold',
                            netBakiye > 0
                              ? 'text-rose-700/80'
                              : netBakiye < 0
                              ? 'text-emerald-700/80'
                              : 'text-slate-500'
                          )}>
                            {bakiyeDurumu}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex w-full shrink-0 flex-wrap gap-3 xl:w-[200px] xl:flex-col">
                  <button
                    onClick={() => teklifVer(m)}
                    className="rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 px-4 py-3 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(59,130,246,0.22)] transition hover:scale-[1.01]"
                  >
                    Teklif Ver
                  </button>

                  <button
                    onClick={() => setTahsilatPopup(m)}
                    className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
                  >
                    Tahsilat Gir
                  </button>

                  <button
                    onClick={() => duzenleAc(m)}
                    className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700 transition hover:bg-amber-100"
                  >
                    Düzenle
                  </button>

                  <button
                    onClick={() => detayAc(m)}
                    className="rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
                  >
                    Detay
                  </button>
                </div>
              </div>
            </div>
          )
        })}

        {filtrelenmisMusteriler.length === 0 && (
          <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center text-slate-500 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
            Aramaya uygun müşteri bulunamadı.
          </div>
        )}
      </section>

      {yeniMusteriAcik && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm" onClick={yeniMusteriModalKapat}>
          <div className="w-full max-w-2xl rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_30px_80px_rgba(15,23,42,0.22)]" onClick={e => e.stopPropagation()}>
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-500">Yeni Müşteri</p>
                <h3 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Müşteri kartı oluştur</h3>
              </div>
              <button onClick={yeniMusteriModalKapat} className="rounded-2xl border border-slate-200 px-3 py-2 text-slate-400 transition hover:bg-slate-50 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={yeniMusteriKaydet} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <input value={yeniMusteriForm.firmaAdi} onChange={e => setYeniMusteriForm(prev => ({...prev, firmaAdi:e.target.value}))} placeholder="Firma Adı" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:bg-white" />
                <input value={yeniMusteriForm.ad} onChange={e => setYeniMusteriForm(prev => ({...prev, ad:e.target.value}))} placeholder="Ad" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:bg-white" />
                <input value={yeniMusteriForm.soyad} onChange={e => setYeniMusteriForm(prev => ({...prev, soyad:e.target.value}))} placeholder="Soyad" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:bg-white" />
                <input value={yeniMusteriForm.telefon} onChange={e => setYeniMusteriForm(prev => ({...prev, telefon:e.target.value}))} placeholder="Telefon" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:bg-white" />
                <input value={yeniMusteriForm.email} onChange={e => setYeniMusteriForm(prev => ({...prev, email:e.target.value}))} placeholder="Mail" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:bg-white md:col-span-2" />
                <input type="number" step="0.01" value={yeniMusteriForm.acilisBakiyesi} onChange={e => setYeniMusteriForm(prev => ({...prev, acilisBakiyesi:e.target.value}))} placeholder="Açılış Bakiyesi" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:bg-white" />
                <select value={yeniMusteriForm.bakiyeTipi} onChange={e => setYeniMusteriForm(prev => ({...prev, bakiyeTipi:e.target.value}))} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:bg-white">
                  <option value="borc">Borç</option>
                  <option value="alacak">Alacak</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={yeniMusteriModalKapat} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                  İptal
                </button>
                <button type="submit" disabled={kaydediliyor} className="rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 px-4 py-3 text-sm font-semibold text-white transition hover:scale-[1.01] disabled:opacity-70">
                  {kaydediliyor ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {duzenlePopup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm" onClick={() => setDuzenlePopup(null)}>
          <div className="w-full max-w-2xl rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_30px_80px_rgba(15,23,42,0.22)]" onClick={e => e.stopPropagation()}>
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-500">Müşteri Düzenle</p>
                <h3 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{tamAd(duzenlePopup)}</h3>
              </div>
              <button onClick={() => setDuzenlePopup(null)} className="rounded-2xl border border-slate-200 px-3 py-2 text-slate-400 transition hover:bg-slate-50 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={musteriGuncelle} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <input value={duzenleForm.firmaAdi} onChange={e => setDuzenleForm(prev => ({...prev, firmaAdi:e.target.value}))} placeholder="Firma Adı" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:bg-white" />
                <input value={duzenleForm.ad} onChange={e => setDuzenleForm(prev => ({...prev, ad:e.target.value}))} placeholder="Ad" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:bg-white" />
                <input value={duzenleForm.soyad} onChange={e => setDuzenleForm(prev => ({...prev, soyad:e.target.value}))} placeholder="Soyad" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:bg-white" />
                <input value={duzenleForm.telefon} onChange={e => setDuzenleForm(prev => ({...prev, telefon:e.target.value}))} placeholder="Telefon" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:bg-white" />
                <input value={duzenleForm.email} onChange={e => setDuzenleForm(prev => ({...prev, email:e.target.value}))} placeholder="Mail" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:bg-white md:col-span-2" />
                <input type="number" step="0.01" value={duzenleForm.acilisBakiyesi} onChange={e => setDuzenleForm(prev => ({...prev, acilisBakiyesi:e.target.value}))} placeholder="Açılış Bakiyesi" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:bg-white" />
                <select value={duzenleForm.bakiyeTipi} onChange={e => setDuzenleForm(prev => ({...prev, bakiyeTipi:e.target.value}))} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:bg-white">
                  <option value="borc">Borç</option>
                  <option value="alacak">Alacak</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setDuzenlePopup(null)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                  İptal
                </button>
                <button type="submit" disabled={duzenleKaydediliyor} className="rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-3 text-sm font-semibold text-white transition hover:scale-[1.01] disabled:opacity-70">
                  {duzenleKaydediliyor ? 'Kaydediliyor...' : 'Güncelle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {detayMusteri && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm" onClick={() => setDetayMusteri(null)}>
          <div className="w-full max-w-5xl rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_30px_80px_rgba(15,23,42,0.22)]" onClick={e => e.stopPropagation()}>
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-500">Müşteri Detayı</p>
                <h3 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{tamAd(detayMusteri)}</h3>
              </div>
              <button onClick={() => setDetayMusteri(null)} className="rounded-2xl border border-slate-200 px-3 py-2 text-slate-400 transition hover:bg-slate-50 hover:text-slate-600">✕</button>
            </div>

            {(() => {
              const toplamTeklifTutari = detayMusteri.isler.reduce((a, i) => a + Number(i.satisFiyati || 0), 0)
              const onaylananlar = detayMusteri.isler.filter(i => i.durum === 'onaylandi')
              const bekleyenler = detayMusteri.isler.filter(i => i.durum === 'teklif_verildi')
              const kaybedilenler = detayMusteri.isler.filter(i => i.durum === 'kaybedildi')

              const onaylananToplam = onaylananlar.reduce((a, i) => a + Number(i.satisFiyati || 0), 0)
              const bekleyenToplam = bekleyenler.reduce((a, i) => a + Number(i.satisFiyati || 0), 0)
              const kaybedilenToplam = kaybedilenler.reduce((a, i) => a + Number(i.satisFiyati || 0), 0)

              const toplamTeklifAdeti = detayMusteri.isler.length
              const onaylananAdet = onaylananlar.length
              const onayYuzdesi = toplamTeklifAdeti > 0 ? (onaylananAdet / toplamTeklifAdeti) * 100 : 0
              const toplamTahsilat = detayMusteri.tahsilatlar.reduce((a, t) => a + Number(t.tutar || 0), 0)
              const sira = ciroSiralamasi.get(detayMusteri.id) || '-'

              return (
                <>
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                    <div className="rounded-2xl bg-slate-50 p-4">Açılış Bakiyesi: <strong>{acilisBakiyeYazisi(detayMusteri)}</strong></div>
                    <div className="rounded-2xl bg-blue-50 p-4">Verilen Teklif Toplamı: <strong>{paraGoster(toplamTeklifTutari)}</strong></div>
                    <div className="rounded-2xl bg-emerald-50 p-4">Onaylanan Toplam: <strong>{paraGoster(onaylananToplam)}</strong></div>
                    <div className="rounded-2xl bg-amber-50 p-4">Bekleyen Toplam: <strong>{paraGoster(bekleyenToplam)}</strong></div>
                    <div className="rounded-2xl bg-rose-50 p-4">Kaybedilen Toplam: <strong>{paraGoster(kaybedilenToplam)}</strong></div>
                    <div className="rounded-2xl bg-slate-50 p-4">Toplam Teklif Adeti: <strong>{toplamTeklifAdeti}</strong></div>
                    <div className="rounded-2xl bg-emerald-50 p-4">Onaylanan Adet: <strong>{onaylananAdet}</strong></div>
                    <div className="rounded-2xl bg-violet-50 p-4">Onaylama Yüzdesi: <strong>{yuzdeGoster(onayYuzdesi)}</strong></div>
                    <div className="rounded-2xl bg-indigo-50 p-4">Ciro Sırası: <strong>#{sira}</strong></div>
                    <div className="rounded-2xl bg-cyan-50 p-4">Toplam Tahsilat: <strong>{paraGoster(toplamTahsilat)}</strong></div>
                  </div>

                  <div className="mt-6 flex flex-wrap gap-3">
                    <button onClick={() => teklifVer(detayMusteri)} className="rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 px-4 py-3 text-sm font-semibold text-white">Teklif Ver</button>
                    <button onClick={() => { setTahsilatPopup(detayMusteri); setDetayMusteri(null) }} className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">Tahsilat Gir</button>
                    <button onClick={() => { duzenleAc(detayMusteri); setDetayMusteri(null) }} className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">Müşteriyi Düzenle</button>
                  </div>
                </>
              )
            })()}
          </div>
        </div>
      )}

      {tahsilatPopup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm" onClick={() => setTahsilatPopup(null)}>
          <div className="w-full max-w-lg rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_30px_80px_rgba(15,23,42,0.22)]" onClick={e => e.stopPropagation()}>
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-500">Tahsilat Gir</p>
                <h3 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{tamAd(tahsilatPopup)}</h3>
              </div>
              <button onClick={() => setTahsilatPopup(null)} className="rounded-2xl border border-slate-200 px-3 py-2 text-slate-400 transition hover:bg-slate-50 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={tahsilatKaydet} className="space-y-4">
              <input type="date" value={tahsilatForm.tarih} onChange={e => setTahsilatForm(prev => ({...prev, tarih:e.target.value}))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:bg-white" />
              <input type="number" step="0.01" value={tahsilatForm.tutar} onChange={e => setTahsilatForm(prev => ({...prev, tutar:e.target.value}))} placeholder="Tahsilat tutarı" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:bg-white" />

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setTahsilatPopup(null)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                  İptal
                </button>
                <button type="submit" disabled={tahsilatKaydediliyor} className="rounded-2xl bg-gradient-to-r from-emerald-600 to-green-600 px-4 py-3 text-sm font-semibold text-white transition hover:scale-[1.01] disabled:opacity-70">
                  {tahsilatKaydediliyor ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
