'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

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
  kurulusYili: string
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

function emptyForm(): FormState {
  return {
    atolyeAdi: '',
    sehir: '',
    ilce: '',
    telefon: '',
    email: '',
    adres: '',
  kurulusYili: '',
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

function n(v: any) {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0
  const cleaned = String(v || '').replace(',', '.').replace(/[^0-9.\-]/g, '')
  const first = cleaned.indexOf('.')
  const normalized = first >= 0 ? cleaned.slice(0, first + 1) + cleaned.slice(first + 1).replace(/\./g, '') : cleaned
  const out = Number(normalized)
  return Number.isFinite(out) ? out : 0
}

function tl(v: any) {
  return Number(v || 0).toLocaleString('tr-TR', { maximumFractionDigits: 2 }) + ' ₺'
}

function pct(v: any) {
  return '%' + Number(v || 0).toLocaleString('tr-TR', { maximumFractionDigits: 1 })
}

export default function AtolyePage() {
  const logoInputRef = useRef<HTMLInputElement | null>(null)

  const [form, setForm] = useState<FormState>(emptyForm())
  const [makineler, setMakineler] = useState<Makine[]>([])
  const [araclar, setAraclar] = useState<Arac[]>([])
  const [logoUrl, setLogoUrl] = useState('')
  const [aktifSol, setAktifSol] = useState<'kimlik' | 'gider' | 'kapasite'>('kimlik')
  const [makineModal, setMakineModal] = useState(false)
  const [aracModal, setAracModal] = useState(false)
  const [detayModal, setDetayModal] = useState<'makine' | 'arac' | null>(null)
  const [kaydediliyor, setKaydediliyor] = useState(false)
  const [giderModal, setGiderModal] = useState(false)
  const [yeniGider, setYeniGider] = useState({ giderAdi: '', tutar: '' })
  const [mesaj, setMesaj] = useState('')
  const [logoYukleniyor, setLogoYukleniyor] = useState(false)

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

  async function yukle() {
    const [a, m, ar] = await Promise.all([
      fetch('/api/atolye'),
      fetch('/api/makineler'),
      fetch('/api/araclar'),
    ])

    const av = await a.json()
    const mv = await m.json()
    const arv = await ar.json()

    if (av.atolye) {
      const x = av.atolye
      setForm({
        atolyeAdi: String(x.atolyeAdi || ''),
        sehir: String(x.sehir || ''),
        ilce: String(x.ilce || ''),
        telefon: String(x.telefon || ''),
        email: String(x.email || ''),
        adres: String(x.adres || ''),
        kurulusYili: String(x.kurulusYili || ''),
        toplamMaas: String(x.toplamMaas || ''),
        sgkGideri: String(x.sgkGideri || ''),
        yemekGideri: String(x.yemekGideri || ''),
        yolGideri: String(x.yolGideri || ''),
        kira: String(x.kira || ''),
        elektrik: String(x.elektrik || ''),
        su: String(x.su || ''),
        dogalgaz: String(x.dogalgaz || ''),
        internet: String(x.internet || ''),
        sarfMalzeme: String(x.sarfMalzeme || ''),
        aylikPorselenPlaka: String(x.aylikPorselenPlaka || ''),
        aylikKuvarsPlaka: String(x.aylikKuvarsPlaka || ''),
        aylikDogaltasPlaka: String(x.aylikDogaltasPlaka || ''),
        plakaBasinaMtul: String(x.plakaBasinaMtul || '3.20'),
        kdvOrani: String(x.kdvOrani || '20'),
        teklifGecerlilik: String(x.teklifGecerlilik || '15'),
      })
      setLogoUrl(x.logoUrl || '')
    }

    setMakineler(mv.makineler || [])
    setAraclar(arv.araclar || [])
  }

  useEffect(() => {
    yukle()
  }, [])

  function setAlan(k: keyof FormState, v: string) {
    setForm(prev => ({ ...prev, [k]: k === 'plakaBasinaMtul' ? v.replace(',', '.') : v }))
  }

  const hesap = useMemo(() => {
    const personel = n(form.toplamMaas) + n(form.sgkGideri) + n(form.yemekGideri) + n(form.yolGideri)
    const sabit = n(form.kira) + n(form.elektrik) + n(form.su) + n(form.dogalgaz) + n(form.internet) + n(form.sarfMalzeme)
    const makine = makineler.reduce((a, m) => a + Number(m.aylikAmortisman || 0), 0)
    const arac = araclar.reduce((a, x) => a + Number(x.aylikToplamSabitMaliyet || 0), 0)
    const toplam = personel + sabit + makine + arac
    const toplamDakika = 26 * 8 * 60
    const dakika = toplamDakika > 0 ? toplam / toplamDakika : 0
    const gunluk = toplam / 26

    const toplamPlaka = n(form.aylikPorselenPlaka) + n(form.aylikKuvarsPlaka) + n(form.aylikDogaltasPlaka)
    const aylikMtul = toplamPlaka * n(form.plakaBasinaMtul)
    const mtulMaliyet = aylikMtul > 0 ? toplam / aylikMtul : 0
    const plakaMaliyet = toplamPlaka > 0 ? toplam / toplamPlaka : 0

    const oran = (v: number) => toplam > 0 ? (v / toplam) * 100 : 0
    const verimlilik = toplamPlaka <= 0
      ? 0
      : Math.max(0, Math.min(100, 100 - Math.max(0, dakika - 75)))

    let durum = 'Kapasite eksik'
    let durumTone = 'text-red-300 border-red-500/30 bg-red-500/10'
    let tavsiye = 'Aylık plaka kapasitesi girilmeden maliyet motoru güvenilir çalışmaz.'

    if (toplamPlaka > 0 && dakika < 75) {
      durum = 'Verimli'
      durumTone = 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10'
      tavsiye = 'Dakika maliyeti sağlıklı görünüyor. Tekliflerde kâr marjını koru.'
    } else if (toplamPlaka > 0 && dakika < 125) {
      durum = 'Kontrollü'
      durumTone = 'text-amber-300 border-amber-500/30 bg-amber-500/10'
      tavsiye = 'Maliyet orta seviyede. Kapasiteyi artırmak fiyat baskısını azaltır.'
    } else if (toplamPlaka > 0) {
      durum = 'Riskli'
      durumTone = 'text-red-300 border-red-500/30 bg-red-500/10'
      tavsiye = 'Dakika maliyeti yüksek. Sabit gider veya kapasite varsayımı yeniden kontrol edilmeli.'
    }

    return {
      personel,
      sabit,
      makine,
      arac,
      toplam,
      dakika,
      gunluk,
      toplamPlaka,
      aylikMtul,
      mtulMaliyet,
      plakaMaliyet,
      oranPersonel: oran(personel),
      oranSabit: oran(sabit),
      oranMakine: oran(makine),
      oranArac: oran(arac),
      verimlilik,
      durum,
      durumTone,
      tavsiye,
    }
  }, [form, makineler, araclar])

  async function kaydet() {
    setKaydediliyor(true)
    setMesaj('')
    try {
      const res = await fetch('/api/atolye', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          kurulusYili: Math.round(n(form.kurulusYili)) || 0,
          toplamMaas: n(form.toplamMaas),
          sgkGideri: n(form.sgkGideri),
          yemekGideri: n(form.yemekGideri),
          yolGideri: n(form.yolGideri),
          kira: n(form.kira),
          elektrik: n(form.elektrik),
          su: n(form.su),
          dogalgaz: n(form.dogalgaz),
          internet: n(form.internet),
          sarfMalzeme: n(form.sarfMalzeme),
          aylikPorselenPlaka: Math.round(n(form.aylikPorselenPlaka)),
          aylikKuvarsPlaka: Math.round(n(form.aylikKuvarsPlaka)),
          aylikDogaltasPlaka: Math.round(n(form.aylikDogaltasPlaka)),
          plakaBasinaMtul: n(form.plakaBasinaMtul) || 3.2,
          kdvOrani: Math.round(n(form.kdvOrani)) || 20,
          teklifGecerlilik: Math.round(n(form.teklifGecerlilik)) || 15,
        }),
      })

      if (!res.ok) {
        setMesaj('Kayıt başarısız.')
        return
      }

      await yukle()
      setMesaj('Kaydedildi.')
    } finally {
      setKaydediliyor(false)
    }
  }

  async function logoYukle(e: React.ChangeEvent<HTMLInputElement>) {
    const dosya = e.target.files?.[0]
    if (!dosya) return

    setLogoYukleniyor(true)
    const fd = new FormData()
    fd.append('logo', dosya)

    try {
      const res = await fetch('/api/logo', { method: 'POST', body: fd })
      const json = await res.json()
      if (json.logoUrl) setLogoUrl(json.logoUrl)
    } finally {
      setLogoYukleniyor(false)
    }
  }

  async function makineKaydet() {
    const res = await fetch('/api/makineler', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        makineAdi: yeniMakine.makineAdi,
        alinanBedel: n(yeniMakine.alinanBedel),
        paraBirimi: yeniMakine.paraBirimi,
        amortismanSuresiAy: Math.round(n(yeniMakine.amortismanSuresiAy)),
        aylikAktifCalismaSaati: n(yeniMakine.aylikAktifCalismaSaati),
      }),
    })

    const json = await res.json()
    if (json.makine) {
      setMakineler(prev => [...prev, json.makine])
      setMakineModal(false)
      setYeniMakine({ makineAdi: '', alinanBedel: '', paraBirimi: 'TRY', amortismanSuresiAy: '', aylikAktifCalismaSaati: '' })
    }
  }

  async function aracKaydet() {
    const res = await fetch('/api/araclar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        aracAdi: yeniArac.aracAdi,
        aracTipi: yeniArac.aracTipi,
        alinanBedel: n(yeniArac.alinanBedel),
        paraBirimi: yeniArac.paraBirimi,
        amortismanSuresiAy: Math.round(n(yeniArac.amortismanSuresiAy)),
        aylikBakim: n(yeniArac.aylikBakim),
        aylikSigortaKasko: n(yeniArac.aylikSigortaKasko),
        aylikVergiMuayene: n(yeniArac.aylikVergiMuayene),
      }),
    })

    const json = await res.json()
    if (json.arac) {
      setAraclar(prev => [...prev, json.arac])
      setAracModal(false)
      setYeniArac({ aracAdi: '', aracTipi: 'Kamyonet', alinanBedel: '', paraBirimi: 'TRY', amortismanSuresiAy: '', aylikBakim: '', aylikSigortaKasko: '', aylikVergiMuayene: '' })
    }
  }

  async function makineSil(id: string) {
    await fetch('/api/makineler', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    setMakineler(prev => prev.filter(x => x.id !== id))
  }

  async function aracSil(id: string) {
    await fetch('/api/araclar', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    setAraclar(prev => prev.filter(x => x.id !== id))
  }

  return (
    <div className="h-screen overflow-hidden bg-[#030712] text-white p-3">
      <div className="grid h-full grid-cols-[270px_minmax(0,1fr)_290px] gap-3">

        <aside className="rounded-3xl border border-slate-800 bg-[#0B1120] p-3 overflow-hidden flex flex-col">
          <p className="text-xs tracking-[0.25em] text-slate-500 uppercase">Metrix</p>
          <h1 className="mt-2 text-2xl font-semibold">Atölye</h1>

          <div className="mt-4 rounded-2xl border border-slate-800 bg-[#111827] p-4">
            <div className="flex items-center gap-3">
              <div className="h-14 w-14 overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 flex items-center justify-center">
                {logoUrl ? <img src={logoUrl} alt="Logo" className="h-full w-full object-cover" /> : <span className="text-xs text-slate-500">Logo</span>}
              </div>
              <div className="min-w-0">
                <p className="truncate font-semibold">{form.atolyeAdi || 'Atölye Adı'}</p>
                <p className="text-xs text-slate-400">{[form.sehir, form.ilce].filter(Boolean).join(' / ') || 'Konum yok'}</p>
              </div>
            </div>

            <button
              onClick={() => logoInputRef.current?.click()}
              className="mt-3 w-full rounded-xl border border-slate-700 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800"
            >
              {logoYukleniyor ? 'Yükleniyor...' : 'Logo Yükle'}
            </button>
            <input ref={logoInputRef} onChange={logoYukle} type="file" accept="image/*" className="hidden" />
          </div>

          <div className="mt-4 grid gap-2">
            <SideButton active={aktifSol === 'kimlik'} onClick={() => setAktifSol('kimlik')} title="Atölye Bilgileri" sub="Kimlik, iletişim" />
            <SideButton active={aktifSol === 'gider'} onClick={() => setAktifSol('gider')} title="Giderler" sub="Personel ve sabit gider" />
            <SideButton active={aktifSol === 'kapasite'} onClick={() => setAktifSol('kapasite')} title="Kapasite" sub="Plaka, mtül, teklif" />
          </div>

          <div className="mt-4 flex-1 rounded-2xl border border-slate-800 bg-[#111827] p-3 overflow-hidden">
            {aktifSol === 'kimlik' && (
              <div className="grid gap-2">
                <Input label="Atölye Adı" value={form.atolyeAdi} onChange={v => setAlan('atolyeAdi', v)} />
                <Input label="Şehir" value={form.sehir} onChange={v => setAlan('sehir', v)} />
                <Input label="İlçe" value={form.ilce} onChange={v => setAlan('ilce', v)} />
                <Input label="Telefon" value={form.telefon} onChange={v => setAlan('telefon', v)} />
                <Input label="Kuruluş Yılı" value={form.kurulusYili} onChange={v => setAlan('kurulusYili', v)} />
                <Input label="E-posta" value={form.email} onChange={v => setAlan('email', v)} />
              </div>
            )}

            {aktifSol === 'gider' && (
              <div className="grid gap-2">
                <Input label="Toplam Maaş" value={form.toplamMaas} onChange={v => setAlan('toplamMaas', v)} />
                <Input label="SGK" value={form.sgkGideri} onChange={v => setAlan('sgkGideri', v)} />
                <Input label="Yemek" value={form.yemekGideri} onChange={v => setAlan('yemekGideri', v)} />
                <Input label="Yol" value={form.yolGideri} onChange={v => setAlan('yolGideri', v)} />
                <Input label="Kira" value={form.kira} onChange={v => setAlan('kira', v)} />
                <Input label="Elektrik" value={form.elektrik} onChange={v => setAlan('elektrik', v)} />
                <Input label="Sarf" value={form.sarfMalzeme} onChange={v => setAlan('sarfMalzeme', v)} />
              </div>
            )}

            {aktifSol === 'kapasite' && (
              <div className="grid gap-2">
                <Input label="Porselen Plaka/Ay" value={form.aylikPorselenPlaka} onChange={v => setAlan('aylikPorselenPlaka', v)} />
                <Input label="Kuvars Plaka/Ay" value={form.aylikKuvarsPlaka} onChange={v => setAlan('aylikKuvarsPlaka', v)} />
                <Input label="Doğaltaş Plaka/Ay" value={form.aylikDogaltasPlaka} onChange={v => setAlan('aylikDogaltasPlaka', v)} />
                <Input label="Plaka Başına Mtül" value={form.plakaBasinaMtul} onChange={v => setAlan('plakaBasinaMtul', v)} />
                <Input label="KDV %" value={form.kdvOrani} onChange={v => setAlan('kdvOrani', v)} />
                <Input label="Teklif Geçerlilik" value={form.teklifGecerlilik} onChange={v => setAlan('teklifGecerlilik', v)} />
              </div>
            )}
          </div>
        </aside>

        <main className="min-w-0 rounded-3xl border border-slate-800 bg-[#0B1120] p-5 overflow-hidden">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs tracking-[0.25em] text-slate-500 uppercase">Maliyet Motoru</p>
              <h2 className="mt-2 text-3xl font-semibold">Atölye Kârlılık Paneli</h2>
            </div>

            <span className={`rounded-full border px-4 py-2 text-sm font-semibold ${hesap.durumTone}`}>
              Verimlilik %{hesap.verimlilik.toFixed(0)}
            </span>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <Kpi label="Aylık Gider" value={tl(hesap.toplam)} />
            <Kpi label="Dakika Maliyeti" value={tl(hesap.dakika)} tone="text-emerald-300" />
            <Kpi label="Günlük Gider" value={tl(hesap.gunluk)} />
            <Kpi label="Mtül Maliyeti" value={tl(hesap.mtulMaliyet)} tone="text-cyan-300" />
          </div>

          <div className="mt-5 grid grid-cols-[1.2fr_0.8fr] gap-4">
            <section className="rounded-3xl border border-slate-800 bg-[#111827] p-5">
              <p className="text-sm text-slate-400">Üretim Modeli</p>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <ModelCard label="Aylık Plaka" value={hesap.toplamPlaka.toFixed(0)} sub="adet" />
                <ModelCard label="Aylık Mtül" value={hesap.aylikMtul.toLocaleString('tr-TR', { maximumFractionDigits: 1 })} sub="mtül" />
                <ModelCard label="Çalışma" value="12.480" sub="dk/ay" />
                <ModelCard label="Plaka Maliyeti" value={Math.round(hesap.plakaMaliyet).toLocaleString("tr-TR")} sub="₺ / plaka" compact />
              </div>

              <div className="mt-6">
                <div className="mb-2 flex justify-between text-xs text-slate-400">
                  <span>Gider Dağılımı</span>
                  <span>{tl(hesap.toplam)}</span>
                </div>

                <div className="h-5 overflow-hidden rounded-full bg-slate-800 flex">
                  <div style={{ width: `${hesap.oranPersonel}%` }} className="bg-blue-500" />
                  <div style={{ width: `${hesap.oranSabit}%` }} className="bg-emerald-500" />
                  <div style={{ width: `${hesap.oranMakine}%` }} className="bg-amber-500" />
                  <div style={{ width: `${hesap.oranArac}%` }} className="bg-violet-500" />
                </div>

                <div className="mt-4 grid grid-cols-4 gap-2 text-xs">
                  <Break label="Personel" value={pct(hesap.oranPersonel)} color="bg-blue-500" />
                  <Break label="Sabit" value={pct(hesap.oranSabit)} color="bg-emerald-500" />
                  <Break label="Makine" value={pct(hesap.oranMakine)} color="bg-amber-500" />
                  <Break label="Araç" value={pct(hesap.oranArac)} color="bg-violet-500" />
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-800 bg-[#111827] p-5">
              <p className="text-sm text-slate-400">Kaynaklar</p>

              <div className="mt-2 grid gap-1.5">
                <ResourceCard title="Makineler" count={makineler.length} value={tl(hesap.makine)} onDetail={() => setDetayModal('makine')} onAdd={() => setMakineModal(true)} />
                <ResourceCard title="Araçlar" count={araclar.length} value={tl(hesap.arac)} onDetail={() => setDetayModal('arac')} onAdd={() => setAracModal(true)} />
              </div>

              <div className="mt-5 rounded-2xl border border-slate-800 bg-[#0B1120] p-4">
                <p className="text-xs text-slate-500">Operasyon Notu</p>
                <p className="mt-2 text-sm text-slate-300">{hesap.tavsiye}</p>
              </div>
            </section>
          </div>

          <div className="mt-4 grid grid-cols-4 gap-3">
            <SmallStat label="Personel" value={tl(hesap.personel)} />
            <SmallStat label="Sabit Gider" value={tl(hesap.sabit)} />
            <SmallStat label="Makine Amort." value={tl(hesap.makine)} />
            <SmallStat label="Araç Maliyeti" value={tl(hesap.arac)} />
          </div>
        </main>

        <aside className="rounded-3xl border border-slate-800 bg-[#0B1120] p-4 overflow-hidden flex flex-col">
          <p className="text-xs tracking-[0.25em] text-slate-500 uppercase">Karar Paneli</p>
          <h2 className="mt-1 text-lg font-semibold">Canlı Özet</h2>

          <div className="mt-2 grid gap-1.5">
            <RightCard label="Verimlilik" value={`%${hesap.verimlilik.toFixed(0)}`} />
            <RightCard label="Dakika" value={tl(hesap.dakika)} />
            <RightCard label="Günlük Gider" value={tl(hesap.gunluk)} />
            <RightCard label="Aylık Plaka" value={`${hesap.toplamPlaka.toFixed(0)} adet`} />
            <RightCard label="Aylık Mtül" value={`${hesap.aylikMtul.toFixed(1)} mtül`} />
          </div>

          <div className={`mt-4 rounded-2xl border p-4 ${hesap.durumTone}`}>
            <p className="text-sm font-semibold">{hesap.durum}</p>
            <p className="mt-2 text-xs opacity-90">{hesap.tavsiye}</p>
          </div>

          <div className="mt-auto grid gap-2 pt-2">
            <button onClick={kaydet} disabled={kaydediliyor} className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold hover:bg-emerald-500 disabled:bg-slate-700">
              {kaydediliyor ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
            <button onClick={() => setMakineModal(true)} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold hover:bg-blue-500">
              + Makine Ekle
            </button>
            <button onClick={() => setAracModal(true)} className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold hover:bg-violet-500">
              + Araç Ekle
            </button>
            <button onClick={() => setGiderModal(true)} className="rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-semibold hover:bg-amber-500">
              + Gider Ekle
            </button>
            {mesaj && <p className="text-center text-xs text-emerald-300">{mesaj}</p>}
          </div>
        </aside>
      </div>


      
      {giderModal && (
        <Modal title="Yeni Gider Kalemi" onClose={() => setGiderModal(false)}>
          <Input
            label="Gider Adı"
            value={yeniGider.giderAdi}
            onChange={v => setYeniGider({ ...yeniGider, giderAdi: v })}
          />
          <Input
            label="Tutar"
            value={yeniGider.tutar}
            onChange={v => setYeniGider({ ...yeniGider, tutar: v })}
          />
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-200">
            Bu gider şimdilik Sarf / Ek Gider toplamına eklenir.
          </div>
          <button
            onClick={() => {
              const mevcut = n(form.sarfMalzeme)
              const ek = n(yeniGider.tutar)
              setForm(prev => ({ ...prev, sarfMalzeme: String(mevcut + ek) }))
              setYeniGider({ giderAdi: '', tutar: '' })
              setGiderModal(false)
            }}
            className="mt-4 w-full rounded-xl bg-emerald-600 py-3 font-semibold"
          >
            Gideri Ekle
          </button>
        </Modal>
      )}

      {makineModal && (
        <Modal title="Yeni Makine" onClose={() => setMakineModal(false)}>
          <Input label="Makine Adı" value={yeniMakine.makineAdi} onChange={v => setYeniMakine({ ...yeniMakine, makineAdi: v })} />
          <Input label="Alınan Bedel" value={yeniMakine.alinanBedel} onChange={v => setYeniMakine({ ...yeniMakine, alinanBedel: v })} />
          <Input label="Amortisman Ay" value={yeniMakine.amortismanSuresiAy} onChange={v => setYeniMakine({ ...yeniMakine, amortismanSuresiAy: v })} />
          <Input label="Aylık Aktif Saat" value={yeniMakine.aylikAktifCalismaSaati} onChange={v => setYeniMakine({ ...yeniMakine, aylikAktifCalismaSaati: v })} />
          <button onClick={makineKaydet} className="mt-4 w-full rounded-xl bg-emerald-600 py-3 font-semibold">Kaydet</button>
        </Modal>
      )}

      {aracModal && (
        <Modal title="Yeni Araç" onClose={() => setAracModal(false)}>
          <Input label="Araç Adı" value={yeniArac.aracAdi} onChange={v => setYeniArac({ ...yeniArac, aracAdi: v })} />
          <Input label="Araç Tipi" value={yeniArac.aracTipi} onChange={v => setYeniArac({ ...yeniArac, aracTipi: v })} />
          <Input label="Alınan Bedel" value={yeniArac.alinanBedel} onChange={v => setYeniArac({ ...yeniArac, alinanBedel: v })} />
          <Input label="Amortisman Ay" value={yeniArac.amortismanSuresiAy} onChange={v => setYeniArac({ ...yeniArac, amortismanSuresiAy: v })} />
          <Input label="Aylık Bakım" value={yeniArac.aylikBakim} onChange={v => setYeniArac({ ...yeniArac, aylikBakim: v })} />
          <Input label="Sigorta/Kasko" value={yeniArac.aylikSigortaKasko} onChange={v => setYeniArac({ ...yeniArac, aylikSigortaKasko: v })} />
          <Input label="Vergi/Muayene" value={yeniArac.aylikVergiMuayene} onChange={v => setYeniArac({ ...yeniArac, aylikVergiMuayene: v })} />
          <button onClick={aracKaydet} className="mt-4 w-full rounded-xl bg-emerald-600 py-3 font-semibold">Kaydet</button>
        </Modal>
      )}

      {detayModal === 'makine' && (
        <Modal title="Makineler" onClose={() => setDetayModal(null)}>
          <div className="grid gap-2">
            {makineler.map(m => (
              <div key={m.id} className="rounded-xl border border-slate-700 bg-[#111827] p-3">
                <div className="flex justify-between gap-3">
                  <div>
                    <p className="font-semibold">{m.makineAdi}</p>
                    <p className="text-xs text-slate-400">{tl(m.dakikalikMaliyet)} / dk · {tl(m.aylikAmortisman)} / ay</p>
                  </div>
                  <button onClick={() => makineSil(m.id)} className="text-xs text-red-300">Sil</button>
                </div>
              </div>
            ))}
          </div>
        </Modal>
      )}

      {detayModal === 'arac' && (
        <Modal title="Araçlar" onClose={() => setDetayModal(null)}>
          <div className="grid gap-2">
            {araclar.map(a => (
              <div key={a.id} className="rounded-xl border border-slate-700 bg-[#111827] p-3">
                <div className="flex justify-between gap-3">
                  <div>
                    <p className="font-semibold">{a.aracAdi}</p>
                    <p className="text-xs text-slate-400">{a.aracTipi} · {tl(a.aylikToplamSabitMaliyet)} / ay</p>
                  </div>
                  <button onClick={() => aracSil(a.id)} className="text-xs text-red-300">Sil</button>
                </div>
              </div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  )
}

function Input({ label, value, onChange, type = "text" }: any) {
  return (
    <label className="block">
      <p className="mb-0.5 text-[10px] text-slate-400">{label}</p>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 w-full rounded-lg border border-slate-700 bg-[#0B1120] px-3 text-sm text-white outline-none focus:border-blue-500"
      />
    </label>
  )
}

function SideButton({ active, title, sub, onClick }: any) {
  return (
    <button onClick={onClick} className={`rounded-2xl border p-3 text-left ${active ? 'border-blue-500/50 bg-blue-500/10' : 'border-slate-800 bg-[#111827]'}`}>
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-1 text-xs text-slate-400">{sub}</p>
    </button>
  )
}

function Kpi({ label, value, tone = 'text-white' }: any) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-[#111827] p-3">
      <p className="text-xs text-slate-400">{label}</p>
      <p className={`mt-2 text-xl font-semibold ${tone}`}>{value}</p>
    </div>
  )
}

function ModelCard({ label, value, sub, compact = false }: any) {
  return (
    <div className="min-w-0 rounded-2xl border border-slate-800 bg-[#0B1120] p-4">
      <p className="text-xs text-slate-400">{label}</p>
      <div className="mt-3 flex items-end gap-2">
        <p className={`${compact ? 'text-[26px]' : 'text-[30px]'} font-semibold leading-none tracking-tight tabular-nums`}>
          {value}
        </p>
        <p className="pb-1 text-xs text-slate-500 whitespace-nowrap">{sub}</p>
      </div>
    </div>
  )
}

function Break({ label, value, color }: any) {
  return (
    <div className="rounded-xl bg-[#0B1120] p-3">
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${color}`} />
        <span className="text-slate-400">{label}</span>
      </div>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  )
}

function ResourceCard({ title, count, value, onAdd, onDetail }: any) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-[#0B1120] p-4">
      <div className="flex justify-between">
        <div>
          <p className="text-sm font-semibold">{title}</p>
          <p className="mt-1 text-xs text-slate-400">{count} kayıt · {value}</p>
        </div>
        <button onClick={onAdd} className="rounded-lg bg-blue-600 px-2 text-xs">+</button>
      </div>
      <button onClick={onDetail} className="mt-3 w-full rounded-xl border border-slate-700 py-2 text-xs text-slate-300">
        Detayları Gör
      </button>
    </div>
  )
}

function SmallStat({ label, value }: any) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-[#111827] p-3">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-2 font-semibold">{value}</p>
    </div>
  )
}

function RightCard({ label, value }: any) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-[#111827] p-3">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  )
}

function Modal({ title, children, onClose }: any) {
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="w-full max-w-xl rounded-3xl border border-slate-800 bg-[#0B1120] p-6 text-white shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-semibold">{title}</h2>
          <button onClick={onClose} className="rounded-xl border border-slate-700 px-3 py-1 text-slate-300">Kapat</button>
        </div>
        <div className="grid gap-3">{children}</div>
      </div>
    </div>
  )
}
