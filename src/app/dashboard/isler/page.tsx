'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { paraGoster } from '@/lib/format'

type Is = {
  id: string
  musteriAdi: string
  urunAdi: string
  malzemeTipi: string
  musteriTipi: string
  metrajMtul: number
  tezgahArasiMtul: number
  adaTezgahMtul: number
  toplamMaliyet: number
  satisFiyati: number
  mtulSatisFiyati: number
  karYuzdesi: number
  durum: string
  createdAt: string
  notlar?: string
}

const durumRenk: { [key: string]: { bg: string; color: string; label: string } } = {
  teklif_verildi: { bg: '#fef9c3', color: '#854d0e', label: 'Teklif Verildi' },
  onaylandi: { bg: '#f0fdf4', color: '#15803d', label: 'Onaylandı' },
  kaybedildi: { bg: '#fef2f2', color: '#dc2626', label: 'Kaybedildi' },
}

export default function IsListesi() {
  const router = useRouter()
  const [isler, setIsler] = useState<Is[]>([])
  const [yukleniyor, setYukleniyor] = useState(true)

  useEffect(() => {
    fetch('/api/isler')
      .then(r => r.json())
      .then(v => { if (v.isler) setIsler(v.isler) })
      .finally(() => setYukleniyor(false))
  }, [])

  async function durumGuncelle(id: string, durum: string) {
    await fetch('/api/isler/durum', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, durum }),
    })
    setIsler(prev => prev.map(is => is.id === id ? { ...is, durum } : is))
  }

  function toplamMetraj(is: Is) {
    return (Number(is.metrajMtul) || 0) + (Number(is.tezgahArasiMtul) || 0) + (Number(is.adaTezgahMtul) || 0)
  }

  if (yukleniyor) return <div style={{padding:'32px'}}>Yükleniyor...</div>

  return (
    <div style={{padding:'32px'}}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'24px'}}>
        <h2 style={{margin:0, fontSize:'24px', fontWeight:'600', color:'#111827'}}>İş Listesi</h2>
        <a href="/dashboard/yeni-is" style={{background:'#2563eb', color:'white', textDecoration:'none', borderRadius:'8px', padding:'10px 20px', fontSize:'14px', fontWeight:'500'}}>
          + Yeni İş
        </a>
      </div>

      {isler.length === 0 ? (
        <div style={{background:'white', borderRadius:'12px', padding:'60px', border:'1px solid #e5e7eb', textAlign:'center'}}>
          <p style={{color:'#9ca3af', margin:0}}>Henüz iş kaydı yok.</p>
        </div>
      ) : (
        <div style={{display:'flex', flexDirection:'column', gap:'12px'}}>
          {isler.map(is => (
            <div key={is.id} style={{background:'white', borderRadius:'12px', padding:'20px', border:'1px solid #e5e7eb'}}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:'12px'}}>
                <div style={{flex:1}}>
                  <div style={{display:'flex', alignItems:'center', gap:'10px', marginBottom:'6px', flexWrap:'wrap'}}>
                    <h3 style={{margin:0, fontSize:'16px', fontWeight:'700', color:'#111827'}}>{is.musteriAdi || '—'}</h3>
                    <span style={{fontSize:'14px', color:'#6b7280'}}>→ {is.urunAdi}</span>
                    <span style={{background:'#f3f4f6', color:'#6b7280', borderRadius:'6px', padding:'2px 8px', fontSize:'12px'}}>{is.malzemeTipi}</span>
                    <span style={{background:'#eff6ff', color:'#2563eb', borderRadius:'6px', padding:'2px 8px', fontSize:'12px'}}>{is.musteriTipi}</span>
                  </div>
                  <div style={{display:'flex', gap:'16px', flexWrap:'wrap'}}>
                    <span style={{fontSize:'13px', color:'#6b7280'}}>Metraj: <strong>{toplamMetraj(is).toFixed(2)} mtül</strong></span>
                    <span style={{fontSize:'13px', color:'#6b7280'}}>Maliyet: <strong>{paraGoster(Number(is.toplamMaliyet))}</strong></span>
                    <span style={{fontSize:'13px', color:'#6b7280'}}>Satış: <strong style={{color:'#2563eb'}}>{paraGoster(Number(is.satisFiyati))}</strong></span>
                    <span style={{fontSize:'13px', color:'#6b7280'}}>Mtül: <strong style={{color:'#9333ea'}}>{paraGoster(Number(is.mtulSatisFiyati))}</strong></span>
                    <span style={{fontSize:'13px', color:'#6b7280'}}>Kar: <strong>%{Number(is.karYuzdesi).toFixed(0)}</strong></span>
                  </div>
                  {is.notlar && <p style={{margin:'8px 0 0', fontSize:'13px', color:'#9ca3af'}}>Not: {is.notlar}</p>}
                  <p style={{margin:'6px 0 0', fontSize:'12px', color:'#d1d5db'}}>{new Date(is.createdAt).toLocaleDateString('tr-TR')}</p>
                </div>
                <div style={{display:'flex', flexDirection:'column', alignItems:'flex-end', gap:'8px'}}>
                  <span style={{background:durumRenk[is.durum]?.bg, color:durumRenk[is.durum]?.color, borderRadius:'6px', padding:'4px 12px', fontSize:'13px', fontWeight:'500'}}>
                    {durumRenk[is.durum]?.label}
                  </span>
                  <select
                    value={is.durum}
                    onChange={e => durumGuncelle(is.id, e.target.value)}
                    style={{border:'1px solid #d1d5db', borderRadius:'6px', padding:'6px 10px', fontSize:'13px', cursor:'pointer'}}
                  >
                    <option value="teklif_verildi">Teklif Verildi</option>
                    <option value="onaylandi">Onaylandı</option>
                    <option value="kaybedildi">Kaybedildi</option>
                  </select>
                  <button
                    onClick={() => router.push(`/dashboard/isler/${is.id}`)}
                    style={{background:'#eff6ff', color:'#2563eb', border:'1px solid #bfdbfe', borderRadius:'6px', padding:'6px 12px', fontSize:'12px', cursor:'pointer', fontWeight:'500'}}
                  >
                    ✏ Düzenle
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}