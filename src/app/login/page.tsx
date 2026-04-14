'use client'

import { useState } from 'react'

export default function LoginSayfasi() {
  const [email, setEmail] = useState('')
  const [sifre, setSifre] = useState('')
  const [hata, setHata] = useState('')
  const [yukleniyor, setYukleniyor] = useState(false)

  async function girisYap(e: React.FormEvent) {
    e.preventDefault()
    setYukleniyor(true)
    setHata('')
    try {
      const yanit = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: sifre }),
      })
      const veri = await yanit.json()
      if (!yanit.ok) { setHata(veri.hata); return }
      window.location.href = '/dashboard'
    } catch {
      setHata('Bağlantı hatası.')
    } finally {
      setYukleniyor(false)
    }
  }

  return (
    <div style={{minHeight:'100vh',background:'#f9fafb',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{background:'white',borderRadius:'16px',border:'1px solid #e5e7eb',padding:'40px',width:'100%',maxWidth:'400px'}}>
        <div style={{textAlign:'center',marginBottom:'32px'}}>
          <h1 style={{fontSize:'28px',fontWeight:'700',color:'#111827',margin:'0'}}>Metrix</h1>
          <p style={{color:'#6b7280',marginTop:'8px'}}>Atölye yönetim sistemi</p>
        </div>
        <form onSubmit={girisYap}>
          <div style={{marginBottom:'16px'}}>
            <label style={{display:'block',fontSize:'14px',fontWeight:'500',color:'#374151',marginBottom:'4px'}}>E-posta</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@metrix.com" required style={{width:'100%',border:'1px solid #d1d5db',borderRadius:'8px',padding:'10px 14px',fontSize:'14px',boxSizing:'border-box'}}/>
          </div>
          <div style={{marginBottom:'16px'}}>
            <label style={{display:'block',fontSize:'14px',fontWeight:'500',color:'#374151',marginBottom:'4px'}}>Şifre</label>
            <input type="password" value={sifre} onChange={(e) => setSifre(e.target.value)} placeholder="••••••••" required style={{width:'100%',border:'1px solid #d1d5db',borderRadius:'8px',padding:'10px 14px',fontSize:'14px',boxSizing:'border-box'}}/>
          </div>
          {hata && <div style={{background:'#fef2f2',border:'1px solid #fecaca',color:'#dc2626',borderRadius:'8px',padding:'12px',fontSize:'14px',marginBottom:'16px'}}>{hata}</div>}
          <button type="submit" disabled={yukleniyor} style={{width:'100%',background:'#2563eb',color:'white',border:'none',borderRadius:'8px',padding:'12px',fontSize:'15px',fontWeight:'500',cursor:'pointer'}}>
            {yukleniyor ? 'Giriş yapılıyor...' : 'Giriş Yap'}
          </button>
        </form>
      </div>
    </div>
  )
}