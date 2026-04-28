'use client'

import { useEffect, useRef, useState } from 'react'

async function safeJson(res: Response) {
  try {
    const text = await res.text()
    return text ? JSON.parse(text) : {}
  } catch {
    return {}
  }
}

function ad(m: any) {
  if (!m) return 'İsimsiz müşteri'
  return m.firmaAdi || [m.ad, m.soyad].filter(Boolean).join(' ') || 'İsimsiz müşteri'
}

function tl(v: any) {
  return Number(v || 0).toLocaleString('tr-TR') + ' ₺'
}

export default function MusterilerPage() {
  const [musteriler, setMusteriler] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [arama, setArama] = useState('')
  const [modal, setModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [excelLoading, setExcelLoading] = useState(false)
  const fileRef = useRef<HTMLInputElement | null>(null)

  const [form, setForm] = useState({
    firmaAdi: '',
    ad: '',
    soyad: '',
    telefon: '',
    email: '',
    acilisBakiyesi: '',
    bakiyeTipi: 'borc',
  })

  async function load() {
    setLoading(true)
    const r = await fetch('/api/musteriler', { cache: 'no-store' })
    const d = await safeJson(r)
    setMusteriler(Array.isArray(d.musteriler) ? d.musteriler.filter(Boolean) : [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const filtreli = musteriler.filter((m) =>
    [m?.firmaAdi, m?.ad, m?.soyad, m?.telefon, m?.email]
      .filter(Boolean)
      .join(' ')
      .toLocaleLowerCase('tr-TR')
      .includes(arama.toLocaleLowerCase('tr-TR'))
  )

  async function kaydet(e: React.FormEvent) {
    e.preventDefault()
    if (!form.firmaAdi.trim() && !form.ad.trim()) {
      alert('Firma adı veya ad girmelisin.')
      return
    }

    setSaving(true)
    const r = await fetch('/api/musteriler', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, acilisBakiyesi: Number(form.acilisBakiyesi || 0) }),
    })

    const d = await safeJson(r)
    setSaving(false)

    if (!r.ok) {
      alert(d.hata || 'Müşteri eklenemedi.')
      return
    }

    setModal(false)
    setForm({ firmaAdi: '', ad: '', soyad: '', telefon: '', email: '', acilisBakiyesi: '', bakiyeTipi: 'borc' })
    await load()
  }

  async function excel(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setExcelLoading(true)
    const fd = new FormData()
    fd.append('file', file)

    const r = await fetch('/api/musteriler/import', { method: 'POST', body: fd })
    const d = await safeJson(r)
    setExcelLoading(false)

    if (!r.ok) {
      alert(d.hata || 'Excel yüklenemedi.')
      return
    }

    alert(`Excel yüklendi. Eklenen: ${d.eklenen || 0}, Atlanan: ${d.atlanan || 0}`)
    await load()
  }

  return (
    <div className="min-h-screen bg-[#030712] text-white p-6 md:p-10">
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-5 mb-8">
        <div>
          <p className="text-xs tracking-[0.28em] text-slate-500 uppercase">CRM</p>
          <h1 className="text-4xl font-bold mt-2">Müşteriler</h1>
          <p className="text-slate-400 mt-2">Müşteri kayıtları, Excel aktarımı ve bakiyeler.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button onClick={() => setModal(true)} className="rounded-2xl bg-white text-slate-950 px-5 py-3 font-bold">
            + Yeni Müşteri
          </button>
          <a href="/api/musteriler/sablon" className="rounded-2xl border border-slate-700 px-5 py-3 font-bold text-center">
            Excel Şablon İndir
          </a>
          <button onClick={() => fileRef.current?.click()} className="rounded-2xl border border-slate-700 px-5 py-3 font-bold">
            {excelLoading ? 'Yükleniyor...' : 'Excel Yükle'}
          </button>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={excel} className="hidden" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card title="Toplam Müşteri" value={musteriler.length} />
        <Card title="Aktif Liste" value={filtreli.length} />
        <Card title="Excel" value="Hazır" />
        <Card title="Durum" value={loading ? 'Yükleniyor' : 'Aktif'} />
      </div>

      <div className="rounded-[2rem] border border-slate-800 bg-[#08111f] overflow-hidden">
        <div className="p-5 border-b border-slate-800">
          <input
            value={arama}
            onChange={(e) => setArama(e.target.value)}
            placeholder="Müşteri ara..."
            className="w-full rounded-2xl bg-[#030712] border border-slate-700 px-5 py-4 outline-none focus:border-blue-500"
          />
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400">Yükleniyor...</div>
        ) : filtreli.length === 0 ? (
          <div className="p-14 text-center">
            <div className="mx-auto w-16 h-16 rounded-3xl bg-slate-800 flex items-center justify-center text-2xl mb-5">+</div>
            <h2 className="text-2xl font-bold">Henüz müşteri yok</h2>
            <p className="text-slate-400 mt-2">İlk müşterini ekleyerek bu hesabın CRM yapısını başlat.</p>
            <button onClick={() => setModal(true)} className="mt-6 rounded-2xl bg-white text-slate-950 px-6 py-3 font-bold">
              İlk müşteriyi ekle
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {filtreli.map((m) => (
              <div key={m.id} className="p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 hover:bg-slate-900/40">
                <div>
                  <p className="text-lg font-bold">{ad(m)}</p>
                  <p className="text-sm text-slate-400 mt-1">
                    {[m?.telefon, m?.email].filter(Boolean).join(' · ') || 'İletişim bilgisi yok'}
                  </p>
                </div>
                <div className="text-sm text-slate-300">
                  Açılış bakiyesi: <span className="font-bold">{tl(m?.acilisBakiyesi)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={kaydet} className="w-full max-w-2xl rounded-[2rem] border border-slate-800 bg-[#08111f] p-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <p className="text-xs tracking-[0.25em] text-slate-500 uppercase">Yeni kayıt</p>
                <h2 className="text-2xl font-bold mt-1">Yeni Müşteri</h2>
              </div>
              <button type="button" onClick={() => setModal(false)} className="text-3xl text-slate-400">×</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                ['Firma adı', 'firmaAdi'],
                ['Ad', 'ad'],
                ['Soyad', 'soyad'],
                ['Telefon', 'telefon'],
                ['E-posta', 'email'],
                ['Açılış bakiyesi', 'acilisBakiyesi'],
              ].map(([label, key]) => (
                <input
                  key={key}
                  placeholder={label}
                  value={(form as any)[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  className="rounded-2xl bg-[#030712] border border-slate-700 px-4 py-3 outline-none focus:border-blue-500"
                />
              ))}
            </div>

            <select
              value={form.bakiyeTipi}
              onChange={(e) => setForm({ ...form, bakiyeTipi: e.target.value })}
              className="mt-3 w-full rounded-2xl bg-[#030712] border border-slate-700 px-4 py-3 outline-none"
            >
              <option value="borc">Borç</option>
              <option value="alacak">Alacak</option>
            </select>

            <button disabled={saving} className="mt-5 w-full rounded-2xl bg-white text-slate-950 px-5 py-3 font-bold disabled:opacity-50">
              {saving ? 'Kaydediliyor...' : 'Müşteriyi Kaydet'}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}

function Card({ title, value }: { title: string; value: any }) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-[#08111f] p-5">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{title}</p>
      <p className="text-3xl font-bold mt-2">{value}</p>
    </div>
  )
}
