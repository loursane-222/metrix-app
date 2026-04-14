'use client'

import { useState, useEffect } from 'react'
import { paraGoster, yuzdeGoster } from '@/lib/format'

export default function Dashboard() {
  const [veri, setVeri] = useState({
    toplamIs: 0,
    onaylananIs: 0,
    kaybedilenIs: 0,
    teklifVerilenTutar: 0,
    onaylananTutar: 0,
    onaylanmaOrani: 0,
    toplamCiro: 0,
    toplamMaliyet: 0,
    toplamKar: 0,
  })

  useEffect(() => {
    fetch('/api/dashboard')
      .then(r => r.json())
      .then(v => setVeri(v))
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
  ]

  return (
    <div style={{padding:'32px'}}>
      <h2 style={{margin:'0 0 24px', fontSize:'24px', fontWeight:'600', color:'#111827'}}>Dashboard</h2>

      <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(220px, 1fr))', gap:'16px', marginBottom:'32px'}}>
        {kartlar.map((kart, i) => (
          <div key={i} style={{background:'white', borderRadius:'12px', padding:'24px', border:'1px solid #e5e7eb'}}>
            <p style={{margin:'0 0 8px', fontSize:'12px', color:'#6b7280', fontWeight:'500', letterSpacing:'0.05em'}}>{kart.baslik}</p>
            <p style={{margin:0, fontSize:'24px', fontWeight:'700', color:kart.renk}}>{kart.deger}</p>
          </div>
        ))}
      </div>

      <div style={{background:'white', borderRadius:'12px', padding:'24px', border:'1px solid #e5e7eb'}}>
        <p style={{margin:0, color:'#6b7280', textAlign:'center', padding:'20px 0'}}>
          Onaylanan işlerin verileri yukarıda görünür. İş durumunu güncellemek için <strong>İş Listesi</strong> sayfasını kullanın.
        </p>
      </div>
    </div>
  )
}