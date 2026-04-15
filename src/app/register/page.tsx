'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function KayitOl() {
  const router = useRouter()
  const [form, setForm] = useState({ ad: '', email: '', password: '', passwordTekrar: '' })
  const [hata, setHata] = useState('')
  const [yukleniyor, setYukleniyor] = useState(false)

  function guncelle(alan: string, deger: string) {
    setForm(prev => ({ ...prev, [alan]: deger }))
  }

  async function kayitOl(e: React.FormEvent) {
    e.preventDefault()
    setHata('')

    if (form.password !== form.passwordTekrar) {
      setHata('Şifreler eşleşmiyor.')
      return
    }

    setYukleniyor(true)
    try {
      const yanit = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ad: form.ad, email: form.email, password: form.password }),
      })
      const veri = await yanit.json()
      if (yanit.ok) {
        router.push('/login?kayit=basarili')
      } else {
        setHata(veri.hata || 'Bir hata oluştu.')
      }
    } finally {
      setYukleniyor(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ background: 'white', borderRadius: '16px', padding: '40px', width: '100%', maxWidth: '440px', border: '1px solid #e5e7eb', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{ margin: '0 0 8px', fontSize: '28px', fontWeight: '700', color: '#111827' }}>Metrix</h1>
          <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>Atölye Yönetim Sistemi</p>
        </div>

        <h2 style={{ margin: '0 0 24px', fontSize: '20px', fontWeight: '600', color: '#111827' }}>Hesap Oluştur</h2>
        <p style={{ margin: '0 0 24px', fontSize: '13px', color: '#6b7280' }}>30 gün ücretsiz deneme ile başla.</p>

        <form onSubmit={kayitOl}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>Atölye / Firma Adı</label>
            <input
              style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: '8px', padding: '10px 12px', fontSize: '14px', boxSizing: 'border-box' }}
              required
              value={form.ad}
              onChange={e => guncelle('ad', e.target.value)}
              placeholder="Atölye adınız"
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>E-posta</label>
            <input
              type="email"
              style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: '8px', padding: '10px 12px', fontSize: '14px', boxSizing: 'border-box' }}
              required
              value={form.email}
              onChange={e => guncelle('email', e.target.value)}
              placeholder="ornek@email.com"
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>Şifre</label>
            <input
              type="password"
              style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: '8px', padding: '10px 12px', fontSize: '14px', boxSizing: 'border-box' }}
              required
              value={form.password}
              onChange={e => guncelle('password', e.target.value)}
              placeholder="En az 6 karakter"
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>Şifre Tekrar</label>
            <input
              type="password"
              style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: '8px', padding: '10px 12px', fontSize: '14px', boxSizing: 'border-box' }}
              required
              value={form.passwordTekrar}
              onChange={e => guncelle('passwordTekrar', e.target.value)}
              placeholder="Şifrenizi tekrar girin"
            />
          </div>

          {hata && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: '8px', padding: '12px', marginBottom: '16px', fontSize: '14px' }}>
              {hata}
            </div>
          )}

          <button
            type="submit"
            disabled={yukleniyor}
            style={{ width: '100%', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', padding: '12px', fontSize: '15px', fontWeight: '500', cursor: 'pointer', marginBottom: '16px' }}
          >
            {yukleniyor ? 'Kaydediliyor...' : 'Kayıt Ol'}
          </button>

          <p style={{ margin: 0, textAlign: 'center', fontSize: '14px', color: '#6b7280' }}>
            Zaten hesabın var mı?{' '}
            <Link href="/login" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: '500' }}>Giriş Yap</Link>
          </p>
        </form>
      </div>
    </div>
  )
}