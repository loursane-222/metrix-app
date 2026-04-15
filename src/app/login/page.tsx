'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [form, setForm] = useState({ email: '', password: '', beniHatirla: false })
  const [hata, setHata] = useState('')
  const [basari, setBasari] = useState('')
  const [yukleniyor, setYukleniyor] = useState(false)

  useEffect(() => {
    if (searchParams.get('kayit') === 'basarili') {
      setBasari('Kayıt başarılı! Şimdi giriş yapabilirsiniz.')
    }
  }, [searchParams])

  async function girisYap(e: React.FormEvent) {
    e.preventDefault()
    setHata('')
    setYukleniyor(true)
    try {
      const yanit = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, password: form.password, beniHatirla: form.beniHatirla }),
      })
      const veri = await yanit.json()
      if (yanit.ok) {
        router.push('/dashboard')
      } else {
        setHata(veri.hata || 'Giriş başarısız.')
      }
    } finally {
      setYukleniyor(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ background: 'white', borderRadius: '16px', padding: '40px', width: '100%', maxWidth: '400px', border: '1px solid #e5e7eb', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{ margin: '0 0 8px', fontSize: '28px', fontWeight: '700', color: '#111827' }}>Metrix</h1>
          <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>Atölye Yönetim Sistemi</p>
        </div>

        {basari && (
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a', borderRadius: '8px', padding: '12px', marginBottom: '20px', fontSize: '14px' }}>
            {basari}
          </div>
        )}

        <form onSubmit={girisYap}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>E-posta</label>
            <input
              type="email"
              style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: '8px', padding: '10px 12px', fontSize: '14px', boxSizing: 'border-box' }}
              required
              value={form.email}
              onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))}
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
              onChange={e => setForm(prev => ({ ...prev, password: e.target.value }))}
              placeholder="Şifreniz"
            />
          </div>

          <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="checkbox"
              id="beniHatirla"
              checked={form.beniHatirla}
              onChange={e => setForm(prev => ({ ...prev, beniHatirla: e.target.checked }))}
              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
            />
            <label htmlFor="beniHatirla" style={{ fontSize: '14px', color: '#374151', cursor: 'pointer' }}>Beni hatırla (30 gün)</label>
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
            {yukleniyor ? 'Giriş yapılıyor...' : 'Giriş Yap'}
          </button>

          <p style={{ margin: 0, textAlign: 'center', fontSize: '14px', color: '#6b7280' }}>
            Hesabın yok mu?{' '}
            <Link href="/register" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: '500' }}>Kayıt Ol</Link>
          </p>
        </form>
      </div>
    </div>
  )
}

export default function Login() {
  return (
    <Suspense fallback={<div style={{minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center'}}>Yükleniyor...</div>}>
      <LoginForm />
    </Suspense>
  )
}