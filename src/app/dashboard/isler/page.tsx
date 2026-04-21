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
  isTarihi?: string
  tasDurumu?: string
  tahsilat?: number
  notlar?: string
}

const durumRenk: { [key: string]: { bg: string; color: string; label: string } } = {
  teklif_verildi: { bg: '#fef9c3', color: '#854d0e', label: 'Teklif Verildi' },
  onaylandi:      { bg: '#f0fdf4', color: '#15803d', label: 'Onaylandı' },
  kaybedildi:     { bg: '#fef2f2', color: '#dc2626', label: 'Kaybedildi' },
}

export default function IsListesi() {
  const router = useRouter()
  const [isler, setIsler] = useState<Is[]>([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const [sirala, setSirala] = useState<'yeni' | 'eski' | 'tarih'>('yeni')
  const [filtre, setFiltre] = useState<'hepsi' | 'onaylandi' | 'bekliyor'>('hepsi')

  // Onay popup
  const [popupIs, setPopupIs] = useState<Is | null>(null)
  const [tasDurumu, setTasDurumu] = useState<'stokta' | 'alinacak' | ''>('')
  const [tahsilat, setTahsilat] = useState('')
  const [popupKaydediliyor, setPopupKaydediliyor] = useState(false)

  useEffect(() => {
    fetch('/api/isler')
      .then(r => r.json())
      .then(v => { if (v.isler) setIsler(v.isler) })
      .finally(() => setYukleniyor(false))
  }, [])

  async function durumGuncelle(id: string, yeniDurum: string, mevcutIs: Is) {
    if (yeniDurum === 'onaylandi') {
      setTasDurumu((mevcutIs.tasDurumu as 'stokta' | 'alinacak') || '')
      setTahsilat(mevcutIs.tahsilat ? String(mevcutIs.tahsilat) : '')
      setPopupIs(mevcutIs)
      return
    }
    await fetch('/api/isler/durum', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, durum: yeniDurum }),
    })
    setIsler(prev => prev.map(is => is.id === id ? { ...is, durum: yeniDurum } : is))
  }

  async function popupKaydet() {
    if (!popupIs) return
    setPopupKaydediliyor(true)
    await fetch('/api/isler/durum', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: popupIs.id,
        durum: 'onaylandi',
        tasDurumu,
        tahsilat: parseFloat(tahsilat) || 0,
      }),
    })
    setIsler(prev => prev.map(is =>
      is.id === popupIs.id
        ? { ...is, durum: 'onaylandi', tasDurumu, tahsilat: parseFloat(tahsilat) || 0 }
        : is
    ))
    setPopupKaydediliyor(false)
    setPopupIs(null)
  }

  function toplamMetraj(is: Is) {
    return (Number(is.metrajMtul) || 0) + (Number(is.tezgahArasiMtul) || 0) + (Number(is.adaTezgahMtul) || 0)
  }

  const filtrelenmis = isler
    .filter(is => {
      if (filtre === 'onaylandi') return is.durum === 'onaylandi'
      if (filtre === 'bekliyor') return is.durum === 'teklif_verildi'
      return true
    })
    .sort((a, b) => {
      if (sirala === 'tarih') {
        return (b.isTarihi ? new Date(b.isTarihi).getTime() : 0) -
               (a.isTarihi ? new Date(a.isTarihi).getTime() : 0)
      }
      if (sirala === 'eski') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })

  if (yukleniyor) return <div style={{padding:'32px'}}>Yükleniyor...</div>

  return (
    <div style={{padding:'32px'}}>
      {/* Başlık */}
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px'}}>
        <h2 style={{margin:0, fontSize:'24px', fontWeight:'600', color:'#111827'}}>İş Listesi</h2>
        <a href="/dashboard/yeni-is" style={{background:'#2563eb', color:'white', textDecoration:'none', borderRadius:'8px', padding:'10px 20px', fontSize:'14px', fontWeight:'500'}}>
          + Yeni İş
        </a>
      </div>

      {/* Filtre Bölümü */}
      <div style={{background:'white', borderRadius:'12px', padding:'16px 20px', border:'1px solid #e5e7eb', marginBottom:'20px', display:'flex', gap:'20px', flexWrap:'wrap', alignItems:'center'}}>
        <span style={{fontSize:'13px', fontWeight:'600', color:'#374151'}}>🔍 Filtre</span>

        <div style={{display:'flex', gap:'6px', alignItems:'center', flexWrap:'wrap'}}>
          <span style={{fontSize:'12px', color:'#6b7280', marginRight:'2px'}}>Sırala:</span>
          {([['yeni','En Yeni'],['eski','En Eski'],['tarih','İş Tarihine Göre']] as const).map(([val, label]) => (
            <button key={val} onClick={() => setSirala(val)}
              style={{padding:'5px 12px', borderRadius:'6px', fontSize:'12px', fontWeight:'500', cursor:'pointer',
                border: sirala === val ? '1px solid #2563eb' : '1px solid #d1d5db',
                background: sirala === val ? '#eff6ff' : 'white',
                color: sirala === val ? '#2563eb' : '#374151'}}>
              {label}
            </button>
          ))}
        </div>

        <div style={{display:'flex', gap:'6px', alignItems:'center', flexWrap:'wrap'}}>
          <span style={{fontSize:'12px', color:'#6b7280', marginRight:'2px'}}>Göster:</span>
          {([['hepsi','Tümü'],['onaylandi','✅ Onaylananlar'],['bekliyor','⏳ Bekleyenler']] as const).map(([val, label]) => (
            <button key={val} onClick={() => setFiltre(val)}
              style={{padding:'5px 12px', borderRadius:'6px', fontSize:'12px', fontWeight:'500', cursor:'pointer',
                border: filtre === val ? '1px solid #16a34a' : '1px solid #d1d5db',
                background: filtre === val ? '#f0fdf4' : 'white',
                color: filtre === val ? '#15803d' : '#374151'}}>
              {label}
            </button>
          ))}
        </div>

        <span style={{marginLeft:'auto', fontSize:'12px', color:'#9ca3af'}}>{filtrelenmis.length} iş</span>
      </div>

      {/* Liste */}
      {filtrelenmis.length === 0 ? (
        <div style={{background:'white', borderRadius:'12px', padding:'60px', border:'1px solid #e5e7eb', textAlign:'center'}}>
          <p style={{color:'#9ca3af', margin:0}}>Gösterilecek iş yok.</p>
        </div>
      ) : (
        <div style={{display:'flex', flexDirection:'column', gap:'12px'}}>
          {filtrelenmis.map(is => (
            <div key={is.id} style={{background:'white', borderRadius:'12px', padding:'20px', border:'1px solid #e5e7eb'}}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:'12px'}}>
                <div style={{flex:1}}>
                  <div style={{display:'flex', alignItems:'center', gap:'8px', marginBottom:'6px', flexWrap:'wrap'}}>
                    <h3 style={{margin:0, fontSize:'16px', fontWeight:'700', color:'#111827'}}>{is.musteriAdi || '—'}</h3>
                    <span style={{fontSize:'14px', color:'#6b7280'}}>→ {is.urunAdi}</span>
                    <span style={{background:'#f3f4f6', color:'#6b7280', borderRadius:'6px', padding:'2px 8px', fontSize:'12px'}}>{is.malzemeTipi}</span>
                    <span style={{background:'#eff6ff', color:'#2563eb', borderRadius:'6px', padding:'2px 8px', fontSize:'12px'}}>{is.musteriTipi}</span>
                    {is.tasDurumu === 'alinacak' && (
                      <span style={{background:'#fff7ed', color:'#c2410c', borderRadius:'6px', padding:'2px 8px', fontSize:'12px', border:'1px solid #fed7aa'}}>🪨 Taş Alınacak</span>
                    )}
                    {is.tasDurumu === 'stokta' && (
                      <span style={{background:'#f0fdf4', color:'#15803d', borderRadius:'6px', padding:'2px 8px', fontSize:'12px', border:'1px solid #bbf7d0'}}>✅ Taş Stokta</span>
                    )}
                  </div>
                  <div style={{display:'flex', gap:'16px', flexWrap:'wrap'}}>
                    <span style={{fontSize:'13px', color:'#6b7280'}}>Metraj: <strong>{toplamMetraj(is).toFixed(2)} mtül</strong></span>
                    <span style={{fontSize:'13px', color:'#6b7280'}}>Maliyet: <strong>{paraGoster(Number(is.toplamMaliyet))}</strong></span>
                    <span style={{fontSize:'13px', color:'#6b7280'}}>Satış: <strong style={{color:'#2563eb'}}>{paraGoster(Number(is.satisFiyati))}</strong></span>
                    <span style={{fontSize:'13px', color:'#6b7280'}}>Mtül: <strong style={{color:'#9333ea'}}>{paraGoster(Number(is.mtulSatisFiyati))}</strong></span>
                    <span style={{fontSize:'13px', color:'#6b7280'}}>Kar: <strong>%{Number(is.karYuzdesi).toFixed(0)}</strong></span>
                    {Number(is.tahsilat) > 0 && (
                      <span style={{fontSize:'13px', color:'#6b7280'}}>Tahsilat: <strong style={{color:'#0891b2'}}>{paraGoster(Number(is.tahsilat))}</strong></span>
                    )}
                  </div>
                  {is.notlar && <p style={{margin:'8px 0 0', fontSize:'13px', color:'#9ca3af'}}>Not: {is.notlar}</p>}
                  <div style={{display:'flex', gap:'12px', marginTop:'6px', flexWrap:'wrap'}}>
                    {is.isTarihi && (
                      <span style={{fontSize:'12px', color:'#374151'}}>
                        📅 <strong>{new Date(is.isTarihi).toLocaleDateString('tr-TR')}</strong>
                      </span>
                    )}
                    <span style={{fontSize:'12px', color:'#d1d5db'}}>
                      Oluşturuldu: {new Date(is.createdAt).toLocaleDateString('tr-TR')}
                    </span>
                  </div>
                </div>

                <div style={{display:'flex', flexDirection:'column', alignItems:'flex-end', gap:'8px'}}>
                  <span style={{background:durumRenk[is.durum]?.bg, color:durumRenk[is.durum]?.color, borderRadius:'6px', padding:'4px 12px', fontSize:'13px', fontWeight:'500'}}>
                    {durumRenk[is.durum]?.label}
                  </span>
                  <select
                    value={is.durum}
                    onChange={e => durumGuncelle(is.id, e.target.value, is)}
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

      {/* Onay Popup */}
      {popupIs && (
        <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:'16px'}}
          onClick={() => setPopupIs(null)}>
          <div style={{background:'white', borderRadius:'16px', padding:'28px', maxWidth:'460px', width:'100%', boxShadow:'0 24px 64px rgba(0,0,0,0.2)'}}
            onClick={e => e.stopPropagation()}>

            <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'6px'}}>
              <h3 style={{margin:0, fontSize:'18px', fontWeight:'700', color:'#111827'}}>✅ İş Onaylandı</h3>
              <button onClick={() => setPopupIs(null)} style={{background:'none', border:'none', fontSize:'18px', cursor:'pointer', color:'#9ca3af', lineHeight:1}}>×</button>
            </div>
            <p style={{margin:'0 0 22px', fontSize:'14px', color:'#6b7280'}}>
              <strong>{popupIs.musteriAdi}</strong> — {popupIs.urunAdi}
            </p>

            {/* Taş Durumu */}
            <div style={{marginBottom:'22px'}}>
              <p style={{margin:'0 0 10px', fontSize:'13px', fontWeight:'600', color:'#374151'}}>🪨 Taş Durumu</p>
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px'}}>
                {([
                  { val: 'stokta',   label: '✅ Taş Stokta',   activeBg:'#f0fdf4', activeBorder:'#16a34a', activeColor:'#15803d' },
                  { val: 'alinacak', label: '🛒 Taş Alınacak', activeBg:'#fff7ed', activeBorder:'#ea580c', activeColor:'#c2410c' },
                ] as const).map(opt => (
                  <label key={opt.val} style={{
                    display:'flex', alignItems:'center', gap:'8px', cursor:'pointer',
                    padding:'12px 14px', borderRadius:'8px',
                    border:`2px solid ${tasDurumu === opt.val ? opt.activeBorder : '#e5e7eb'}`,
                    background: tasDurumu === opt.val ? opt.activeBg : '#fafafa',
                    fontSize:'13px', fontWeight:'500',
                    color: tasDurumu === opt.val ? opt.activeColor : '#374151',
                    transition:'all 0.15s',
                  }}>
                    <input type="radio" name="tas" value={opt.val}
                      checked={tasDurumu === opt.val}
                      onChange={() => setTasDurumu(opt.val)}
                      style={{accentColor: opt.activeBorder, width:'16px', height:'16px'}} />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>

            {/* Tahsilat */}
            <div style={{marginBottom:'24px'}}>
              <label style={{display:'block', fontSize:'13px', fontWeight:'600', color:'#374151', marginBottom:'8px'}}>
                💰 Tahsilat (Alınan Ödeme)
              </label>
              <div style={{position:'relative'}}>
                <input
                  type="number" step="0.01" placeholder="0.00"
                  value={tahsilat}
                  onChange={e => setTahsilat(e.target.value)}
                  style={{width:'100%', border:'1px solid #d1d5db', borderRadius:'8px', padding:'10px 40px 10px 12px', fontSize:'15px', boxSizing:'border-box', outline:'none'}}
                />
                <span style={{position:'absolute', right:'12px', top:'50%', transform:'translateY(-50%)', fontSize:'14px', color:'#9ca3af', fontWeight:'500'}}>₺</span>
              </div>
              <p style={{margin:'6px 0 0', fontSize:'12px', color:'#9ca3af'}}>
                Toplam satış fiyatı: {paraGoster(Number(popupIs.satisFiyati))}
              </p>
            </div>

            {/* Butonlar */}
            <div style={{display:'grid', gridTemplateColumns:'1fr 2fr', gap:'10px'}}>
              <button onClick={() => setPopupIs(null)}
                style={{padding:'11px', borderRadius:'8px', border:'1px solid #d1d5db', background:'white', fontSize:'14px', cursor:'pointer', color:'#374151', fontWeight:'500'}}>
                İptal
              </button>
              <button onClick={popupKaydet} disabled={popupKaydediliyor}
                style={{padding:'11px', borderRadius:'8px', border:'none', background: popupKaydediliyor ? '#86efac' : '#16a34a', color:'white', fontSize:'14px', fontWeight:'600', cursor: popupKaydediliyor ? 'not-allowed' : 'pointer', transition:'background 0.2s'}}>
                {popupKaydediliyor ? 'Kaydediliyor...' : '💾 Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
