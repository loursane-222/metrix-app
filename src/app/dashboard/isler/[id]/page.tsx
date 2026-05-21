'use client'
import { normalizeMtulInput, normalizeMtulDisplay } from "@/lib/normalizeMtul";
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { paraGoster } from '@/lib/format'
import { teklifPdfIndir } from '@/lib/teklif-pdf'
import { PlakaPlanlayiciMini, type PlakaHesapSonucu } from '@/components/plaka-planlayici/PlakaPlanlayiciMini'
import {
  MobilePageContainer,
  MobileStickyHeader,
  MobileBottomSheet,
  MobileAccordion,
  MobileDarkCard,
} from '@/components/ui/mobile'

// ─── Desktop stil sabitleri (değişmedi) ──────────────────────────────────────
const inputStil: React.CSSProperties = { width:'100%', border:'1px solid #d1d5db', borderRadius:'8px', padding:'8px 12px', fontSize:'14px', boxSizing:'border-box' }
const labelStil: React.CSSProperties = { display:'block', fontSize:'13px', fontWeight:'500', color:'#374151', marginBottom:'4px' }
const gridStil: React.CSSProperties = { display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:'16px' }
const ikiKolonStil: React.CSSProperties = { display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px' }

type Makine = { id: string; makineAdi: string; dakikalikMaliyet: number }
type Operasyon = { operasyonTipi: string; makineId: string; adet: number; birimDakika: number; toplamDakika: number }

const OPERASYONLAR = [
  { key: 'ocak_kesim', label: 'Ocak Kesim', varsayilanDakika: 25 },
  { key: 'eviye_kesim', label: 'Eviye Kesim', varsayilanDakika: 20 },
  { key: 'kirk_bes_kesim', label: '45 Kesim', varsayilanDakika: 3 },
  { key: 'pah', label: 'Pah', varsayilanDakika: 2 },
  { key: 'boat_deligi', label: 'Boat Deliği', varsayilanDakika: 10 },
  { key: 'dogalgaz_deligi', label: 'Doğalgaz Deliği', varsayilanDakika: 5 },
]

// Özel işçilik key map — TypeScript strict için
const OZEL_ISCILIK = [
  { n: 1, mtul: 'ozelIscilik1Mtul' as const, dakika: 'ozelIscilik1Dakika' as const, aciklama: 'ozelIscilik1Aciklama' as const },
  { n: 2, mtul: 'ozelIscilik2Mtul' as const, dakika: 'ozelIscilik2Dakika' as const, aciklama: 'ozelIscilik2Aciklama' as const },
  { n: 3, mtul: 'ozelIscilik3Mtul' as const, dakika: 'ozelIscilik3Dakika' as const, aciklama: 'ozelIscilik3Aciklama' as const },
]

export default function IsDuzenle() {
  const router = useRouter()
  const params = useParams()
  const isId = params.id as string

  // ─── Mevcut state (değişmedi) ─────────────────────────────────────────────
  const [yukleniyor, setYukleniyor] = useState(true)
  const [kaydediliyor, setKaydediliyor] = useState(false)
  const [pdfYukleniyor, setPdfYukleniyor] = useState(false)
  const [makineler, setMakineler] = useState<Makine[]>([])
  const [plakaBasinaOrtMtul, setPlakaBasinaOrtMtul] = useState('3.20')
  const [atolyeBilgi, setAtolyeBilgi] = useState<{adi:string;adres:string;telefon:string;email:string;sehir:string;ilce:string;logoUrl:string;kdvOrani:number}>({adi:'',adres:'',telefon:'',email:'',sehir:'',ilce:'',logoUrl:'',kdvOrani:20})
  const [mevcutDurum, setMevcutDurum] = useState('teklif_verildi')
  const [plakaHesap, setPlakaHesap] = useState<PlakaHesapSonucu | null>(null)
  const [sonuc, setSonuc] = useState<{toplamSureDakika:number;iscilikMaliyeti:number;malzemeMaliyeti:number;toplamMaliyet:number;satisFiyati:number;mtulSatisFiyati:number;toplamMetraj:number;kdvTutari:number;kdvDahilFiyat:number;teklifNo:string;teklifGecerlilikTarihi:string;kullanilanPlakaSayisi:number} | null>(null)

  const [form, setForm] = useState({
    musteriAdi:'',
    urunAdi:'',
    malzemeTipi:'Porselen',
    musteriTipi:'Ev sahibi',
    plakaFiyatiEuro:'',
    metrajMtul:'',
    birMtulDakika:'',
    tezgahArasiMtul:'',
    tezgahArasiDakika:'',
    adaTezgahMtul:'',
    adaTezgahDakika:'',
    kullanilanKur:'',
    karYuzdesi:'30',
    notlar:'',
    plakaGenislikCm:'',
    plakaUzunlukCm:'',
    plakadanAlinanMtul:'',
    kirilanTasPlaka:'0',
    hataliKesimPlaka:'0',
    manuelPlakaSayisi:'',
    ozelIscilik1Mtul:'',
    ozelIscilik1Dakika:'',
    ozelIscilik1Aciklama:'',
    ozelIscilik2Mtul:'',
    ozelIscilik2Dakika:'',
    ozelIscilik2Aciklama:'',
    ozelIscilik3Mtul:'',
    ozelIscilik3Dakika:'',
    ozelIscilik3Aciklama:'',
  })

  const [seciliOperasyonlar, setSeciliOperasyonlar] = useState<{[key:string]:boolean}>({})
  const [operasyonDetay, setOperasyonDetay] = useState<{[key:string]:{makineId:string;adet:string;birimDakika:string}}>({})

  // ─── YENİ: Mobile UI state (business logic değişmedi) ────────────────────
  const [pdfModalAcik, setPdfModalAcik] = useState(false)
  const [pdfOdemeKosullari, setPdfOdemeKosullari] = useState('Sipariş onayı sonrası ödeme planı ayrıca mutabık kalınacaktır.')
  const [pdfTeslimTarihi, setPdfTeslimTarihi] = useState('Termin, ölçü ve kesin sipariş onayı sonrası netleşecektir.')
  const [sonucSheetAcik, setSonucSheetAcik] = useState(false)
  const [isRaw, setIsRaw] = useState<any>(null)

  // ─── Veri yükleme (değişmedi + setIsRaw eklendi) ─────────────────────────
  useEffect(() => {
    async function yukle() {
      try {
        const [isRes, makRes, atolyeRes] = await Promise.all([
          fetch(`/api/isler/${isId}`),
          fetch('/api/makineler'),
          fetch('/api/atolye'),
        ])
        const isVeri = await isRes.json()
        const makVeri = await makRes.json()
        const atolyeVeri = await atolyeRes.json()

        if (makVeri.makineler) setMakineler(makVeri.makineler)
        if (atolyeVeri.atolye) {
          const a = atolyeVeri.atolye
          setPlakaBasinaOrtMtul(normalizeMtulInput(a.plakaBasinaMtul).toFixed(2))
          setAtolyeBilgi({
            adi:a.atolyeAdi||'',
            adres:a.adres||'',
            telefon:a.telefon||'',
            email:a.email||'',
            sehir:a.sehir||'',
            ilce:a.ilce||'',
            logoUrl:a.logoUrl||'',
            kdvOrani:a.kdvOrani||20
          })
        }
        if (isVeri.is) {
          const is = isVeri.is
          setMevcutDurum(is.durum)
          setIsRaw(is) // ← YENİ: mobile display için ham veri
          setForm({
            musteriAdi:is.musteriAdi||'',
            urunAdi:is.urunAdi||'',
            malzemeTipi:is.malzemeTipi||'Porselen',
            musteriTipi:is.musteriTipi||'Ev sahibi',
            plakaFiyatiEuro:String(Number(is.plakaFiyatiEuro)||''),
            metrajMtul:String(normalizeMtulInput(is.metrajMtul)||''),
            birMtulDakika:String(normalizeMtulInput(is.birMtulDakika)||''),
            tezgahArasiMtul:String(normalizeMtulInput(is.tezgahArasiMtul)||''),
            tezgahArasiDakika:String(Number(is.tezgahArasiDakika)||''),
            adaTezgahMtul:String(normalizeMtulInput(is.adaTezgahMtul)||''),
            adaTezgahDakika:String(Number(is.adaTezgahDakika)||''),
            kullanilanKur:String(Number(is.kullanilanKur)||''),
            karYuzdesi:String(Number(is.karYuzdesi)||'30'),
            notlar:is.notlar||'',
            plakaGenislikCm:String(Number(is.plakaGenislikCm)||''),
            plakaUzunlukCm:String(Number(is.plakaUzunlukCm)||''),
            plakadanAlinanMtul:String(normalizeMtulInput(is.plakadanAlinanMtul)||''),
            kirilanTasPlaka:String(Number(is.kirilanTasPlaka)||'0'),
            hataliKesimPlaka:String(normalizeMtulInput(is.hataliKesimPlaka)||'0'),
            manuelPlakaSayisi:String(Number(is.kullanilanPlakaSayisi)||''),
            ozelIscilik1Mtul:'',
            ozelIscilik1Dakika:'',
            ozelIscilik1Aciklama:'',
            ozelIscilik2Mtul:'',
            ozelIscilik2Dakika:'',
            ozelIscilik2Aciklama:'',
            ozelIscilik3Mtul:'',
            ozelIscilik3Dakika:'',
            ozelIscilik3Aciklama:'',
          })
          if (is.operasyonlar) {
            const secili: {[key:string]:boolean} = {}
            const detay: {[key:string]:{makineId:string;adet:string;birimDakika:string}} = {}
            for (const op of is.operasyonlar) {
              secili[op.operasyonTipi] = true
              detay[op.operasyonTipi] = {
                makineId:op.makineId||'',
                adet:String(op.adet),
                birimDakika:String(op.birimDakika)
              }
            }
            setSeciliOperasyonlar(secili)
            setOperasyonDetay(detay)
          }
        }
      } finally {
        setYukleniyor(false)
      }
    }
    yukle()
  }, [isId])

  // ─── Mevcut fonksiyonlar (değişmedi) ─────────────────────────────────────
  function guncelle(alan: string, deger: string) {
    setForm(prev => ({...prev, [alan]: deger}))
  }

  function operasyonToggle(key: string) {
    setSeciliOperasyonlar(prev => ({...prev, [key]: !prev[key]}))
    if (!operasyonDetay[key]) {
      setOperasyonDetay(prev => ({
        ...prev,
        [key]: {makineId: makineler[0]?.id||'', adet:'', birimDakika:''}
      }))
    }
  }

  function operasyonGuncelle(key: string, alan: string, deger: string) {
    setOperasyonDetay(prev => ({...prev, [key]: {...prev[key], [alan]: deger}}))
  }

  const onaylandi = mevcutDurum === 'onaylandi'

  const toplamMetrajHesap =
    (normalizeMtulInput(form.metrajMtul) || 0) +
    (normalizeMtulInput(form.tezgahArasiMtul) || 0) +
    (normalizeMtulInput(form.adaTezgahMtul) || 0) +
    (normalizeMtulInput(form.ozelIscilik1Mtul) || 0) +
    (normalizeMtulInput(form.ozelIscilik2Mtul) || 0) +
    (normalizeMtulInput(form.ozelIscilik3Mtul) || 0)

  const otomatikPlakaSayisi =
    (normalizeMtulInput(form.plakadanAlinanMtul) || 0) > 0
      ? Math.ceil(toplamMetrajHesap / (normalizeMtulInput(form.plakadanAlinanMtul) || 1))
      : 0

  const gosterilenPlakaSayisi =
    (parseFloat(form.manuelPlakaSayisi) || 0) > 0
      ? parseFloat(form.manuelPlakaSayisi)
      : otomatikPlakaSayisi

  // Desktop form submit (değişmedi)
  async function kaydet(e: React.FormEvent) {
    e.preventDefault()
    setKaydediliyor(true)
    setSonuc(null)

    const operasyonlar: Operasyon[] = OPERASYONLAR
      .filter(op => seciliOperasyonlar[op.key])
      .map(op => {
        const detay = operasyonDetay[op.key]
        const adet = parseInt(detay?.adet)||1
        const birimDakika = parseFloat(detay?.birimDakika)||op.varsayilanDakika
        return {
          operasyonTipi:op.key,
          makineId:detay?.makineId||'',
          adet,
          birimDakika,
          toplamDakika:adet*birimDakika
        }
      })

    try {
      const yanit = await fetch(`/api/isler/${isId}`, {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          ...form,
          onaylandi,
          plakaFiyatiEuro:parseFloat(form.plakaFiyatiEuro)||0,
          metrajMtul:normalizeMtulInput(form.metrajMtul)||0,
          birMtulDakika:normalizeMtulInput(form.birMtulDakika)||0,
          tezgahArasiMtul:normalizeMtulInput(form.tezgahArasiMtul)||0,
          tezgahArasiDakika:parseFloat(form.tezgahArasiDakika)||0,
          adaTezgahMtul:normalizeMtulInput(form.adaTezgahMtul)||0,
          adaTezgahDakika:parseFloat(form.adaTezgahDakika)||0,
          kullanilanKur:parseFloat(form.kullanilanKur)||0,
          karYuzdesi:parseFloat(form.karYuzdesi)||0,
          plakaGenislikCm:parseFloat(form.plakaGenislikCm)||0,
          plakaUzunlukCm:parseFloat(form.plakaUzunlukCm)||0,
          plakadanAlinanMtul:normalizeMtulInput(form.plakadanAlinanMtul)||0,
          kirilanTasPlaka:parseFloat(form.kirilanTasPlaka)||0,
          hataliKesimPlaka:normalizeMtulInput(form.hataliKesimPlaka)||0,
          manuelPlakaSayisi:parseFloat(form.manuelPlakaSayisi)||0,
          ozelIscilik1Mtul:normalizeMtulInput(form.ozelIscilik1Mtul)||0,
          ozelIscilik1Dakika:parseFloat(form.ozelIscilik1Dakika)||0,
          ozelIscilik2Mtul:normalizeMtulInput(form.ozelIscilik2Mtul)||0,
          ozelIscilik2Dakika:parseFloat(form.ozelIscilik2Dakika)||0,
          ozelIscilik3Mtul:normalizeMtulInput(form.ozelIscilik3Mtul)||0,
          ozelIscilik3Dakika:parseFloat(form.ozelIscilik3Dakika)||0,
          operasyonlar,
        }),
      })
      const veri = await yanit.json()
      if (yanit.ok) setSonuc(veri)
    } finally {
      setKaydediliyor(false)
    }
  }

  // Desktop PDF (window.prompt — değişmedi, desktop'ta kullanılır)
  async function pdfIndir() {
    if (!sonuc) return

    const odemeKosullari = window.prompt(
      'Ödeme Koşulları',
      'Sipariş onayı sonrası ödeme planı ayrıca mutabık kalınacaktır.'
    )
    if (odemeKosullari === null) return

    const teslimTarihi = window.prompt(
      'Teslim Tarihi',
      'Termin, ölçü ve kesin sipariş onayı sonrası netleşecektir.'
    )
    if (teslimTarihi === null) return

    setPdfYukleniyor(true)
    try {
      await teklifPdfIndir({
        teklifNo:sonuc.teklifNo,
        tarih:new Date().toLocaleDateString('tr-TR'),
        gecerlilikTarihi:new Date(sonuc.teklifGecerlilikTarihi).toLocaleDateString('tr-TR'),
        firma:atolyeBilgi,
        musteri:{adi:form.musteriAdi, tipi:form.musteriTipi},
        odemeKosullari,
        teslimTarihi,
        is:{
          urunAdi:form.urunAdi,
          malzemeTipi:form.malzemeTipi,
          metrajMtul:normalizeMtulInput(form.metrajMtul)||0,
          tezgahArasiMtul:normalizeMtulInput(form.tezgahArasiMtul)||0,
          adaTezgahMtul:normalizeMtulInput(form.adaTezgahMtul)||0,
          toplamMetraj:sonuc.toplamMetraj,
          plakaGenislikCm:parseFloat(form.plakaGenislikCm)||0,
          plakaUzunlukCm:parseFloat(form.plakaUzunlukCm)||0,
          plakadanAlinanMtul:normalizeMtulInput(form.plakadanAlinanMtul)||0,
          kullanilanPlakaSayisi:sonuc.kullanilanPlakaSayisi,
          plakaFiyatiEuro:parseFloat(form.plakaFiyatiEuro)||0,
          kullanilanKur:parseFloat(form.kullanilanKur)||0,
          toplamSureDakika:sonuc.toplamSureDakika,
          iscilikMaliyeti:sonuc.iscilikMaliyeti,
          malzemeMaliyeti:sonuc.malzemeMaliyeti,
          toplamMaliyet:sonuc.toplamMaliyet,
          karYuzdesi:parseFloat(form.karYuzdesi)||0,
          satisFiyati:sonuc.satisFiyati,
          kdvOrani:atolyeBilgi.kdvOrani,
          kdvTutari:sonuc.kdvTutari,
          kdvDahilFiyat:sonuc.kdvDahilFiyat,
          mtulSatisFiyati:sonuc.mtulSatisFiyati,
          ozelIscilik1Mtul:normalizeMtulInput(form.ozelIscilik1Mtul)||0,
          ozelIscilik1Dakika:parseFloat(form.ozelIscilik1Dakika)||0,
          ozelIscilik1Aciklama:form.ozelIscilik1Aciklama,
          ozelIscilik2Mtul:normalizeMtulInput(form.ozelIscilik2Mtul)||0,
          ozelIscilik2Dakika:parseFloat(form.ozelIscilik2Dakika)||0,
          ozelIscilik2Aciklama:form.ozelIscilik2Aciklama,
          ozelIscilik3Mtul:normalizeMtulInput(form.ozelIscilik3Mtul)||0,
          ozelIscilik3Dakika:parseFloat(form.ozelIscilik3Dakika)||0,
          ozelIscilik3Aciklama:form.ozelIscilik3Aciklama,
          notlar:form.notlar,
        },
      })
    } finally {
      setPdfYukleniyor(false)
    }
  }

  // ─── YENİ: Mobile fonksiyonlar ────────────────────────────────────────────

  // Mobile submit — window.prompt yok, state üzerinden
  async function mobilKaydet() {
    const ev = { preventDefault: () => {} } as React.FormEvent<HTMLFormElement>
    await kaydet(ev)
  }

  // Mobile PDF — window.prompt yerine MobileBottomSheet state
  async function mobilPdfIndir() {
    if (!sonuc) return
    setPdfModalAcik(false)
    setPdfYukleniyor(true)
    try {
      await teklifPdfIndir({
        teklifNo: sonuc.teklifNo,
        tarih: new Date().toLocaleDateString('tr-TR'),
        gecerlilikTarihi: new Date(sonuc.teklifGecerlilikTarihi).toLocaleDateString('tr-TR'),
        firma: atolyeBilgi,
        musteri: { adi: form.musteriAdi, tipi: form.musteriTipi },
        odemeKosullari: pdfOdemeKosullari,
        teslimTarihi: pdfTeslimTarihi,
        is: {
          urunAdi: form.urunAdi,
          malzemeTipi: form.malzemeTipi,
          metrajMtul: normalizeMtulInput(form.metrajMtul) || 0,
          tezgahArasiMtul: normalizeMtulInput(form.tezgahArasiMtul) || 0,
          adaTezgahMtul: normalizeMtulInput(form.adaTezgahMtul) || 0,
          toplamMetraj: sonuc.toplamMetraj,
          plakaGenislikCm: parseFloat(form.plakaGenislikCm) || 0,
          plakaUzunlukCm: parseFloat(form.plakaUzunlukCm) || 0,
          plakadanAlinanMtul: normalizeMtulInput(form.plakadanAlinanMtul) || 0,
          kullanilanPlakaSayisi: sonuc.kullanilanPlakaSayisi,
          plakaFiyatiEuro: parseFloat(form.plakaFiyatiEuro) || 0,
          kullanilanKur: parseFloat(form.kullanilanKur) || 0,
          toplamSureDakika: sonuc.toplamSureDakika,
          iscilikMaliyeti: sonuc.iscilikMaliyeti,
          malzemeMaliyeti: sonuc.malzemeMaliyeti,
          toplamMaliyet: sonuc.toplamMaliyet,
          karYuzdesi: parseFloat(form.karYuzdesi) || 0,
          satisFiyati: sonuc.satisFiyati,
          kdvOrani: atolyeBilgi.kdvOrani,
          kdvTutari: sonuc.kdvTutari,
          kdvDahilFiyat: sonuc.kdvDahilFiyat,
          mtulSatisFiyati: sonuc.mtulSatisFiyati,
          ozelIscilik1Mtul: normalizeMtulInput(form.ozelIscilik1Mtul) || 0,
          ozelIscilik1Dakika: parseFloat(form.ozelIscilik1Dakika) || 0,
          ozelIscilik1Aciklama: form.ozelIscilik1Aciklama,
          ozelIscilik2Mtul: normalizeMtulInput(form.ozelIscilik2Mtul) || 0,
          ozelIscilik2Dakika: parseFloat(form.ozelIscilik2Dakika) || 0,
          ozelIscilik2Aciklama: form.ozelIscilik2Aciklama,
          ozelIscilik3Mtul: normalizeMtulInput(form.ozelIscilik3Mtul) || 0,
          ozelIscilik3Dakika: parseFloat(form.ozelIscilik3Dakika) || 0,
          ozelIscilik3Aciklama: form.ozelIscilik3Aciklama,
          notlar: form.notlar,
        },
      })
    } finally {
      setPdfYukleniyor(false)
    }
  }

  // Mobile WhatsApp
  function mobilWhatsapp() {
    const rawPhone = String(isRaw?.musteriTelefonu || '')
    let phone = rawPhone.replace(/\D/g, '')
    if (phone.startsWith('0')) phone = '90' + phone.slice(1)
    if (phone && !phone.startsWith('90')) phone = '90' + phone

    const teklifNo = isRaw?.teklifNo || sonuc?.teklifNo || ''
    const link = teklifNo ? `${window.location.origin}/teklif/${teklifNo}` : ''
    const mesaj = link
      ? `Merhaba ${form.musteriAdi || 'Sayın Müşteri'},\n\nTeklifinizi aşağıdaki linkten inceleyebilirsiniz:\n\n${link}\n\nHerhangi bir sorunuz için yardımcı olmaktan memnuniyet duyarım.`
      : `Merhaba ${form.musteriAdi || 'Sayın Müşteri'}, teklifiniz hakkında bilgi almak için bize ulaşabilirsiniz.`

    const waUrl = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(mesaj)}`
      : `https://wa.me/?text=${encodeURIComponent(mesaj)}`
    window.open(waUrl, '_blank')
  }

  // Sonuç gelince sheet'i aç
  useEffect(() => {
    if (sonuc) setSonucSheetAcik(true)
  }, [sonuc])

  // ─── Mobile computed değerler ─────────────────────────────────────────────
  const mobilDurumLabel =
    mevcutDurum === 'onaylandi' ? 'Onaylandı'
    : mevcutDurum === 'montaj_tamamlandi' ? 'Montaj Tamam'
    : mevcutDurum === 'kaybedildi' ? 'Kaybedildi'
    : 'Beklemede'

  const mobilDurumCls =
    mevcutDurum === 'onaylandi'
      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
      : mevcutDurum === 'kaybedildi'
      ? 'bg-red-500/15 text-red-400 border border-red-500/25'
      : 'bg-amber-500/15 text-amber-400 border border-amber-500/25'

  const aktifOpSayisi = Object.values(seciliOperasyonlar).filter(Boolean).length

  // Mobile input stil sabitleri
  const iS = { background: '#111827', border: '0.5px solid rgba(255,255,255,0.10)', fontSize: 16 as const }
  const iC = 'h-12 w-full rounded-xl px-4 text-white outline-none'
  const lS = { color: 'rgba(148,163,184,0.62)' }
  const lC = 'text-[11px] font-semibold uppercase tracking-wide'
  const sepS = { height: 1, background: 'rgba(255,255,255,0.07)' }

  // ─── Loading state ────────────────────────────────────────────────────────
  if (yukleniyor) return (
    <>
      <div className="hidden md:block" style={{padding:'32px'}}>Yükleniyor...</div>
      <div className="md:hidden min-h-[100dvh] bg-[#030712] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-blue-500" />
          <p className="text-sm text-slate-500">Yükleniyor...</p>
        </div>
      </div>
    </>
  )

  return (
    <>
    {/* ═══════════════════════════════════════════════════════════════════
        DESKTOP — Birebir korundu, hidden md:block wrapper eklendi
        ═══════════════════════════════════════════════════════════════════ */}
    <div className="hidden md:block" style={{padding:'32px', maxWidth:'900px'}}>
      <div style={{display:'flex', alignItems:'center', gap:'12px', marginBottom:'24px', flexWrap:'wrap'}}>
        <button onClick={() => router.push('/dashboard/isler')} style={{background:'#f3f4f6', border:'1px solid #e5e7eb', borderRadius:'8px', padding:'8px 14px', cursor:'pointer', fontSize:'14px'}}>← Geri</button>
        <h2 style={{margin:0, fontSize:'24px', fontWeight:'600', color:'#111827'}}>İş Düzenle</h2>
        {onaylandi && (
          <span style={{background:'#fef3c7', color:'#92400e', borderRadius:'8px', padding:'6px 12px', fontSize:'13px', fontWeight:'500'}}>
            ⚠ Onaylanmış iş — teklif fiyatı değişmez, sadece maliyet güncellenir
          </span>
        )}
      </div>

      <form onSubmit={kaydet}>
        <div style={{background:'white', borderRadius:'12px', padding:'24px', border:'1px solid #e5e7eb', marginBottom:'20px'}}>
          <h3 style={{fontSize:'16px', fontWeight:'600', margin:'0 0 20px', paddingBottom:'12px', borderBottom:'1px solid #f3f4f6'}}>Müşteri ve Ürün Bilgileri</h3>
          <div style={gridStil}>
            <div><label style={labelStil}>Müşteri Adı</label><input style={inputStil} required value={form.musteriAdi} onChange={e => guncelle('musteriAdi', e.target.value)} /></div>
            <div><label style={labelStil}>Müşteri Tipi</label>
              <select style={inputStil} value={form.musteriTipi} onChange={e => guncelle('musteriTipi', e.target.value)}>
                <option>Ev sahibi</option><option>Mimar</option><option>Müteahhit</option>
              </select>
            </div>
          </div>
        </div>

        <div style={{background:'white', borderRadius:'12px', padding:'24px', border:'1px solid #e5e7eb', marginBottom:'20px'}}>
          <h3 style={{fontSize:'16px', fontWeight:'600', margin:'0 0 20px', paddingBottom:'12px', borderBottom:'1px solid #f3f4f6'}}>Plaka Bilgileri</h3>
          <div style={gridStil}>
            <div><label style={labelStil}>Ürün Adı</label><input style={inputStil} required value={form.urunAdi} onChange={e => guncelle('urunAdi', e.target.value)} /></div>
            <div><label style={labelStil}>Malzeme Tipi</label>
              <select style={inputStil} value={form.malzemeTipi} onChange={e => guncelle('malzemeTipi', e.target.value)}>
                <option>Porselen</option><option>Kuvars</option><option>Doğaltaş</option>
              </select>
            </div>
          </div>
          <div style={{height:'16px'}}></div>
          <div style={{background:'#fffbeb', border:'1px solid #fde68a', borderRadius:'8px', padding:'10px 14px', marginBottom:'16px', fontSize:'13px', color:'#92400e'}}>
            Atölye ortalaması: <strong>{plakaBasinaOrtMtul} mtül/plaka</strong>
          </div>
          <div style={gridStil}>
            <div><label style={labelStil}>Plaka Genişliği (cm)</label><input style={inputStil} type="number" step="0.1" value={form.plakaGenislikCm} onChange={e => guncelle('plakaGenislikCm', e.target.value)} /></div>
            <div><label style={labelStil}>Plaka Uzunluğu (cm)</label><input style={inputStil} type="number" step="0.1" value={form.plakaUzunlukCm} onChange={e => guncelle('plakaUzunlukCm', e.target.value)} /></div>
            <div><label style={labelStil}>Bu Plakadan Alınan Mtül</label><input style={inputStil} type="number" step="0.01" value={form.plakadanAlinanMtul} onChange={e => guncelle('plakadanAlinanMtul', e.target.value)} /></div>
            <div><label style={labelStil}>Plaka Fiyatı (€)</label><input style={inputStil} type="number" step="0.01" required value={form.plakaFiyatiEuro} onChange={e => guncelle('plakaFiyatiEuro', e.target.value)} /></div>
            <div><label style={labelStil}>Güncel Kur (1€ = ? TL)</label><input style={inputStil} type="number" step="0.01" required value={form.kullanilanKur} onChange={e => guncelle('kullanilanKur', e.target.value)} /></div>
          </div>
          <PlakaPlanlayiciMini
            plakaEni={form.plakaGenislikCm}
            plakaBoy={form.plakaUzunlukCm}
            onHesapla={(s) => {
              setPlakaHesap(s)
              if (s.tezgahBoy>0&&s.tezgahAdet>0) guncelle('metrajMtul',((s.tezgahBoy/100)*s.tezgahAdet).toFixed(2))
              if (s.tezgahArasiBoy>0&&s.tezgahArasiAdet>0) guncelle('tezgahArasiMtul',((s.tezgahArasiBoy/100)*s.tezgahArasiAdet).toFixed(2))
              if (s.adaTezgahBoy>0&&s.adaTezgahAdet>0) guncelle('adaTezgahMtul',((s.adaTezgahBoy/100)*s.adaTezgahAdet).toFixed(2))
            }}
          />
        </div>

        <div style={{background:'white', borderRadius:'12px', padding:'24px', border:'1px solid #e5e7eb', marginBottom:'20px'}}>
          <h3 style={{fontSize:'16px', fontWeight:'600', margin:'0 0 8px', paddingBottom:'12px', borderBottom:'1px solid #f3f4f6'}}>Ek Plaka Giderleri</h3>
          <p style={{margin:'0 0 16px', fontSize:'13px', color:'#6b7280'}}>
            {onaylandi ? '⚠ Onaylanmış iş: Bu girişler sadece maliyeti günceller, teklif fiyatı değişmez.' : 'Bu girişler toplam maliyet hesabına dahil edilir.'}
          </p>
          <div style={gridStil}>
            <div><label style={labelStil}>Kırılan Taş (plaka adedi)</label><input style={inputStil} type="number" step="0.1" min="0" value={form.kirilanTasPlaka} onChange={e => guncelle('kirilanTasPlaka', e.target.value)} /></div>
            <div><label style={labelStil}>Hatalı Kesim/Ölçü (plaka adedi)</label><input style={inputStil} type="number" step="0.1" min="0" value={form.hataliKesimPlaka} onChange={e => guncelle('hataliKesimPlaka', e.target.value)} /></div>
          </div>
        </div>

        <div style={{background:'white', borderRadius:'12px', padding:'24px', border:'1px solid #e5e7eb', marginBottom:'20px'}}>
          <h3 style={{fontSize:'16px', fontWeight:'600', margin:'0 0 20px', paddingBottom:'12px', borderBottom:'1px solid #f3f4f6'}}>Metraj ve Üretim</h3>
          <div style={ikiKolonStil}>
            <div><label style={labelStil}>Tezgah (mtül)</label><input style={inputStil} type="number" step="0.01" required value={form.metrajMtul} onChange={e => guncelle('metrajMtul', e.target.value)} /></div>
            <div><label style={labelStil}>Tezgah 1 mtül Üretim Süresi (dk)</label><input style={inputStil} type="number" step="0.1" required value={form.birMtulDakika} onChange={e => guncelle('birMtulDakika', e.target.value)} /></div>
            <div><label style={labelStil}>Tezgah Arası (mtül)</label><input style={inputStil} type="number" step="0.01" value={form.tezgahArasiMtul} onChange={e => guncelle('tezgahArasiMtul', e.target.value)} /></div>
            <div><label style={labelStil}>Tezgah Arası 1 mtül Üretim Süresi (dk)</label><input style={inputStil} type="number" step="0.1" value={form.tezgahArasiDakika} onChange={e => guncelle('tezgahArasiDakika', e.target.value)} /></div>
            <div><label style={labelStil}>Ada Tezgah (mtül)</label><input style={inputStil} type="number" step="0.01" value={form.adaTezgahMtul} onChange={e => guncelle('adaTezgahMtul', e.target.value)} /></div>
            <div><label style={labelStil}>Ada Tezgah 1 mtül Üretim Süresi (dk)</label><input style={inputStil} type="number" step="0.1" value={form.adaTezgahDakika} onChange={e => guncelle('adaTezgahDakika', e.target.value)} /></div>
            <div><label style={labelStil}>Özel İşçilik 1</label><input style={inputStil} type="number" step="0.01" value={form.ozelIscilik1Mtul} onChange={e => guncelle('ozelIscilik1Mtul', e.target.value)} placeholder="mtül" /></div>
            <div><label style={labelStil}>İşçilik Detayı 1</label><input style={inputStil} value={form.ozelIscilik1Aciklama} onChange={e => guncelle('ozelIscilik1Aciklama', e.target.value)} placeholder="Açıklama" /></div>
            <div><label style={labelStil}>Özel İşçilik 1 mtül Üretim Süresi (dk)</label><input style={inputStil} type="number" step="0.1" value={form.ozelIscilik1Dakika} onChange={e => guncelle('ozelIscilik1Dakika', e.target.value)} /></div>
            <div></div>
            <div><label style={labelStil}>Özel İşçilik 2</label><input style={inputStil} type="number" step="0.01" value={form.ozelIscilik2Mtul} onChange={e => guncelle('ozelIscilik2Mtul', e.target.value)} placeholder="mtül" /></div>
            <div><label style={labelStil}>İşçilik Detayı 2</label><input style={inputStil} value={form.ozelIscilik2Aciklama} onChange={e => guncelle('ozelIscilik2Aciklama', e.target.value)} placeholder="Açıklama" /></div>
            <div><label style={labelStil}>Özel İşçilik 2 mtül Üretim Süresi (dk)</label><input style={inputStil} type="number" step="0.1" value={form.ozelIscilik2Dakika} onChange={e => guncelle('ozelIscilik2Dakika', e.target.value)} placeholder="0" /></div>
            <div></div>
            <div><label style={labelStil}>Özel İşçilik 3</label><input style={inputStil} type="number" step="0.01" value={form.ozelIscilik3Mtul} onChange={e => guncelle('ozelIscilik3Mtul', e.target.value)} placeholder="mtül" /></div>
            <div><label style={labelStil}>İşçilik Detayı 3</label><input style={inputStil} value={form.ozelIscilik3Aciklama} onChange={e => guncelle('ozelIscilik3Aciklama', e.target.value)} placeholder="Açıklama" /></div>
            <div><label style={labelStil}>Özel İşçilik 3 mtül Üretim Süresi (dk)</label><input style={inputStil} type="number" step="0.1" value={form.ozelIscilik3Dakika} onChange={e => guncelle('ozelIscilik3Dakika', e.target.value)} placeholder="0" /></div>
            <div></div>
          </div>
          <div style={{marginTop:'20px', background:'#f8fafc', border:'1px solid #e5e7eb', borderRadius:'10px', padding:'16px'}}>
            <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(220px, 1fr))', gap:'16px'}}>
              <div>
                <div style={{fontSize:'12px', color:'#6b7280', marginBottom:'4px'}}>Toplam Mtül</div>
                <div style={{fontSize:'18px', fontWeight:'700', color:'#111827'}}>{toplamMetrajHesap.toFixed(2)} mtül</div>
              </div>
              <div>
                <div style={{fontSize:'12px', color:'#6b7280', marginBottom:'4px'}}>Otomatik Plaka İhtiyacı</div>
                <div style={{fontSize:'18px', fontWeight:'700', color:'#111827'}}>{otomatikPlakaSayisi}</div>
              </div>
              <div>
                <label style={labelStil}>Kaç Plaka Ürün Gerekiyor?</label>
                <input
                  style={inputStil}
                  type="number"
                  step="1"
                  min="0"
                  value={form.manuelPlakaSayisi}
                  onChange={e => guncelle('manuelPlakaSayisi', e.target.value)}
                  placeholder={`Otomatik: ${otomatikPlakaSayisi}`}
                />
                <div style={{fontSize:'12px', color:'#6b7280', marginTop:'6px'}}>
                  Boş bırakırsan otomatik hesap kullanılır. Aktif plaka sayısı: <strong>{gosterilenPlakaSayisi}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style={{background:'white', borderRadius:'12px', padding:'24px', border:'1px solid #e5e7eb', marginBottom:'20px'}}>
          <h3 style={{fontSize:'16px', fontWeight:'600', margin:'0 0 20px', paddingBottom:'12px', borderBottom:'1px solid #f3f4f6'}}>Özel Operasyonlar</h3>
          <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))', gap:'10px', marginBottom:'16px'}}>
            {OPERASYONLAR.map(op => (
              <label key={op.key} style={{display:'flex', alignItems:'center', gap:'8px', cursor:'pointer', fontSize:'14px', padding:'8px 12px', border:`1px solid ${seciliOperasyonlar[op.key]?'#2563eb':'#e5e7eb'}`, borderRadius:'8px', background:seciliOperasyonlar[op.key]?'#eff6ff':'white'}}>
                <input type="checkbox" checked={!!seciliOperasyonlar[op.key]} onChange={() => operasyonToggle(op.key)} />
                {op.label}
              </label>
            ))}
          </div>
          {OPERASYONLAR.filter(op => seciliOperasyonlar[op.key]).map(op => (
            <div key={op.key} style={{background:'#f8fafc', borderRadius:'8px', padding:'16px', marginBottom:'8px', border:'1px solid #e2e8f0'}}>
              <p style={{margin:'0 0 12px', fontWeight:'500', fontSize:'14px', color:'#1e40af'}}>{op.label}</p>
              <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(150px, 1fr))', gap:'12px'}}>
                <div><label style={labelStil}>Makine</label>
                  <select style={inputStil} value={operasyonDetay[op.key]?.makineId||''} onChange={e => operasyonGuncelle(op.key,'makineId',e.target.value)}>
                    {makineler.map(m => <option key={m.id} value={m.id}>{m.makineAdi}</option>)}
                  </select>
                </div>
                <div><label style={labelStil}>Adet</label><input style={inputStil} type="number" value={operasyonDetay[op.key]?.adet||''} onChange={e => operasyonGuncelle(op.key,'adet',e.target.value)} /></div>
                <div><label style={labelStil}>Birim Süre (dk)</label><input style={inputStil} type="number" step="0.1" value={operasyonDetay[op.key]?.birimDakika||''} onChange={e => operasyonGuncelle(op.key,'birimDakika',e.target.value)} /></div>
              </div>
            </div>
          ))}
        </div>

        {!onaylandi && (
          <div style={{background:'white', borderRadius:'12px', padding:'24px', border:'1px solid #e5e7eb', marginBottom:'20px'}}>
            <h3 style={{fontSize:'16px', fontWeight:'600', margin:'0 0 20px', paddingBottom:'12px', borderBottom:'1px solid #f3f4f6'}}>Fiyatlandırma</h3>
            <div style={gridStil}>
              <div><label style={labelStil}>Kar Yüzdesi (%)</label><input style={inputStil} type="number" step="0.1" value={form.karYuzdesi} onChange={e => guncelle('karYuzdesi', e.target.value)} /></div>
              <div><label style={labelStil}>Notlar</label><input style={inputStil} value={form.notlar} onChange={e => guncelle('notlar', e.target.value)} /></div>
            </div>
          </div>
        )}

        <button type="submit" disabled={kaydediliyor} style={{background:'#2563eb', color:'white', border:'none', borderRadius:'8px', padding:'12px 32px', fontSize:'15px', fontWeight:'500', cursor:'pointer', marginBottom:'24px'}}>
          {kaydediliyor ? 'Hesaplanıyor...' : onaylandi ? 'Maliyeti Güncelle' : 'Hesapla ve Güncelle'}
        </button>
      </form>

      {sonuc && (
        <div style={{background:'#f0fdf4', borderRadius:'12px', padding:'24px', border:'1px solid #bbf7d0'}}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px', flexWrap:'wrap', gap:'12px'}}>
            <h3 style={{margin:0, fontSize:'18px', fontWeight:'600', color:'#15803d'}}>{onaylandi ? 'Maliyet Güncellendi' : 'Hesaplama Sonucu'}</h3>
            {!onaylandi && <button onClick={pdfIndir} disabled={pdfYukleniyor} style={{background:'#dc2626', color:'white', border:'none', borderRadius:'8px', padding:'10px 20px', fontSize:'14px', cursor:'pointer'}}>{pdfYukleniyor?'Hazırlanıyor...':'📄 PDF Teklif İndir'}</button>}
          </div>
          <div style={{background:'#eff6ff', borderRadius:'8px', padding:'12px 16px', marginBottom:'16px', fontSize:'14px', color:'#1e40af'}}>
            Toplam metraj: <strong>{sonuc.toplamMetraj.toFixed(2)} mtül</strong> — Kullanılan plaka: <strong>{sonuc.kullanilanPlakaSayisi}</strong>
          </div>
          <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))', gap:'16px'}}>
            <div style={{background:'white', borderRadius:'8px', padding:'16px', border:'1px solid #bbf7d0'}}>
              <p style={{margin:'0 0 4px', fontSize:'12px', color:'#6b7280'}}>TOPLAM SÜRE</p>
              <p style={{margin:0, fontSize:'20px', fontWeight:'700'}}>{Math.floor(sonuc.toplamSureDakika/60)>0?`${Math.floor(sonuc.toplamSureDakika/60)} sa `:''}{Math.round(sonuc.toplamSureDakika%60)} dk</p>
            </div>
            <div style={{background:'white', borderRadius:'8px', padding:'16px', border:'1px solid #bbf7d0'}}>
              <p style={{margin:'0 0 4px', fontSize:'12px', color:'#6b7280'}}>İŞÇİLİK MALİYETİ</p>
              <p style={{margin:0, fontSize:'20px', fontWeight:'700'}}>{paraGoster(sonuc.iscilikMaliyeti)}</p>
            </div>
            <div style={{background:'white', borderRadius:'8px', padding:'16px', border:'1px solid #bbf7d0'}}>
              <p style={{margin:'0 0 4px', fontSize:'12px', color:'#6b7280'}}>MALZEME MALİYETİ</p>
              <p style={{margin:0, fontSize:'20px', fontWeight:'700'}}>{paraGoster(sonuc.malzemeMaliyeti)}</p>
            </div>
            <div style={{background:'white', borderRadius:'8px', padding:'16px', border:'1px solid #bbf7d0'}}>
              <p style={{margin:'0 0 4px', fontSize:'12px', color:'#6b7280'}}>TOPLAM MALİYET</p>
              <p style={{margin:0, fontSize:'20px', fontWeight:'700', color:'#dc2626'}}>{paraGoster(sonuc.toplamMaliyet)}</p>
            </div>
            {!onaylandi && <>
              <div style={{background:'white', borderRadius:'8px', padding:'16px', border:'1px solid #bbf7d0'}}>
                <p style={{margin:'0 0 4px', fontSize:'12px', color:'#6b7280'}}>SATIŞ FİYATI (KDV HARİÇ)</p>
                <p style={{margin:0, fontSize:'20px', fontWeight:'700', color:'#2563eb'}}>{paraGoster(sonuc.satisFiyati)}</p>
              </div>
              <div style={{background:'white', borderRadius:'8px', padding:'16px', border:'1px solid #bbf7d0'}}>
                <p style={{margin:'0 0 4px', fontSize:'12px', color:'#6b7280'}}>KDV (%{atolyeBilgi.kdvOrani})</p>
                <p style={{margin:0, fontSize:'20px', fontWeight:'700'}}>{paraGoster(sonuc.kdvTutari)}</p>
              </div>
              <div style={{background:'#1e40af', borderRadius:'8px', padding:'16px'}}>
                <p style={{margin:'0 0 4px', fontSize:'12px', color:'#93c5fd'}}>GENEL TOPLAM (KDV DAHİL)</p>
                <p style={{margin:0, fontSize:'20px', fontWeight:'700', color:'white'}}>{paraGoster(sonuc.kdvDahilFiyat)}</p>
              </div>
              <div style={{background:'white', borderRadius:'8px', padding:'16px', border:'1px solid #bbf7d0'}}>
                <p style={{margin:'0 0 4px', fontSize:'12px', color:'#6b7280'}}>MTÜL SATIŞ FİYATI</p>
                <p style={{margin:0, fontSize:'20px', fontWeight:'700', color:'#9333ea'}}>{paraGoster(sonuc.mtulSatisFiyati)}</p>
              </div>
            </>}
          </div>
          <div style={{marginTop:'16px'}}>
            <button onClick={() => router.push('/dashboard/isler')} style={{background:'#15803d', color:'white', border:'none', borderRadius:'8px', padding:'12px 24px', fontSize:'14px', cursor:'pointer'}}>
              İş Listesine Git →
            </button>
          </div>
        </div>
      )}
    </div>

    {/* ═══════════════════════════════════════════════════════════════════
        MOBILE — Dark theme, accordion, sticky CTA, sheet
        Desktop'a dokunulmamıştır.
        ═══════════════════════════════════════════════════════════════════ */}
    <div className="md:hidden">
      {/* Sticky header */}
      <MobileStickyHeader
        title="İş Düzenle"
        onBack={() => router.push('/dashboard/isler')}
        right={
          <span className={`text-[11px] font-semibold rounded-full px-2.5 py-1 ${mobilDurumCls}`}>
            {mobilDurumLabel}
          </span>
        }
      />

      <MobilePageContainer hasHeader>
        {/* ── Özet kartı ── */}
        <div className="px-4 pt-3 pb-3">
          <MobileDarkCard>
            <p className="text-xl font-black text-white leading-tight">
              {form.musteriAdi || '—'}
            </p>
            <p className="text-sm mt-0.5" style={lS}>
              {form.urunAdi || '—'}{form.malzemeTipi ? ` · ${form.malzemeTipi}` : ''}
            </p>
            <div className="flex items-center justify-between mt-3">
              <span className={`text-[11px] font-semibold rounded-full px-2.5 py-1 ${mobilDurumCls}`}>
                {mobilDurumLabel}
              </span>
              {isRaw?.satisFiyati ? (
                <p className="text-base font-bold text-emerald-400">
                  {paraGoster(Number(isRaw.satisFiyati))}
                </p>
              ) : null}
            </div>
            {onaylandi && (
              <div className="mt-3 rounded-lg px-3 py-2" style={{background:'rgba(245,158,11,0.08)', border:'0.5px solid rgba(245,158,11,0.20)'}}>
                <p className="text-[12px]" style={{color:'#fcd34d'}}>
                  Onaylanmış iş — teklif fiyatı değişmez, sadece maliyet güncellenir
                </p>
              </div>
            )}
          </MobileDarkCard>
        </div>

        {/* ── Accordion'lar ── */}
        <div className="px-4 flex flex-col gap-2">

          {/* 1. İş Bilgileri */}
          <MobileAccordion title="İş Bilgileri" defaultOpen>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <p className={lC} style={lS}>Müşteri Adı</p>
                <input className={iC} style={iS} value={form.musteriAdi}
                  onChange={e => guncelle('musteriAdi', e.target.value)} placeholder="Müşteri adı" />
              </div>
              <div className="flex flex-col gap-1.5">
                <p className={lC} style={lS}>Müşteri Tipi</p>
                <select className={`${iC} appearance-none`} style={iS} value={form.musteriTipi}
                  onChange={e => guncelle('musteriTipi', e.target.value)}>
                  <option value="Ev sahibi">Ev sahibi</option>
                  <option value="Mimar">Mimar</option>
                  <option value="Müteahhit">Müteahhit</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <p className={lC} style={lS}>Ürün Adı</p>
                <input className={iC} style={iS} value={form.urunAdi}
                  onChange={e => guncelle('urunAdi', e.target.value)} placeholder="Ürün adı" />
              </div>
              <div className="flex flex-col gap-1.5">
                <p className={lC} style={lS}>Malzeme Tipi</p>
                <select className={`${iC} appearance-none`} style={iS} value={form.malzemeTipi}
                  onChange={e => guncelle('malzemeTipi', e.target.value)}>
                  <option value="Porselen">Porselen</option>
                  <option value="Kuvars">Kuvars</option>
                  <option value="Doğaltaş">Doğaltaş</option>
                </select>
              </div>
            </div>
          </MobileAccordion>

          {/* 2a. Plaka & Fiyat */}
          <MobileAccordion
            title="Plaka & Fiyat"
            badge={
              form.plakaFiyatiEuro && form.kullanilanKur
                ? `€${form.plakaFiyatiEuro} · ${form.kullanilanKur}₺`
                : undefined
            }
          >
            <div className="flex flex-col gap-4">
              {/* Atölye info */}
              <div className="rounded-xl px-3 py-2.5" style={{background:'rgba(245,158,11,0.08)', border:'0.5px solid rgba(245,158,11,0.20)'}}>
                <p className="text-[12px]" style={{color:'#fcd34d'}}>
                  Atölye ort: <strong>{plakaBasinaOrtMtul} mtül/plaka</strong>
                </p>
              </div>

              {/* Plaka ölçüleri */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <p className={lC} style={lS}>Genişlik (cm)</p>
                  <input className={iC} style={iS} inputMode="decimal" value={form.plakaGenislikCm}
                    onChange={e => guncelle('plakaGenislikCm', e.target.value)} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <p className={lC} style={lS}>Uzunluk (cm)</p>
                  <input className={iC} style={iS} inputMode="decimal" value={form.plakaUzunlukCm}
                    onChange={e => guncelle('plakaUzunlukCm', e.target.value)} />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <p className={lC} style={lS}>Plakadan Alınan Mtül</p>
                <input className={iC} style={iS} inputMode="decimal" value={form.plakadanAlinanMtul}
                  onChange={e => guncelle('plakadanAlinanMtul', e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <p className={lC} style={lS}>Plaka Fiyatı (€)</p>
                  <input className={iC} style={iS} inputMode="decimal" value={form.plakaFiyatiEuro}
                    onChange={e => guncelle('plakaFiyatiEuro', e.target.value)} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <p className={lC} style={lS}>Kur (1€=?₺)</p>
                  <input className={iC} style={iS} inputMode="decimal" value={form.kullanilanKur}
                    onChange={e => guncelle('kullanilanKur', e.target.value)} />
                </div>
              </div>

              {/* Ek giderler */}
              <div style={sepS} />
              <p className={lC} style={{color:'rgba(148,163,184,0.42)'}}>Ek Giderler</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <p className={lC} style={lS}>Kırılan Taş (plaka)</p>
                  <input className={iC} style={iS} inputMode="decimal" value={form.kirilanTasPlaka}
                    onChange={e => guncelle('kirilanTasPlaka', e.target.value)} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <p className={lC} style={lS}>Hatalı Kesim (plaka)</p>
                  <input className={iC} style={iS} inputMode="decimal" value={form.hataliKesimPlaka}
                    onChange={e => guncelle('hataliKesimPlaka', e.target.value)} />
                </div>
              </div>
            </div>
          </MobileAccordion>

          {/* 2b. Metraj & İşçilik */}
          <MobileAccordion
            title="Metraj & İşçilik"
            badge={toplamMetrajHesap > 0 ? `${toplamMetrajHesap.toFixed(2)} mtül · ${gosterilenPlakaSayisi} plaka` : undefined}
          >
            <div className="flex flex-col gap-4">
              {/* Tezgah satırları */}
              {[
                { label: 'Tezgah', mtul: 'metrajMtul', dk: 'birMtulDakika' },
                { label: 'Tezgah Arası', mtul: 'tezgahArasiMtul', dk: 'tezgahArasiDakika' },
                { label: 'Ada Tezgah', mtul: 'adaTezgahMtul', dk: 'adaTezgahDakika' },
              ].map(row => (
                <div key={row.label} className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <p className={lC} style={lS}>{row.label} (mtül)</p>
                    <input className={iC} style={iS} inputMode="decimal"
                      value={form[row.mtul as keyof typeof form] as string}
                      onChange={e => guncelle(row.mtul, e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <p className={lC} style={lS}>1 mtül (dk)</p>
                    <input className={iC} style={iS} inputMode="decimal"
                      value={form[row.dk as keyof typeof form] as string}
                      onChange={e => guncelle(row.dk, e.target.value)} />
                  </div>
                </div>
              ))}

              {/* Özel işçilik */}
              {OZEL_ISCILIK.map(({ n, mtul, dakika, aciklama }) => (
                <div key={n} className="rounded-xl p-3 flex flex-col gap-3"
                  style={{background:'rgba(255,255,255,0.03)', border:'0.5px solid rgba(255,255,255,0.07)'}}>
                  <p className={lC} style={{color:'rgba(148,163,184,0.45)'}}>Özel İşçilik {n}</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <p className={lC} style={lS}>Mtül</p>
                      <input className={iC} style={iS} inputMode="decimal" placeholder="0"
                        value={form[mtul]} onChange={e => guncelle(mtul, e.target.value)} />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <p className={lC} style={lS}>Süre (dk)</p>
                      <input className={iC} style={iS} inputMode="decimal" placeholder="0"
                        value={form[dakika]} onChange={e => guncelle(dakika, e.target.value)} />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <p className={lC} style={lS}>Açıklama</p>
                    <input className={iC} style={iS} placeholder="Opsiyonel"
                      value={form[aciklama]} onChange={e => guncelle(aciklama, e.target.value)} />
                  </div>
                </div>
              ))}

              {/* Canlı özet */}
              {toplamMetrajHesap > 0 && (
                <div className="rounded-xl px-4 py-3 flex items-center justify-between"
                  style={{background:'rgba(59,130,246,0.08)', border:'0.5px solid rgba(59,130,246,0.20)'}}>
                  <span className="text-[13px] text-blue-300">
                    Toplam {toplamMetrajHesap.toFixed(2)} mtül
                  </span>
                  <span className="text-[13px] font-bold text-white">
                    {gosterilenPlakaSayisi} plaka
                  </span>
                </div>
              )}

              <div style={sepS} />
              <div className="flex flex-col gap-1.5">
                <p className={lC} style={lS}>Manuel Plaka Sayısı</p>
                <input className={iC} style={iS} inputMode="numeric"
                  value={form.manuelPlakaSayisi}
                  onChange={e => guncelle('manuelPlakaSayisi', e.target.value)}
                  placeholder={`Otomatik: ${otomatikPlakaSayisi}`} />
              </div>

              {!onaylandi && (
                <>
                  <div style={sepS} />
                  <p className={lC} style={{color:'rgba(148,163,184,0.42)'}}>Fiyatlandırma</p>
                  <div className="flex flex-col gap-1.5">
                    <p className={lC} style={lS}>Kar Yüzdesi (%)</p>
                    <input className={iC} style={iS} inputMode="decimal" value={form.karYuzdesi}
                      onChange={e => guncelle('karYuzdesi', e.target.value)} />
                  </div>
                </>
              )}
            </div>
          </MobileAccordion>

          {/* 3. Operasyonlar */}
          <MobileAccordion
            title="Özel Operasyonlar"
            badge={aktifOpSayisi > 0 ? `${aktifOpSayisi} seçili` : 'Seçilmedi'}
          >
            <div className="flex flex-col gap-4">
              {/* Toggle pill'lar */}
              <div className="flex flex-wrap gap-2">
                {OPERASYONLAR.map(op => (
                  <button
                    key={op.key}
                    onClick={() => operasyonToggle(op.key)}
                    className="h-10 px-4 rounded-full text-[13px] font-semibold transition-all"
                    style={{
                      background: seciliOperasyonlar[op.key] ? 'rgba(59,130,246,0.18)' : 'rgba(255,255,255,0.05)',
                      border: seciliOperasyonlar[op.key] ? '0.5px solid rgba(59,130,246,0.45)' : '0.5px solid rgba(255,255,255,0.10)',
                      color: seciliOperasyonlar[op.key] ? '#60a5fa' : 'rgba(148,163,184,0.70)',
                    }}
                  >
                    {op.label}
                  </button>
                ))}
              </div>

              {/* Seçili op detayları */}
              {OPERASYONLAR.filter(op => seciliOperasyonlar[op.key]).map(op => (
                <div key={op.key} className="rounded-xl p-3 flex flex-col gap-3"
                  style={{background:'rgba(255,255,255,0.04)', border:'0.5px solid rgba(255,255,255,0.08)'}}>
                  <p className="text-[13px] font-semibold text-blue-300">{op.label}</p>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="flex flex-col gap-1">
                      <p className="text-[10px]" style={lS}>Makine</p>
                      <select
                        className="h-10 w-full rounded-lg px-2 text-white outline-none appearance-none"
                        style={{background:'#111827', border:'0.5px solid rgba(255,255,255,0.10)', fontSize:16}}
                        value={operasyonDetay[op.key]?.makineId || ''}
                        onChange={e => operasyonGuncelle(op.key, 'makineId', e.target.value)}
                      >
                        {makineler.map(m => <option key={m.id} value={m.id}>{m.makineAdi}</option>)}
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <p className="text-[10px]" style={lS}>Adet</p>
                      <input
                        className="h-10 w-full rounded-lg px-2 text-white outline-none"
                        style={{background:'#111827', border:'0.5px solid rgba(255,255,255,0.10)', fontSize:16}}
                        inputMode="numeric"
                        value={operasyonDetay[op.key]?.adet || ''}
                        onChange={e => operasyonGuncelle(op.key, 'adet', e.target.value)}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <p className="text-[10px]" style={lS}>Süre (dk)</p>
                      <input
                        className="h-10 w-full rounded-lg px-2 text-white outline-none"
                        style={{background:'#111827', border:'0.5px solid rgba(255,255,255,0.10)', fontSize:16}}
                        inputMode="decimal"
                        value={operasyonDetay[op.key]?.birimDakika || ''}
                        onChange={e => operasyonGuncelle(op.key, 'birimDakika', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </MobileAccordion>

          {/* 4. Notlar */}
          <MobileAccordion
            title="Notlar"
            badge={form.notlar ? 'Dolu' : 'Boş'}
          >
            <textarea
              className="w-full rounded-xl px-4 py-3 text-white outline-none resize-none"
              style={{background:'#111827', border:'0.5px solid rgba(255,255,255,0.10)', fontSize:16, minHeight:96}}
              value={form.notlar}
              onChange={e => guncelle('notlar', e.target.value)}
              placeholder="Bu iş için notlar..."
            />
          </MobileAccordion>

          {/* 5. PDF & Teklif */}
          <MobileAccordion title="PDF & Teklif">
            {sonuc ? (
              <div className="flex flex-col gap-3">
                <MobileDarkCard tone="emerald">
                  <p className="text-[11px] text-emerald-400 uppercase tracking-wide font-semibold mb-2">
                    Son Hesaplama
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[11px]" style={lS}>Toplam Maliyet</p>
                      <p className="text-[15px] font-bold text-white mt-0.5">{paraGoster(sonuc.toplamMaliyet)}</p>
                    </div>
                    {!onaylandi && (
                      <div>
                        <p className="text-[11px]" style={lS}>Genel Toplam</p>
                        <p className="text-[15px] font-bold text-emerald-400 mt-0.5">{paraGoster(sonuc.kdvDahilFiyat)}</p>
                      </div>
                    )}
                  </div>
                </MobileDarkCard>
                {!onaylandi && (
                  <button
                    onClick={() => setPdfModalAcik(true)}
                    disabled={pdfYukleniyor}
                    className="h-12 w-full rounded-xl font-semibold text-white transition-all disabled:opacity-50"
                    style={{background:'rgba(220,38,38,0.85)'}}
                  >
                    {pdfYukleniyor ? 'Hazırlanıyor...' : '📄 PDF Teklif İndir'}
                  </button>
                )}
                <button
                  onClick={() => setSonucSheetAcik(true)}
                  className="h-11 w-full rounded-xl font-medium text-[13px]"
                  style={{background:'rgba(255,255,255,0.05)', color:'rgba(148,163,184,0.70)'}}
                >
                  Hesaplama detayını gör
                </button>
              </div>
            ) : (
              <p className="text-[13px] py-1" style={lS}>
                Hesaplama sonucu yok. "Kaydet" butonuyla formu hesaplayın.
              </p>
            )}
          </MobileAccordion>

          {/* 6. Tahsilat */}
          <MobileAccordion title="Tahsilat & Ödeme">
            <div className="flex flex-col gap-3">
              <p className="text-[13px]" style={lS}>
                Bu işe ait tahsilat ve ödeme planı yönetimi için:
              </p>
              <button
                onClick={() => router.push(`/dashboard/tahsilatlar?isId=${isId}`)}
                className="h-12 w-full rounded-xl text-[14px] font-semibold text-left px-4 flex items-center justify-between"
                style={{background:'rgba(59,130,246,0.08)', border:'0.5px solid rgba(59,130,246,0.20)', color:'#60a5fa'}}
              >
                <span>Tahsilat Sayfasına Git</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </button>
            </div>
          </MobileAccordion>

        </div>

        {/* CTA bar için alt boşluk */}
        <div className="h-24" />
      </MobilePageContainer>

      {/* ── Sticky CTA Bar ── */}
      <div
        className="fixed bottom-0 left-0 right-0 z-[85] md:hidden"
        style={{
          background: 'rgba(3,7,18,0.96)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderTop: '0.5px solid rgba(255,255,255,0.07)',
          paddingBottom: 'calc(72px + env(safe-area-inset-bottom, 0px))',
        }}
      >
        <div className="flex gap-2 px-4 pt-3 pb-3">
          {/* Kaydet — tam genişlik */}
          <button
            onClick={mobilKaydet}
            disabled={kaydediliyor}
            className="flex-1 h-14 rounded-2xl font-bold text-[15px] text-white transition-all disabled:opacity-60"
            style={{background: '#2563eb'}}
          >
            {kaydediliyor ? 'Hesaplanıyor...' : onaylandi ? 'Maliyeti Güncelle' : 'Kaydet'}
          </button>

          {/* PDF */}
          <button
            onClick={() => setPdfModalAcik(true)}
            disabled={!sonuc || onaylandi || pdfYukleniyor}
            className="w-14 h-14 rounded-2xl font-bold text-[12px] transition-all disabled:opacity-30 flex flex-col items-center justify-center gap-0.5"
            style={{background:'rgba(255,255,255,0.07)', color:'rgba(255,255,255,0.75)'}}
            aria-label="PDF İndir"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="12" y1="18" x2="12" y2="12"/>
              <line x1="9" y1="15" x2="15" y2="15"/>
            </svg>
            <span>PDF</span>
          </button>

          {/* WhatsApp */}
          <button
            onClick={mobilWhatsapp}
            className="w-14 h-14 rounded-2xl font-bold text-[12px] transition-all flex flex-col items-center justify-center gap-0.5"
            style={{background:'rgba(34,197,94,0.12)', color:'#4ade80', border:'0.5px solid rgba(34,197,94,0.22)'}}
            aria-label="WhatsApp"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            <span>WA</span>
          </button>
        </div>
      </div>

      {/* ── PDF Modal (window.prompt yerine) ── */}
      <MobileBottomSheet
        open={pdfModalAcik}
        onClose={() => setPdfModalAcik(false)}
        title="PDF Teklif Hazırla"
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <p className={lC} style={lS}>Ödeme Koşulları</p>
            <textarea
              className="w-full rounded-xl px-4 py-3 text-white outline-none resize-none"
              style={{background:'#111827', border:'0.5px solid rgba(255,255,255,0.10)', fontSize:16, minHeight:80}}
              value={pdfOdemeKosullari}
              onChange={e => setPdfOdemeKosullari(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <p className={lC} style={lS}>Teslim Tarihi</p>
            <textarea
              className="w-full rounded-xl px-4 py-3 text-white outline-none resize-none"
              style={{background:'#111827', border:'0.5px solid rgba(255,255,255,0.10)', fontSize:16, minHeight:64}}
              value={pdfTeslimTarihi}
              onChange={e => setPdfTeslimTarihi(e.target.value)}
            />
          </div>
          <button
            onClick={mobilPdfIndir}
            disabled={pdfYukleniyor}
            className="h-14 w-full rounded-2xl font-bold text-white text-[15px] disabled:opacity-50"
            style={{background:'#dc2626'}}
          >
            {pdfYukleniyor ? 'Hazırlanıyor...' : '📄 PDF Oluştur'}
          </button>
          <button
            onClick={() => setPdfModalAcik(false)}
            className="h-11 w-full rounded-2xl text-[14px] font-medium"
            style={{color:'rgba(148,163,184,0.65)', background:'rgba(255,255,255,0.04)'}}
          >
            Vazgeç
          </button>
        </div>
      </MobileBottomSheet>

      {/* ── Sonuç Sheet ── */}
      <MobileBottomSheet
        open={sonucSheetAcik}
        onClose={() => setSonucSheetAcik(false)}
        title={onaylandi ? 'Maliyet Güncellendi' : 'Hesaplama Sonucu'}
        size="full"
      >
        {sonuc && (
          <div className="flex flex-col gap-3">
            {/* Özet banner */}
            <div className="rounded-xl px-4 py-3"
              style={{background:'rgba(59,130,246,0.08)', border:'0.5px solid rgba(59,130,246,0.18)'}}>
              <p className="text-[13px] text-blue-300">
                {sonuc.toplamMetraj.toFixed(2)} mtül — {sonuc.kullanilanPlakaSayisi} plaka kullanıldı
              </p>
            </div>

            {/* KPI grid */}
            <div className="grid grid-cols-2 gap-2">
              <MobileDarkCard>
                <p className="text-[11px] uppercase tracking-wide" style={lS}>Toplam Süre</p>
                <p className="text-[15px] font-bold text-white mt-1">
                  {Math.floor(sonuc.toplamSureDakika / 60) > 0 ? `${Math.floor(sonuc.toplamSureDakika / 60)}sa ` : ''}
                  {Math.round(sonuc.toplamSureDakika % 60)}dk
                </p>
              </MobileDarkCard>
              <MobileDarkCard>
                <p className="text-[11px] uppercase tracking-wide" style={lS}>İşçilik</p>
                <p className="text-[15px] font-bold text-white mt-1">{paraGoster(sonuc.iscilikMaliyeti)}</p>
              </MobileDarkCard>
              <MobileDarkCard>
                <p className="text-[11px] uppercase tracking-wide" style={lS}>Malzeme</p>
                <p className="text-[15px] font-bold text-white mt-1">{paraGoster(sonuc.malzemeMaliyeti)}</p>
              </MobileDarkCard>
              <MobileDarkCard tone="red">
                <p className="text-[11px] uppercase tracking-wide" style={lS}>Toplam Maliyet</p>
                <p className="text-[15px] font-bold text-white mt-1">{paraGoster(sonuc.toplamMaliyet)}</p>
              </MobileDarkCard>
              {!onaylandi && (
                <>
                  <MobileDarkCard tone="blue">
                    <p className="text-[11px] uppercase tracking-wide" style={lS}>Satış (KDV Hariç)</p>
                    <p className="text-[15px] font-bold text-white mt-1">{paraGoster(sonuc.satisFiyati)}</p>
                  </MobileDarkCard>
                  <MobileDarkCard>
                    <p className="text-[11px] uppercase tracking-wide" style={lS}>KDV (%{atolyeBilgi.kdvOrani})</p>
                    <p className="text-[15px] font-bold text-white mt-1">{paraGoster(sonuc.kdvTutari)}</p>
                  </MobileDarkCard>
                </>
              )}
            </div>

            {/* Genel toplam — öne çıkan */}
            {!onaylandi && (
              <div className="rounded-2xl p-4" style={{background:'#1d4ed8'}}>
                <p className="text-[11px] text-blue-200 uppercase tracking-wide">Genel Toplam (KDV Dahil)</p>
                <p className="text-2xl font-black text-white mt-1">{paraGoster(sonuc.kdvDahilFiyat)}</p>
                <p className="text-[11px] text-blue-300 mt-1">{sonuc.teklifNo}</p>
              </div>
            )}

            {/* Aksiyonlar */}
            <div className="flex flex-col gap-2 pt-1">
              {!onaylandi && (
                <button
                  onClick={() => { setSonucSheetAcik(false); setPdfModalAcik(true) }}
                  disabled={pdfYukleniyor}
                  className="h-14 w-full rounded-2xl font-bold text-white text-[15px]"
                  style={{background:'#dc2626'}}
                >
                  📄 PDF Teklif İndir
                </button>
              )}
              <button
                onClick={() => { setSonucSheetAcik(false); router.push('/dashboard/isler') }}
                className="h-12 w-full rounded-2xl font-semibold text-[14px]"
                style={{background:'rgba(34,197,94,0.10)', color:'#4ade80', border:'0.5px solid rgba(34,197,94,0.20)'}}
              >
                İş Listesine Dön →
              </button>
              <button
                onClick={() => setSonucSheetAcik(false)}
                className="h-11 w-full rounded-2xl text-[14px]"
                style={{color:'rgba(148,163,184,0.60)', background:'rgba(255,255,255,0.04)'}}
              >
                Kapat
              </button>
            </div>
          </div>
        )}
      </MobileBottomSheet>
    </div>
    </>
  )
}
