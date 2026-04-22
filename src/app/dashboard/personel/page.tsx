'use client'

import { useState, useEffect } from 'react'

type Personel = {
  id: string
  ad: string
  soyad: string
  gorevi: string
  calismaYili: number
  telefon: string
  email: string
  aktif: boolean
  bagliOldugu?: { id: string; ad: string; soyad: string } | null
  performansNotu: number | null
  toplamGorev: number
  tamamlananGorev?: number
  zamanindaTamamlanan?: number
}

const inputStil: React.CSSProperties = {
  width: '100%', border: '1px solid #d1d5db', borderRadius: '8px',
  padding: '8px 12px', fontSize: '14px', boxSizing: 'border-box'
}
const labelStil: React.CSSProperties = {
  display: 'block', fontSize: '13px', fontWeight: '500', color: '#374151', marginBottom: '4px'
}

const GOREVLER = ['Ustabaşı','Kesimci','Montajcı','Ölçücü','Yardımcı','Şoför','Ofis','Diğer']

export default function PersonelSayfasi() {
  const [personeller, setPersoneller] = useState<Personel[]>([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const [formAcik, setFormAcik] = useState(false)
  const [duzenleId, setDuzenleId] = useState<string | null>(null)
  const [kaydediliyor, setKaydediliyor] = useState(false)

  const [form, setForm] = useState({
    ad: '', soyad: '', gorevi: GOREVLER[0],
    bagliOlduguId: '', calismaYili: '', telefon: '', email: ''
  })

  useEffect(() => { yukle() }, [])

  async function yukle() {
    setYukleniyor(true)
    const res = await fetch('/api/personel')
    const v = await res.json()
    if (v.personeller) setPersoneller(v.personeller)
    setYukleniyor(false)
  }

  function formAc(p?: Personel) {
    if (p) {
      setDuzenleId(p.id)
      setForm({
        ad: p.ad, soyad: p.soyad, gorevi: p.gorevi,
        bagliOlduguId: p.bagliOldugu?.id || '',
        calismaYili: String(p.calismaYili),
        telefon: p.telefon, email: p.email
      })
    } else {
      setDuzenleId(null)
      setForm({ ad: '', soyad: '', gorevi: GOREVLER[0], bagliOlduguId: '', calismaYili: '', telefon: '', email: '' })
    }
    setFormAcik(true)
  }

  async function kaydet() {
    setKaydediliyor(true)
    try {
      const method = duzenleId ? 'PUT' : 'POST'
      const body = duzenleId ? { ...form, id: duzenleId } : form
      const res = await fetch('/api/personel', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      const v = await res.json()
      if (v.hata) { alert(v.hata); return }
      setFormAcik(false)
      yukle()
    } finally { setKaydediliyor(false) }
  }

  function performansRenk(not: number | null) {
    if (not === null) return '#9ca3af'
    if (not >= 80) return '#16a34a'
    if (not >= 60) return '#d97706'
    return '#dc2626'
  }

  function performansEtiket(not: number | null) {
    if (not === null) return '—'
    if (not >= 80) return '🟢 İyi'
    if (not >= 60) return '🟡 Orta'
    return '🔴 Düşük'
  }

  if (yukleniyor) return <div style={{ padding: '32px' }}>Yükleniyor...</div>

  return (
    <div style={{ padding: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ margin: '0 0 4px', fontSize: '24px', fontWeight: '600', color: '#111827' }}>Personel</h2>
          <p style={{ margin: 0, fontSize: '13px', color: '#9ca3af' }}>{personeller.length}/50 personel</p>
        </div>
        <button onClick={() => formAc()}
          style={{ background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', padding: '10px 20px', fontSize: '14px', fontWeight: '500', cursor: 'pointer' }}>
          + Personel Ekle
        </button>
      </div>

      {personeller.length === 0 ? (
        <div style={{ background: 'white', borderRadius: '12px', padding: '60px', border: '1px solid #e5e7eb', textAlign: 'center' }}>
          <p style={{ color: '#9ca3af', margin: 0 }}>Henüz personel kaydı yok.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {personeller.map((p, idx) => (
            <div key={p.id} style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>

              {/* Kıdem sırası */}
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: idx === 0 ? '#fef9c3' : idx === 1 ? '#f3f4f6' : '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '700', color: '#374151', flexShrink: 0 }}>
                {idx + 1}
              </div>

              {/* Bilgiler */}
              <div style={{ flex: 1, minWidth: '200px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '16px', fontWeight: '700', color: '#111827' }}>{p.ad} {p.soyad}</span>
                  <span style={{ background: '#eff6ff', color: '#2563eb', borderRadius: '6px', padding: '2px 8px', fontSize: '12px' }}>{p.gorevi}</span>
                  <span style={{ background: '#f3f4f6', color: '#6b7280', borderRadius: '6px', padding: '2px 8px', fontSize: '12px' }}>
                    {p.calismaYili} yıl kıdem
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '12px', marginTop: '4px', flexWrap: 'wrap' }}>
                  {p.bagliOldugu && (
                    <span style={{ fontSize: '12px', color: '#6b7280' }}>
                      👤 {p.bagliOldugu.ad} {p.bagliOldugu.soyad}'e bağlı
                    </span>
                  )}
                  {p.telefon && <span style={{ fontSize: '12px', color: '#6b7280' }}>📞 {p.telefon}</span>}
                </div>
              </div>

              {/* Performans */}
              <div style={{ textAlign: 'center', minWidth: '120px' }}>
                <div style={{ fontSize: '28px', fontWeight: '800', color: performansRenk(p.performansNotu), lineHeight: 1 }}>
                  {p.performansNotu !== null ? p.performansNotu : '—'}
                </div>
                <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>/ 100</div>
                <div style={{ fontSize: '11px', color: performansRenk(p.performansNotu), marginTop: '2px' }}>
                  {performansEtiket(p.performansNotu)}
                </div>
                {p.toplamGorev > 0 && (
                  <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>
                    {p.tamamlananGorev}/{p.toplamGorev} görev
                  </div>
                )}
              </div>

              {/* Düzenle */}
              <button onClick={() => formAc(p)}
                style={{ background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: '6px', padding: '6px 12px', fontSize: '12px', cursor: 'pointer', fontWeight: '500' }}>
                ✏ Düzenle
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Form Modal */}
      {formAcik && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
          onClick={() => setFormAcik(false)}>
          <div style={{ background: 'white', borderRadius: '16px', padding: '28px', maxWidth: '500px', width: '100%', boxShadow: '0 24px 64px rgba(0,0,0,0.2)' }}
            onClick={e => e.stopPropagation()}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700' }}>{duzenleId ? 'Personel Düzenle' : 'Personel Ekle'}</h3>
              <button onClick={() => setFormAcik(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#9ca3af' }}>×</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div><label style={labelStil}>Ad</label><input style={inputStil} value={form.ad} onChange={e => setForm(p => ({ ...p, ad: e.target.value }))} placeholder="Ad" /></div>
              <div><label style={labelStil}>Soyad</label><input style={inputStil} value={form.soyad} onChange={e => setForm(p => ({ ...p, soyad: e.target.value }))} placeholder="Soyad" /></div>

              <div><label style={labelStil}>Görevi</label>
                <select style={inputStil} value={form.gorevi} onChange={e => setForm(p => ({ ...p, gorevi: e.target.value }))}>
                  {GOREVLER.map(g => <option key={g}>{g}</option>)}
                </select>
              </div>

              <div><label style={labelStil}>Kıdem (Çalışma Yılı)</label>
                <input style={inputStil} type="number" min="0" value={form.calismaYili} onChange={e => setForm(p => ({ ...p, calismaYili: e.target.value }))} placeholder="0" />
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStil}>Kime Bağlı</label>
                <select style={inputStil} value={form.bagliOlduguId} onChange={e => setForm(p => ({ ...p, bagliOlduguId: e.target.value }))}>
                  <option value="">— Bağlı Olmayan (Bağımsız) —</option>
                  {personeller.filter(p => p.id !== duzenleId).map(p => (
                    <option key={p.id} value={p.id}>{p.ad} {p.soyad} ({p.gorevi})</option>
                  ))}
                </select>
              </div>

              <div><label style={labelStil}>Telefon</label><input style={inputStil} value={form.telefon} onChange={e => setForm(p => ({ ...p, telefon: e.target.value }))} placeholder="05xx..." /></div>
              <div><label style={labelStil}>E-posta</label><input style={inputStil} value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="@" /></div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px', marginTop: '20px' }}>
              <button onClick={() => setFormAcik(false)}
                style={{ padding: '11px', borderRadius: '8px', border: '1px solid #d1d5db', background: 'white', fontSize: '14px', cursor: 'pointer' }}>
                İptal
              </button>
              <button onClick={kaydet} disabled={kaydediliyor || !form.ad || !form.soyad}
                style={{ padding: '11px', borderRadius: '8px', border: 'none', background: '#2563eb', color: 'white', fontSize: '14px', fontWeight: '600', cursor: 'pointer', opacity: (!form.ad || !form.soyad) ? 0.5 : 1 }}>
                {kaydediliyor ? 'Kaydediliyor...' : '💾 Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
