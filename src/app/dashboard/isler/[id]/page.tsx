'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { paraGoster } from '@/lib/format'
import { teklifPdfIndir } from '@/lib/teklif-pdf'
import { PlakaPlanlayiciMini, type PlakaHesapSonucu } from '@/components/plaka-planlayici/PlakaPlanlayiciMini'

const inputStil: React.CSSProperties = { width:'100%', border:'1px solid #d1d5db', borderRadius:'8px', padding:'8px 12px', fontSize:'14px', boxSizing:'border-box' }
const labelStil: React.CSSProperties = { display:'block', fontSize:'13px', fontWeight:'500', color:'#374151', marginBottom:'4px' }
const gridStil: React.CSSProperties = { display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:'16px' }

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

export default function IsDuzenle() {
  const router = useRouter()
  const params = useParams()
  const isId = params.id as string

  const [yukleniyor, setYukleniyor] = useState(true)
  const [kaydediliyor, setKaydediliyor] = useState(false)
  const [pdfYukleniyor, setPdfYukleniyor] = useState(false)
  const [makineler, setMakineler] = useState<Makine[]>([])
  const [plakaBasinaOrtMtul, setPlakaBasinaOrtMtul] = useState('3.20')
  const [atolyeBilgi, setAtolyeBilgi] = useState<{adi:string;adres:string;telefon:string;email:string;sehir:string;ilce:string;logoUrl:string;kdvOrani:number}>({adi:'',adres:'',telefon:'',email:'',sehir:'',ilce:'',logoUrl:'',kdvOrani:20})
  const [mevcutDurum, setMevcutDurum] = useState('teklif_verildi')
  const [plakaHesap, setPlakaHesap] = useState<PlakaHesapSonucu | null>(null)
  const [sonuc, setSonuc] = useState<{toplamSureDakika:number;iscilikMaliyeti:number;malzemeMaliyeti:number;toplamMaliyet:number;satisFiyati:number;mtulSatisFiyati:number;toplamMetraj:number;kdvTutari:number;kdvDahilFiyat:number;teklifNo:string;teklifGecerlilikTarihi:string} | null>(null)

  const [form, setForm] = useState({
    musteriAdi:'', urunAdi:'', malzemeTipi:'Porselen', musteriTipi:'Ev sahibi',
    plakaFiyatiEuro:'', metrajMtul:'', birMtulDakika:'',
    tezgahArasiMtul:'', tezgahArasiDakika:'',
    adaTezgahMtul:'', adaTezgahDakika:'',
    kullanilanKur:'', karYuzdesi:'30', notlar:'',
    plakaGenislikCm:'', plakaUzunlukCm:'', plakadanAlinanMtul:'',
    kirilanTasPlaka:'0', hataliKesimPlaka:'0',
  })

  const [seciliOperasyonlar, setSeciliOperasyonlar] = useState<{[key:string]:boolean}>({})
  const [operasyonDetay, setOperasyonDetay] = useState<{[key:string]:{makineId:string;adet:string;birimDakika:string}}>({})

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
          setPlakaBasinaOrtMtul(Number(a.plakaBasinaMtul).toFixed(2))
          setAtolyeBilgi({adi:a.atolyeAdi||'',adres:a.adres||'',telefon:a.telefon||'',email:a.email||'',sehir:a.sehir||'',ilce:a.ilce||'',logoUrl:a.logoUrl||'',kdvOrani:a.kdvOrani||20})
        }
        if (isVeri.is) {
          const is = isVeri.is
          setMevcutDurum(is.durum)
          setForm({
            musteriAdi:is.musteriAdi||'', urunAdi:is.urunAdi||'',
            malzemeTipi:is.malzemeTipi||'Porselen', musteriTipi:is.musteriTipi||'Ev sahibi',
            plakaFiyatiEuro:String(Number(is.plakaFiyatiEuro)||''),
            metrajMtul:String(Number(is.metrajMtul)||''),
            birMtulDakika:String(Number(is.birMtulDakika)||''),
            tezgahArasiMtul:String(Number(is.tezgahArasiMtul)||''),
            tezgahArasiDakika:String(Number(is.tezgahArasiDakika)||''),
            adaTezgahMtul:String(Number(is.adaTezgahMtul)||''),
            adaTezgahDakika:String(Number(is.adaTezgahDakika)||''),
            kullanilanKur:String(Number(is.kullanilanKur)||''),
            karYuzdesi:String(Number(is.karYuzdesi)||'30'),
            notlar:is.notlar||'',
            plakaGenislikCm:String(Number(is.plakaGenislikCm)||''),
            plakaUzunlukCm:String(Number(is.plakaUzunlukCm)||''),
            plakadanAlinanMtul:String(Number(is.plakadanAlinanMtul)||''),
            kirilanTasPlaka:String(Number(is.kirilanTasPlaka)||'0'),
            hataliKesimPlaka:String(Number(is.hataliKesimPlaka)||'0'),
          })
          if (is.operasyonlar) {
            const secili: {[key:string]:boolean} = {}
            const detay: {[key:string]:{makineId:string;adet:string;birimDakika:string}} = {}
            for (const op of is.operasyonlar) {
              secili[op.operasyonTipi] = true
              detay[op.operasyonTipi] = {makineId:op.makineId||'',adet:String(op.adet),birimDakika:String(op.birimDakika)}
            }
            setSeciliOperasyonlar(secili)
            setOperasyonDetay(detay)
          }
        }
      } finally { setYukleniyor(false) }
    }
    yukle()
  }, [isId])

  function guncelle(alan: string, deger: string) { setForm(prev => ({...prev, [alan]: deger})) }

  function operasyonToggle(key: string) {
    setSeciliOperasyonlar(prev => ({...prev, [key]: !prev[key]}))
    if (!operasyonDetay[key]) setOperasyonDetay(prev => ({...prev, [key]: {makineId: makineler[0]?.id||'', adet:'', birimDakika:''}}))
  }

  function operasyonGuncelle(key: string, alan: string, deger: string) {
    setOperasyonDetay(prev => ({...prev, [key]: {...prev[key], [alan]: deger}}))
  }

  const onaylandi = mevcutDurum === 'onaylandi'

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
        return {operasyonTipi:op.key, makineId:detay?.makineId||'', adet, birimDakika, toplamDakika:adet*birimDakika}
      })
    try {
      const yanit = await fetch(`/api/isler/${isId}`, {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          ...form, onaylandi,
          plakaFiyatiEuro:parseFloat(form.plakaFiyatiEuro)||0,
          metrajMtul:parseFloat(form.metrajMtul)||0,
          birMtulDakika:parseFloat(form.birMtulDakika)||0,
          tezgahArasiMtul:parseFloat(form.tezgahArasiMtul)||0,
          tezgahArasiDakika:parseFloat(form.tezgahArasiDakika)||0,
          adaTezgahMtul:parseFloat(form.adaTezgahMtul)||0,
          adaTezgahDakika:parseFloat(form.adaTezgahDakika)||0,
          kullanilanKur:parseFloat(form.kullanilanKur)||0,
          karYuzdesi:parseFloat(form.karYuzdesi)||0,
          plakaGenislikCm:parseFloat(form.plakaGenislikCm)||0,
          plakaUzunlukCm:parseFloat(form.plakaUzunlukCm)||0,
          plakadanAlinanMtul:parseFloat(form.plakadanAlinanMtul)||0,
          kirilanTasPlaka:parseFloat(form.kirilanTasPlaka)||0,
          hataliKesimPlaka:parseFloat(form.hataliKesimPlaka)||0,
          operasyonlar,
        }),
      })
      const veri = await yanit.json()
      if (yanit.ok) setSonuc(veri)
    } finally { setKaydediliyor(false) }
  }

  async function pdfIndir() {
    if (!sonuc) return
    setPdfYukleniyor(true)
    try {
      await teklifPdfIndir({
        teklifNo:sonuc.teklifNo, tarih:new Date().toLocaleDateString('tr-TR'),
        gecerlilikTarihi:new Date(sonuc.teklifGecerlilikTarihi).toLocaleDateString('tr-TR'),
        firma:atolyeBilgi, musteri:{adi:form.musteriAdi, tipi:form.musteriTipi},
        is:{
          urunAdi:form.urunAdi, malzemeTipi:form.malzemeTipi,
          metrajMtul:parseFloat(form.metrajMtul)||0, tezgahArasiMtul:parseFloat(form.tezgahArasiMtul)||0,
          adaTezgahMtul:parseFloat(form.adaTezgahMtul)||0, toplamMetraj:sonuc.toplamMetraj,
          plakaGenislikCm:parseFloat(form.plakaGenislikCm)||0, plakaUzunlukCm:parseFloat(form.plakaUzunlukCm)||0,
          plakadanAlinanMtul:parseFloat(form.plakadanAlinanMtul)||0,
          kullanilanPlakaSayisi:sonuc.toplamMetraj/(parseFloat(form.plakadanAlinanMtul)||3.2),
          plakaFiyatiEuro:parseFloat(form.plakaFiyatiEuro)||0, kullanilanKur:parseFloat(form.kullanilanKur)||0,
          toplamSureDakika:sonuc.toplamSureDakika, iscilikMaliyeti:sonuc.iscilikMaliyeti,
          malzemeMaliyeti:sonuc.malzemeMaliyeti, toplamMaliyet:sonuc.toplamMaliyet,
          karYuzdesi:parseFloat(form.karYuzdesi)||0, satisFiyati:sonuc.satisFiyati,
          kdvOrani:atolyeBilgi.kdvOrani, kdvTutari:sonuc.kdvTutari, kdvDahilFiyat:sonuc.kdvDahilFiyat,
          mtulSatisFiyati:sonuc.mtulSatisFiyati, notlar:form.notlar,
        },
      })
    } finally { setPdfYukleniyor(false) }
  }

  if (yukleniyor) return <div style={{padding:'32px'}}>Yükleniyor...</div>

  return (
    <div style={{padding:'32px', maxWidth:'900px'}}>
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
            <div><label style={labelStil}>Ürün Adı</label><input style={inputStil} required value={form.urunAdi} onChange={e => guncelle('urunAdi', e.target.value)} /></div>
            <div><label style={labelStil}>Malzeme Tipi</label>
              <select style={inputStil} value={form.malzemeTipi} onChange={e => guncelle('malzemeTipi', e.target.value)}>
                <option>Porselen</option><option>Kuvars</option><option>Doğaltaş</option>
              </select>
            </div>
          </div>
        </div>

        <div style={{background:'white', borderRadius:'12px', padding:'24px', border:'1px solid #e5e7eb', marginBottom:'20px'}}>
          <h3 style={{fontSize:'16px', fontWeight:'600', margin:'0 0 20px', paddingBottom:'12px', borderBottom:'1px solid #f3f4f6'}}>Plaka Bilgileri</h3>
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
          <div style={gridStil}>
            <div><label style={labelStil}>Tezgah (mtül)</label><input style={inputStil} type="number" step="0.01" required value={form.metrajMtul} onChange={e => guncelle('metrajMtul', e.target.value)} /></div>
            <div><label style={labelStil}>Tezgah 1 mtül Üretim Süresi (dk)</label><input style={inputStil} type="number" step="0.1" required value={form.birMtulDakika} onChange={e => guncelle('birMtulDakika', e.target.value)} /></div>
            <div><label style={labelStil}>Tezgah Arası (mtül)</label><input style={inputStil} type="number" step="0.01" value={form.tezgahArasiMtul} onChange={e => guncelle('tezgahArasiMtul', e.target.value)} /></div>
            <div><label style={labelStil}>Tezgah Arası 1 mtül Üretim Süresi (dk)</label><input style={inputStil} type="number" step="0.1" value={form.tezgahArasiDakika} onChange={e => guncelle('tezgahArasiDakika', e.target.value)} /></div>
            <div><label style={labelStil}>Ada Tezgah (mtül)</label><input style={inputStil} type="number" step="0.01" value={form.adaTezgahMtul} onChange={e => guncelle('adaTezgahMtul', e.target.value)} /></div>
            <div><label style={labelStil}>Ada Tezgah 1 mtül Üretim Süresi (dk)</label><input style={inputStil} type="number" step="0.1" value={form.adaTezgahDakika} onChange={e => guncelle('adaTezgahDakika', e.target.value)} /></div>
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
            Toplam metraj: <strong>{sonuc.toplamMetraj.toFixed(2)} mtül</strong>
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
  )
}
