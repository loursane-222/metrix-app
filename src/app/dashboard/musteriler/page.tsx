'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { paraGoster } from '@/lib/format'

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

function tamAd(m: Musteri) {
  const kisimlar = [m.firmaAdi, m.ad, m.soyad].filter(Boolean)
  return kisimlar.join(' / ')
}

function acilisBakiyeYazisi(m: Musteri) {
  const tip = m.bakiyeTipi === 'alacak' ? 'Alacak' : 'Borç'
  return `${paraGoster(Number(m.acilisBakiyesi || 0))} (${tip})`
}

export default function MusterilerPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [musteriler, setMusteriler] = useState<Musteri[]>([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const [excelYukleniyor, setExcelYukleniyor] = useState(false)
  const [excelMesaji, setExcelMesaji] = useState<string>('')

  const [yeniMusteriAcik, setYeniMusteriAcik] = useState(false)
  const [detayMusteri, setDetayMusteri] = useState<Musteri | null>(null)
  const [tahsilatPopup, setTahsilatPopup] = useState<Musteri | null>(null)

  const [kaydediliyor, setKaydediliyor] = useState(false)
  const [tahsilatKaydediliyor, setTahsilatKaydediliyor] = useState(false)

  const [yeniMusteriForm, setYeniMusteriForm] = useState({
    firmaAdi: '',
    ad: '',
    soyad: '',
    telefon: '',
    email: '',
    acilisBakiyesi: '',
    bakiyeTipi: 'borc',
  })

  const [tahsilatForm, setTahsilatForm] = useState({
    tarih: new Date().toISOString().slice(0, 10),
    tutar: '',
  })

  async function listeYukle() {
    setYukleniyor(true)
    try {
      const r = await fetch('/api/musteriler')
      const v = await r.json()
      setMusteriler(v.musteriler || [])
    } finally {
      setYukleniyor(false)
    }
  }

  useEffect(() => {
    listeYukle()
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
    sirali.forEach((item, index) => {
      map.set(item.id, index + 1)
    })
    return map
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
      setYeniMusteriForm({
        firmaAdi: '',
        ad: '',
        soyad: '',
        telefon: '',
        email: '',
        acilisBakiyesi: '',
        bakiyeTipi: 'borc',
      })
      await listeYukle()
    } finally {
      setKaydediliyor(false)
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

  if (yukleniyor) {
    return <div style={{padding:'32px'}}>Yükleniyor...</div>
  }

  return (
    <div style={{padding:'32px'}}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px', flexWrap:'wrap', gap:'12px'}}>
        <h2 style={{margin:0, fontSize:'24px', fontWeight:'600', color:'#111827'}}>Müşteriler</h2>

        <div style={{display:'flex', gap:'10px', flexWrap:'wrap'}}>
          <a
            href="/api/musteriler/sablon"
            style={{
              background:'#111827',
              color:'white',
              textDecoration:'none',
              borderRadius:'8px',
              padding:'10px 18px',
              fontSize:'14px',
              fontWeight:'600',
              display:'inline-flex',
              alignItems:'center'
            }}
          >
            Şablon İndir
          </a>

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={excelYukleniyor}
            style={{
              background:'#7c3aed',
              color:'white',
              border:'none',
              borderRadius:'8px',
              padding:'10px 18px',
              cursor:'pointer',
              fontSize:'14px',
              fontWeight:'600'
            }}
          >
            {excelYukleniyor ? 'Yükleniyor...' : 'Excel Yükle'}
          </button>

          <button
            onClick={() => setYeniMusteriAcik(true)}
            style={{background:'#2563eb', color:'white', border:'none', borderRadius:'8px', padding:'10px 18px', cursor:'pointer', fontSize:'14px', fontWeight:'600'}}
          >
            + Yeni Müşteri
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx"
            onChange={excelSecildi}
            style={{display:'none'}}
          />
        </div>
      </div>

      {excelMesaji && (
        <div style={{
          whiteSpace:'pre-wrap',
          background:'#f8fafc',
          border:'1px solid #cbd5e1',
          color:'#0f172a',
          borderRadius:'10px',
          padding:'14px 16px',
          marginBottom:'16px',
          fontSize:'13px',
          lineHeight:1.5
        }}>
          {excelMesaji}
        </div>
      )}

      <div style={{display:'flex', flexDirection:'column', gap:'12px'}}>
        {musteriler.map((m) => {
          const onayliCiro = m.isler
            .filter(i => i.durum === 'onaylandi')
            .reduce((a, i) => a + Number(i.satisFiyati || 0), 0)

          const toplamTahsilat = m.tahsilatlar
            .reduce((a, t) => a + Number(t.tutar || 0), 0)

          return (
            <div
              key={m.id}
              onClick={() => setDetayMusteri(m)}
              style={{
                background:'white',
                border:'1px solid #e5e7eb',
                borderRadius:'12px',
                padding:'18px 20px',
                cursor:'pointer'
              }}
            >
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', gap:'12px', flexWrap:'wrap'}}>
                <div>
                  <div style={{fontSize:'16px', fontWeight:'700', color:'#111827'}}>
                    {m.firmaAdi || '-'} {m.ad || ''} {m.soyad || ''}
                  </div>
                  <div style={{fontSize:'13px', color:'#6b7280', marginTop:'4px'}}>
                    {m.telefon || '-'} {m.email ? `• ${m.email}` : ''}
                  </div>
                </div>

                <div style={{display:'flex', gap:'20px', flexWrap:'wrap'}}>
                  <div style={{fontSize:'13px', color:'#374151'}}>
                    Açılış Bakiyesi: <strong>{acilisBakiyeYazisi(m)}</strong>
                  </div>
                  <div style={{fontSize:'13px', color:'#374151'}}>
                    Toplam Ciro: <strong>{paraGoster(onayliCiro)}</strong>
                  </div>
                  <div style={{fontSize:'13px', color:'#374151'}}>
                    Toplam Tahsilat: <strong>{paraGoster(toplamTahsilat)}</strong>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {yeniMusteriAcik && (
        <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:'16px'}} onClick={() => setYeniMusteriAcik(false)}>
          <div style={{background:'white', borderRadius:'16px', padding:'24px', width:'100%', maxWidth:'560px'}} onClick={e => e.stopPropagation()}>
            <h3 style={{margin:'0 0 16px', fontSize:'18px'}}>Yeni Müşteri</h3>

            <form onSubmit={yeniMusteriKaydet}>
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px'}}>
                <input value={yeniMusteriForm.firmaAdi} onChange={e => setYeniMusteriForm(prev => ({...prev, firmaAdi:e.target.value}))} placeholder="Firma Adı" style={{border:'1px solid #d1d5db', borderRadius:'8px', padding:'10px 12px'}} />
                <input value={yeniMusteriForm.ad} onChange={e => setYeniMusteriForm(prev => ({...prev, ad:e.target.value}))} placeholder="Ad" style={{border:'1px solid #d1d5db', borderRadius:'8px', padding:'10px 12px'}} />
                <input value={yeniMusteriForm.soyad} onChange={e => setYeniMusteriForm(prev => ({...prev, soyad:e.target.value}))} placeholder="Soyad" style={{border:'1px solid #d1d5db', borderRadius:'8px', padding:'10px 12px'}} />
                <input value={yeniMusteriForm.telefon} onChange={e => setYeniMusteriForm(prev => ({...prev, telefon:e.target.value}))} placeholder="Telefon" style={{border:'1px solid #d1d5db', borderRadius:'8px', padding:'10px 12px'}} />
                <input value={yeniMusteriForm.email} onChange={e => setYeniMusteriForm(prev => ({...prev, email:e.target.value}))} placeholder="Mail" style={{border:'1px solid #d1d5db', borderRadius:'8px', padding:'10px 12px', gridColumn:'1 / span 2'}} />

                <input type="number" step="0.01" value={yeniMusteriForm.acilisBakiyesi} onChange={e => setYeniMusteriForm(prev => ({...prev, acilisBakiyesi:e.target.value}))} placeholder="Açılış Bakiyesi" style={{border:'1px solid #d1d5db', borderRadius:'8px', padding:'10px 12px'}} />
                <select value={yeniMusteriForm.bakiyeTipi} onChange={e => setYeniMusteriForm(prev => ({...prev, bakiyeTipi:e.target.value}))} style={{border:'1px solid #d1d5db', borderRadius:'8px', padding:'10px 12px'}}>
                  <option value="borc">Borç</option>
                  <option value="alacak">Alacak</option>
                </select>
              </div>

              <div style={{display:'flex', justifyContent:'flex-end', gap:'10px', marginTop:'18px'}}>
                <button type="button" onClick={() => setYeniMusteriAcik(false)} style={{padding:'10px 14px', borderRadius:'8px', border:'1px solid #d1d5db', background:'white', cursor:'pointer'}}>İptal</button>
                <button type="submit" disabled={kaydediliyor} style={{padding:'10px 14px', borderRadius:'8px', border:'none', background:'#2563eb', color:'white', cursor:'pointer'}}>
                  {kaydediliyor ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {detayMusteri && (
        <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:'16px'}} onClick={() => setDetayMusteri(null)}>
          <div style={{background:'white', borderRadius:'16px', padding:'24px', width:'100%', maxWidth:'760px'}} onClick={e => e.stopPropagation()}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px'}}>
              <h3 style={{margin:0, fontSize:'20px'}}>{tamAd(detayMusteri)}</h3>
              <button onClick={() => setDetayMusteri(null)} style={{background:'none', border:'none', fontSize:'24px', cursor:'pointer'}}>×</button>
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
                  <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(220px, 1fr))', gap:'12px', marginBottom:'18px'}}>
                    <div style={{background:'#f8fafc', border:'1px solid #e5e7eb', borderRadius:'10px', padding:'14px'}}>Açılış Bakiyesi: <strong>{acilisBakiyeYazisi(detayMusteri)}</strong></div>
                    <div style={{background:'#f8fafc', border:'1px solid #e5e7eb', borderRadius:'10px', padding:'14px'}}>Verilen Teklif Toplamı: <strong>{paraGoster(toplamTeklifTutari)}</strong></div>
                    <div style={{background:'#f8fafc', border:'1px solid #e5e7eb', borderRadius:'10px', padding:'14px'}}>Onaylanan Teklif Toplamı: <strong>{paraGoster(onaylananToplam)}</strong></div>
                    <div style={{background:'#f8fafc', border:'1px solid #e5e7eb', borderRadius:'10px', padding:'14px'}}>Bekleyen Teklif Toplamı: <strong>{paraGoster(bekleyenToplam)}</strong></div>
                    <div style={{background:'#f8fafc', border:'1px solid #e5e7eb', borderRadius:'10px', padding:'14px'}}>Kaybedilen Teklif Toplamı: <strong>{paraGoster(kaybedilenToplam)}</strong></div>
                    <div style={{background:'#f8fafc', border:'1px solid #e5e7eb', borderRadius:'10px', padding:'14px'}}>Toplam Teklif Adeti: <strong>{toplamTeklifAdeti}</strong></div>
                    <div style={{background:'#f8fafc', border:'1px solid #e5e7eb', borderRadius:'10px', padding:'14px'}}>Onaylanan Teklif Adeti: <strong>{onaylananAdet}</strong></div>
                    <div style={{background:'#f8fafc', border:'1px solid #e5e7eb', borderRadius:'10px', padding:'14px'}}>Onaylama Yüzdesi: <strong>%{onayYuzdesi.toFixed(1)}</strong></div>
                    <div style={{background:'#f8fafc', border:'1px solid #e5e7eb', borderRadius:'10px', padding:'14px'}}>Onaylı Ciro Sırası: <strong>{sira}</strong></div>
                    <div style={{background:'#f8fafc', border:'1px solid #e5e7eb', borderRadius:'10px', padding:'14px'}}>Toplam Tahsilat: <strong>{paraGoster(toplamTahsilat)}</strong></div>
                  </div>

                  <div style={{display:'flex', gap:'10px', flexWrap:'wrap'}}>
                    <button onClick={() => teklifVer(detayMusteri)} style={{padding:'10px 14px', border:'none', borderRadius:'8px', background:'#2563eb', color:'white', cursor:'pointer'}}>Teklif Ver</button>
                    <button onClick={() => { setTahsilatPopup(detayMusteri); setDetayMusteri(null) }} style={{padding:'10px 14px', border:'none', borderRadius:'8px', background:'#16a34a', color:'white', cursor:'pointer'}}>Tahsilat Gir</button>
                  </div>
                </>
              )
            })()}
          </div>
        </div>
      )}

      {tahsilatPopup && (
        <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:'16px'}} onClick={() => setTahsilatPopup(null)}>
          <div style={{background:'white', borderRadius:'16px', padding:'24px', width:'100%', maxWidth:'420px'}} onClick={e => e.stopPropagation()}>
            <h3 style={{margin:'0 0 16px', fontSize:'18px'}}>Tahsilat Gir</h3>

            <form onSubmit={tahsilatKaydet}>
              <div style={{display:'grid', gap:'12px'}}>
                <input type="date" value={tahsilatForm.tarih} onChange={e => setTahsilatForm(prev => ({...prev, tarih:e.target.value}))} style={{border:'1px solid #d1d5db', borderRadius:'8px', padding:'10px 12px'}} />
                <input type="number" step="0.01" value={tahsilatForm.tutar} onChange={e => setTahsilatForm(prev => ({...prev, tutar:e.target.value}))} placeholder="Tutar" style={{border:'1px solid #d1d5db', borderRadius:'8px', padding:'10px 12px'}} />
              </div>

              <div style={{display:'flex', justifyContent:'flex-end', gap:'10px', marginTop:'18px'}}>
                <button type="button" onClick={() => setTahsilatPopup(null)} style={{padding:'10px 14px', borderRadius:'8px', border:'1px solid #d1d5db', background:'white', cursor:'pointer'}}>İptal</button>
                <button type="submit" disabled={tahsilatKaydediliyor} style={{padding:'10px 14px', borderRadius:'8px', border:'none', background:'#16a34a', color:'white', cursor:'pointer'}}>
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
