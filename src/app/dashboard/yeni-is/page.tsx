'use client'

import { useState, useEffect, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { paraGoster } from '@/lib/format'
import { teklifPdfIndir } from '@/lib/teklif-pdf'
import { PlakaPlanlayiciV2 } from '@/components/plaka-planlayici/PlakaPlanlayiciV2'
import type { PlakaHesapSonucu } from '@/components/plaka-planlayici/PlakaPlanlayiciMini'

type Makine = { id: string; makineAdi: string; dakikalikMaliyet: number }
type Operasyon = { operasyonTipi: string; makineId: string; adet: number; birimDakika: number; toplamDakika: number }
type MusteriSecim = { id: string; firmaAdi?: string; ad?: string; soyad?: string }

type AIPlakaAktarSonucu = {
  toplamPlaka: number
  toplamMaliyet: number
  ortalamaPlakaFiyati: number
  fireOrani: number
  fireMaliyeti: number
  tezgahMtul: number
  tezgahArasiMtul: number
  adaTezgahMtul: number
  plakaGenislik: number
  plakaYukseklik: number
}


const OPERASYONLAR = [
  { key: 'ocak_kesim', label: 'Ocak Kesim', varsayilanDakika: 25 },
  { key: 'eviye_kesim', label: 'Eviye Kesim', varsayilanDakika: 20 },
  { key: 'kirk_bes_kesim', label: '45 Kesim', varsayilanDakika: 3 },
  { key: 'pah', label: 'Pah', varsayilanDakika: 2 },
  { key: 'boat_deligi', label: 'Boat Deliği', varsayilanDakika: 10 },
  { key: 'dogalgaz_deligi', label: 'Doğalgaz Deliği', varsayilanDakika: 5 },
] as const

const STEPS = [
  { id: 1, title: 'Müşteri', desc: 'Teklifin sahibi' },
  { id: 2, title: 'Ürün / Plaka', desc: 'Malzeme ve plaka' },
  { id: 3, title: 'Üretim', desc: 'Metraj ve işçilik' },
  { id: 4, title: 'Operasyon / Fiyat', desc: 'Detay ve kar' },
  { id: 5, title: 'Sonuç', desc: 'Hesap ve PDF' },
] as const

function normalizeDecimalInput(value: string) {
  return value.replace(/,/g, '.')
}

function parseNum(value: string | number | null | undefined) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  if (typeof value !== 'string') return 0
  const cleaned = normalizeDecimalInput(value).replace(/[^0-9.\-]/g, '')
  const firstDot = cleaned.indexOf('.')
  const normalized = firstDot >= 0
    ? cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, '')
    : cleaned
  const n = Number(normalized)
  return Number.isFinite(n) ? n : 0
}

function cls(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

function SectionCard({
  title,
  desc,
  children,
}: {
  title: string
  desc?: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
      <div className="mb-5">
        <h3 className="text-xl font-bold tracking-tight text-slate-900">{title}</h3>
        {desc && <p className="mt-1 text-sm text-slate-500">{desc}</p>}
      </div>
      {children}
    </div>
  )
}

function Field({
  label,
  children,
  hint,
}: {
  label: string
  children: React.ReactNode
  hint?: string
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-700">{label}</label>
      {children}
      {hint && <p className="mt-2 text-xs text-slate-500">{hint}</p>}
    </div>
  )
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const isNumeric = props.type === 'number'
  const actualType = isNumeric ? 'text' : props.type

  return (
    <input
      {...props}
      type={actualType}
      inputMode={isNumeric ? 'decimal' : props.inputMode}
      onWheel={(e) => {
        ;(e.currentTarget as HTMLInputElement).blur()
        props.onWheel?.(e)
      }}
      className={cls(
        'w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white',
        props.className
      )}
    />
  )
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cls(
        'w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white',
        props.className
      )}
    />
  )
}

function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cls(
        'w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white',
        props.className
      )}
    />
  )
}

export default function YeniIs() {
  const router = useRouter()
  const [step, setStep] = useState(1)

  const [makineler, setMakineler] = useState<Makine[]>([])
  const [musteriler, setMusteriler] = useState<MusteriSecim[]>([])
  const [kaydediliyor, setKaydediliyor] = useState(false)
  const [pdfYukleniyor, setPdfYukleniyor] = useState(false)
  const [pdfModalAcik, setPdfModalAcik] = useState(false)

  const [pdfForm, setPdfForm] = useState({
    odemeKosullari: 'Sipariş onayı sonrası ödeme planı ayrıca mutabık kalınacaktır.',
    teslimTarihi: 'Termin, ölçü ve kesin sipariş onayı sonrası netleşecektir.',
  })

  const [plakaBasinaOrtMtul, setPlakaBasinaOrtMtul] = useState('3.20')
  const [atolyeBilgi, setAtolyeBilgi] = useState<{
    adi: string
    adres: string
    telefon: string
    email: string
    sehir: string
    ilce: string
    logoUrl: string
    kdvOrani: number
  }>({ adi: '', adres: '', telefon: '', email: '', sehir: '', ilce: '', logoUrl: '', kdvOrani: 20 })

  const [aiAcik, setAiAcik] = useState(false)
  const [plakaHesap, setPlakaHesap] = useState<PlakaHesapSonucu | null>(null)

  // AI PLAKA SONUCUNU YENI ISE AKTAR
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const raw = localStorage.getItem('aiPlakaSonuc');
    if (!raw) return;

    try {
      const data = JSON.parse(raw);

      setForm(prev => ({
        ...prev,
        manuelPlakaSayisi: data.toplamPlaka ? String(data.toplamPlaka) : prev.manuelPlakaSayisi,
        plakaFiyatiEuro: data.ortalamaPlakaFiyati ? String(Number(data.ortalamaPlakaFiyati).toFixed(2)) : prev.plakaFiyatiEuro,
        metrajMtul: data.tezgahMtul ? String(Number(data.tezgahMtul).toFixed(2)) : prev.metrajMtul,
        tezgahArasiMtul: data.tezgahArasiMtul ? String(Number(data.tezgahArasiMtul).toFixed(2)) : prev.tezgahArasiMtul,
        adaTezgahMtul: data.adaTezgahMtul ? String(Number(data.adaTezgahMtul).toFixed(2)) : prev.adaTezgahMtul,
        plakaGenislikCm: data.plakaGenislik ? String(data.plakaGenislik) : prev.plakaGenislikCm,
        plakaUzunlukCm: data.plakaYukseklik ? String(data.plakaYukseklik) : prev.plakaUzunlukCm,
      }));

      setPlakaHesap({
        fireOrani: Number(data.fireOrani || 0),
        toplamPlakaAdet: Number(data.toplamPlaka || 0),
        plakaEni: Number(data.plakaGenislik || 0),
        plakaBoy: Number(data.plakaYukseklik || 0),
        tezgahBoy: Number(data.tezgahMtul || 0) * 100,
        tezgahAdet: 1,
        tezgahArasiBoy: Number(data.tezgahArasiMtul || 0) * 100,
        tezgahArasiAdet: 1,
        adaTezgahBoy: Number(data.adaTezgahMtul || 0) * 100,
        adaTezgahAdet: 1,
      });

      localStorage.removeItem('aiPlakaSonuc');
    } catch {}
  }, []);


  const [fiyatModalAcik, setFiyatModalAcik] = useState(false)

  const [basariModal, setBasariModal] = useState(false)

const [sonuc, setSonuc] = useState<{
    toplamSureDakika: number
    iscilikMaliyeti: number
    malzemeMaliyeti: number
    toplamMaliyet: number
    satisFiyati: number
    mtulSatisFiyati: number
    toplamMetraj: number
    kdvTutari: number
    kdvDahilFiyat: number
    teklifNo: string
    teklifGecerlilikTarihi: string
    kullanilanPlakaSayisi: number
  } | null>(null)

  const [form, setForm] = useState({
    musteriId: '',
    musteriAdi: '',
    urunAdi: '',
    malzemeTipi: 'Porselen',
    musteriTipi: 'Ev sahibi',
    plakaFiyatiEuro: '',
    metrajMtul: '',
    birMtulDakika: '',
    tezgahArasiMtul: '',
    tezgahArasiDakika: '',
    adaTezgahMtul: '',
    adaTezgahDakika: '',
    kullanilanKur: '',
    karYuzdesi: '30',
    notlar: '',
    plakaGenislikCm: '',
    plakaUzunlukCm: '',
    plakadanAlinanMtul: '',
    isTarihi: '',
    manuelPlakaSayisi: '',

    ozelIscilik1Mtul: '',
    ozelIscilik1Dakika: '',
    ozelIscilik1Aciklama: '',
    ozelIscilik2Mtul: '',
    ozelIscilik2Dakika: '',
    ozelIscilik2Aciklama: '',
    ozelIscilik3Mtul: '',
    ozelIscilik3Dakika: '',
    ozelIscilik3Aciklama: '',
  })

  const [seciliOperasyonlar, setSeciliOperasyonlar] = useState<{ [key: string]: boolean }>({})
  const [operasyonDetay, setOperasyonDetay] = useState<{ [key: string]: { makineId: string; adet: string; birimDakika: string } }>({})

  useEffect(() => {
    fetch('/api/makineler')
      .then(r => r.json())
      .then(v => {
        if (v.makineler) setMakineler(v.makineler)
      })

    fetch('/api/musteriler')
      .then(r => r.json())
      .then(v => {
        if (Array.isArray(v?.musteriler)) setMusteriler(v.musteriler)
      })

    fetch('/api/atolye')
      .then(r => r.json())
      .then(v => {
        if (v.atolye) {
          const a = v.atolye
          setPlakaBasinaOrtMtul(Number(a.plakaBasinaMtul).toFixed(2))
          setForm(prev => ({ ...prev, plakadanAlinanMtul: Number(a.plakaBasinaMtul).toFixed(2) }))
          setAtolyeBilgi({
            adi: a.atolyeAdi || '',
            adres: a.adres || '',
            telefon: a.telefon || '',
            email: a.email || '',
            sehir: a.sehir || '',
            ilce: a.ilce || '',
            logoUrl: a.logoUrl || '',
            kdvOrani: a.kdvOrani || 20,
          })
        }
      })
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const musteriId = params.get('musteriId') || ''
    const musteriAdi = params.get('musteriAdi') || ''

    if (musteriId || musteriAdi) {
      setForm(prev => ({
        ...prev,
        musteriId: musteriId || prev.musteriId,
        musteriAdi: musteriAdi || prev.musteriAdi,
      }))
    }
  }, [])

  function musteriGosterimAdi(m: MusteriSecim) {
    return m.firmaAdi || [m.ad, m.soyad].filter(Boolean).join(' ')
  }

  function musteriSecildi(deger: string) {
    const hedef = deger.trim().toLocaleLowerCase('tr-TR')
    const bulunan = musteriler.find((m) => musteriGosterimAdi(m).trim().toLocaleLowerCase('tr-TR') === hedef)
    setForm(prev => ({
      ...prev,
      musteriAdi: deger,
      musteriId: bulunan?.id || '',
    }))
  }

  function yeniMusteriSayfasinaGit() {
    const ad = encodeURIComponent(form.musteriAdi || '')
    router.push(`/dashboard/musteriler?yeni=1&musteriAdi=${ad}`)
  }

  function guncelle(alan: string, deger: string) {
    setForm(prev => ({ ...prev, [alan]: deger }))
  }

  function operasyonToggle(key: string) {
    setSeciliOperasyonlar(prev => ({ ...prev, [key]: !prev[key] }))
    if (!operasyonDetay[key]) {
      setOperasyonDetay(prev => ({
        ...prev,
        [key]: { makineId: makineler[0]?.id || '', adet: '', birimDakika: '' },
      }))
    }
  }

  function operasyonGuncelle(key: string, alan: string, deger: string) {
    setOperasyonDetay(prev => ({ ...prev, [key]: { ...prev[key], [alan]: deger } }))
  }

  const toplamMetrajHesap =
    (parseNum(form.metrajMtul) || 0) +
    (parseNum(form.tezgahArasiMtul) || 0) +
    (parseNum(form.adaTezgahMtul) || 0) +
    (parseNum(form.ozelIscilik1Mtul) || 0) +
    (parseNum(form.ozelIscilik2Mtul) || 0) +
    (parseNum(form.ozelIscilik3Mtul) || 0)

  const otomatikPlakaSayisi =
    (parseNum(form.plakadanAlinanMtul) || 0) > 0
      ? Math.ceil(toplamMetrajHesap / (parseNum(form.plakadanAlinanMtul) || 1))
      : 0

  const gosterilenPlakaSayisi =
    (parseNum(form.manuelPlakaSayisi) || 0) > 0
      ? parseNum(form.manuelPlakaSayisi)
      : otomatikPlakaSayisi

  const seciliOperasyonAdet = OPERASYONLAR.filter(op => seciliOperasyonlar[op.key]).length

  const stepTamamlandi = [
    !!form.musteriAdi && !!form.musteriTipi,
    !!form.urunAdi && !!form.malzemeTipi && !!form.plakaFiyatiEuro && !!form.kullanilanKur,
    toplamMetrajHesap > 0 && !!form.birMtulDakika,
    !!form.karYuzdesi,
    !!sonuc,
  ]

  function ileri() {
    setStep(prev => Math.min(prev + 1, 5))
  }

  function geri() {
    setStep(prev => Math.max(prev - 1, 1))
  }

  async function kaydet(e: FormEvent) {
    e.preventDefault()
    setKaydediliyor(true)
    setSonuc(null)

    let aktifMusteriId = form.musteriId || ''

    const yazilanMusteriAdi = (form.musteriAdi || '').trim()
    if (yazilanMusteriAdi && !aktifMusteriId) {
      const bulunan = musteriler.find((m) =>
        musteriGosterimAdi(m).trim().toLocaleLowerCase('tr-TR') === yazilanMusteriAdi.toLocaleLowerCase('tr-TR')
      )

      if (bulunan?.id) {
        aktifMusteriId = bulunan.id
      } else {
        try {
          const musteriYanit = await fetch('/api/musteriler', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              firmaAdi: yazilanMusteriAdi,
              ad: '',
              soyad: '',
              telefon: '',
              email: '',
              acilisBakiyesi: 0,
              bakiyeTipi: 'borc',
            }),
          })

          const musteriVeri = await musteriYanit.json()
          if (musteriYanit.ok && musteriVeri?.musteri?.id) {
            aktifMusteriId = musteriVeri.musteri.id
            setMusteriler(prev => {
              const varMi = prev.some((m) => m.id === musteriVeri.musteri.id)
              return varMi ? prev : [...prev, musteriVeri.musteri]
            })
            setForm(prev => ({ ...prev, musteriId: musteriVeri.musteri.id }))
          }
        } catch {}
      }
    }

    const operasyonlar: Operasyon[] = OPERASYONLAR
      .filter(op => seciliOperasyonlar[op.key])
      .map(op => {
        const detay = operasyonDetay[op.key]
        const adet = parseInt(detay?.adet) || 1
        const birimDakika = parseNum(detay?.birimDakika) || op.varsayilanDakika
        return {
          operasyonTipi: op.key,
          makineId: detay?.makineId || '',
          adet,
          birimDakika,
          toplamDakika: adet * birimDakika,
        }
      })

    try {
      const yanit = await fetch('/api/isler', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          musteriId: aktifMusteriId || '',
          plakaFiyatiEuro: parseNum(form.plakaFiyatiEuro) || 0,
          metrajMtul: parseNum(form.metrajMtul) || 0,
          birMtulDakika: parseNum(form.birMtulDakika) || 0,
          tezgahArasiMtul: parseNum(form.tezgahArasiMtul) || 0,
          tezgahArasiDakika: parseNum(form.tezgahArasiDakika) || 0,
          adaTezgahMtul: parseNum(form.adaTezgahMtul) || 0,
          adaTezgahDakika: parseNum(form.adaTezgahDakika) || 0,
          kullanilanKur: parseNum(form.kullanilanKur) || 0,
          karYuzdesi: parseNum(form.karYuzdesi) || 0,
          plakaGenislikCm: parseNum(form.plakaGenislikCm) || 0,
          plakaUzunlukCm: parseNum(form.plakaUzunlukCm) || 0,
          plakadanAlinanMtul: parseNum(form.plakadanAlinanMtul) || 0,
          isTarihi: form.isTarihi || null,
          manuelPlakaSayisi: parseNum(form.manuelPlakaSayisi) || 0,

          ozelIscilik1Mtul: parseNum(form.ozelIscilik1Mtul) || 0,
          ozelIscilik1Dakika: parseNum(form.ozelIscilik1Dakika) || 0,
          ozelIscilik2Mtul: parseNum(form.ozelIscilik2Mtul) || 0,
          ozelIscilik2Dakika: parseNum(form.ozelIscilik2Dakika) || 0,
          ozelIscilik3Mtul: parseNum(form.ozelIscilik3Mtul) || 0,
          ozelIscilik3Dakika: parseNum(form.ozelIscilik3Dakika) || 0,

          operasyonlar,
        }),
      })

      const veri = await yanit.json()
      if (yanit.ok) {
        setSonuc(veri)
        setStep(5)
        setBasariModal(true)
      }
    } finally {
      setKaydediliyor(false)
    }
  }

  function whatsappGonder() {
  if (!sonuc) return;

  const link = `${window.location.origin}/teklif/${sonuc.teklifNo}`
  const mesaj = encodeURIComponent(
    `Merhaba, teklifinizi aşağıdaki linkten inceleyip onaylayabilirsiniz:\n\n${link}`
  )

  window.open(`https://wa.me/?text=${mesaj}`, '_blank')
}

function linkKopyala() {
  if (!sonuc) return;

  const link = `${window.location.origin}/teklif/${sonuc.teklifNo}`
  navigator.clipboard.writeText(link)
  alert("Teklif linki kopyalandı")
}

function pdfModalAc() {
    if (!sonuc) return
    setPdfModalAcik(true)
  }

  function pdfModalKapat() {
    if (pdfYukleniyor) return
    setPdfModalAcik(false)
  }

  async function pdfOlusturOnayla() {
    if (!sonuc) return

    setPdfYukleniyor(true)
    try {
      await teklifPdfIndir({
        teklifNo: sonuc.teklifNo,
        tarih: new Date().toLocaleDateString('tr-TR'),
        gecerlilikTarihi: new Date(sonuc.teklifGecerlilikTarihi).toLocaleDateString('tr-TR'),
        firma: atolyeBilgi,
        musteri: { adi: form.musteriAdi, tipi: form.musteriTipi },
        odemeKosullari: pdfForm.odemeKosullari,
        teslimTarihi: pdfForm.teslimTarihi,
        is: {
          urunAdi: form.urunAdi,
          malzemeTipi: form.malzemeTipi,
          metrajMtul: parseNum(form.metrajMtul) || 0,
          tezgahArasiMtul: parseNum(form.tezgahArasiMtul) || 0,
          adaTezgahMtul: parseNum(form.adaTezgahMtul) || 0,
          toplamMetraj: sonuc.toplamMetraj,
          plakaGenislikCm: parseNum(form.plakaGenislikCm) || 0,
          plakaUzunlukCm: parseNum(form.plakaUzunlukCm) || 0,
          plakadanAlinanMtul: parseNum(form.plakadanAlinanMtul) || 0,
          kullanilanPlakaSayisi: sonuc.kullanilanPlakaSayisi,
          plakaFiyatiEuro: parseNum(form.plakaFiyatiEuro) || 0,
          kullanilanKur: parseNum(form.kullanilanKur) || 0,
          toplamSureDakika: sonuc.toplamSureDakika,
          iscilikMaliyeti: sonuc.iscilikMaliyeti,
          malzemeMaliyeti: sonuc.malzemeMaliyeti,
          toplamMaliyet: sonuc.toplamMaliyet,
          karYuzdesi: parseNum(form.karYuzdesi) || 0,
          satisFiyati: sonuc.satisFiyati,
          kdvOrani: atolyeBilgi.kdvOrani,
          kdvTutari: sonuc.kdvTutari,
          kdvDahilFiyat: sonuc.kdvDahilFiyat,
          mtulSatisFiyati: sonuc.mtulSatisFiyati,
          ozelIscilik1Mtul: parseNum(form.ozelIscilik1Mtul) || 0,
          ozelIscilik1Dakika: parseNum(form.ozelIscilik1Dakika) || 0,
          ozelIscilik1Aciklama: form.ozelIscilik1Aciklama,
          ozelIscilik2Mtul: parseNum(form.ozelIscilik2Mtul) || 0,
          ozelIscilik2Dakika: parseNum(form.ozelIscilik2Dakika) || 0,
          ozelIscilik2Aciklama: form.ozelIscilik2Aciklama,
          ozelIscilik3Mtul: parseNum(form.ozelIscilik3Mtul) || 0,
          ozelIscilik3Dakika: parseNum(form.ozelIscilik3Dakika) || 0,
          ozelIscilik3Aciklama: form.ozelIscilik3Aciklama,
          notlar: form.notlar,
        },
      })
      setPdfModalAcik(false)
    } finally {
      setPdfYukleniyor(false)
    }
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
                Premium Teklif Sihirbazı
              </p>
              <h2 className="mt-3 max-w-2xl text-3xl font-bold tracking-tight lg:text-4xl">
                Yeni işi adım adım oluştur, fiyatı profesyonelce çıkar.
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300">
                Müşteri, plaka, üretim, operasyon ve fiyat kararlarını tek akışta topla. En sonda sonucu gör ve PDF teklifi indir.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <span className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium">
                  Adım {step} / {STEPS.length}
                </span>
                <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-sm font-medium text-emerald-200">
                  Toplam mtül: {toplamMetrajHesap.toFixed(2)}
                </span>
                <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-4 py-2 text-sm font-medium text-amber-200">
                  Plaka ihtiyacı: {gosterilenPlakaSayisi}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-300">Müşteri</p>
                <p className="mt-3 text-lg font-bold">{form.musteriAdi || 'Seçilmedi'}</p>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-300">Ürün</p>
                <p className="mt-3 text-lg font-bold">{form.urunAdi || 'Girilmedi'}</p>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-300">Operasyon</p>
                <p className="mt-3 text-lg font-bold">{seciliOperasyonAdet}</p>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-300">Kar Hedefi</p>
                <p className="mt-3 text-lg font-bold">%{form.karYuzdesi || '0'}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
        <div className="grid gap-3 md:grid-cols-5">
          {STEPS.map((s, index) => {
            const aktif = step === s.id
            const tamam = stepTamamlandi[index]
            const gecildi = step > s.id

            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setStep(s.id)}
                className={cls(
                  'rounded-2xl border px-4 py-4 text-left transition',
                  aktif && 'border-blue-300 bg-blue-50',
                  !aktif && gecildi && 'border-emerald-200 bg-emerald-50',
                  !aktif && !gecildi && 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                )}
              >
                <div className="flex items-center justify-between">
                  <span className={cls(
                    'inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold',
                    aktif && 'bg-blue-600 text-white',
                    !aktif && gecildi && 'bg-emerald-600 text-white',
                    !aktif && !gecildi && 'bg-white text-slate-500 border border-slate-200'
                  )}>
                    {tamam || gecildi ? '✓' : s.id}
                  </span>

                  <span className={cls(
                    'text-xs font-semibold uppercase tracking-[0.14em]',
                    aktif ? 'text-blue-600' : gecildi ? 'text-emerald-600' : 'text-slate-400'
                  )}>
                    Adım {s.id}
                  </span>
                </div>

                <p className="mt-3 text-sm font-semibold text-slate-900">{s.title}</p>
                <p className="mt-1 text-xs text-slate-500">{s.desc}</p>
              </button>
            )
          })}
        </div>
      </section>

      <form onSubmit={kaydet} className="space-y-6">
        {step === 1 && (
          <SectionCard title="Müşteri ve teklif bilgileri" desc="İşin kime verildiğini ve teklifin temel sahibini tanımla.">
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Müşteri Adı" hint="Kayıtlı müşteriler öneri olarak gelir. Yeni isim yazarsan kaydettiğinde otomatik müşteri oluşturulur.">
                <div className="space-y-3">
                  <Input
                    required
                    list="musteri-listesi"
                    value={form.musteriAdi}
                    onChange={e => musteriSecildi(e.target.value)}
                    placeholder="Müşteri adı soyadı / firma"
                  />
                  <datalist id="musteri-listesi">
                    {musteriler.map((m) => (
                      <option key={m.id} value={musteriGosterimAdi(m)} />
                    ))}
                  </datalist>

                  <button
                    type="button"
                    onClick={yeniMusteriSayfasinaGit}
                    className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
                  >
                    + Yeni Müşteri Sayfasına Git
                  </button>
                </div>
              </Field>

              <Field label="Müşteri Tipi">
                <Select value={form.musteriTipi} onChange={e => guncelle('musteriTipi', e.target.value)}>
                  <option>Ev sahibi</option>
                  <option>Mimar</option>
                  <option>Müteahhit</option>
                </Select>
              </Field>

              <Field label="Teklif Tarihi">
                <Input type="date" value={form.isTarihi} onChange={e => guncelle('isTarihi', e.target.value)} />
              </Field>
            </div>

            <div className="mt-5 rounded-2xl bg-slate-50 p-4">
              <p className="text-sm text-slate-600">
                Bu adım teklifin müşteri bağlamını belirler. Müşteriler sayfasından geldiysen isim otomatik dolmuş olur.
              </p>
            </div>
          </SectionCard>
        )}

        {step === 2 && (
          <SectionCard title="Ürün ve AI plaka optimizasyonu" desc="Ürün, plaka, desen ve damar takipli yerleşimi aynı akışta yönet.">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <Field label="Ürün Adı">
                <Input required value={form.urunAdi} onChange={e => guncelle('urunAdi', e.target.value)} placeholder="Mutfak tezgahı / ada vb." />
              </Field>

              <Field label="Malzeme Tipi">
                <Select value={form.malzemeTipi} onChange={e => guncelle('malzemeTipi', e.target.value)}>
                  <option>Porselen</option>
                  <option>Kuvars</option>
                  <option>Doğaltaş</option>
                </Select>
              </Field>

              <Field label="Güncel Kur (1€ = ? TL)">
                <Input type="number" step="0.01" required value={form.kullanilanKur} onChange={e => guncelle('kullanilanKur', e.target.value)} />
              </Field>
            </div>

            <div className="mt-6 rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-violet-950 p-6 text-white shadow-[0_20px_50px_rgba(15,23,42,0.18)]">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-300">
                    Metrix AI
                  </p>
                  <h3 className="mt-2 text-xl font-black">
                    AI Plaka Optimizasyonu
                  </h3>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                    Damar takibi, tip bazlı desen ayrımı, çoklu plaka ve minimum fire hesabı ile yerleşimi profesyonelce hazırla.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setAiAcik(prev => !prev)}
                  className="rounded-2xl bg-white px-6 py-3 text-sm font-black text-slate-950 shadow-[0_14px_30px_rgba(0,0,0,0.22)] transition hover:scale-[1.02]"
                >
                  {aiAcik ? 'AI Planlayıcıyı Kapat' : 'AI Plaka Planlayıcıyı Aç →'}
                </button>
              </div>
            </div>

            {aiAcik && (
              <div className="mt-6">
                <PlakaPlanlayiciV2
                  embedded
                  onApply={(sonuc: AIPlakaAktarSonucu) => {
                    setForm(prev => ({
                      ...prev,
                      manuelPlakaSayisi: sonuc.toplamPlaka ? String(sonuc.toplamPlaka) : prev.manuelPlakaSayisi,
                      plakaFiyatiEuro: sonuc.ortalamaPlakaFiyati ? String(Number(sonuc.ortalamaPlakaFiyati).toFixed(2)) : prev.plakaFiyatiEuro,
                      metrajMtul: sonuc.tezgahMtul ? String(Number(sonuc.tezgahMtul).toFixed(2)) : prev.metrajMtul,
                      tezgahArasiMtul: sonuc.tezgahArasiMtul ? String(Number(sonuc.tezgahArasiMtul).toFixed(2)) : prev.tezgahArasiMtul,
                      adaTezgahMtul: sonuc.adaTezgahMtul ? String(Number(sonuc.adaTezgahMtul).toFixed(2)) : prev.adaTezgahMtul,
                      plakaGenislikCm: sonuc.plakaGenislik ? String(sonuc.plakaGenislik) : prev.plakaGenislikCm,
                      plakaUzunlukCm: sonuc.plakaYukseklik ? String(sonuc.plakaYukseklik) : prev.plakaUzunlukCm,
                      plakadanAlinanMtul:
                        sonuc.toplamPlaka > 0 && (sonuc.tezgahMtul + sonuc.tezgahArasiMtul + sonuc.adaTezgahMtul) > 0
                          ? String(((sonuc.tezgahMtul + sonuc.tezgahArasiMtul + sonuc.adaTezgahMtul) / sonuc.toplamPlaka).toFixed(2))
                          : prev.plakadanAlinanMtul,
                    }))

                    setPlakaHesap({
                      fireOrani: Number(sonuc.fireOrani || 0),
                      toplamPlakaAdet: Number(sonuc.toplamPlaka || 0),
                      plakaEni: Number(sonuc.plakaGenislik || 0),
                      plakaBoy: Number(sonuc.plakaYukseklik || 0),
                      tezgahBoy: Number(sonuc.tezgahMtul || 0) * 100,
                      tezgahAdet: 1,
                      tezgahArasiBoy: Number(sonuc.tezgahArasiMtul || 0) * 100,
                      tezgahArasiAdet: 1,
                      adaTezgahBoy: Number(sonuc.adaTezgahMtul || 0) * 100,
                      adaTezgahAdet: 1,
                    })

                    setAiAcik(false)
                  }}
                />
              </div>
            )}

            {plakaHesap && (
              <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                AI plaka optimizasyonu Yeni İş formuna aktarıldı. Metraj, plaka sayısı ve ortalama plaka maliyeti otomatik işlendi.
              </div>
            )}
          </SectionCard>
        )}

        {step === 3 && (
          <SectionCard title="Metraj ve üretim" desc="İşin üretim yoğunluğunu ve toplam plaka ihtiyacını burada oluşturursun.">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Tezgah (mtül)">
                <Input type="number" step="0.01" required value={form.metrajMtul} onChange={e => guncelle('metrajMtul', e.target.value)} />
              </Field>

              <Field label="Tezgah 1 mtül üretim süresi (dk)">
                <Input type="number" step="0.1" required value={form.birMtulDakika} onChange={e => guncelle('birMtulDakika', e.target.value)} />
              </Field>

              <Field label="Tezgah arası (mtül)">
                <Input type="number" step="0.01" value={form.tezgahArasiMtul} onChange={e => guncelle('tezgahArasiMtul', e.target.value)} placeholder="0" />
              </Field>

              <Field label="Tezgah arası 1 mtül süre (dk)">
                <Input type="number" step="0.1" value={form.tezgahArasiDakika} onChange={e => guncelle('tezgahArasiDakika', e.target.value)} placeholder="0" />
              </Field>

              <Field label="Ada tezgah (mtül)">
                <Input type="number" step="0.01" value={form.adaTezgahMtul} onChange={e => guncelle('adaTezgahMtul', e.target.value)} placeholder="0" />
              </Field>

              <Field label="Ada tezgah 1 mtül süre (dk)">
                <Input type="number" step="0.1" value={form.adaTezgahDakika} onChange={e => guncelle('adaTezgahDakika', e.target.value)} placeholder="0" />
              </Field>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Toplam mtül</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">{toplamMetrajHesap.toFixed(2)}</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Otomatik plaka</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">{otomatikPlakaSayisi}</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Aktif plaka</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">{gosterilenPlakaSayisi}</p>
              </div>
            </div>

            <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <h4 className="text-lg font-bold text-slate-900">Özel işçilikler</h4>

              <div className="mt-4 grid gap-4 xl:grid-cols-3">
                <div className="rounded-2xl bg-white p-4 border border-slate-200">
                  <p className="mb-4 text-sm font-semibold text-slate-900">Özel İşçilik 1</p>
                  <div className="space-y-3">
                    <Field label="Mtül">
                      <Input type="number" step="0.01" value={form.ozelIscilik1Mtul} onChange={e => guncelle('ozelIscilik1Mtul', e.target.value)} placeholder="0" />
                    </Field>
                    <Field label="Süre (dk)">
                      <Input type="number" step="0.1" value={form.ozelIscilik1Dakika} onChange={e => guncelle('ozelIscilik1Dakika', e.target.value)} placeholder="0" />
                    </Field>
                    <Field label="Açıklama">
                      <Input value={form.ozelIscilik1Aciklama} onChange={e => guncelle('ozelIscilik1Aciklama', e.target.value)} placeholder="Açıklama" />
                    </Field>
                  </div>
                </div>

                <div className="rounded-2xl bg-white p-4 border border-slate-200">
                  <p className="mb-4 text-sm font-semibold text-slate-900">Özel İşçilik 2</p>
                  <div className="space-y-3">
                    <Field label="Mtül">
                      <Input type="number" step="0.01" value={form.ozelIscilik2Mtul} onChange={e => guncelle('ozelIscilik2Mtul', e.target.value)} placeholder="0" />
                    </Field>
                    <Field label="Süre (dk)">
                      <Input type="number" step="0.1" value={form.ozelIscilik2Dakika} onChange={e => guncelle('ozelIscilik2Dakika', e.target.value)} placeholder="0" />
                    </Field>
                    <Field label="Açıklama">
                      <Input value={form.ozelIscilik2Aciklama} onChange={e => guncelle('ozelIscilik2Aciklama', e.target.value)} placeholder="Açıklama" />
                    </Field>
                  </div>
                </div>

                <div className="rounded-2xl bg-white p-4 border border-slate-200">
                  <p className="mb-4 text-sm font-semibold text-slate-900">Özel İşçilik 3</p>
                  <div className="space-y-3">
                    <Field label="Mtül">
                      <Input type="number" step="0.01" value={form.ozelIscilik3Mtul} onChange={e => guncelle('ozelIscilik3Mtul', e.target.value)} placeholder="0" />
                    </Field>
                    <Field label="Süre (dk)">
                      <Input type="number" step="0.1" value={form.ozelIscilik3Dakika} onChange={e => guncelle('ozelIscilik3Dakika', e.target.value)} placeholder="0" />
                    </Field>
                    <Field label="Açıklama">
                      <Input value={form.ozelIscilik3Aciklama} onChange={e => guncelle('ozelIscilik3Aciklama', e.target.value)} placeholder="Açıklama" />
                    </Field>
                  </div>
                </div>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <Field
                  label="Kaç plaka ürün gerekiyor?"
                  hint={`Boş bırakırsan otomatik hesap kullanılır. Aktif plaka sayısı: ${gosterilenPlakaSayisi}`}
                >
                  <Input
                    type="number"
                    step="1"
                    min="0"
                    value={form.manuelPlakaSayisi}
                    onChange={e => guncelle('manuelPlakaSayisi', e.target.value)}
                    placeholder={`Otomatik: ${otomatikPlakaSayisi}`}
                  />
                </Field>
              </div>
            </div>
          </SectionCard>
        )}

        {step === 4 && (
          <SectionCard title="Operasyonlar ve fiyatlandırma" desc="Ek işlemleri seç, kar hedefini belirle ve teklifi hesaplamaya hazırla.">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {OPERASYONLAR.map(op => (
                <label
                  key={op.key}
                  className={cls(
                    'cursor-pointer rounded-2xl border p-4 transition',
                    seciliOperasyonlar[op.key]
                      ? 'border-blue-300 bg-blue-50'
                      : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={!!seciliOperasyonlar[op.key]}
                      onChange={() => operasyonToggle(op.key)}
                      className="h-4 w-4"
                    />
                    <div>
                      <p className="font-semibold text-slate-900">{op.label}</p>
                      <p className="text-xs text-slate-500">Varsayılan: {op.varsayilanDakika} dk</p>
                    </div>
                  </div>
                </label>
              ))}
            </div>

            {OPERASYONLAR.filter(op => seciliOperasyonlar[op.key]).length > 0 && (
              <div className="mt-6 space-y-3">
                {OPERASYONLAR.filter(op => seciliOperasyonlar[op.key]).map(op => (
                  <div key={op.key} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="mb-4 text-sm font-semibold text-blue-700">{op.label}</p>
                    <div className="grid gap-4 md:grid-cols-3">
                      <Field label="Makine">
                        <Select
                          value={operasyonDetay[op.key]?.makineId || ''}
                          onChange={e => operasyonGuncelle(op.key, 'makineId', e.target.value)}
                        >
                          {makineler.map(m => (
                            <option key={m.id} value={m.id}>
                              {m.makineAdi}
                            </option>
                          ))}
                        </Select>
                      </Field>

                      <Field label="Adet">
                        <Input
                          type="number"
                          value={operasyonDetay[op.key]?.adet || ''}
                          onChange={e => operasyonGuncelle(op.key, 'adet', e.target.value)}
                          placeholder="Adet girin"
                        />
                      </Field>

                      <Field label="Birim süre (dk)">
                        <Input
                          type="number"
                          step="0.1"
                          value={operasyonDetay[op.key]?.birimDakika || ''}
                          onChange={e => operasyonGuncelle(op.key, 'birimDakika', e.target.value)}
                          placeholder="Süre girin"
                        />
                      </Field>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <Field label="Kar Yüzdesi (%)">
                <Input type="number" step="0.1" value={form.karYuzdesi} onChange={e => guncelle('karYuzdesi', e.target.value)} />
              </Field>

              <Field label="Notlar">
                <Textarea rows={4} value={form.notlar} onChange={e => guncelle('notlar', e.target.value)} placeholder="İsteğe bağlı notlar..." />
              </Field>
            </div>
          </SectionCard>
        )}

        {step === 5 && (
          <SectionCard title="Premium teklif sonucu" desc="Kârlılık, fiyat ve operasyon kararını tek ekranda gör.">
            {!sonuc ? (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center">
                <p className="text-lg font-semibold text-slate-900">Henüz sonuç oluşmadı</p>
                <p className="mt-2 text-sm text-slate-500">
                  Alttaki butonla hesaplamayı çalıştır. Sonuç oluşunca kâr, maliyet, fiyat ve kapasite analizi burada görünür.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {(() => {
                  const netKar = sonuc.satisFiyati - sonuc.toplamMaliyet

                  const bazMtul = parseFloat(form.metrajMtul || "0")
                  const arasiMtul = parseFloat(form.tezgahArasiMtul || "0")
                  const adaMtul = parseFloat(form.adaTezgahMtul || "0")

                  const weightedTotal =
                    (bazMtul * 1) +
                    (arasiMtul * 0.75) +
                    (adaMtul * 1.5)

                  const bazFiyat = weightedTotal > 0 ? sonuc.satisFiyati / weightedTotal : 0

                  const fiyatDagilimi = [
                    bazMtul > 0 && {
                      ad: "Tezgah",
                      mtul: bazMtul,
                      birim: bazFiyat,
                      toplam: bazMtul * bazFiyat
                    },
                    arasiMtul > 0 && {
                      ad: "Tezgah Arası",
                      mtul: arasiMtul,
                      birim: bazFiyat * 0.75,
                      toplam: arasiMtul * (bazFiyat * 0.75)
                    },
                    adaMtul > 0 && {
                      ad: "Ada",
                      mtul: adaMtul,
                      birim: bazFiyat * 1.5,
                      toplam: adaMtul * (bazFiyat * 1.5)
                    }
                  ].filter(Boolean)
                  const karOrani = sonuc.satisFiyati > 0 ? (netKar / sonuc.satisFiyati) * 100 : 0
                  const tahminiGun = Math.max(0.1, sonuc.toplamSureDakika / 480)
                  const kapasite = Math.min(999, (sonuc.toplamSureDakika / 480) * 100)
                  const karYorumu =
                    karOrani >= 40
                      ? 'Yüksek kârlı iş'
                      : karOrani >= 25
                        ? 'Sağlıklı kâr seviyesi'
                        : karOrani >= 10
                          ? 'Dikkatli fiyatlandır'
                          : 'Düşük marj uyarısı'

                  return (
                    <>
                      <div className="overflow-hidden rounded-[32px] border border-emerald-200 bg-gradient-to-br from-slate-950 via-emerald-950 to-emerald-700 text-white shadow-[0_24px_70px_rgba(15,23,42,0.20)]">
                        <div className="grid gap-6 p-6 lg:grid-cols-[1.35fr_0.9fr] lg:p-8">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-200">
                              Kârlılık Karar Paneli
                            </p>
                            <h4 className="mt-3 text-3xl font-black tracking-tight lg:text-4xl">
                              Bu işten net kazanç
                            </h4>
                            <p className="mt-3 text-5xl font-black tracking-tight">
                              {paraGoster(netKar)}
                            </p>
                            <div className="mt-5 flex flex-wrap gap-3">
                              <span className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold">
                                Kâr oranı %{karOrani.toFixed(1)}
                              </span>
                              <span className="rounded-full border border-emerald-300/30 bg-emerald-300/15 px-4 py-2 text-sm font-semibold text-emerald-100">
                                {karYorumu}
                              </span>
                              <span className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold">
                                Teklif No: {sonuc.teklifNo}
                              </span>
                            </div>
                          </div>

                          <div className="grid gap-3">
                            <div className="rounded-3xl border border-white/10 bg-white/10 p-5 backdrop-blur-sm">
                              <p className="text-xs uppercase tracking-[0.18em] text-emerald-100">Müşteriye Sunulan</p>
                              <p className="mt-2 text-2xl font-black">{paraGoster(sonuc.kdvDahilFiyat)}</p>
                              <p className="mt-1 text-xs text-emerald-100">KDV dahil genel toplam</p>
                            </div>
                            <button
                              type="button"
                              onClick={pdfModalAc}
                              disabled={pdfYukleniyor}
                              className="rounded-3xl bg-white px-5 py-4 text-sm font-black text-emerald-800 transition hover:scale-[1.01] disabled:opacity-70"
                            >
                              {pdfYukleniyor ? 'Hazırlanıyor...' : '📄 Premium PDF Teklif İndir'}

<button
  type="button"
  onClick={linkKopyala}
  className="rounded-3xl bg-slate-900 px-5 py-4 text-sm font-black text-white mt-3"
>
  🔗 Teklif Linkini Kopyala
</button>

                            <button
                              type="button"
                              onClick={() => setFiyatModalAcik(true)}
                              className="rounded-3xl bg-slate-900 px-5 py-4 text-sm font-black text-white"
                            >
                              📊 Kalem Bazlı Fiyat Analizi
                            </button>
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <div className="rounded-3xl border border-rose-100 bg-rose-50 p-5">
                          <p className="text-xs font-bold uppercase tracking-[0.16em] text-rose-500">Toplam Maliyet</p>
                          <p className="mt-3 text-2xl font-black text-rose-700">{paraGoster(sonuc.toplamMaliyet)}</p>
                        </div>

                        <div className="rounded-3xl border border-blue-100 bg-blue-50 p-5">
                          <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-500">Satış Fiyatı</p>
                          <p className="mt-3 text-2xl font-black text-blue-700">{paraGoster(sonuc.satisFiyati)}</p>
                          <p className="mt-1 text-xs text-blue-500">KDV hariç</p>
                        </div>

                        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">KDV</p>
                          <p className="mt-3 text-2xl font-black text-slate-900">{paraGoster(sonuc.kdvTutari)}</p>
                          <p className="mt-1 text-xs text-slate-500">%{atolyeBilgi.kdvOrani}</p>
                        </div>

                        <div className="rounded-3xl border border-indigo-900 bg-indigo-950 p-5 text-white">
                          <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-200">Genel Toplam</p>
                          <p className="mt-3 text-2xl font-black">{paraGoster(sonuc.kdvDahilFiyat)}</p>
                          <p className="mt-1 text-xs text-indigo-200">KDV dahil</p>
                        </div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <div className="rounded-3xl border border-slate-200 bg-white p-5">
                          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Toplam Süre</p>
                          <p className="mt-3 text-xl font-black text-slate-900">
                            {Math.floor(sonuc.toplamSureDakika / 60) > 0 ? `${Math.floor(sonuc.toplamSureDakika / 60)} sa ` : ''}{Math.round(sonuc.toplamSureDakika % 60)} dk
                          </p>
                        </div>

                        <div className="rounded-3xl border border-emerald-100 bg-emerald-50 p-5">
                          <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-600">Tahmini İş Yükü</p>
                          <p className="mt-3 text-xl font-black text-emerald-800">{tahminiGun.toFixed(1)} iş günü</p>
                        </div>

                        <div className="rounded-3xl border border-violet-100 bg-violet-50 p-5">
                          <p className="text-xs font-bold uppercase tracking-[0.16em] text-violet-600">Günlük Kapasite</p>
                          <p className="mt-3 text-xl font-black text-violet-800">%{kapasite.toFixed(0)}</p>
                        </div>

                        <div className="rounded-3xl border border-slate-200 bg-white p-5">
                          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Mtül Satış</p>
                          <p className="mt-3 text-xl font-black text-slate-900">{paraGoster(sonuc.mtulSatisFiyati)}</p>
                        </div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-3">
                        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-700">
                          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Metraj</p>
                          <p className="mt-2 text-lg font-black text-slate-900">{sonuc.toplamMetraj.toFixed(2)} mtül</p>
                        </div>

                        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-700">
                          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Kullanılan Plaka</p>
                          <p className="mt-2 text-lg font-black text-slate-900">{sonuc.kullanilanPlakaSayisi}</p>
                        </div>

                        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-700">
                          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Geçerlilik</p>
                          <p className="mt-2 text-lg font-black text-slate-900">
                            {new Date(sonuc.teklifGecerlilikTarihi).toLocaleDateString('tr-TR')}
                          </p>
                        </div>
                      </div>

                      <div className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.07)]">
                        <div className="border-b border-slate-100 bg-gradient-to-r from-slate-950 to-slate-800 p-5 text-white">
                          <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-300">Fiyat Karar Motoru</p>
                          <h4 className="mt-2 text-2xl font-black tracking-tight">Bu fiyatla işi almak mantıklı mı?</h4>
                        </div>

                        {(() => {
                          const netKar = sonuc.satisFiyati - sonuc.toplamMaliyet
                          const karOrani = sonuc.satisFiyati > 0 ? (netKar / sonuc.satisFiyati) * 100 : 0

                          const basabasFiyat = sonuc.toplamMaliyet
                          const hedef30Fiyat = sonuc.toplamMaliyet / 0.70
                          const hedef40Fiyat = sonuc.toplamMaliyet / 0.60

                          const durum =
                            karOrani >= 40
                              ? {
                                  baslik: 'Çok güçlü fiyat',
                                  aciklama: 'Bu iş yüksek kârlı görünüyor. İndirim alanın var ama gereksiz indirim yapma.',
                                  className: 'border-emerald-200 bg-emerald-50 text-emerald-800',
                                }
                              : karOrani >= 30
                                ? {
                                    baslik: 'Sağlıklı fiyat',
                                    aciklama: 'Bu fiyat operasyonel olarak güvenli. Kâr seviyesi dengeli.',
                                    className: 'border-blue-200 bg-blue-50 text-blue-800',
                                  }
                                : karOrani >= 20
                                  ? {
                                      baslik: 'Sınırda fiyat',
                                      aciklama: 'Kâr var ama riskli. Fire, gecikme veya ek işçilik bu işi zayıflatabilir.',
                                      className: 'border-amber-200 bg-amber-50 text-amber-800',
                                    }
                                  : {
                                      baslik: 'Düşük marj uyarısı',
                                      aciklama: 'Bu fiyatla işi almak riskli. Satış fiyatını yükseltmen gerekir.',
                                      className: 'border-rose-200 bg-rose-50 text-rose-800',
                                    }

                          return (
                            <div className="p-5">
                              <div className="grid gap-4 md:grid-cols-4">
                                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                                  <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Başabaş</p>
                                  <p className="mt-2 text-xl font-black text-slate-900">{paraGoster(basabasFiyat)}</p>
                                  <p className="mt-1 text-xs text-slate-500">Zarar etmeme noktası</p>
                                </div>

                                <div className="rounded-3xl border border-blue-100 bg-blue-50 p-5">
                                  <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-500">Min. Sağlıklı</p>
                                  <p className="mt-2 text-xl font-black text-blue-800">{paraGoster(hedef30Fiyat)}</p>
                                  <p className="mt-1 text-xs text-blue-500">Hedef %30 kâr</p>
                                </div>

                                <div className="rounded-3xl border border-emerald-100 bg-emerald-50 p-5">
                                  <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-500">İdeal Fiyat</p>
                                  <p className="mt-2 text-xl font-black text-emerald-800">{paraGoster(hedef40Fiyat)}</p>
                                  <p className="mt-1 text-xs text-emerald-500">Hedef %40 kâr</p>
                                </div>

                                <div className="rounded-3xl border border-violet-100 bg-violet-50 p-5">
                                  <p className="text-xs font-black uppercase tracking-[0.16em] text-violet-500">Mevcut Kâr</p>
                                  <p className="mt-2 text-xl font-black text-violet-800">%{karOrani.toFixed(1)}</p>
                                  <p className="mt-1 text-xs text-violet-500">{paraGoster(netKar)} net</p>
                                </div>
                              </div>

                              <div className={`mt-4 rounded-3xl border p-5 ${durum.className}`}>
                                <p className="text-lg font-black">{durum.baslik}</p>
                                <p className="mt-1 text-sm font-semibold opacity-80">{durum.aciklama}</p>
                              </div>
                            </div>
                          )
                        })()}
                      </div>

                      <div className="flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={pdfModalAc}
                          disabled={pdfYukleniyor}
                          className="rounded-2xl bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-70"
                        >
                          {pdfYukleniyor ? 'Hazırlanıyor...' : '📄 PDF Teklif İndir'}
                        </button>

                        <button
                          type="button"
                          onClick={() => router.push('/dashboard/isler')}
                          className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
                        >
                          İş Listesine Git →
                        </button>
                      </div>
                    </>
                  )
                })()}
              </div>
            )}
          </SectionCard>
        )}

        <section className="sticky bottom-4 z-20 rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-[0_18px_40px_rgba(15,23,42,0.10)] backdrop-blur-xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Mevcut adım</p>
              <h4 className="mt-1 text-lg font-bold text-slate-900">
                {STEPS[step - 1].title}
              </h4>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={geri}
                disabled={step === 1}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                ← Geri
              </button>

              {step < 5 && (
                <button
                  type="button"
                  onClick={ileri}
                  className="rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 px-4 py-3 text-sm font-semibold text-white transition hover:scale-[1.01]"
                >
                  İleri →
                </button>
              )}

              {step === 5 && (
                <button
                  type="submit"
                  disabled={kaydediliyor}
                  className="rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 px-5 py-3 text-sm font-semibold text-white transition hover:scale-[1.01] disabled:opacity-70"
                >
                  {kaydediliyor ? 'Hesaplanıyor...' : 'Hesapla ve Kaydet'}
                </button>
              )}
            </div>
          </div>
        </section>
      

{/* 🔥 SUCCESS MODAL */}
{basariModal && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
    <div className="w-full max-w-md rounded-3xl bg-white p-6 text-center">
      
      <h2 className="text-2xl font-black mb-2">🔥 TEKLİF HAZIR</h2>
      <p className="text-sm text-slate-500 mb-6">
        Teklif oluşturuldu. Müşteriye gönderebilirsin.
      </p>

      <div className="space-y-3">

        <button onClick={whatsappGonder}
          className="w-full rounded-2xl bg-green-600 py-3 text-white font-bold">
          📲 WhatsApp ile Gönder
        </button>

        <button onClick={linkKopyala}
          className="w-full rounded-2xl bg-slate-900 py-3 text-white font-bold">
          🔗 Linki Kopyala
        </button>

        <button onClick={pdfModalAc}
          className="w-full rounded-2xl bg-blue-600 py-3 text-white font-bold">
          📄 PDF Aç
        </button>

        <button onClick={() => setBasariModal(false)}
          className="w-full rounded-2xl border py-3">
          Kapat
        </button>

      </div>
    </div>
  </div>
)}

</form>

      {pdfModalAcik && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm"
          onClick={pdfModalKapat}
        >
          <div
            className="w-full max-w-2xl rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_30px_80px_rgba(15,23,42,0.24)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-500">PDF Teklif Ayarları</p>
                <h3 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
                  Teklif metnini son kez düzenle
                </h3>
                <p className="mt-2 text-sm text-slate-500">
                  Bu bilgiler sadece oluşturulacak PDF teklif içinde kullanılacak.
                </p>
              </div>

              <button
                type="button"
                onClick={pdfModalKapat}
                className="rounded-2xl border border-slate-200 px-3 py-2 text-slate-400 transition hover:bg-slate-50 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="mt-6 grid gap-5">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <label className="mb-2 block text-sm font-semibold text-slate-800">
                  Ödeme Koşulları
                </label>
                <Textarea
                  rows={4}
                  value={pdfForm.odemeKosullari}
                  onChange={(e) => setPdfForm(prev => ({ ...prev, odemeKosullari: e.target.value }))}
                  placeholder="Ödeme koşullarını yaz..."
                  className="bg-white"
                />
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <label className="mb-2 block text-sm font-semibold text-slate-800">
                  Teslim Tarihi
                </label>
                <Textarea
                  rows={3}
                  value={pdfForm.teslimTarihi}
                  onChange={(e) => setPdfForm(prev => ({ ...prev, teslimTarihi: e.target.value }))}
                  placeholder="Teslim tarihi / termin bilgisini yaz..."
                  className="bg-white"
                />
              </div>

              {sonuc && (
                <div className="rounded-2xl bg-blue-50 p-4 border border-blue-200">
                  <p className="text-sm text-blue-900">
                    <strong>{sonuc.teklifNo}</strong> numaralı teklif için PDF oluşturulacak.
                    Genel toplam: <strong>{paraGoster(sonuc.kdvDahilFiyat)}</strong>
                  </p>
                </div>
              )}
            </div>

            <div className="mt-8 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={pdfModalKapat}
                disabled={pdfYukleniyor}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
              >
                İptal
              </button>

              <button
                type="button"
                onClick={pdfOlusturOnayla}
                disabled={pdfYukleniyor}
                className="rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(220,38,38,0.22)] transition hover:scale-[1.01] disabled:opacity-70"
              >
                {pdfYukleniyor ? 'PDF Hazırlanıyor...' : 'PDF Oluştur'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
