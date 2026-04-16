'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

type Kullanici = {
  id: string
  email: string
  ad: string
  aktif: boolean
  abonelikBitis: string | null
  createdAt: string
  atolye: { atolyeAdi: string } | null
}

export default function AdminPanel() {
  const router = useRouter()
  const [kullanicilar, setKullanicilar] = useState<Kullanici[]>([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const [islemYapiliyor, setIslemYapiliyor] = useState<string | null>(null)

  useEffect(() => {
    yukle()
  }, [])

  async function yukle() {
    setYukleniyor(true)
    try {
      const yanit = await fetch('/api/admin/kullanicilar')
      if (yanit.status === 401) {
        router.push('/dashboard')
        return
      }
      const veri = await yanit.json()
      if (veri.kullanicilar) setKullanicilar(veri.kullanicilar)
    } finally {
      setYukleniyor(false)
    }
  }

  async function islemYap(kullaniciId: string, islem: string, ay?: number) {
    setIslemYapiliyor(kullaniciId + islem)
    try {
      await fetch('/api/admin/kullanicilar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kullaniciId, islem, ay }),
      })
      await yukle()
    } finally {
      setIslemYapiliyor(null)
    }
  }

  function abonelikDurumu(bitis: string | null) {
    if (!bitis) return { renk: '#6b7280', label: 'Belirsiz' }
    const gun = Math.ceil((new Date(bitis).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    if (gun < 0) return { renk: '#dc2626', label: `${Math.abs(gun)} gün önce doldu` }
    if (gun <= 7) return { renk: '#f59e0b', label: `${gun} gün kaldı` }
    return { renk: '#16a34a', label: `${gun} gün kaldı` }
  }

  if (yukleniyor) return <div style={{padding:'32px'}}>Yükleniyor...</div>

  return (
    <div style={{padding:'32px', maxWidth:'1200px', margin:'0 auto'}}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'32px'}}>
        <div>
          <h1 style={{margin:'0 0 4px', fontSize:'28px', fontWeight:'700', color:'#111827'}}>Admin Paneli</h1>
          <p style={{margin:0, fontSize:'14px', color:'#6b7280'}}>{kullanicilar.length} kullanıcı</p>
        </div>
        <button onClick={() => router.push('/dashboard')} style={{background:'#f3f4f6', color:'#374151', border:'1px solid #e5e7eb', borderRadius:'8px', padding:'8px 16px', fontSize:'14px', cursor:'pointer'}}>
          ← Dashboard
        </button>
      </div>

      <div style={{display:'flex', flexDirection:'column', gap:'12px'}}>
        {kullanicilar.map(k => {
          const abonelik = abonelikDurumu(k.abonelikBitis)
          return (
            <div key={k.id} style={{background:'white', borderRadius:'12px', padding:'20px', border:'1px solid #e5e7eb', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'16px'}}>
              <div style={{flex:1}}>
                <div style={{display:'flex', alignItems:'center', gap:'10px', marginBottom:'6px', flexWrap:'wrap'}}>
                  <p style={{margin:0, fontWeight:'600', fontSize:'15px', color:'#111827'}}>{k.ad || '—'}</p>
                  <span style={{background: k.aktif ? '#f0fdf4' : '#fef2f2', color: k.aktif ? '#16a34a' : '#dc2626', borderRadius:'6px', padding:'2px 8px', fontSize:'12px', fontWeight:'500'}}>
                    {k.aktif ? 'Aktif' : 'Pasif'}
                  </span>
                  <span style={{background:'#eff6ff', color:'#2563eb', borderRadius:'6px', padding:'2px 8px', fontSize:'12px'}}>
                    {k.atolye?.atolyeAdi || 'Profil yok'}
                  </span>
                </div>
                <p style={{margin:'0 0 4px', fontSize:'13px', color:'#6b7280'}}>{k.email}</p>
                <div style={{display:'flex', gap:'12px', flexWrap:'wrap'}}>
                  <span style={{fontSize:'12px', color:'#9ca3af'}}>Kayıt: {new Date(k.createdAt).toLocaleDateString('tr-TR')}</span>
                  <span style={{fontSize:'12px', color: abonelik.renk, fontWeight:'500'}}>
                    Abonelik: {k.abonelikBitis ? new Date(k.abonelikBitis).toLocaleDateString('tr-TR') : '—'} ({abonelik.label})
                  </span>
                </div>
              </div>

              <div style={{display:'flex', gap:'8px', flexWrap:'wrap', alignItems:'center'}}>
                <div style={{display:'flex', gap:'4px'}}>
                  {[1, 3, 6, 12].map(ay => (
                    <button
                      key={ay}
                      onClick={() => islemYap(k.id, 'abonelikUzat', ay)}
                      disabled={islemYapiliyor === k.id + 'abonelikUzat'}
                      style={{background:'#eff6ff', color:'#2563eb', border:'1px solid #bfdbfe', borderRadius:'6px', padding:'6px 10px', fontSize:'12px', cursor:'pointer', fontWeight:'500'}}
                    >
                      +{ay}ay
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => islemYap(k.id, 'durumDegistir')}
                  disabled={islemYapiliyor === k.id + 'durumDegistir'}
                  style={{background: k.aktif ? '#fef2f2' : '#f0fdf4', color: k.aktif ? '#dc2626' : '#16a34a', border:`1px solid ${k.aktif ? '#fecaca' : '#bbf7d0'}`, borderRadius:'6px', padding:'6px 12px', fontSize:'12px', cursor:'pointer', fontWeight:'500'}}
                >
                  {k.aktif ? 'Askıya Al' : 'Aktifleştir'}
                </button>
                <button
                  onClick={() => { if (confirm('Bu kullanıcıyı silmek istediğinizden emin misiniz?')) islemYap(k.id, 'sil') }}
                  disabled={islemYapiliyor === k.id + 'sil'}
                  style={{background:'#fef2f2', color:'#dc2626', border:'1px solid #fecaca', borderRadius:'6px', padding:'6px 12px', fontSize:'12px', cursor:'pointer'}}
                >
                  Sil
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}