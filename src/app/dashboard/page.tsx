'use client'

import { useState, useEffect } from 'react'
import { paraGoster, yuzdeGoster } from '@/lib/format'

type AyOzet = {
  yil: number; ay: number; ayAdi: string;
  toplamTeklif: number; onaylananTeklif: number; bekleyenTeklif: number; kaybedilenTeklif: number;
  onaylanmaOrani: number;
  toplamTeklifTutari: number; onaylananTeklifTutari: number; kaybedilenTeklifTutari: number;
  toplamTahsilat: number; kirilanTas: number; toplamPlaka: number;
  toplamMaliyet: number; toplamKazanc: number;
}

export default function Dashboard() {
  const [veri, setVeri] = useState({
    toplamIs: 0, onaylananIs: 0, kaybedilenIs: 0,
    teklifVerilenTutar: 0, onaylananTutar: 0, onaylanmaOrani: 0,
    toplamCiro: 0, toplamMaliyet: 0, toplamKar: 0, toplamTahsilat: 0,
  })
  const [aylar, setAylar] = useState<AyOzet[]>([])
  const [aylarYukleniyor, setAylarYukleniyor] = useState(true)

  useEffect(() => {
    fetch('/api/dashboard').then(r => r.json()).then(v => setVeri(v))
    fetch('/api/dashboard/aylik')
      .then(r => r.json())
      .then(v => { if (v.aylar) setAylar(v.aylar) })
      .finally(() => setAylarYukleniyor(false))
  }, [])

  const kartlar = [
    { baslik: 'TOPLAM İŞ', deger: veri.toplamIs.toString(), renk: '#111827' },
    { baslik: 'ONAYLANAN İŞ', deger: veri.onaylananIs.toString(), renk: '#16a34a' },
    { baslik: 'KAYBEDİLEN İŞ', deger: veri.kaybedilenIs.toString(), renk: '#dc2626' },
    { baslik: 'TEKLİF VERİLEN TUTAR', deger: paraGoster(veri.teklifVerilenTutar), renk: '#0369a1' },
    { baslik: 'ONAYLANAN TUTAR', deger: paraGoster(veri.onaylananTutar), renk: '#16a34a' },
    { baslik: 'ONAYLANMA ORANI', deger: yuzdeGoster(veri.onaylanmaOrani), renk: '#7c3aed' },
    { baslik: 'TOPLAM CİRO', deger: paraGoster(veri.toplamCiro), renk: '#2563eb' },
    { baslik: 'TOPLAM MALİYET', deger: paraGoster(veri.toplamMaliyet), renk: '#dc2626' },
    { baslik: 'TOPLAM KAR', deger: paraGoster(veri.toplamKar), renk: '#9333ea' },
    { baslik: 'TAHSİLATLAR TOPLAMI', deger: paraGoster(veri.toplamTahsilat), renk: '#0891b2' },
  ]

  const ozet_sutunlar = [
    { key: 'toplamTeklif',         label: 'Toplam Teklif',          format: (v: number) => v.toString(),              renk: '#374151' },
    { key: 'onaylananTeklif',      label: 'Onaylanan',               format: (v: number) => v.toString(),              renk: '#16a34a' },
    { key: 'bekleyenTeklif',       label: 'Bekleyen',                format: (v: number) => v.toString(),              renk: '#d97706' },
    { key: 'kaybedilenTeklif',     label: 'Kaybedilen',              format: (v: number) => v.toString(),              renk: '#dc2626' },
    { key: 'onaylanmaOrani',       label: 'Onaylanma %',             format: (v: number) => `%${v.toFixed(0)}`,        renk: '#7c3aed' },
    { key: 'toplamTeklifTutari',   label: 'Toplam Teklif Tutarı',    format: (v: number) => paraGoster(v),             renk: '#0369a1' },
    { key: 'onaylananTeklifTutari',label: 'Onaylanan Tutar',         format: (v: number) => paraGoster(v),             renk: '#16a34a' },
    { key: 'kaybedilenTeklifTutari',label:'Kaybedilen Tutar',        format: (v: number) => paraGoster(v),             renk: '#dc2626' },
    { key: 'toplamTahsilat',       label: 'Toplam Tahsilat',         format: (v: number) => paraGoster(v),             renk: '#0891b2' },
    { key: 'kirilanTas',           label: 'Kırılan Taş (plaka)',     format: (v: number) => v.toFixed(1),              renk: '#92400e' },
    { key: 'toplamPlaka',          label: 'Kesilen Plaka',           format: (v: number) => v.toFixed(1),              renk: '#374151' },
    { key: 'toplamMaliyet',        label: 'Toplam Maliyet',          format: (v: number) => paraGoster(v),             renk: '#dc2626' },
    { key: 'toplamKazanc',         label: 'Toplam Kazanç',           format: (v: number) => paraGoster(v),             renk: '#9333ea' },
  ]

  return (
    <div style={{padding:'32px'}}>
      <h2 style={{margin:'0 0 24px', fontSize:'24px', fontWeight:'600', color:'#111827'}}>Dashboard</h2>

      {/* Üst Kartlar */}
      <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(220px, 1fr))', gap:'16px', marginBottom:'40px'}}>
        {kartlar.map((kart, i) => (
          <div key={i} style={{background:'white', borderRadius:'12px', padding:'24px', border:'1px solid #e5e7eb'}}>
            <p style={{margin:'0 0 8px', fontSize:'12px', color:'#6b7280', fontWeight:'500', letterSpacing:'0.05em'}}>{kart.baslik}</p>
            <p style={{margin:0, fontSize:'24px', fontWeight:'700', color:kart.renk}}>{kart.deger}</p>
          </div>
        ))}
      </div>

      {/* Aylık Özet */}
      <div>
        <h3 style={{margin:'0 0 16px', fontSize:'18px', fontWeight:'600', color:'#111827'}}>📅 Aylık Özet</h3>

        {aylarYukleniyor ? (
          <div style={{background:'white', borderRadius:'12px', padding:'40px', border:'1px solid #e5e7eb', textAlign:'center', color:'#9ca3af'}}>
            Yükleniyor...
          </div>
        ) : aylar.length === 0 ? (
          <div style={{background:'white', borderRadius:'12px', padding:'40px', border:'1px solid #e5e7eb', textAlign:'center', color:'#9ca3af'}}>
            Henüz iş kaydı yok.
          </div>
        ) : (
          <div style={{display:'flex', flexDirection:'column', gap:'12px'}}>
            {aylar.map((ay) => (
              <div key={`${ay.yil}-${ay.ay}`}
                style={{background:'white', borderRadius:'12px', border:'1px solid #e5e7eb', overflow:'hidden'}}>

                {/* Ay Başlığı */}
                <div style={{
                  background:'linear-gradient(135deg, #1e40af 0%, #2563eb 100%)',
                  padding:'12px 20px',
                  display:'flex', alignItems:'center', justifyContent:'space-between'
                }}>
                  <span style={{color:'white', fontWeight:'700', fontSize:'15px'}}>
                    {ay.ayAdi} {ay.yil}
                  </span>
                  <div style={{display:'flex', gap:'16px'}}>
                    <span style={{color:'#bfdbfe', fontSize:'12px'}}>
                      {ay.toplamTeklif} teklif
                    </span>
                    <span style={{color:'#bbf7d0', fontSize:'12px', fontWeight:'600'}}>
                      {ay.onaylananTeklif} onaylı
                    </span>
                    {ay.bekleyenTeklif > 0 && (
                      <span style={{color:'#fde68a', fontSize:'12px'}}>
                        {ay.bekleyenTeklif} bekliyor
                      </span>
                    )}
                  </div>
                </div>

                {/* Özet Satırı */}
                <div style={{
                  padding:'16px 20px',
                  display:'grid',
                  gridTemplateColumns:'repeat(auto-fill, minmax(160px, 1fr))',
                  gap:'12px 20px'
                }}>
                  {ozet_sutunlar.map(sutun => {
                    const deger = ay[sutun.key as keyof AyOzet] as number
                    if (deger === 0 && ['kirilanTas','toplamPlaka','toplamTahsilat'].includes(sutun.key)) return null
                    return (
                      <div key={sutun.key}>
                        <div style={{fontSize:'11px', color:'#9ca3af', fontWeight:'500', marginBottom:'2px', textTransform:'uppercase', letterSpacing:'0.03em'}}>
                          {sutun.label}
                        </div>
                        <div style={{fontSize:'14px', fontWeight:'700', color: sutun.renk}}>
                          {sutun.format(deger)}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
