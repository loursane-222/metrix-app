'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { paraGoster } from '@/lib/format'

type Makine = {
  id: string
  makineAdi: string
  alinanBedel: number
  paraBirimi: string
  amortismanSuresiAy: number
  aylikAktifCalismaSaati: number
  aylikAmortisman: number
  saatlikMaliyet: number
  dakikalikMaliyet: number
}

type Arac = {
  id: string
  aracAdi: string
  aracTipi: string
  alinanBedel: number
  paraBirimi: string
  amortismanSuresiAy: number
  aylikBakim: number
  aylikSigortaKasko: number
  aylikVergiMuayene: number
  aylikAmortisman: number
  aylikToplamSabitMaliyet: number
}

type FormState = {
  atolyeAdi: string
  sehir: string
  ilce: string
  telefon: string
  email: string
  adres: string
  toplamMaas: string
  sgkGideri: string
  yemekGideri: string
  yolGideri: string
  kira: string
  elektrik: string
  su: string
  dogalgaz: string
  internet: string
  sarfMalzeme: string
  aylikPorselenPlaka: string
  aylikKuvarsPlaka: string
  aylikDogaltasPlaka: string
  plakaBasinaMtul: string
  kdvOrani: string
  teklifGecerlilik: string
}

function cls(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

function normalizeDecimalInput(value: string) {
  return value.replace(/,/g, '.')
}

function parseNum(value: string | number | null | undefined) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  if (typeof value !== 'string') return 0
  const cleaned = normalizeDecimalInput(value).replace(/[^0-9.\-]/g, '')
  const firstDot = cleaned.indexOf('.')
  const normalized =
    firstDot >= 0
      ? cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, '')
      : cleaned
  const n = Number(normalized)
  return Number.isFinite(n) ? n : 0
}

function SectionCard({
  title,
  desc,
  children,
  tone = 'default',
}: {
  title: string
  desc?: string
  children: React.ReactNode
  tone?: 'default' | 'soft'
}) {
  return (
    <section
      className={cls(
        'rounded-3xl border p-6 shadow-[0_10px_30px_rgba(15,23,42,0.06)]',
        tone === 'default' && 'border-slate-200 bg-white',
        tone === 'soft' && 'border-slate-200 bg-slate-50/70'
      )}
    >
      <div className="mb-5">
        <h3 className="text-xl font-bold tracking-tight text-slate-900">{title}</h3>
        {desc && <p className="mt-1 text-sm text-slate-500">{desc}</p>}
      </div>
      {children}
    </section>
  )
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
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
  return (
    <input
      {...props}
      type={isNumeric ? 'text' : props.type}
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

function InsightCard({
  title,
  value,
  tone = 'slate',
  sub,
}: {
  title: string
  value: string
  tone?: 'slate' | 'blue' | 'emerald' | 'violet' | 'amber' | 'rose'
  sub?: string
}) {
  const map = {
    slate: 'border-slate-200 bg-white text-slate-900',
    blue: 'border-blue-200 bg-blue-50 text-blue-700',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    violet: 'border-violet-200 bg-violet-50 text-violet-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-700',
    rose: 'border-rose-200 bg-rose-50 text-rose-700',
  }
  return (
    <div className={cls('rounded-3xl border p-5 shadow-[0_10px_30px_rgba(15,23,42,0.06)]', map[tone])}>
      <p className="text-sm font-medium opacity-80">{title}</p>
      <p className="mt-3 text-3xl font-bold">{value}</p>
      {sub && <p className="mt-2 text-xs opacity-80">{sub}</p>}
    </div>
  )
}

function emptyForm(): FormState {
  return {
    atolyeAdi: '',
    sehir: '',
    ilce: '',
    telefon: '',
    email: '',
    adres: '',
    toplamMaas: '',
    sgkGideri: '',
    yemekGideri: '',
    yolGideri: '',
    kira: '',
    elektrik: '',
    su: '',
    dogalgaz: '',
    internet: '',
    sarfMalzeme: '',
    aylikPorselenPlaka: '',
    aylikKuvarsPlaka: '',
    aylikDogaltasPlaka: '',
    plakaBasinaMtul: '3.20',
    kdvOrani: '20',
    teklifGecerlilik: '15',
  }
}

export default function AtolyeProfili() {
  const [yukleniyor, setYukleniyor] = useState(false)
  const [kaydediliyor, setKaydediliyor] = useState(false)
  const [mesaj, setMesaj] = useState('')
  const [dakikaMaliyeti, setDakikaMaliyeti] = useState<number>(0)
  const [toplamAylikGider, setToplamAylikGider] = useState<number>(0)
  const [gunlukGider, setGunlukGider] = useState<number>(0)
  const [makineler, setMakineler] = useState<Makine[]>([])
  const [araclar, setAraclar] = useState<Arac[]>([])
  const [logoUrl, setLogoUrl] = useState('')
  const [logoYukleniyor, setLogoYukleniyor] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm())

  const [makineEkleAcik, setMakineEkleAcik] = useState(false)
  const [aracEkleAcik, setAracEkleAcik] = useState(false)

  const [yeniMakine, setYeniMakine] = useState({
    makineAdi: '',
    alinanBedel: '',
    paraBirimi: 'TRY',
    amortismanSuresiAy: '',
    aylikAktifCalismaSaati: '',
  })

  const [yeniArac, setYeniArac] = useState({
    aracAdi: '',
    aracTipi: 'Kamyonet',
    alinanBedel: '',
    paraBirimi: 'TRY',
    amortismanSuresiAy: '',
    aylikBakim: '',
    aylikSigortaKasko: '',
    aylikVergiMuayene: '',
  })

  const [aylikKontrolAcik, setAylikKontrolAcik] = useState(false)
  const logoInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setYukleniyor(true)
    Promise.all([fetch('/api/atolye'), fetch('/api/makineler'), fetch('/api/araclar')])
      .then(async ([a, m, ar]) => {
        const av = await a.json()
        const mv = await m.json()
        const arv = await ar.json()

        if (av.atolye) {
          const a = av.atolye
          setForm({
            atolyeAdi: a.atolyeAdi?.toString() || '',
            sehir: a.sehir?.toString() || '',
            ilce: a.ilce?.toString() || '',
            telefon: a.telefon?.toString() || '',
            email: a.email?.toString() || '',
            adres: a.adres?.toString() || '',
            toplamMaas: a.toplamMaas?.toString() || '',
            sgkGideri: a.sgkGideri?.toString() || '',
            yemekGideri: a.yemekGideri?.toString() || '',
            yolGideri: a.yolGideri?.toString() || '',
            kira: a.kira?.toString() || '',
            elektrik: a.elektrik?.toString() || '',
            su: a.su?.toString() || '',
            dogalgaz: a.dogalgaz?.toString() || '',
            internet: a.internet?.toString() || '',
            sarfMalzeme: a.sarfMalzeme?.toString() || '',
            aylikPorselenPlaka: a.aylikPorselenPlaka?.toString() || '',
            aylikKuvarsPlaka: a.aylikKuvarsPlaka?.toString() || '',
            aylikDogaltasPlaka: a.aylikDogaltasPlaka?.toString() || '',
            plakaBasinaMtul: a.plakaBasinaMtul?.toString() || '3.20',
            kdvOrani: a.kdvOrani?.toString() || '20',
            teklifGecerlilik: a.teklifGecerlilik?.toString() || '15',
          })
          setLogoUrl(a.logoUrl || '')
        }

        if (av.toplamAylikGider !== undefined) setToplamAylikGider(Number(av.toplamAylikGider))
        if (av.dakikaMaliyeti !== undefined) setDakikaMaliyeti(Number(av.dakikaMaliyeti))
        if (av.gunlukGider !== undefined) setGunlukGider(Number(av.gunlukGider))
        if (mv.makineler) setMakineler(mv.makineler)
        if (arv.araclar) setAraclar(arv.araclar)
      })
      .finally(() => setYukleniyor(false))
  }, [])

  useEffect(() => {
    const now = new Date()
    if (now.getDate() !== 1) return

    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const saved = localStorage.getItem('metrix-atolye-aylik-kontrol')
    if (saved !== monthKey) setAylikKontrolAcik(true)
  }, [])

  function aylikKontrolKapat() {
    const now = new Date()
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    localStorage.setItem('metrix-atolye-aylik-kontrol', monthKey)
    setAylikKontrolAcik(false)
  }

  function guncelle(alan: keyof FormState, deger: string) {
    setForm((prev) => ({ ...prev, [alan]: alan === 'plakaBasinaMtul' ? normalizeDecimalInput(deger) : deger }))
  }

  async function logoYukle(e: React.ChangeEvent<HTMLInputElement>) {
    const dosya = e.target.files?.[0]
    if (!dosya) return
    setLogoYukleniyor(true)
    const formData = new FormData()
    formData.append('logo', dosya)
    try {
      const yanit = await fetch('/api/logo', { method: 'POST', body: formData })
      const veri = await yanit.json()
      if (veri.logoUrl) setLogoUrl(veri.logoUrl)
    } finally {
      setLogoYukleniyor(false)
    }
  }

  async function kaydet(e: React.FormEvent) {
    e.preventDefault()
    setKaydediliyor(true)
    setMesaj('')

    try {
      const yanit = await fetch('/api/atolye', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          atolyeAdi: form.atolyeAdi,
          sehir: form.sehir,
          ilce: form.ilce,
          telefon: form.telefon,
          email: form.email,
          adres: form.adres,
          toplamMaas: parseNum(form.toplamMaas),
          sgkGideri: parseNum(form.sgkGideri),
          yemekGideri: parseNum(form.yemekGideri),
          yolGideri: parseNum(form.yolGideri),
          kira: parseNum(form.kira),
          elektrik: parseNum(form.elektrik),
          su: parseNum(form.su),
          dogalgaz: parseNum(form.dogalgaz),
          internet: parseNum(form.internet),
          sarfMalzeme: parseNum(form.sarfMalzeme),
          aylikPorselenPlaka: Math.round(parseNum(form.aylikPorselenPlaka)),
          aylikKuvarsPlaka: Math.round(parseNum(form.aylikKuvarsPlaka)),
          aylikDogaltasPlaka: Math.round(parseNum(form.aylikDogaltasPlaka)),
          plakaBasinaMtul: parseNum(form.plakaBasinaMtul) || 3.2,
          kdvOrani: Math.round(parseNum(form.kdvOrani)) || 20,
          teklifGecerlilik: Math.round(parseNum(form.teklifGecerlilik)) || 15,
        }),
      })

      if (yanit.ok) {
        const sonuc = await yanit.json()
        setDakikaMaliyeti(Number(sonuc.dakikaMaliyeti) || 0)
        setToplamAylikGider(Number(sonuc.toplamAylikGider) || 0)
        setGunlukGider(Number(sonuc.gunlukGider) || 0)
        setMesaj('Kaydedildi!')
      } else {
        setMesaj('Hata oluştu.')
      }
    } finally {
      setKaydediliyor(false)
    }
  }

  async function makineKaydet() {
    const yanit = await fetch('/api/makineler', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        makineAdi: yeniMakine.makineAdi,
        alinanBedel: parseNum(yeniMakine.alinanBedel),
        paraBirimi: yeniMakine.paraBirimi,
        amortismanSuresiAy: Math.round(parseNum(yeniMakine.amortismanSuresiAy)),
        aylikAktifCalismaSaati: parseNum(yeniMakine.aylikAktifCalismaSaati),
      }),
    })
    const veri = await yanit.json()
    if (veri.makine) {
      setMakineler((prev) => [...prev, veri.makine])
      setYeniMakine({
        makineAdi: '',
        alinanBedel: '',
        paraBirimi: 'TRY',
        amortismanSuresiAy: '',
        aylikAktifCalismaSaati: '',
      })
      setMakineEkleAcik(false)
    }
  }

  async function makineSil(id: string) {
    await fetch('/api/makineler', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setMakineler((prev) => prev.filter((m) => m.id !== id))
  }

  async function aracKaydet() {
    const yanit = await fetch('/api/araclar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        aracAdi: yeniArac.aracAdi,
        aracTipi: yeniArac.aracTipi,
        alinanBedel: parseNum(yeniArac.alinanBedel),
        paraBirimi: yeniArac.paraBirimi,
        amortismanSuresiAy: Math.round(parseNum(yeniArac.amortismanSuresiAy)),
        aylikBakim: parseNum(yeniArac.aylikBakim),
        aylikSigortaKasko: parseNum(yeniArac.aylikSigortaKasko),
        aylikVergiMuayene: parseNum(yeniArac.aylikVergiMuayene),
      }),
    })
    const veri = await yanit.json()
    if (veri.arac) {
      setAraclar((prev) => [...prev, veri.arac])
      setYeniArac({
        aracAdi: '',
        aracTipi: 'Kamyonet',
        alinanBedel: '',
        paraBirimi: 'TRY',
        amortismanSuresiAy: '',
        aylikBakim: '',
        aylikSigortaKasko: '',
        aylikVergiMuayene: '',
      })
      setAracEkleAcik(false)
    }
  }

  async function aracSil(id: string) {
    await fetch('/api/araclar', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setAraclar((prev) => prev.filter((a) => a.id !== id))
  }

  const hesapOzet = useMemo(() => {
    const personel = parseNum(form.toplamMaas) + parseNum(form.sgkGideri) + parseNum(form.yemekGideri) + parseNum(form.yolGideri)
    const sabit =
      parseNum(form.kira) +
      parseNum(form.elektrik) +
      parseNum(form.su) +
      parseNum(form.dogalgaz) +
      parseNum(form.internet) +
      parseNum(form.sarfMalzeme)

    const makineAmortisman = makineler.reduce((acc, m) => acc + Number(m.aylikAmortisman || 0), 0)
    const aracMaliyet = araclar.reduce((acc, a) => acc + Number(a.aylikToplamSabitMaliyet || 0), 0)

    const toplamPlaka =
      parseNum(form.aylikPorselenPlaka) +
      parseNum(form.aylikKuvarsPlaka) +
      parseNum(form.aylikDogaltasPlaka)

    const calismaGunu = 26
    const gunlukSaat = 8
    const toplamDakika = calismaGunu * gunlukSaat * 60
    const plakaBasinaMtul = parseNum(form.plakaBasinaMtul) || 0
    const aylikUretimMtul = toplamPlaka * plakaBasinaMtul
    const dakikalikMtul = toplamDakika > 0 ? aylikUretimMtul / toplamDakika : 0
    const birMtulDakika = dakikalikMtul > 0 ? 1 / dakikalikMtul : 0
    const plakaTeorikDakika = toplamPlaka > 0 ? toplamDakika / toplamPlaka : 0
    const toplam = personel + sabit + makineAmortisman + aracMaliyet
    const dakika = toplamDakika > 0 ? toplam / toplamDakika : 0
    const mtulMaliyeti = aylikUretimMtul > 0 ? toplam / aylikUretimMtul : 0
    const gunluk = toplam / calismaGunu

    return {
      personel,
      sabit,
      makineAmortisman,
      aracMaliyet,
      toplamPlaka,
      toplamDakika,
      plakaBasinaMtul,
      aylikUretimMtul,
      dakikalikMtul,
      birMtulDakika,
      plakaTeorikDakika,
      toplam,
      dakika,
      mtulMaliyeti,
      gunluk,
    }
  }, [form, makineler, araclar])

  const operasyonMesaji = useMemo(() => {
    if (hesapOzet.toplamPlaka <= 0) {
      return {
        tone: 'rose' as const,
        title: 'Kapasite girilmedi',
        desc: 'Dakika maliyeti güvenilir çıkmaz. En az bir malzeme türü için aylık plaka kapasitesi gir.',
      }
    }

    if (hesapOzet.dakika > 0 && hesapOzet.dakika < 1) {
      return {
        tone: 'emerald' as const,
        title: 'Verimli görünüm',
        desc: 'Dakika maliyetin düşük. Kapasite ve gider dengesi şu an güçlü görünüyor.',
      }
    }

    if (hesapOzet.dakika >= 1 && hesapOzet.dakika < 3) {
      return {
        tone: 'blue' as const,
        title: 'Dengeli görünüm',
        desc: 'Fiyat motoru çalışıyor. Yine de kapasite veya sabit giderlerde değişim varsa ay başında güncelle.',
      }
    }

    return {
      tone: 'amber' as const,
      title: 'Maliyet baskısı var',
      desc: 'Dakika maliyeti yükselmiş. Kapasite düşmüş veya sabit giderler artmış olabilir.',
    }
  }, [hesapOzet])

  const kapasiteKullanim = useMemo(() => {
    const referans = 80
    if (hesapOzet.toplamPlaka <= 0) return 0
    return Math.min(100, Math.round((hesapOzet.toplamPlaka / referans) * 100))
  }, [hesapOzet.toplamPlaka])

  const basabasIsAdedi = useMemo(() => {
    const ortalamaIsKari = 15000
    return Math.max(1, Math.round(hesapOzet.toplam / ortalamaIsKari))
  }, [hesapOzet.toplam])

  const maliyetTrendi = useMemo(() => {
    if (hesapOzet.dakika <= 0) return 'Veri Bekleniyor'
    if (hesapOzet.dakika < 1) return 'Düşük'
    if (hesapOzet.dakika < 3) return 'Stabil'
    return 'Artıyor'
  }, [hesapOzet.dakika])

  const akilliOneriler = useMemo(() => {
    const mevcutDakika = hesapOzet.dakika
    const mevcutToplam = hesapOzet.toplam
    const mevcutDakikaKapasite = hesapOzet.toplamDakika
    const plakaBasinaMtul = parseNum(form.plakaBasinaMtul) || 3.2

    const kapasite10 = Math.round(hesapOzet.toplamPlaka * 1.1)
    const dakikaKapasite10 = hesapOzet.toplamDakika
    const uretimMtul10 = kapasite10 * plakaBasinaMtul
    const dakikaMaliyetKapasite10 = dakikaKapasite10 > 0 ? mevcutToplam / dakikaKapasite10 : 0
    const mtulMaliyetKapasite10 = uretimMtul10 > 0 ? mevcutToplam / uretimMtul10 : 0

    const sabit10DusukToplam = mevcutToplam - (hesapOzet.sabit * 0.10)
    const dakikaMaliyetSabit10 = mevcutDakikaKapasite > 0 ? sabit10DusukToplam / mevcutDakikaKapasite : 0

    const personel10DusukToplam = mevcutToplam - (hesapOzet.personel * 0.10)
    const dakikaMaliyetPersonel10 = mevcutDakikaKapasite > 0 ? personel10DusukToplam / mevcutDakikaKapasite : 0

    const mtul10Artis = plakaBasinaMtul * 1.1
    const mtulKazanci = mtul10Artis - plakaBasinaMtul

    const items = [
      {
        tone: 'blue',
        title: 'Kapasiteyi artır',
        impact: `${paraGoster(hesapOzet.mtulMaliyeti)} → ${paraGoster(mtulMaliyetKapasite10)}`,
        desc: `Aylık kapasiteyi yaklaşık %10 artırıp ${kapasite10} plakaya çıkarırsan 1 mtül maliyetin düşer.`,
      },
      {
        tone: 'amber',
        title: 'Sabit gideri sıkıştır',
        impact: `${paraGoster(mevcutDakika, 4)} → ${paraGoster(dakikaMaliyetSabit10, 4)}`,
        desc: `Sabit giderlerde %10 tasarruf sağlanırsa teklif motorun daha rekabetçi çalışır.`,
      },
      {
        tone: 'violet',
        title: 'Personel yükünü optimize et',
        impact: `${paraGoster(mevcutDakika, 4)} → ${paraGoster(dakikaMaliyetPersonel10, 4)}`,
        desc: `Personel toplam yükünde %10 verimlilik yakalanırsa dakika maliyeti aşağı gelir.`,
      },
      {
        tone: 'emerald',
        title: 'Plaka verimini artır',
        impact: `+${mtulKazanci.toFixed(2)} mtül/plaka`,
        desc: `Plaka başına mtül verimini %10 yükseltmek aynı kapasitede daha güçlü fiyatlama sağlar.`,
      },
    ]

    return items
  }, [hesapOzet, form.plakaBasinaMtul])

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
                Operasyon Motoru
              </p>
              <h1 className="mt-3 max-w-2xl text-3xl font-bold tracking-tight lg:text-4xl">
                Atölye Fiyat Motoru
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300">
                Tüm giderlerini, kapasiteni, makine ve araç sabit yükünü tek merkezden yönet. Buradaki veriler teklif motorunu ve dakika maliyetini doğrudan etkiler.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm font-medium text-cyan-200">
                  Kapasite %{kapasiteKullanim}
                </span>
                <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-4 py-2 text-sm font-medium text-amber-200">
                  Başabaş: {basabasIsAdedi} iş/ay
                </span>
                <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-sm font-medium text-emerald-200">
                  Maliyet: {maliyetTrendi}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-300">Dakika Maliyeti</p>
                <p className="mt-3 text-2xl font-bold">{paraGoster(hesapOzet.dakika, 4)}</p>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-300">Aylık Gider</p>
                <p className="mt-3 text-2xl font-bold">{paraGoster(hesapOzet.toplam)}</p>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-300">Günlük Gider</p>
                <p className="mt-3 text-2xl font-bold">{paraGoster(hesapOzet.gunluk)}</p>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-300">Aylık Kapasite</p>
                <p className="mt-3 text-2xl font-bold">{Math.round(hesapOzet.toplamPlaka)} plaka</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {aylikKontrolAcik && (
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-amber-700">Aylık kontrol zamanı</p>
              <h3 className="mt-1 text-xl font-bold text-slate-900">Bu ay gider veya kapasite verilerinde değişiklik var mı?</h3>
              <p className="mt-2 text-sm text-slate-600">
                Özellikle maaş, kira, elektrik, sarf malzeme, aylık plaka kapasitesi, yeni makine ve araç giderlerini gözden geçir.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={aylikKontrolKapat}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Bugün kontrol ettim
              </button>
              <button
                type="button"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 px-4 py-3 text-sm font-semibold text-white transition hover:scale-[1.01]"
              >
                Şimdi güncelle
              </button>
            </div>
          </div>
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <InsightCard title="Personel Gideri" value={paraGoster(hesapOzet.personel)} tone="blue" />
        <InsightCard title="Sabit Gider" value={paraGoster(hesapOzet.sabit)} tone="slate" />
        <InsightCard title="Makine + Araç Yükü" value={paraGoster(hesapOzet.makineAmortisman + hesapOzet.aracMaliyet)} tone="violet" />
        <InsightCard title="Aktif Çalışma Dakikası" value={`${Math.round(hesapOzet.toplamDakika).toLocaleString('tr-TR')} dk`} tone="emerald" sub="26 gün × 8 saat × 60 dk" />
        <InsightCard title="Aylık Üretim Mtül" value={`${hesapOzet.aylikUretimMtul.toFixed(2)} mtül`} tone="blue" sub={`${Math.round(hesapOzet.toplamPlaka)} plaka × ${hesapOzet.plakaBasinaMtul.toFixed(2)} mtül`} />
        <InsightCard title="Dakikalık Üretim" value={`${hesapOzet.dakikalikMtul.toFixed(4)} mtül/dk`} tone="violet" sub="Dakikada teorik mtül çıktısı" />
        <InsightCard title="1 Mtül Süresi" value={`${hesapOzet.birMtulDakika.toFixed(1)} dk`} tone="amber" sub={`1 plaka ≈ ${hesapOzet.plakaTeorikDakika.toFixed(1)} dk`} />
        <InsightCard title="1 Mtül Maliyeti" value={paraGoster(hesapOzet.mtulMaliyeti)} tone="rose" sub="Aylık gider / aylık mtül üretimi" />
      </section>

      <div
        className={cls(
          'rounded-3xl border p-5 shadow-[0_10px_30px_rgba(15,23,42,0.06)]',
          operasyonMesaji.tone === 'emerald' && 'border-emerald-200 bg-emerald-50',
          operasyonMesaji.tone === 'blue' && 'border-blue-200 bg-blue-50',
          operasyonMesaji.tone === 'amber' && 'border-amber-200 bg-amber-50',
          operasyonMesaji.tone === 'rose' && 'border-rose-200 bg-rose-50'
        )}
      >
        <p className="text-sm font-semibold text-slate-900">{operasyonMesaji.title}</p>
        <p className="mt-1 text-sm text-slate-600">{operasyonMesaji.desc}</p>
      </div>

      <SectionCard
        title="Akıllı öneriler"
        desc="Bu öneriler mevcut gider ve kapasite verilerine göre dakika maliyetini aşağı çekmek için canlı senaryolar üretir."
      >
        <div className="grid gap-4 xl:grid-cols-2">
          {akilliOneriler.map((o) => (
            <div
              key={o.title}
              className={cls(
                'rounded-3xl border p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]',
                o.tone === 'blue' && 'border-blue-200 bg-blue-50',
                o.tone === 'amber' && 'border-amber-200 bg-amber-50',
                o.tone === 'violet' && 'border-violet-200 bg-violet-50',
                o.tone === 'emerald' && 'border-emerald-200 bg-emerald-50'
              )}
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-base font-bold text-slate-900">{o.title}</p>
                  <p className="mt-2 text-sm text-slate-600">{o.desc}</p>
                </div>

                <div className="rounded-2xl border border-white/60 bg-white/70 px-4 py-3 text-sm font-semibold text-slate-900">
                  {o.impact}
                </div>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      <form onSubmit={kaydet} className="space-y-6">
        <SectionCard title="Firma kimliği" desc="Logo ve firma bilgileri teklif PDF’lerinde ve müşteri iletişiminde kullanılır.">
          <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm font-medium text-slate-500">Firma Logosu</p>
              <div className="mt-4 flex flex-col items-start gap-4">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt="Firma logosu"
                    className="h-24 rounded-2xl border border-slate-200 bg-white p-3 object-contain"
                  />
                ) : (
                  <div className="flex h-24 w-44 items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-white text-sm text-slate-400">
                    Logo yok
                  </div>
                )}

                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={logoYukle}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  disabled={logoYukleniyor}
                  className="rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 px-4 py-3 text-sm font-semibold text-white transition hover:scale-[1.01] disabled:opacity-70"
                >
                  {logoYukleniyor ? 'Yükleniyor...' : logoUrl ? 'Logoyu Değiştir' : 'Logo Yükle'}
                </button>

                <p className="text-xs text-slate-400">PNG, JPG — max 2MB</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Atölye Adı">
                <Input value={form.atolyeAdi} onChange={(e) => guncelle('atolyeAdi', e.target.value)} />
              </Field>
              <Field label="Telefon">
                <Input value={form.telefon} onChange={(e) => guncelle('telefon', e.target.value)} />
              </Field>
              <Field label="Şehir">
                <Input value={form.sehir} onChange={(e) => guncelle('sehir', e.target.value)} />
              </Field>
              <Field label="İlçe">
                <Input value={form.ilce} onChange={(e) => guncelle('ilce', e.target.value)} />
              </Field>
              <Field label="E-posta">
                <Input type="email" value={form.email} onChange={(e) => guncelle('email', e.target.value)} />
              </Field>
              <Field label="Adres" hint="PDF tekliflerde firma alt bilgisinde görünür.">
                <Input value={form.adres} onChange={(e) => guncelle('adres', e.target.value)} />
              </Field>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Teklif motoru ayarları" desc="Bu alanlar teklif çıktısında ve fiyat hesap motorunda temel varsayılanları belirler.">
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="KDV Oranı (%)">
              <Input type="number" value={form.kdvOrani} onChange={(e) => guncelle('kdvOrani', e.target.value)} />
            </Field>

            <Field label="Teklif Geçerlilik Süresi (gün)">
              <Input type="number" value={form.teklifGecerlilik} onChange={(e) => guncelle('teklifGecerlilik', e.target.value)} />
            </Field>

            <Field
              label="Plaka Başına Mtül"
              hint="Yeni iş ekranındaki plaka verimlilik varsayımı. Öğrenen sistem gibi davranır; ama ay başında kontrol edilmesi iyi olur."
            >
              <Input type="number" value={form.plakaBasinaMtul} onChange={(e) => guncelle('plakaBasinaMtul', e.target.value)} />
            </Field>
          </div>
        </SectionCard>

        <SectionCard title="Gider motoru" desc="Dakika maliyetini belirleyen ana yük burada oluşur.">
          <div className="grid gap-6 xl:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <h4 className="text-lg font-bold text-slate-900">Personel Giderleri</h4>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <Field label="Toplam Maaş">
                  <Input type="number" value={form.toplamMaas} onChange={(e) => guncelle('toplamMaas', e.target.value)} />
                </Field>
                <Field label="SGK Gideri">
                  <Input type="number" value={form.sgkGideri} onChange={(e) => guncelle('sgkGideri', e.target.value)} />
                </Field>
                <Field label="Yemek Gideri">
                  <Input type="number" value={form.yemekGideri} onChange={(e) => guncelle('yemekGideri', e.target.value)} />
                </Field>
                <Field label="Yol Gideri">
                  <Input type="number" value={form.yolGideri} onChange={(e) => guncelle('yolGideri', e.target.value)} />
                </Field>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <h4 className="text-lg font-bold text-slate-900">Sabit Giderler</h4>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <Field label="Kira">
                  <Input type="number" value={form.kira} onChange={(e) => guncelle('kira', e.target.value)} />
                </Field>
                <Field label="Elektrik">
                  <Input type="number" value={form.elektrik} onChange={(e) => guncelle('elektrik', e.target.value)} />
                </Field>
                <Field label="Su">
                  <Input type="number" value={form.su} onChange={(e) => guncelle('su', e.target.value)} />
                </Field>
                <Field label="Doğalgaz">
                  <Input type="number" value={form.dogalgaz} onChange={(e) => guncelle('dogalgaz', e.target.value)} />
                </Field>
                <Field label="İnternet">
                  <Input type="number" value={form.internet} onChange={(e) => guncelle('internet', e.target.value)} />
                </Field>
                <Field label="Sarf Malzeme">
                  <Input type="number" value={form.sarfMalzeme} onChange={(e) => guncelle('sarfMalzeme', e.target.value)} />
                </Field>
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Aylık kapasite" desc="Kapasite artık plaka → mtül dönüşümüyle okunur. Sistem 26 gün × 8 saat = 12.480 aktif çalışma dakikasını baz alır.">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Field label="Porselen Plaka (adet/ay)">
              <Input type="number" value={form.aylikPorselenPlaka} onChange={(e) => guncelle('aylikPorselenPlaka', e.target.value)} />
            </Field>
            <Field label="Kuvars Plaka (adet/ay)">
              <Input type="number" value={form.aylikKuvarsPlaka} onChange={(e) => guncelle('aylikKuvarsPlaka', e.target.value)} />
            </Field>
            <Field label="Doğaltaş Plaka (adet/ay)">
              <Input type="number" value={form.aylikDogaltasPlaka} onChange={(e) => guncelle('aylikDogaltasPlaka', e.target.value)} />
            </Field>
            <Field label="Toplam Kapasite">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800">
                {Math.round(hesapOzet.toplamPlaka)} plaka / ay
              </div>
            </Field>
          </div>
        </SectionCard>

        {mesaj && (
          <div
            className={cls(
              'rounded-2xl border p-4 text-sm shadow-[0_10px_30px_rgba(15,23,42,0.06)]',
              mesaj === 'Kaydedildi!'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-rose-200 bg-rose-50 text-rose-700'
            )}
          >
            {mesaj}
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={kaydediliyor}
            className="rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 px-5 py-3 text-sm font-semibold text-white transition hover:scale-[1.01] disabled:opacity-70"
          >
            {kaydediliyor ? 'Kaydediliyor...' : 'Atölye Ayarlarını Kaydet'}
          </button>

          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
            Son hesap: dakika {paraGoster(dakikaMaliyeti, 4)} · günlük {paraGoster(gunlukGider)}
          </div>
        </div>
      </form>

      <SectionCard title="Makine parkı" desc="Makine amortismanı dakika maliyetini yukarı çeker. Burayı eksik bırakma.">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-slate-500">
            Toplam makine: <strong className="text-slate-900">{makineler.length}</strong>
          </div>

          <button
            type="button"
            onClick={() => setMakineEkleAcik((v) => !v)}
            className="rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 px-4 py-3 text-sm font-semibold text-white transition hover:scale-[1.01]"
          >
            + Makine Ekle
          </button>
        </div>

        {makineler.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
            Henüz makine eklenmedi.
          </div>
        )}

        <div className="grid gap-4 xl:grid-cols-2">
          {makineler.map((m) => (
            <div key={m.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="text-lg font-bold text-slate-900">{m.makineAdi}</h4>
                  <p className="mt-1 text-sm text-slate-500">
                    {m.paraBirimi} · {Math.round(Number(m.amortismanSuresiAy || 0))} ay amortisman
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => makineSil(m.id)}
                  className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
                >
                  Sil
                </button>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-xs uppercase tracking-[0.12em] text-slate-400">Aylık Amortisman</p>
                  <p className="mt-2 text-lg font-bold text-slate-900">{paraGoster(Number(m.aylikAmortisman || 0))}</p>
                </div>

                <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
                  <p className="text-xs uppercase tracking-[0.12em] text-blue-600">Dakika Maliyeti</p>
                  <p className="mt-2 text-lg font-bold text-blue-700">{paraGoster(Number(m.dakikalikMaliyet || 0), 4)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {makineEkleAcik && (
          <div className="mt-6 rounded-3xl border border-blue-200 bg-blue-50 p-5">
            <h4 className="text-lg font-bold text-slate-900">Yeni Makine</h4>
            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <Field label="Makine Adı">
                <Input value={yeniMakine.makineAdi} onChange={(e) => setYeniMakine((p) => ({ ...p, makineAdi: e.target.value }))} />
              </Field>
              <Field label="Alınan Bedel">
                <Input type="number" value={yeniMakine.alinanBedel} onChange={(e) => setYeniMakine((p) => ({ ...p, alinanBedel: e.target.value }))} />
              </Field>
              <Field label="Para Birimi">
                <Select value={yeniMakine.paraBirimi} onChange={(e) => setYeniMakine((p) => ({ ...p, paraBirimi: e.target.value }))}>
                  <option>TRY</option>
                  <option>EUR</option>
                  <option>USD</option>
                </Select>
              </Field>
              <Field label="Amortisman (ay)">
                <Input type="number" value={yeniMakine.amortismanSuresiAy} onChange={(e) => setYeniMakine((p) => ({ ...p, amortismanSuresiAy: e.target.value }))} />
              </Field>
              <Field label="Aylık Aktif Çalışma (saat)">
                <Input type="number" value={yeniMakine.aylikAktifCalismaSaati} onChange={(e) => setYeniMakine((p) => ({ ...p, aylikAktifCalismaSaati: e.target.value }))} />
              </Field>
            </div>

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={makineKaydet}
                className="rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 px-4 py-3 text-sm font-semibold text-white transition hover:scale-[1.01]"
              >
                Kaydet
              </button>
              <button
                type="button"
                onClick={() => setMakineEkleAcik(false)}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                İptal
              </button>
            </div>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Araç filosu" desc="Araç sabit giderleri teklif karlılığını görünmeyen taraftan baskılar.">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-slate-500">
            Toplam araç: <strong className="text-slate-900">{araclar.length}</strong>
          </div>

          <button
            type="button"
            onClick={() => setAracEkleAcik((v) => !v)}
            className="rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 px-4 py-3 text-sm font-semibold text-white transition hover:scale-[1.01]"
          >
            + Araç Ekle
          </button>
        </div>

        {araclar.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
            Henüz araç eklenmedi.
          </div>
        )}

        <div className="grid gap-4 xl:grid-cols-2">
          {araclar.map((a) => (
            <div key={a.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="text-lg font-bold text-slate-900">{a.aracAdi}</h4>
                  <p className="mt-1 text-sm text-slate-500">{a.aracTipi}</p>
                </div>

                <button
                  type="button"
                  onClick={() => aracSil(a.id)}
                  className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
                >
                  Sil
                </button>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-xs uppercase tracking-[0.12em] text-slate-400">Aylık Amortisman</p>
                  <p className="mt-2 text-lg font-bold text-slate-900">{paraGoster(Number(a.aylikAmortisman || 0))}</p>
                </div>

                <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4">
                  <p className="text-xs uppercase tracking-[0.12em] text-violet-600">Aylık Toplam Sabit</p>
                  <p className="mt-2 text-lg font-bold text-violet-700">{paraGoster(Number(a.aylikToplamSabitMaliyet || 0))}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {aracEkleAcik && (
          <div className="mt-6 rounded-3xl border border-blue-200 bg-blue-50 p-5">
            <h4 className="text-lg font-bold text-slate-900">Yeni Araç</h4>
            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Field label="Araç Adı / Modeli">
                <Input value={yeniArac.aracAdi} onChange={(e) => setYeniArac((p) => ({ ...p, aracAdi: e.target.value }))} />
              </Field>
              <Field label="Araç Tipi">
                <Select value={yeniArac.aracTipi} onChange={(e) => setYeniArac((p) => ({ ...p, aracTipi: e.target.value }))}>
                  <option>Kamyon</option>
                  <option>Kamyonet</option>
                  <option>Binek</option>
                  <option>Diğer</option>
                </Select>
              </Field>
              <Field label="Alınan Bedel">
                <Input type="number" value={yeniArac.alinanBedel} onChange={(e) => setYeniArac((p) => ({ ...p, alinanBedel: e.target.value }))} />
              </Field>
              <Field label="Para Birimi">
                <Select value={yeniArac.paraBirimi} onChange={(e) => setYeniArac((p) => ({ ...p, paraBirimi: e.target.value }))}>
                  <option>TRY</option>
                  <option>EUR</option>
                  <option>USD</option>
                </Select>
              </Field>
              <Field label="Amortisman (ay)">
                <Input type="number" value={yeniArac.amortismanSuresiAy} onChange={(e) => setYeniArac((p) => ({ ...p, amortismanSuresiAy: e.target.value }))} />
              </Field>
              <Field label="Aylık Bakım">
                <Input type="number" value={yeniArac.aylikBakim} onChange={(e) => setYeniArac((p) => ({ ...p, aylikBakim: e.target.value }))} />
              </Field>
              <Field label="Aylık Sigorta/Kasko">
                <Input type="number" value={yeniArac.aylikSigortaKasko} onChange={(e) => setYeniArac((p) => ({ ...p, aylikSigortaKasko: e.target.value }))} />
              </Field>
              <Field label="Aylık Vergi/Muayene">
                <Input type="number" value={yeniArac.aylikVergiMuayene} onChange={(e) => setYeniArac((p) => ({ ...p, aylikVergiMuayene: e.target.value }))} />
              </Field>
            </div>

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={aracKaydet}
                className="rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 px-4 py-3 text-sm font-semibold text-white transition hover:scale-[1.01]"
              >
                Kaydet
              </button>
              <button
                type="button"
                onClick={() => setAracEkleAcik(false)}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                İptal
              </button>
            </div>
          </div>
        )}
      </SectionCard>
    </div>
  )
}





