'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [menuAcik, setMenuAcik] = useState(false)
  const [mobil, setMobil] = useState(false)
  const [atolyeBilgi, setAtolyeBilgi] = useState<{ atolyeAdi: string; logoUrl: string } | null>(null)

  useEffect(() => {
    function ekranKontrol() {
      setMobil(window.innerWidth <= 768)
    }
    ekranKontrol()
    window.addEventListener('resize', ekranKontrol)
    return () => window.removeEventListener('resize', ekranKontrol)
  }, [])

  useEffect(() => {
    setMenuAcik(false)
  }, [pathname])

  useEffect(() => {
    fetch('/api/atolye').then(r => r.json()).then(v => {
      if (v.atolye) setAtolyeBilgi({ atolyeAdi: v.atolye.atolyeAdi, logoUrl: v.atolye.logoUrl })
    })
  }, [])

  async function cikisYap() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  const menuItems = [
    { href: '/dashboard', label: 'Dashboard', icon: '▦' },
    { href: '/dashboard/atolye', label: 'Atölye Profili', icon: '⚙' },
    { href: '/dashboard/yeni-is', label: 'Yeni İş', icon: '+' },
    { href: '/dashboard/isler', label: 'İş Listesi', icon: '≡' },
  ]

  return (
    <div style={{display:'flex', minHeight:'100vh'}}>

      {/* Mobil üst bar */}
      {mobil && (
        <div style={{position:'fixed', top:0, left:0, right:0, background:'#1e1e2e', padding:'12px 16px', zIndex:100, display:'flex', alignItems:'center', justifyContent:'space-between', borderBottom:'1px solid #2e2e3e'}}>
          <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
            {atolyeBilgi?.logoUrl ? (
              <img src={atolyeBilgi.logoUrl} alt="logo" style={{height:'28px', objectFit:'contain'}} />
            ) : (
              <h1 style={{margin:0, fontSize:'18px', fontWeight:'700', color:'#60a5fa'}}>Metrix</h1>
            )}
            {atolyeBilgi?.atolyeAdi && (
              <span style={{fontSize:'13px', color:'#9ca3af'}}>{atolyeBilgi.atolyeAdi}</span>
            )}
          </div>
          <button onClick={() => setMenuAcik(!menuAcik)} style={{background:'transparent', border:'none', color:'white', fontSize:'24px', cursor:'pointer', padding:'4px 8px', lineHeight:1}}>
            {menuAcik ? '✕' : '☰'}
          </button>
        </div>
      )}

      {/* Overlay */}
      {mobil && menuAcik && (
        <div onClick={() => setMenuAcik(false)} style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:98}} />
      )}

      {/* Sol Menü */}
      <div style={{
        width:'240px', background:'#1e1e2e', color:'white', display:'flex', flexDirection:'column',
        flexShrink:0, position:'fixed', height:'100vh', zIndex:99,
        transform: mobil ? (menuAcik ? 'translateX(0)' : 'translateX(-100%)') : 'translateX(0)',
        transition:'transform 0.3s ease',
      }}>
        {/* Metrix Başlık */}
        <div style={{padding:'20px 20px 0', borderBottom:'1px solid #2e2e3e'}}>
          <div style={{display:'flex', alignItems:'center', gap:'8px', marginBottom:'12px'}}>
            <h1 style={{margin:0, fontSize:'20px', fontWeight:'700', color:'#60a5fa'}}>Metrix</h1>
            <span style={{fontSize:'11px', color:'#6b7280', marginTop:'2px'}}>Atölye Yönetimi</span>
          </div>

          {/* Firma Bilgisi */}
          {(atolyeBilgi?.logoUrl || atolyeBilgi?.atolyeAdi) && (
            <div style={{display:'flex', alignItems:'center', gap:'10px', padding:'10px 0 14px'}}>
              {atolyeBilgi.logoUrl && (
                <img src={atolyeBilgi.logoUrl} alt="firma logo" style={{height:'36px', width:'36px', objectFit:'contain', borderRadius:'6px', background:'white', padding:'3px'}} />
              )}
              {atolyeBilgi.atolyeAdi && (
                <span style={{fontSize:'13px', color:'#d1d5db', fontWeight:'500'}}>{atolyeBilgi.atolyeAdi}</span>
              )}
            </div>
          )}
        </div>

        <nav style={{flex:1, padding:'12px 0'}}>
          {menuItems.map((item) => {
            const aktif = pathname === item.href
            return (
              <Link key={item.href} href={item.href} style={{display:'flex', alignItems:'center', gap:'12px', padding:'12px 20px', color:aktif?'#60a5fa':'#9ca3af', background:aktif?'#2e2e4e':'transparent', textDecoration:'none', fontSize:'14px', fontWeight:aktif?'600':'400', borderLeft:aktif?'3px solid #60a5fa':'3px solid transparent'}}>
                <span style={{fontSize:'16px'}}>{item.icon}</span>
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div style={{padding:'16px 20px', borderTop:'1px solid #2e2e3e'}}>
          <button onClick={cikisYap} style={{width:'100%', padding:'10px', background:'transparent', border:'1px solid #374151', borderRadius:'8px', color:'#9ca3af', cursor:'pointer', fontSize:'14px'}}>
            Çıkış Yap
          </button>
        </div>
      </div>

      {/* İçerik */}
      <div style={{flex:1, marginLeft: mobil ? '0' : '240px', background:'#f9fafb', minHeight:'100vh', paddingTop: mobil ? '56px' : '0'}}>
        {children}
      </div>

    </div>
  )
}