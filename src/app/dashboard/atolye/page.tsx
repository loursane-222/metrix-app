'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { formatMtulTR } from '@/lib/format'

function Input({ label, value, onChange }: any) {
  return (
    <label className="block">
      <p className="mb-0.5 text-[10px] text-slate-400">{label}</p>
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)}
        className="h-10 md:h-8 w-full rounded-lg border border-slate-700 bg-[#0B1120] px-3 text-sm text-white outline-none focus:border-blue-500" />
    </label>
  )
}


function ParaInput({ label, fieldKey, ort, value, onChange }: { label: string; fieldKey: keyof FormState; ort?: number; value: string; onChange: (key: keyof FormState, val: string) => void }) {
  const display = tlInput(value)
  const hasOrt = ort && ort > 0 && String(Math.round(ort)) !== value.replace(/\./g, '')
  return (
    <label className="block">
      <div className="mb-0.5 flex items-center justify-between">
        <p className="text-[10px] text-slate-400">{label}</p>
        {hasOrt && (
          <span className="text-[9px] text-blue-400 cursor-pointer" onClick={() => onChange(fieldKey, String(Math.round(ort!)))}>
            ort: {Math.round(ort!).toLocaleString('tr-TR')} ₺ ↑
          </span>
        )}
      </div>
      <div className="relative">
        <input
          type="text"
          inputMode="numeric"
          value={display}
          onChange={e => {
            const raw = e.target.value.replace(/\./g, '').replace(/[^0-9]/g, '')
            onChange(fieldKey, raw)
          }}
          className="h-10 md:h-8 w-full rounded-lg border border-slate-700 bg-[#0B1120] px-3 pr-7 text-sm text-white outline-none focus:border-blue-500"
        />
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-500">₺</span>
      </div>
    </label>
  )
}

type Makine = {
  id: string; makineAdi: string; alinanBedel: number; paraBirimi: string
  amortismanSuresiAy: number; aylikAktifCalismaSaati: number
  aylikAmortisman: number; saatlikMaliyet: number; dakikalikMaliyet: number
}
type Arac = {
  id: string; aracAdi: string; aracTipi: string; alinanBedel: number; paraBirimi: string
  amortismanSuresiAy: number; aylikBakim: number; aylikSigortaKasko: number
  aylikVergiMuayene: number; aylikAmortisman: number; aylikToplamSabitMaliyet: number
}
type FormState = {
  atolyeAdi: string; sehir: string; ilce: string; telefon: string; email: string
  adres: string; kurulusYili: string; toplamMaas: string; sgkGideri: string
  yemekGideri: string; yolGideri: string; kira: string; elektrik: string; su: string
  dogalgaz: string; internet: string; sarfMalzeme: string; digerGider: string
  aylikPorselenPlaka: string; aylikKuvarsPlaka: string; aylikDogaltasPlaka: string
  plakaBasinaMtul: string; kdvOrani: string; teklifGecerlilik: string
}
type AylikGider = {
  id: string; tarih: string; kategori: string; aciklama: string; tutar: number
}

const KATEGORİLER = [
  { key: 'toplamMaas', label: 'Toplam Maaş' },
  { key: 'sgkGideri', label: 'SGK Gideri' },
  { key: 'yemekGideri', label: 'Yemek Gideri' },
  { key: 'yolGideri', label: 'Yol Gideri' },
  { key: 'kira', label: 'Kira' },
  { key: 'elektrik', label: 'Elektrik' },
  { key: 'su', label: 'Su' },
  { key: 'dogalgaz', label: 'Doğalgaz' },
  { key: 'internet', label: 'İnternet' },
  { key: 'sarfMalzeme', label: 'Sarf Malzeme' },
  { key: 'diger', label: 'Diğer' },
]

function emptyForm(): FormState {
  return {
    atolyeAdi: '', sehir: '', ilce: '', telefon: '', email: '', adres: '', kurulusYili: '',
    toplamMaas: '', sgkGideri: '', yemekGideri: '', yolGideri: '',
    kira: '', elektrik: '', su: '', dogalgaz: '', internet: '', sarfMalzeme: '', digerGider: '',
    aylikPorselenPlaka: '', aylikKuvarsPlaka: '', aylikDogaltasPlaka: '',
    plakaBasinaMtul: '3.20', kdvOrani: '20', teklifGecerlilik: '15',
  }
}

function n(v: any) {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0
  const cleaned = String(v || '').replace(/\./g, '').replace(',', '.').replace(/[^0-9.\-]/g, '')
  const out = Number(cleaned)
  return Number.isFinite(out) ? out : 0
}

function tl(v: any) {
  return Number(v || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₺'
}

function tlInput(v: string) {
  const raw = v.replace(/\./g, '').replace(',', '').replace(/[^0-9]/g, '')
  if (!raw) return ''
  return Number(raw).toLocaleString('tr-TR')
}

function pct(v: any) {
  return '%' + Number(v || 0).toLocaleString('tr-TR', { maximumFractionDigits: 1 })
}

function bugunStr() {
  return new Date().toISOString().slice(0, 10)
}

export default function AtolyePage() {
  const logoInputRef = useRef<HTMLInputElement | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm())
  const [makineler, setMakineler] = useState<Makine[]>([])
  const [araclar, setAraclar] = useState<Arac[]>([])
  const [logoUrl, setLogoUrl] = useState('')
  const [aktifSol, setAktifSol] = useState<'kimlik' | 'gider' | 'kapasite'>('kimlik')
  const [aktifTab, setAktifTab] = useState<'genel' | 'uretim' | 'kaynaklar' | 'kimlik' | 'giderler' | 'kapasite'>('genel')
  const [makineModal, setMakineModal] = useState(false)
  const [aracModal, setAracModal] = useState(false)
  const [detayModal, setDetayModal] = useState<'makine' | 'arac' | null>(null)
  const [kaydediliyor, setKaydediliyor] = useState(false)
  const [giderModal, setGiderModal] = useState(false)
  const [mesaj, setMesaj] = useState('')
  const [logoYukleniyor, setLogoYukleniyor] = useState(false)
  const [mobileSolOpen, setMobileSolOpen] = useState(false)
  const [mobileSagOpen, setMobileSagOpen] = useState(false)
  const [gecmisGiderler, setGecmisGiderler] = useState<AylikGider[]>([])
  const [ortalamalar, setOrtalamalar] = useState<Record<string, number>>({})
  const [yeniGider, setYeniGider] = useState({ tarih: bugunStr(), kategori: 'toplamMaas', aciklama: '', tutar: '' })
  const [giderYukleniyor, setGiderYukleniyor] = useState(false)
  const [personelKayitMaasToplami, setPersonelKayitMaasToplami] = useState(0)
  const [personelKayitSgkToplami, setPersonelKayitSgkToplami] = useState(0)
  const [personelKayitSayisi, setPersonelKayitSayisi] = useState(0)
  const [aktarMesaj, setAktarMesaj] = useState('')

  const [yeniMakine, setYeniMakine] = useState({ makineAdi: '', alinanBedel: '', paraBirimi: 'TRY', amortismanSuresiAy: '', aylikAktifCalismaSaati: '' })
  const [yeniArac, setYeniArac] = useState({ aracAdi: '', aracTipi: 'Kamyonet', alinanBedel: '', paraBirimi: 'TRY', amortismanSuresiAy: '', aylikBakim: '', aylikSigortaKasko: '', aylikVergiMuayene: '' })

  // Düzenleme state'leri
  const [editingMakine, setEditingMakine] = useState<Makine | null>(null)
  const [editMakineForm, setEditMakineForm] = useState({ makineAdi: '', alinanBedel: '', paraBirimi: 'TRY', amortismanSuresiAy: '', aylikAktifCalismaSaati: '' })
  const [editingArac, setEditingArac] = useState<Arac | null>(null)
  const [editAracForm, setEditAracForm] = useState({ aracAdi: '', aracTipi: '', alinanBedel: '', paraBirimi: 'TRY', amortismanSuresiAy: '', aylikBakim: '', aylikSigortaKasko: '', aylikVergiMuayene: '' })
  const [editKaydediliyor, setEditKaydediliyor] = useState(false)

  async function yukle() {
    const [a, m, ar, g] = await Promise.all([
      fetch('/api/atolye').catch(() => null),
      fetch('/api/makineler').catch(() => null),
      fetch('/api/araclar').catch(() => null),
      fetch('/api/aylik-gider').catch(() => null),
    ])
    const av = a?.ok ? await a.json().catch(() => ({})) : {}
    const mv = m?.ok ? await m.json().catch(() => ({})) : {}
    const arv = ar?.ok ? await ar.json().catch(() => ({})) : {}
    const gv = g?.ok ? await g.json().catch(() => ({})) : {}

    if (av.atolye) {
      const x = av.atolye
      setForm({
        atolyeAdi: String(x.atolyeAdi || ''), sehir: String(x.sehir || ''), ilce: String(x.ilce || ''),
        telefon: String(x.telefon || ''), email: String(x.email || ''), adres: String(x.adres || ''),
        kurulusYili: String(x.kurulusYili || ''),
        toplamMaas: String(x.toplamMaas || ''), sgkGideri: String(x.sgkGideri || ''),
        yemekGideri: String(x.yemekGideri || ''), yolGideri: String(x.yolGideri || ''),
        kira: String(x.kira || ''), elektrik: String(x.elektrik || ''), su: String(x.su || ''),
        dogalgaz: String(x.dogalgaz || ''), internet: String(x.internet || ''),
        sarfMalzeme: String(x.sarfMalzeme || ''), digerGider: '0',
        aylikPorselenPlaka: String(x.aylikPorselenPlaka || ''), aylikKuvarsPlaka: String(x.aylikKuvarsPlaka || ''),
        aylikDogaltasPlaka: String(x.aylikDogaltasPlaka || ''), plakaBasinaMtul: (() => { const v = parseFloat(String(x.plakaBasinaMtul || '3.20')); return Number.isFinite(v) ? v.toFixed(2) : '3.20' })(),
        kdvOrani: String(x.kdvOrani || '20'), teklifGecerlilik: String(x.teklifGecerlilik || '15'),
      })
      setLogoUrl(x.logoUrl || '')
    }
    setMakineler(mv.makineler || [])
    setAraclar(arv.araclar || [])
    setGecmisGiderler(gv.giderler || [])
    setOrtalamalar(gv.ortalamalar || {})
    setPersonelKayitMaasToplami(Number(av.personelKayitMaasToplami) || 0)
    setPersonelKayitSgkToplami(Number(av.personelKayitSgkToplami) || 0)
    setPersonelKayitSayisi(Number(av.personelKayitSayisi) || 0)
  }

  useEffect(() => { yukle() }, [])

  function setAlan(k: keyof FormState, v: string) {
    setForm(prev => ({ ...prev, [k]: k === 'plakaBasinaMtul' ? v.replace(',', '.') : v }))
  }

  function personeldenAktar() {
    setForm(prev => ({
      ...prev,
      toplamMaas: String(Math.round(personelKayitMaasToplami)),
      sgkGideri: String(Math.round(personelKayitSgkToplami)),
    }))
    setAktarMesaj('Aktarıldı')
    setTimeout(() => setAktarMesaj(''), 3000)
  }

  function rawVal(v: string) {
    return v.replace(/\./g, '').replace(',', '.')
  }

  // Makine düzenlemeyi aç
  function makineEditAc(m: Makine) {
    setEditingMakine(m)
    setEditMakineForm({
      makineAdi: m.makineAdi,
      alinanBedel: String(m.alinanBedel),
      paraBirimi: m.paraBirimi,
      amortismanSuresiAy: String(m.amortismanSuresiAy),
      aylikAktifCalismaSaati: String(m.aylikAktifCalismaSaati),
    })
  }

  // Araç düzenlemeyi aç
  function aracEditAc(a: Arac) {
    setEditingArac(a)
    setEditAracForm({
      aracAdi: a.aracAdi,
      aracTipi: a.aracTipi,
      alinanBedel: String(a.alinanBedel),
      paraBirimi: a.paraBirimi,
      amortismanSuresiAy: String(a.amortismanSuresiAy),
      aylikBakim: String(a.aylikBakim),
      aylikSigortaKasko: String(a.aylikSigortaKasko),
      aylikVergiMuayene: String(a.aylikVergiMuayene),
    })
  }

  async function makineGuncelle() {
    if (!editingMakine) return
    setEditKaydediliyor(true)
    try {
      const res = await fetch('/api/makineler', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingMakine.id,
          makineAdi: editMakineForm.makineAdi,
          alinanBedel: n(editMakineForm.alinanBedel),
          paraBirimi: editMakineForm.paraBirimi,
          amortismanSuresiAy: Math.round(n(editMakineForm.amortismanSuresiAy)),
          aylikAktifCalismaSaati: n(editMakineForm.aylikAktifCalismaSaati),
        }),
      })
      const json = await res.json()
      if (json.makine) {
        setMakineler(prev => prev.map(m => m.id === json.makine.id ? json.makine : m))
        setEditingMakine(null)
      }
    } finally { setEditKaydediliyor(false) }
  }

  async function aracGuncelle() {
    if (!editingArac) return
    setEditKaydediliyor(true)
    try {
      const res = await fetch('/api/araclar', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingArac.id,
          aracAdi: editAracForm.aracAdi,
          aracTipi: editAracForm.aracTipi,
          alinanBedel: n(editAracForm.alinanBedel),
          paraBirimi: editAracForm.paraBirimi,
          amortismanSuresiAy: Math.round(n(editAracForm.amortismanSuresiAy)),
          aylikBakim: n(editAracForm.aylikBakim),
          aylikSigortaKasko: n(editAracForm.aylikSigortaKasko),
          aylikVergiMuayene: n(editAracForm.aylikVergiMuayene),
        }),
      })
      const json = await res.json()
      if (json.arac) {
        setAraclar(prev => prev.map(a => a.id === json.arac.id ? json.arac : a))
        setEditingArac(null)
      }
    } finally { setEditKaydediliyor(false) }
  }

  const hesap = useMemo(() => {
    const personel = n(rawVal(form.toplamMaas)) + n(rawVal(form.sgkGideri)) + n(rawVal(form.yemekGideri)) + n(rawVal(form.yolGideri))
    const sabit = n(rawVal(form.kira)) + n(rawVal(form.elektrik)) + n(rawVal(form.su)) + n(rawVal(form.dogalgaz)) + n(rawVal(form.internet)) + n(rawVal(form.sarfMalzeme)) + n(rawVal(form.digerGider))
    const makine = makineler.reduce((a, m) => a + Number(m.aylikAmortisman || 0), 0)
    const arac = araclar.reduce((a, x) => a + Number(x.aylikToplamSabitMaliyet || 0), 0)
    const toplam = personel + sabit + makine + arac
    const toplamDakika = 26 * 8 * 60
    const dakika = toplamDakika > 0 ? toplam / toplamDakika : 0
    const gunluk = toplam / 26
    const toplamPlaka = n(form.aylikPorselenPlaka) + n(form.aylikKuvarsPlaka) + n(form.aylikDogaltasPlaka)
    const aylikMtul = toplamPlaka * (parseFloat(String(form.plakaBasinaMtul).replace(",", ".")) || 0)
    const mtulMaliyet = aylikMtul > 0 ? toplam / aylikMtul : 0
    const plakaMaliyet = toplamPlaka > 0 ? toplam / toplamPlaka : 0
    const oran = (v: number) => toplam > 0 ? (v / toplam) * 100 : 0
    const verimlilik = toplamPlaka <= 0 ? 0 : Math.max(0, Math.min(100, 100 - Math.max(0, dakika - 75)))
    let durum = 'Kapasite eksik', durumTone = 'text-red-300 border-red-500/30 bg-red-500/10'
    let tavsiye = 'Aylık plaka kapasitesi girilmeden maliyet motoru güvenilir çalışmaz.'
    if (toplamPlaka > 0 && dakika < 75) { durum = 'Verimli'; durumTone = 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10'; tavsiye = 'Dakika maliyeti sağlıklı. Tekliflerde kâr marjını koru.' }
    else if (toplamPlaka > 0 && dakika < 125) { durum = 'Kontrollü'; durumTone = 'text-amber-300 border-amber-500/30 bg-amber-500/10'; tavsiye = 'Maliyet orta seviyede. Kapasiteyi artırmak fiyat baskısını azaltır.' }
    else if (toplamPlaka > 0) { durum = 'Riskli'; durumTone = 'text-red-300 border-red-500/30 bg-red-500/10'; tavsiye = 'Dakika maliyeti yüksek. Sabit gider veya kapasite varsayımı yeniden kontrol edilmeli.' }
    return { personel, sabit, makine, arac, toplam, dakika, gunluk, toplamPlaka, aylikMtul, mtulMaliyet, plakaMaliyet, oranPersonel: oran(personel), oranSabit: oran(sabit), oranMakine: oran(makine), oranArac: oran(arac), verimlilik, durum, durumTone, tavsiye }
  }, [form, makineler, araclar])

  async function kaydet() {
    setKaydediliyor(true); setMesaj('')
    try {
      const res = await fetch('/api/atolye', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          kurulusYili: Math.round(n(form.kurulusYili)) || 0,
          toplamMaas: n(rawVal(form.toplamMaas)), sgkGideri: n(rawVal(form.sgkGideri)),
          yemekGideri: n(rawVal(form.yemekGideri)), yolGideri: n(rawVal(form.yolGideri)),
          kira: n(rawVal(form.kira)), elektrik: n(rawVal(form.elektrik)), su: n(rawVal(form.su)),
          dogalgaz: n(rawVal(form.dogalgaz)), internet: n(rawVal(form.internet)),
          sarfMalzeme: n(rawVal(form.sarfMalzeme)),
          aylikPorselenPlaka: Math.round(n(form.aylikPorselenPlaka)),
          aylikKuvarsPlaka: Math.round(n(form.aylikKuvarsPlaka)),
          aylikDogaltasPlaka: Math.round(n(form.aylikDogaltasPlaka)),
          plakaBasinaMtul: parseFloat(String(form.plakaBasinaMtul).replace(",", ".")) || 3.2,
          kdvOrani: Math.round(n(form.kdvOrani)) || 20,
          teklifGecerlilik: Math.round(n(form.teklifGecerlilik)) || 15,
        }),
      })
      if (!res.ok) { setMesaj('Kayıt başarısız.'); return }
      await yukle(); setMesaj('Kaydedildi.')
    } finally { setKaydediliyor(false) }
  }

  async function logoYukle(e: React.ChangeEvent<HTMLInputElement>) {
    const dosya = e.target.files?.[0]; if (!dosya) return
    setLogoYukleniyor(true)
    const fd = new FormData(); fd.append('logo', dosya)
    try {
      const res = await fetch('/api/logo', { method: 'POST', body: fd })
      const json = await res.json()
      if (json.logoUrl) setLogoUrl(json.logoUrl)
    } finally { setLogoYukleniyor(false) }
  }

  async function makineKaydet() {
    const res = await fetch('/api/makineler', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ makineAdi: yeniMakine.makineAdi, alinanBedel: n(yeniMakine.alinanBedel), paraBirimi: yeniMakine.paraBirimi, amortismanSuresiAy: Math.round(n(yeniMakine.amortismanSuresiAy)), aylikAktifCalismaSaati: n(yeniMakine.aylikAktifCalismaSaati) }) })
    const json = await res.json()
    if (json.makine) { setMakineler(prev => [...prev, json.makine]); setMakineModal(false); setYeniMakine({ makineAdi: '', alinanBedel: '', paraBirimi: 'TRY', amortismanSuresiAy: '', aylikAktifCalismaSaati: '' }) }
  }

  async function aracKaydet() {
    const res = await fetch('/api/araclar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ aracAdi: yeniArac.aracAdi, aracTipi: yeniArac.aracTipi, alinanBedel: n(yeniArac.alinanBedel), paraBirimi: yeniArac.paraBirimi, amortismanSuresiAy: Math.round(n(yeniArac.amortismanSuresiAy)), aylikBakim: n(yeniArac.aylikBakim), aylikSigortaKasko: n(yeniArac.aylikSigortaKasko), aylikVergiMuayene: n(yeniArac.aylikVergiMuayene) }) })
    const json = await res.json()
    if (json.arac) { setAraclar(prev => [...prev, json.arac]); setAracModal(false); setYeniArac({ aracAdi: '', aracTipi: 'Kamyonet', alinanBedel: '', paraBirimi: 'TRY', amortismanSuresiAy: '', aylikBakim: '', aylikSigortaKasko: '', aylikVergiMuayene: '' }) }
  }

  async function makineSil(id: string) {
    await fetch('/api/makineler', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    setMakineler(prev => prev.filter(x => x.id !== id))
    if (editingMakine?.id === id) setEditingMakine(null)
  }

  async function aracSil(id: string) {
    await fetch('/api/araclar', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    setAraclar(prev => prev.filter(x => x.id !== id))
    if (editingArac?.id === id) setEditingArac(null)
  }

  async function giderKaydet() {
    if (!yeniGider.tutar) return
    setGiderYukleniyor(true)
    try {
      const res = await fetch('/api/aylik-gider', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tarih: yeniGider.tarih, kategori: yeniGider.kategori, aciklama: yeniGider.aciklama, tutar: n(yeniGider.tutar.replace(/\./g, '')) }),
      })
      if (res.ok) {
        await yukle()
        setGiderModal(false)
        setYeniGider({ tarih: bugunStr(), kategori: 'toplamMaas', aciklama: '', tutar: '' })
      }
    } finally { setGiderYukleniyor(false) }
  }

  async function giderSil(id: string) {
    await fetch('/api/aylik-gider', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    setGecmisGiderler(prev => prev.filter(x => x.id !== id))
  }

// ParaInput moved to top-level

  return (
    <div className="min-h-[100dvh] overflow-x-hidden bg-[#030712] text-white p-2 md:h-screen md:overflow-hidden md:p-0 md:flex md:flex-col">
      {/* DESKTOP TOP STRIP */}
      <div className="hidden md:flex items-center gap-2 border-b border-slate-800/60 px-4 py-2 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0 mr-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-tight truncate">{form.atolyeAdi || 'Atölye'}</p>
            <p className="text-[10px] text-slate-500 leading-tight">{[form.sehir, form.ilce].filter(Boolean).join(' / ') || 'Konum yok'}</p>
          </div>
          <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${hesap.durumTone}`}>{hesap.durum}</span>
        </div>
        <div className="flex items-center gap-2 flex-1 flex-wrap">
          <TopChip label="Günlük Gider" value={tl(hesap.gunluk)} />
          <TopChip label="Aylık Plaka" value={`${hesap.toplamPlaka.toFixed(0)} adet`} />
          <TopChip label="Aylık Mtül" value={formatMtulTR(hesap.aylikMtul, 1)} />
          <TopChip label="Verimlilik" value={`%${hesap.verimlilik.toFixed(0)}`} />
          <TopChip label="Dakika Maliyeti" value={tl(hesap.dakika)} />
        </div>
        <div className={`hidden xl:block shrink-0 max-w-xs rounded-2xl border px-3 py-2 text-xs ${hesap.durumTone}`}>
          <p className="font-semibold">{hesap.durum}</p>
          <p className="mt-0.5 opacity-80 leading-snug">{hesap.tavsiye}</p>
        </div>
      </div>

      {/* DESKTOP SECTION TABS */}
      <div className="hidden md:flex items-center gap-2 border-b border-slate-800/60 px-4 py-2 shrink-0">
        <div className="flex items-center gap-1 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-1">
          <button onClick={() => setAktifTab('genel')} className={`rounded-xl px-3 py-1.5 text-xs font-medium transition-colors ${aktifTab === 'genel' ? 'bg-slate-700/80 text-white' : 'text-slate-400 hover:text-slate-200'}`}>Genel Bakış</button>
          <button onClick={() => setAktifTab('uretim')} className={`rounded-xl px-3 py-1.5 text-xs font-medium transition-colors ${aktifTab === 'uretim' ? 'bg-slate-700/80 text-white' : 'text-slate-400 hover:text-slate-200'}`}>Üretim Modeli</button>
          <button onClick={() => setAktifTab('kaynaklar')} className={`rounded-xl px-3 py-1.5 text-xs font-medium transition-colors ${aktifTab === 'kaynaklar' ? 'bg-slate-700/80 text-white' : 'text-slate-400 hover:text-slate-200'}`}>Kaynaklar</button>
          <button onClick={() => setAktifTab('kimlik')} className={`rounded-xl px-3 py-1.5 text-xs font-medium transition-colors ${aktifTab === 'kimlik' ? 'bg-slate-700/80 text-white' : 'text-slate-400 hover:text-slate-200'}`}>Kimlik</button>
          <button onClick={() => setAktifTab('giderler')} className={`rounded-xl px-3 py-1.5 text-xs font-medium transition-colors ${aktifTab === 'giderler' ? 'bg-slate-700/80 text-white' : 'text-slate-400 hover:text-slate-200'}`}>Giderler</button>
          <button onClick={() => setAktifTab('kapasite')} className={`rounded-xl px-3 py-1.5 text-xs font-medium transition-colors ${aktifTab === 'kapasite' ? 'bg-slate-700/80 text-white' : 'text-slate-400 hover:text-slate-200'}`}>Kapasite</button>
        </div>
      </div>

      <div className="md:hidden grid min-h-[100dvh] grid-cols-1 gap-3">

        <button onClick={() => setMobileSolOpen(true)} className="fixed bottom-[calc(env(safe-area-inset-bottom)+90px)] left-4 z-[120] rounded-2xl bg-slate-800 px-5 py-4 text-sm font-bold shadow-2xl md:hidden">Atölye</button>
        <button onClick={() => setMobileSagOpen(true)} className="fixed bottom-[calc(env(safe-area-inset-bottom)+90px)] right-4 z-[120] rounded-2xl bg-blue-600 px-5 py-4 text-sm font-bold shadow-2xl md:hidden">Karar</button>

        {(mobileSolOpen || mobileSagOpen) && (
          <div onClick={() => { setMobileSolOpen(false); setMobileSagOpen(false) }} className="fixed inset-0 z-[130] bg-black/60 md:hidden" />
        )}

        {/* SOL PANEL */}
        <aside className={`fixed left-0 top-0 z-[140] h-[100dvh] w-[88vw] max-w-[360px] overflow-y-auto rounded-r-3xl border-r border-slate-800 bg-[#0B1120] p-4 shadow-2xl transition-transform duration-300 md:static md:h-full md:w-auto md:max-w-none md:translate-x-0 md:rounded-3xl md:border md:p-3 md:overflow-hidden md:flex md:flex-col ${mobileSolOpen ? "translate-x-0" : "-translate-x-full"}`}>
          <button onClick={() => setMobileSolOpen(false)} className="mb-4 w-full rounded-xl border border-slate-700 px-4 py-3 text-sm font-semibold md:hidden">Kapat</button>
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
            <button onClick={() => logoInputRef.current?.click()} className="mt-3 w-full rounded-xl border border-slate-700 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800">
              {logoYukleniyor ? 'Yükleniyor...' : 'Logo Yükle'}
            </button>
            <input ref={logoInputRef} onChange={logoYukle} type="file" accept="image/*" className="hidden" />
          </div>

          <div className="mt-4 grid gap-2">
            <SideButton active={aktifSol === 'kimlik'} onClick={() => setAktifSol('kimlik')} title="Atölye Bilgileri" sub="Kimlik, iletişim" />
            <SideButton active={aktifSol === 'gider'} onClick={() => setAktifSol('gider')} title="Giderler" sub="Personel ve sabit gider" />
            <SideButton active={aktifSol === 'kapasite'} onClick={() => setAktifSol('kapasite')} title="Kapasite" sub="Plaka, mtül, teklif" />
          </div>

          <div className="mt-4 flex-1 min-h-0 overflow-y-auto rounded-2xl border border-slate-800 bg-[#111827] p-3" style={{WebkitOverflowScrolling:'touch'}}>
            {aktifSol === 'kimlik' && (
              <div className="grid gap-2">
                <Input label="Atölye Adı" value={form.atolyeAdi} onChange={(v: string) => setAlan('atolyeAdi', v)} />
                <Input label="Şehir" value={form.sehir} onChange={(v: string) => setAlan('sehir', v)} />
                <Input label="İlçe" value={form.ilce} onChange={(v: string) => setAlan('ilce', v)} />
                <Input label="Telefon" value={form.telefon} onChange={(v: string) => setAlan('telefon', v)} />
                <Input label="Kuruluş Yılı" value={form.kurulusYili} onChange={(v: string) => setAlan('kurulusYili', v)} />
                <Input label="E-posta" value={form.email} onChange={(v: string) => setAlan('email', v)} />
              </div>
            )}

            {aktifSol === 'gider' && (
              <div className="grid gap-2">
                <p className="text-[10px] uppercase tracking-widest text-blue-400 pt-1">Personel</p>
                <ParaInput label="Toplam Maaş" fieldKey="toplamMaas" ort={ortalamalar.toplamMaas} value={form["toplamMaas"] as string} onChange={setAlan} />
                <ParaInput label="SGK Gideri" fieldKey="sgkGideri" ort={ortalamalar.sgkGideri} value={form["sgkGideri"] as string} onChange={setAlan} />
                {personelKayitSayisi > 0 && (
                  <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 px-3 py-2.5">
                    <p className="text-[10px] uppercase tracking-wider text-blue-400">Personel kayıtlarından hesaplanan</p>
                    <p className="mt-1 text-sm font-semibold text-white">
                      {Math.round(personelKayitMaasToplami + personelKayitSgkToplami).toLocaleString('tr-TR')} ₺
                      <span className="ml-1.5 text-xs font-normal text-slate-400">· {personelKayitSayisi} kişi</span>
                    </p>
                    <button
                      onClick={personeldenAktar}
                      className="mt-2 rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-300 transition hover:bg-blue-500/20"
                    >
                      {aktarMesaj || 'Kayıtlardan Aktar'}
                    </button>
                  </div>
                )}
                <ParaInput label="Yemek Gideri" fieldKey="yemekGideri" ort={ortalamalar.yemekGideri} value={form["yemekGideri"] as string} onChange={setAlan} />
                <ParaInput label="Yol Gideri" fieldKey="yolGideri" ort={ortalamalar.yolGideri} value={form["yolGideri"] as string} onChange={setAlan} />

                <p className="text-[10px] uppercase tracking-widest text-blue-400 pt-2">Sabit Giderler</p>
                <ParaInput label="Kira" fieldKey="kira" ort={ortalamalar.kira} value={form["kira"] as string} onChange={setAlan} />
                <ParaInput label="Elektrik" fieldKey="elektrik" ort={ortalamalar.elektrik} value={form["elektrik"] as string} onChange={setAlan} />
                <ParaInput label="Su" fieldKey="su" ort={ortalamalar.su} value={form["su"] as string} onChange={setAlan} />
                <ParaInput label="Doğalgaz" fieldKey="dogalgaz" ort={ortalamalar.dogalgaz} value={form["dogalgaz"] as string} onChange={setAlan} />
                <ParaInput label="İnternet" fieldKey="internet" ort={ortalamalar.internet} value={form["internet"] as string} onChange={setAlan} />
                <ParaInput label="Sarf Malzeme" fieldKey="sarfMalzeme" ort={ortalamalar.sarfMalzeme} value={form["sarfMalzeme"] as string} onChange={setAlan} />
                <ParaInput label="Diğer Giderler" fieldKey="digerGider" ort={ortalamalar.diger} value={form["digerGider"] as string} onChange={setAlan} />

                {gecmisGiderler.length > 0 && (
                  <div className="mt-3">
                    <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-2">Geçmiş Gider Kayıtları</p>
                    <div className="grid gap-1.5">
                      {gecmisGiderler.slice(0, 20).map(g => (
                        <div key={g.id} className="flex items-center justify-between gap-2 rounded-lg border border-slate-700 bg-[#0B1120] px-3 py-2">
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-white truncate">
                              {KATEGORİLER.find(k => k.key === g.kategori)?.label || g.kategori}
                              {g.aciklama ? ` — ${g.aciklama}` : ''}
                            </p>
                            <p className="text-[10px] text-slate-500">{new Date(g.tarih).toLocaleDateString('tr-TR', { month: 'short', year: 'numeric' })}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <p className="text-xs text-emerald-400">{Number(g.tutar).toLocaleString('tr-TR')} ₺</p>
                            <button onClick={() => giderSil(g.id)} className="text-[10px] text-red-400 hover:text-red-300">✕</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {ortalamalar && Object.keys(ortalamalar).length > 0 && (
                  <div className="mt-2 rounded-lg border border-blue-500/20 bg-blue-500/5 p-2">
                    <p className="text-[10px] text-blue-400">💡 Mavi "ort:" etiketine tıklayarak ortalamayı otomatik uygulayabilirsiniz.</p>
                  </div>
                )}
              </div>
            )}

            {aktifSol === 'kapasite' && (
              <div className="grid gap-2">
                <Input label="Porselen Plaka/Ay" value={form.aylikPorselenPlaka} onChange={(v: string) => setAlan('aylikPorselenPlaka', v)} />
                <Input label="Kuvars Plaka/Ay" value={form.aylikKuvarsPlaka} onChange={(v: string) => setAlan('aylikKuvarsPlaka', v)} />
                <Input label="Doğaltaş Plaka/Ay" value={form.aylikDogaltasPlaka} onChange={(v: string) => setAlan('aylikDogaltasPlaka', v)} />
                <Input label="Plaka Başına Mtül" value={form.plakaBasinaMtul} onChange={(v: string) => setAlan('plakaBasinaMtul', v)} />
                <Input label="KDV %" value={form.kdvOrani} onChange={(v: string) => setAlan('kdvOrani', v)} />
                <Input label="Teklif Geçerlilik (gün)" value={form.teklifGecerlilik} onChange={(v: string) => setAlan('teklifGecerlilik', v)} />
              </div>
            )}
          </div>
        </aside>

        {/* ORTA PANEL */}
        <main className="min-w-0 rounded-3xl border border-slate-800 bg-[#0B1120] px-4 pb-tab-bar pt-[104px] md:p-5 md:overflow-y-auto">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs tracking-[0.25em] text-slate-400 uppercase">Maliyet Motoru</p>
              <h2 className="mt-2 text-2xl font-bold leading-tight md:text-3xl">Atölye Kârlılık Paneli</h2>
            </div>
            <span className={`rounded-full border px-4 py-2 text-sm font-semibold ${hesap.durumTone}`}>Verimlilik %{hesap.verimlilik.toFixed(0)}</span>
          </div>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Kpi label="Aylık Gider" value={tl(hesap.toplam)} hero />
            <Kpi label="Dakika Maliyeti" value={tl(hesap.dakika)} tone="text-emerald-300" />
            <Kpi label="Mtül Maliyeti" value={tl(hesap.mtulMaliyet)} tone="text-cyan-300" />
            <Kpi label="Günlük Gider" value={tl(hesap.gunluk)} />
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_0.8fr]">
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
                  <span>Gider Dağılımı</span><span>{tl(hesap.toplam)}</span>
                </div>
                <div className="h-5 overflow-hidden rounded-full bg-slate-800 flex">
                  <div style={{ width: `${hesap.oranPersonel}%` }} className="bg-blue-500" />
                  <div style={{ width: `${hesap.oranSabit}%` }} className="bg-emerald-500" />
                  <div style={{ width: `${hesap.oranMakine}%` }} className="bg-amber-500" />
                  <div style={{ width: `${hesap.oranArac}%` }} className="bg-violet-500" />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 text-xs md:grid-cols-4">
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

          <div className="mt-6 hidden md:grid md:grid-cols-4 md:gap-3">
            <SmallStat label="Personel" value={tl(hesap.personel)} />
            <SmallStat label="Sabit Gider" value={tl(hesap.sabit)} />
            <SmallStat label="Makine Amortismanı" value={tl(hesap.makine)} />
            <SmallStat label="Araç Maliyeti" value={tl(hesap.arac)} />
          </div>
        </main>

        {/* SAĞ PANEL */}
        <aside className={`fixed right-0 top-0 z-[140] h-[100dvh] w-[88vw] max-w-[360px] overflow-y-auto rounded-l-3xl border-l border-slate-800 bg-[#0B1120] p-4 shadow-2xl transition-transform duration-300 md:static md:h-full md:w-auto md:max-w-none md:translate-x-0 md:rounded-3xl md:border md:overflow-hidden md:flex md:flex-col md:hidden ${mobileSagOpen ? "translate-x-0" : "translate-x-full"}`}>
          <button onClick={() => setMobileSagOpen(false)} className="mb-4 w-full rounded-xl border border-slate-700 px-4 py-3 text-sm font-semibold md:hidden">Kapat</button>
          <p className="text-xs tracking-[0.25em] text-slate-500 uppercase">Karar Paneli</p>
          <h2 className="mt-1 text-lg font-semibold">Canlı Özet</h2>
          <div className="mt-2 grid gap-2">
            <RightCard label="Verimlilik" value={`%${hesap.verimlilik.toFixed(0)}`} />
            <RightCard label="Dakika" value={tl(hesap.dakika)} />
            <RightCard label="Günlük Gider" value={tl(hesap.gunluk)} />
            <RightCard label="Aylık Plaka" value={`${hesap.toplamPlaka.toFixed(0)} adet`} />
            <RightCard label="Aylık Mtül" value={formatMtulTR(hesap.aylikMtul, 1)} />
          </div>
          <div className={`mt-4 rounded-2xl border p-4 ${hesap.durumTone}`}>
            <p className="text-sm font-semibold">{hesap.durum}</p>
            <p className="mt-2 text-xs opacity-90">{hesap.tavsiye}</p>
          </div>
          <div className="mt-auto grid gap-2 pt-2">
            <button onClick={kaydet} disabled={kaydediliyor} className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold hover:bg-emerald-500 disabled:bg-slate-700">{kaydediliyor ? 'Kaydediliyor...' : 'Kaydet'}</button>
            <button onClick={() => setMakineModal(true)} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold hover:bg-blue-500">+ Makine Ekle</button>
            <button onClick={() => setAracModal(true)} className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold hover:bg-violet-500">+ Araç Ekle</button>
            <button onClick={() => setGiderModal(true)} className="rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-semibold hover:bg-amber-500">+ Gider Ekle</button>
            {mesaj && <p className="text-center text-xs text-emerald-300">{mesaj}</p>}
          </div>
        </aside>
      </div>

      {/* DESKTOP COCKPIT CANVAS */}
      <div className="hidden md:block md:flex-1 md:min-h-0 md:overflow-y-auto md:p-4">

        {aktifTab === 'genel' && (
          <div className="grid gap-4 xl:grid-cols-[1fr_300px]">
            <div className="flex flex-col gap-4">
              <div className="rounded-3xl border border-slate-800 bg-[#111827] p-5">
                <p className="text-xs uppercase tracking-widest text-slate-500">Aylık Toplam Gider</p>
                <p className="mt-1 text-4xl font-bold tabular-nums">{tl(hesap.toplam)}</p>
                <div className="mt-4 grid grid-cols-4 gap-2">
                  <SmallStat label="Personel" value={tl(hesap.personel)} />
                  <SmallStat label="Sabit Gider" value={tl(hesap.sabit)} />
                  <SmallStat label="Makine Amort." value={tl(hesap.makine)} />
                  <SmallStat label="Araç Maliyeti" value={tl(hesap.arac)} />
                </div>
              </div>
              <div className="rounded-3xl border border-slate-800 bg-[#111827] p-5">
                <div className="mb-3 flex justify-between text-xs text-slate-400">
                  <span>Gider Dağılımı</span><span>{tl(hesap.toplam)}</span>
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
            </div>
            <div className="flex flex-col gap-4">
              <div className="rounded-3xl border border-slate-800 bg-[#111827] p-5">
                <p className="mb-3 text-sm text-slate-400">Kaynaklar</p>
                <div className="flex flex-col gap-2">
                  <ResourceCard title="Makineler" count={makineler.length} value={tl(hesap.makine)} onDetail={() => setDetayModal('makine')} onAdd={() => setMakineModal(true)} />
                  <ResourceCard title="Araçlar" count={araclar.length} value={tl(hesap.arac)} onDetail={() => setDetayModal('arac')} onAdd={() => setAracModal(true)} />
                </div>
              </div>
              <div className={`rounded-3xl border p-5 ${hesap.durumTone}`}>
                <p className="text-sm font-semibold">{hesap.durum}</p>
                <p className="mt-2 text-xs leading-relaxed opacity-90">{hesap.tavsiye}</p>
              </div>
            </div>
          </div>
        )}

        {aktifTab === 'uretim' && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
              <ModelCard label="Aylık Plaka" value={hesap.toplamPlaka.toFixed(0)} sub="adet" />
              <ModelCard label="Aylık Mtül" value={hesap.aylikMtul.toLocaleString('tr-TR', { maximumFractionDigits: 1 })} sub="mtül" />
              <ModelCard label="Çalışma" value="12.480" sub="dk/ay" />
              <ModelCard label="Plaka Maliyeti" value={Math.round(hesap.plakaMaliyet).toLocaleString('tr-TR')} sub="₺ / plaka" compact />
            </div>
            <div className="rounded-3xl border border-slate-800 bg-[#111827] p-5">
              <div className="mb-3 flex justify-between text-xs text-slate-400">
                <span>Gider Dağılımı</span><span>{tl(hesap.toplam)}</span>
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
          </div>
        )}

        {aktifTab === 'kaynaklar' && (
          <div className="flex flex-col gap-4">
            <div className="grid gap-3 lg:grid-cols-2">
              <ResourceCard title="Makineler" count={makineler.length} value={tl(hesap.makine)} onDetail={() => setDetayModal('makine')} onAdd={() => setMakineModal(true)} />
              <ResourceCard title="Araçlar" count={araclar.length} value={tl(hesap.arac)} onDetail={() => setDetayModal('arac')} onAdd={() => setAracModal(true)} />
            </div>
            <div className="rounded-3xl border border-slate-800 bg-[#111827] p-5">
              <p className="text-xs text-slate-500">Operasyon Notu</p>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">{hesap.tavsiye}</p>
            </div>
          </div>
        )}

        {aktifTab === 'kimlik' && (
          <div className="grid gap-4 xl:grid-cols-[260px_1fr]">
            <div className="rounded-2xl border border-slate-800 bg-[#111827] p-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 flex items-center justify-center">
                  {logoUrl ? <img src={logoUrl} alt="Logo" className="h-full w-full object-cover" /> : <span className="text-xs text-slate-500">Logo</span>}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-semibold">{form.atolyeAdi || 'Atölye'}</p>
                  <p className="text-xs text-slate-400">{[form.sehir, form.ilce].filter(Boolean).join(' / ') || 'Konum yok'}</p>
                </div>
              </div>
              <button onClick={() => logoInputRef.current?.click()} className="mt-3 w-full rounded-xl border border-slate-700 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800">
                {logoYukleniyor ? 'Yükleniyor...' : 'Logo Yükle'}
              </button>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-[#111827] p-4">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <Input label="Atölye Adı" value={form.atolyeAdi} onChange={(v: string) => setAlan('atolyeAdi', v)} />
                <Input label="Şehir" value={form.sehir} onChange={(v: string) => setAlan('sehir', v)} />
                <Input label="İlçe" value={form.ilce} onChange={(v: string) => setAlan('ilce', v)} />
                <Input label="Telefon" value={form.telefon} onChange={(v: string) => setAlan('telefon', v)} />
                <Input label="Kuruluş Yılı" value={form.kurulusYili} onChange={(v: string) => setAlan('kurulusYili', v)} />
                <Input label="E-posta" value={form.email} onChange={(v: string) => setAlan('email', v)} />
              </div>
            </div>
          </div>
        )}

        {aktifTab === 'giderler' && (
          <div className="flex flex-col gap-4">
            <div className="rounded-2xl border border-slate-800 bg-[#111827] p-4">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <div className="sm:col-span-2 xl:col-span-3"><p className="text-[10px] uppercase tracking-widest text-blue-400">Personel</p></div>
                <ParaInput label="Toplam Maaş" fieldKey="toplamMaas" ort={ortalamalar.toplamMaas} value={form.toplamMaas} onChange={setAlan} />
                <ParaInput label="SGK Gideri" fieldKey="sgkGideri" ort={ortalamalar.sgkGideri} value={form.sgkGideri} onChange={setAlan} />
                {personelKayitSayisi > 0 && (
                  <div className="sm:col-span-2 xl:col-span-3 flex items-center justify-between gap-3 rounded-xl border border-blue-500/20 bg-blue-500/5 px-4 py-3">
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-wider text-blue-400">Personel kayıtlarından hesaplanan maliyet</p>
                      <p className="mt-0.5 text-sm font-semibold text-white">
                        {Math.round(personelKayitMaasToplami + personelKayitSgkToplami).toLocaleString('tr-TR')} ₺
                        <span className="ml-2 text-xs font-normal text-slate-400">· {personelKayitSayisi} aktif personel</span>
                      </p>
                    </div>
                    <button
                      onClick={personeldenAktar}
                      className="shrink-0 rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-1.5 text-xs font-semibold text-blue-300 transition hover:bg-blue-500/20"
                    >
                      {aktarMesaj || 'Kayıtlardan Aktar'}
                    </button>
                  </div>
                )}
                <ParaInput label="Yemek Gideri" fieldKey="yemekGideri" ort={ortalamalar.yemekGideri} value={form.yemekGideri} onChange={setAlan} />
                <ParaInput label="Yol Gideri" fieldKey="yolGideri" ort={ortalamalar.yolGideri} value={form.yolGideri} onChange={setAlan} />
                <div className="sm:col-span-2 xl:col-span-3"><p className="text-[10px] uppercase tracking-widest text-blue-400 pt-1">Sabit Giderler</p></div>
                <ParaInput label="Kira" fieldKey="kira" ort={ortalamalar.kira} value={form.kira} onChange={setAlan} />
                <ParaInput label="Elektrik" fieldKey="elektrik" ort={ortalamalar.elektrik} value={form.elektrik} onChange={setAlan} />
                <ParaInput label="Su" fieldKey="su" ort={ortalamalar.su} value={form.su} onChange={setAlan} />
                <ParaInput label="Doğalgaz" fieldKey="dogalgaz" ort={ortalamalar.dogalgaz} value={form.dogalgaz} onChange={setAlan} />
                <ParaInput label="İnternet" fieldKey="internet" ort={ortalamalar.internet} value={form.internet} onChange={setAlan} />
                <ParaInput label="Sarf Malzeme" fieldKey="sarfMalzeme" ort={ortalamalar.sarfMalzeme} value={form.sarfMalzeme} onChange={setAlan} />
                <ParaInput label="Diğer Giderler" fieldKey="digerGider" ort={ortalamalar.diger} value={form.digerGider} onChange={setAlan} />
              </div>
            </div>
            {gecmisGiderler.length > 0 && (
              <div className="rounded-2xl border border-slate-800 bg-[#111827] p-4">
                <p className="mb-3 text-[10px] uppercase tracking-widest text-slate-500">Geçmiş Gider Kayıtları</p>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {gecmisGiderler.slice(0, 12).map(g => (
                    <div key={g.id} className="flex items-center justify-between gap-2 rounded-lg border border-slate-700 bg-[#0B1120] px-3 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium text-white">
                          {KATEGORİLER.find(k => k.key === g.kategori)?.label || g.kategori}
                          {g.aciklama ? ` — ${g.aciklama}` : ''}
                        </p>
                        <p className="text-[10px] text-slate-500">{new Date(g.tarih).toLocaleDateString('tr-TR', { month: 'short', year: 'numeric' })}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <p className="text-xs text-emerald-400">{Number(g.tutar).toLocaleString('tr-TR')} ₺</p>
                        <button onClick={() => giderSil(g.id)} className="text-[10px] text-red-400 hover:text-red-300">✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {aktifTab === 'kapasite' && (
          <div className="rounded-2xl border border-slate-800 bg-[#111827] p-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <Input label="Porselen Plaka/Ay" value={form.aylikPorselenPlaka} onChange={(v: string) => setAlan('aylikPorselenPlaka', v)} />
              <Input label="Kuvars Plaka/Ay" value={form.aylikKuvarsPlaka} onChange={(v: string) => setAlan('aylikKuvarsPlaka', v)} />
              <Input label="Doğaltaş Plaka/Ay" value={form.aylikDogaltasPlaka} onChange={(v: string) => setAlan('aylikDogaltasPlaka', v)} />
              <Input label="Plaka Başına Mtül" value={form.plakaBasinaMtul} onChange={(v: string) => setAlan('plakaBasinaMtul', v)} />
              <Input label="KDV %" value={form.kdvOrani} onChange={(v: string) => setAlan('kdvOrani', v)} />
              <Input label="Teklif Geçerlilik (gün)" value={form.teklifGecerlilik} onChange={(v: string) => setAlan('teklifGecerlilik', v)} />
            </div>
          </div>
        )}

      </div>

      {/* DESKTOP BOTTOM ACTION BAR */}
      <div className="hidden md:flex items-center justify-between border-t border-slate-800 bg-[#030712] px-4 py-2.5 shrink-0">
        <div className="flex items-center gap-2">
          <button onClick={() => setMakineModal(true)} className="rounded-xl border border-blue-600/50 bg-blue-600/10 px-4 py-2 text-xs font-semibold text-blue-300 hover:bg-blue-600/20">+ Makine Ekle</button>
          <button onClick={() => setAracModal(true)} className="rounded-xl border border-violet-600/50 bg-violet-600/10 px-4 py-2 text-xs font-semibold text-violet-300 hover:bg-violet-600/20">+ Araç Ekle</button>
          <button onClick={() => setGiderModal(true)} className="rounded-xl border border-amber-600/50 bg-amber-600/10 px-4 py-2 text-xs font-semibold text-amber-300 hover:bg-amber-600/20">+ Gider Ekle</button>
        </div>
        <div className="flex items-center gap-3">
          {mesaj && <p className="text-xs text-emerald-300">{mesaj}</p>}
          <button onClick={kaydet} disabled={kaydediliyor} className="rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold hover:bg-emerald-500 disabled:bg-slate-700">
            {kaydediliyor ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </div>
      </div>

      {/* GİDER EKLE MODAL */}
      {giderModal && (
        <Modal title="Gider Kaydet" onClose={() => setGiderModal(false)}>
          <label className="block">
            <p className="mb-0.5 text-[10px] text-slate-400">Tarih</p>
            <input type="date" value={yeniGider.tarih} onChange={e => setYeniGider(g => ({ ...g, tarih: e.target.value }))}
              className="h-10 w-full rounded-lg border border-slate-700 bg-[#0B1120] px-3 text-sm text-white outline-none focus:border-blue-500" />
          </label>
          <label className="block">
            <p className="mb-0.5 text-[10px] text-slate-400">Kategori</p>
            <select value={yeniGider.kategori} onChange={e => setYeniGider(g => ({ ...g, kategori: e.target.value }))}
              className="h-10 w-full rounded-lg border border-slate-700 bg-[#0B1120] px-3 text-sm text-white outline-none focus:border-blue-500">
              {KATEGORİLER.map(k => <option key={k.key} value={k.key}>{k.label}</option>)}
            </select>
          </label>
          <label className="block">
            <p className="mb-0.5 text-[10px] text-slate-400">Açıklama (isteğe bağlı)</p>
            <input type="text" value={yeniGider.aciklama} onChange={e => setYeniGider(g => ({ ...g, aciklama: e.target.value }))}
              placeholder="Örn: Mayıs faturası"
              className="h-10 w-full rounded-lg border border-slate-700 bg-[#0B1120] px-3 text-sm text-white outline-none focus:border-blue-500" />
          </label>
          <label className="block">
            <p className="mb-0.5 text-[10px] text-slate-400">Tutar (₺)</p>
            <div className="relative">
              <input type="text" inputMode="numeric" value={yeniGider.tutar ? Number(yeniGider.tutar.replace(/\./g,'')).toLocaleString('tr-TR') : ''}
                onChange={e => { const raw = e.target.value.replace(/\./g,'').replace(/[^0-9]/g,''); setYeniGider(g => ({ ...g, tutar: raw })) }}
                placeholder="0"
                className="h-10 w-full rounded-lg border border-slate-700 bg-[#0B1120] px-3 pr-7 text-sm text-white outline-none focus:border-blue-500" />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">₺</span>
            </div>
          </label>
          <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-3 text-xs text-blue-300">
            Bu gider kaydedilince ilgili kategori ortalaması otomatik güncellenir ve atölye giderlerine yansır.
          </div>
          <button onClick={giderKaydet} disabled={giderYukleniyor || !yeniGider.tutar}
            className="mt-2 w-full rounded-xl bg-emerald-600 py-3 font-semibold hover:bg-emerald-500 disabled:opacity-50">
            {giderYukleniyor ? 'Kaydediliyor...' : 'Gideri Kaydet'}
          </button>
        </Modal>
      )}

      {/* YENİ MAKİNE MODAL */}
      {makineModal && (
        <Modal title="Yeni Makine" onClose={() => setMakineModal(false)}>
          <Input label="Makine Adı" value={yeniMakine.makineAdi} onChange={(v: string) => setYeniMakine({ ...yeniMakine, makineAdi: v })} />
          <Input label="Alınan Bedel" value={yeniMakine.alinanBedel} onChange={(v: string) => setYeniMakine({ ...yeniMakine, alinanBedel: v })} />
          <Input label="Amortisman Ay" value={yeniMakine.amortismanSuresiAy} onChange={(v: string) => setYeniMakine({ ...yeniMakine, amortismanSuresiAy: v })} />
          <Input label="Aylık Aktif Saat" value={yeniMakine.aylikAktifCalismaSaati} onChange={(v: string) => setYeniMakine({ ...yeniMakine, aylikAktifCalismaSaati: v })} />
          <button onClick={makineKaydet} className="mt-4 w-full rounded-xl bg-emerald-600 py-3 font-semibold">Kaydet</button>
        </Modal>
      )}

      {/* YENİ ARAÇ MODAL */}
      {aracModal && (
        <Modal title="Yeni Araç" onClose={() => setAracModal(false)}>
          <Input label="Araç Adı" value={yeniArac.aracAdi} onChange={(v: string) => setYeniArac({ ...yeniArac, aracAdi: v })} />
          <Input label="Araç Tipi" value={yeniArac.aracTipi} onChange={(v: string) => setYeniArac({ ...yeniArac, aracTipi: v })} />
          <Input label="Alınan Bedel" value={yeniArac.alinanBedel} onChange={(v: string) => setYeniArac({ ...yeniArac, alinanBedel: v })} />
          <Input label="Amortisman Ay" value={yeniArac.amortismanSuresiAy} onChange={(v: string) => setYeniArac({ ...yeniArac, amortismanSuresiAy: v })} />
          <Input label="Aylık Bakım" value={yeniArac.aylikBakim} onChange={(v: string) => setYeniArac({ ...yeniArac, aylikBakim: v })} />
          <Input label="Sigorta/Kasko" value={yeniArac.aylikSigortaKasko} onChange={(v: string) => setYeniArac({ ...yeniArac, aylikSigortaKasko: v })} />
          <Input label="Vergi/Muayene" value={yeniArac.aylikVergiMuayene} onChange={(v: string) => setYeniArac({ ...yeniArac, aylikVergiMuayene: v })} />
          <button onClick={aracKaydet} className="mt-4 w-full rounded-xl bg-emerald-600 py-3 font-semibold">Kaydet</button>
        </Modal>
      )}

      {/* MAKİNELER DETAY + DÜZENLEME MODAL */}
      {detayModal === 'makine' && (
        <Modal title="Makineler" onClose={() => { setDetayModal(null); setEditingMakine(null) }}>
          {editingMakine ? (
            /* DÜZENLEME FORMU */
            <div className="grid gap-3">
              <div className="flex items-center gap-2 mb-1">
                <button onClick={() => setEditingMakine(null)} className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800">← Geri</button>
                <p className="text-sm font-semibold text-white">Makine Düzenle</p>
              </div>
              <Input label="Makine Adı" value={editMakineForm.makineAdi} onChange={(v: string) => setEditMakineForm(f => ({ ...f, makineAdi: v }))} />
              <Input label="Alınan Bedel (₺)" value={editMakineForm.alinanBedel} onChange={(v: string) => setEditMakineForm(f => ({ ...f, alinanBedel: v }))} />
              <Input label="Amortisman Süresi (Ay)" value={editMakineForm.amortismanSuresiAy} onChange={(v: string) => setEditMakineForm(f => ({ ...f, amortismanSuresiAy: v }))} />
              <Input label="Aylık Aktif Çalışma Saati" value={editMakineForm.aylikAktifCalismaSaati} onChange={(v: string) => setEditMakineForm(f => ({ ...f, aylikAktifCalismaSaati: v }))} />
              {/* Hesaplanan önizleme */}
              {n(editMakineForm.alinanBedel) > 0 && n(editMakineForm.amortismanSuresiAy) > 0 && (
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
                  <p className="text-[10px] text-amber-400 uppercase tracking-wider mb-1">Hesaplanan Değerler</p>
                  <p className="text-xs text-slate-300">Aylık Amortisman: <span className="text-white font-semibold">{tl(n(editMakineForm.alinanBedel) / n(editMakineForm.amortismanSuresiAy))}</span></p>
                  {n(editMakineForm.aylikAktifCalismaSaati) > 0 && (
                    <p className="text-xs text-slate-300 mt-1">Dakika Maliyeti: <span className="text-white font-semibold">{tl((n(editMakineForm.alinanBedel) / n(editMakineForm.amortismanSuresiAy)) / n(editMakineForm.aylikAktifCalismaSaati) / 60)}</span></p>
                  )}
                </div>
              )}
              <div className="flex gap-2 mt-2">
                <button onClick={() => setEditingMakine(null)} className="flex-1 rounded-xl border border-slate-700 py-2.5 text-sm text-slate-300 hover:bg-slate-800">İptal</button>
                <button onClick={makineGuncelle} disabled={editKaydediliyor} className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold hover:bg-emerald-500 disabled:opacity-50">
                  {editKaydediliyor ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
              </div>
            </div>
          ) : (
            /* MAKİNE LİSTESİ */
            <div className="grid gap-2">
              {makineler.length === 0 && (
                <p className="text-center text-sm text-slate-500 py-4">Henüz makine eklenmemiş.</p>
              )}
              {makineler.map(m => (
                <div
                  key={m.id}
                  onClick={() => makineEditAc(m)}
                  className="group cursor-pointer rounded-xl border border-slate-700 bg-[#111827] p-4 hover:border-blue-500/50 hover:bg-blue-500/5 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-white truncate">{m.makineAdi}</p>
                        <span className="shrink-0 rounded-md border border-slate-600 px-1.5 py-0.5 text-[9px] text-slate-400 group-hover:border-blue-500/40 group-hover:text-blue-400 transition-colors">Düzenle</span>
                      </div>
                      <div className="mt-1.5 grid grid-cols-2 gap-x-4 gap-y-0.5">
                        <p className="text-[11px] text-slate-400">Amortisman: <span className="text-slate-300">{m.amortismanSuresiAy} ay</span></p>
                        <p className="text-[11px] text-slate-400">Aylık Saat: <span className="text-slate-300">{m.aylikAktifCalismaSaati} sa</span></p>
                        <p className="text-[11px] text-slate-400">Aylık: <span className="text-amber-300 font-medium">{tl(m.aylikAmortisman)}</span></p>
                        <p className="text-[11px] text-slate-400">Dakika: <span className="text-slate-300">{tl(m.dakikalikMaliyet)}</span></p>
                      </div>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); makineSil(m.id) }}
                      className="shrink-0 rounded-lg border border-red-500/20 bg-red-500/10 px-2.5 py-1.5 text-[11px] text-red-400 hover:bg-red-500/20 transition-colors"
                    >
                      Sil
                    </button>
                  </div>
                </div>
              ))}
              <button onClick={() => { setDetayModal(null); setMakineModal(true) }} className="mt-1 w-full rounded-xl border border-dashed border-slate-700 py-2.5 text-xs text-slate-400 hover:border-blue-500/50 hover:text-blue-400 transition-colors">
                + Yeni Makine Ekle
              </button>
            </div>
          )}
        </Modal>
      )}

      {/* ARAÇLAR DETAY + DÜZENLEME MODAL */}
      {detayModal === 'arac' && (
        <Modal title="Araçlar" onClose={() => { setDetayModal(null); setEditingArac(null) }}>
          {editingArac ? (
            /* DÜZENLEME FORMU */
            <div className="grid gap-3">
              <div className="flex items-center gap-2 mb-1">
                <button onClick={() => setEditingArac(null)} className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800">← Geri</button>
                <p className="text-sm font-semibold text-white">Araç Düzenle</p>
              </div>
              <Input label="Araç Adı" value={editAracForm.aracAdi} onChange={(v: string) => setEditAracForm(f => ({ ...f, aracAdi: v }))} />
              <Input label="Araç Tipi" value={editAracForm.aracTipi} onChange={(v: string) => setEditAracForm(f => ({ ...f, aracTipi: v }))} />
              <Input label="Alınan Bedel (₺)" value={editAracForm.alinanBedel} onChange={(v: string) => setEditAracForm(f => ({ ...f, alinanBedel: v }))} />
              <Input label="Amortisman Süresi (Ay)" value={editAracForm.amortismanSuresiAy} onChange={(v: string) => setEditAracForm(f => ({ ...f, amortismanSuresiAy: v }))} />
              <Input label="Aylık Bakım (₺)" value={editAracForm.aylikBakim} onChange={(v: string) => setEditAracForm(f => ({ ...f, aylikBakim: v }))} />
              <Input label="Sigorta / Kasko (₺)" value={editAracForm.aylikSigortaKasko} onChange={(v: string) => setEditAracForm(f => ({ ...f, aylikSigortaKasko: v }))} />
              <Input label="Vergi / Muayene (₺)" value={editAracForm.aylikVergiMuayene} onChange={(v: string) => setEditAracForm(f => ({ ...f, aylikVergiMuayene: v }))} />
              {/* Hesaplanan önizleme */}
              {n(editAracForm.alinanBedel) > 0 && n(editAracForm.amortismanSuresiAy) > 0 && (
                <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-3">
                  <p className="text-[10px] text-violet-400 uppercase tracking-wider mb-1">Hesaplanan Değerler</p>
                  <p className="text-xs text-slate-300">Aylık Amortisman: <span className="text-white font-semibold">{tl(n(editAracForm.alinanBedel) / n(editAracForm.amortismanSuresiAy))}</span></p>
                  <p className="text-xs text-slate-300 mt-1">Toplam Aylık Maliyet: <span className="text-white font-semibold">{tl(
                    n(editAracForm.alinanBedel) / n(editAracForm.amortismanSuresiAy) +
                    n(editAracForm.aylikBakim) + n(editAracForm.aylikSigortaKasko) + n(editAracForm.aylikVergiMuayene)
                  )}</span></p>
                </div>
              )}
              <div className="flex gap-2 mt-2">
                <button onClick={() => setEditingArac(null)} className="flex-1 rounded-xl border border-slate-700 py-2.5 text-sm text-slate-300 hover:bg-slate-800">İptal</button>
                <button onClick={aracGuncelle} disabled={editKaydediliyor} className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold hover:bg-emerald-500 disabled:opacity-50">
                  {editKaydediliyor ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
              </div>
            </div>
          ) : (
            /* ARAÇ LİSTESİ */
            <div className="grid gap-2">
              {araclar.length === 0 && (
                <p className="text-center text-sm text-slate-500 py-4">Henüz araç eklenmemiş.</p>
              )}
              {araclar.map(a => (
                <div
                  key={a.id}
                  onClick={() => aracEditAc(a)}
                  className="group cursor-pointer rounded-xl border border-slate-700 bg-[#111827] p-4 hover:border-violet-500/50 hover:bg-violet-500/5 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-white truncate">{a.aracAdi}</p>
                        <span className="shrink-0 text-[9px] rounded-md border border-slate-600 px-1.5 py-0.5 text-slate-400 group-hover:border-violet-500/40 group-hover:text-violet-400 transition-colors">Düzenle</span>
                      </div>
                      <div className="mt-1.5 grid grid-cols-2 gap-x-4 gap-y-0.5">
                        <p className="text-[11px] text-slate-400">Tip: <span className="text-slate-300">{a.aracTipi}</span></p>
                        <p className="text-[11px] text-slate-400">Amortisman: <span className="text-slate-300">{a.amortismanSuresiAy} ay</span></p>
                        <p className="text-[11px] text-slate-400">Bakım: <span className="text-slate-300">{tl(a.aylikBakim)}</span></p>
                        <p className="text-[11px] text-slate-400">Toplam: <span className="text-violet-300 font-medium">{tl(a.aylikToplamSabitMaliyet)}</span></p>
                      </div>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); aracSil(a.id) }}
                      className="shrink-0 rounded-lg border border-red-500/20 bg-red-500/10 px-2.5 py-1.5 text-[11px] text-red-400 hover:bg-red-500/20 transition-colors"
                    >
                      Sil
                    </button>
                  </div>
                </div>
              ))}
              <button onClick={() => { setDetayModal(null); setAracModal(true) }} className="mt-1 w-full rounded-xl border border-dashed border-slate-700 py-2.5 text-xs text-slate-400 hover:border-violet-500/50 hover:text-violet-400 transition-colors">
                + Yeni Araç Ekle
              </button>
            </div>
          )}
        </Modal>
      )}
    </div>
  )
}

// Input moved to top-level
function SideButton({ active, title, sub, onClick }: any) {
  return (
    <button onClick={onClick} className={`rounded-2xl border p-3 text-left ${active ? 'border-blue-500/50 bg-blue-500/10' : 'border-slate-800 bg-[#111827]'}`}>
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-1 text-xs text-slate-400">{sub}</p>
    </button>
  )
}
function Kpi({ label, value, tone = 'text-white', hero = false }: any) {
  return (
    <div className={`rounded-2xl border border-slate-800 bg-[#111827] p-4${hero ? ' sm:col-span-2' : ''}`}>
      <p className="text-xs text-slate-400">{label}</p>
      <p className={`mt-2 whitespace-nowrap overflow-hidden font-semibold leading-tight tabular-nums ${hero ? 'text-2xl md:text-3xl' : 'text-lg md:text-xl'} ${tone}`}>{value}</p>
    </div>
  )
}
function ModelCard({ label, value, sub, compact = false }: any) {
  return (
    <div className="min-w-0 rounded-2xl border border-slate-800 bg-[#0B1120] p-4">
      <p className="text-xs text-slate-400">{label}</p>
      <div className="mt-3 flex items-end gap-2 min-w-0">
        <p className={`${compact ? 'text-[18px] md:text-[22px]' : 'text-[20px] md:text-[24px]'} whitespace-nowrap overflow-hidden font-semibold leading-none tracking-tight tabular-nums`}>{value}</p>
        <p className="pb-1 text-xs text-slate-500 min-w-0 truncate">{sub}</p>
      </div>
    </div>
  )
}
function Break({ label, value, color }: any) {
  return (
    <div className="rounded-xl bg-[#0B1120] p-3">
      <div className="flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${color}`} /><span className="text-slate-400">{label}</span></div>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  )
}
function ResourceCard({ title, count, value, onAdd, onDetail }: any) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-[#0B1120] p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold">{title}</p>
          <p className="mt-1 text-xs text-slate-400 truncate">{count} kayıt · {value}</p>
        </div>
        <button onClick={onAdd} className="w-8 h-8 flex items-center justify-center rounded-lg bg-blue-600 text-sm font-bold shrink-0">+</button>
      </div>
      <button onClick={onDetail} className="mt-3 w-full rounded-xl border border-slate-700 py-2 text-xs text-slate-300">Detayları Gör</button>
    </div>
  )
}
function SmallStat({ label, value }: any) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-[#111827] p-3">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-2 text-sm font-semibold leading-tight tabular-nums truncate">{value}</p>
    </div>
  )
}
function RightCard({ label, value }: any) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-[#111827] p-3">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-1 break-words text-lg font-semibold leading-tight tabular-nums">{value}</p>
    </div>
  )
}
function TopChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-[#0B1120] px-3 py-1.5">
      <p className="text-[9px] uppercase tracking-wider text-slate-500">{label}</p>
      <p className="text-xs font-semibold tabular-nums text-white">{value}</p>
    </div>
  )
}
function Modal({ title, children, onClose }: any) {
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="max-h-[90dvh] w-full max-w-xl overflow-y-auto rounded-3xl border border-slate-800 bg-[#0B1120] p-5 md:p-6 text-white shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-semibold">{title}</h2>
          <button onClick={onClose} className="rounded-xl border border-slate-700 px-3 py-1 text-slate-300">Kapat</button>
        </div>
        <div className="grid gap-3">{children}</div>
      </div>
    </div>
  )
}
