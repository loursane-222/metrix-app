'use client'

import { useEffect, useRef, useState } from 'react'

async function safeJsonResponse(res: Response) {
  try {
    const text = await res.text()
    if (!text) return {}
    return JSON.parse(text)
  } catch {
    return {}
  }
}

export default function MusterilerPage() {
  const [musteriler, setMusteriler] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [yeniAcik, setYeniAcik] = useState(false)
  const [kaydediliyor, setKaydediliyor] = useState(false)
  const [excelYukleniyor, setExcelYukleniyor] = useState(false)
  const [excelMesaji, setExcelMesaji] = useState('')
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [form, setForm] = useState({
    firmaAdi: '',
    ad: '',
    soyad: '',
    telefon: '',
    email: '',
    acilisBakiyesi: '',
    bakiyeTipi: 'borc',
  })

  async function listeYukle() {
    setLoading(true)
    try {
      const r = await fetch('/api/musteriler', { cache: 'no-store' })
      const d = await safeJsonResponse(r)
      setMusteriler(Array.isArray(d.musteriler) ? d.musteriler : [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    listeYukle()
  }, [])

  async function yeniMusteriKaydet(e: React.FormEvent) {
    e.preventDefault()

    if (!form.firmaAdi.trim() && !form.ad.trim()) {
      alert('Firma adı veya ad girmelisin.')
      return
    }

    setKaydediliyor(true)

    try {
      const res = await fetch('/api/musteriler', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          acilisBakiyesi: Number(form.acilisBakiyesi || 0),
        }),
      })

      const json = await safeJsonResponse(res)

      if (!res.ok) {
        alert(json.hata || json.error || 'Müşteri oluşturulamadı.')
        return
      }

      setYeniAcik(false)
      setForm({
        firmaAdi: '',
        ad: '',
        soyad: '',
        telefon: '',
        email: '',
        acilisBakiyesi: '',
        bakiyeTipi: 'borc',
      })

      await listeYukle()
    } finally {
      setKaydediliyor(false)
    }
  }

  async function excelSecildi(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setExcelYukleniyor(true)
    setExcelMesaji('')

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/musteriler/import', {
        method: 'POST',
        body: formData,
      })

      const json = await safeJsonResponse(res)

      if (!res.ok) {
        setExcelMesaji(json.hata || 'Excel yükleme başarısız.')
        return
      }

      setExcelMesaji(`Excel yüklendi. Eklenen: ${json.eklenen || 0}, Atlanan: ${json.atlanan || 0}`)
      await listeYukle()
    } catch (err: any) {
      setExcelMesaji(err.message || 'Excel yükleme sırasında hata oluştu.')
    } finally {
      setExcelYukleniyor(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div className="min-h-screen bg-[#030712] text-white p-5 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <p className="text-xs tracking-[0.25em] text-slate-500 uppercase">CRM</p>
            <h1 className="text-2xl md:text-4xl font-semibold mt-2">Müşteriler</h1>
            <p className="text-slate-400 mt-2">Müşteri kayıtlarını, bakiyeleri ve teklif geçmişlerini yönetin.</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={() => setYeniAcik(true)}
              className="rounded-2xl bg-white text-slate-950 px-5 py-3 font-bold hover:bg-slate-200"
            >
              + Yeni Müşteri
            </button>

            <a
              href="/api/musteriler/sablon"
              className="rounded-2xl border border-slate-700 px-5 py-3 font-bold text-center hover:bg-slate-900"
            >
              Excel Şablon İndir
            </a>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="rounded-2xl border border-slate-700 px-5 py-3 font-bold hover:bg-slate-900"
            >
              {excelYukleniyor ? 'Excel Yükleniyor...' : 'Excel Yükle'}
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={excelSecildi}
              className="hidden"
            />
          </div>
        </div>

        {excelMesaji && (
          <div className="mb-5 rounded-2xl border border-blue-500/30 bg-blue-500/10 p-4 text-sm text-blue-100 whitespace-pre-wrap">
            {excelMesaji}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <MiniCard label="Toplam müşteri" value={musteriler.length} />
          <MiniCard label="Aktif ekran" value="CRM" />
          <MiniCard label="Excel aktarım" value="Hazır" />
          <MiniCard label="Durum" value={loading ? 'Yükleniyor' : 'Aktif'} />
        </div>

        <div className="rounded-3xl border border-slate-800 bg-[#08111f] overflow-hidden">
          {loading ? (
            <div className="p-10 text-center text-slate-400">Müşteriler yükleniyor...</div>
          ) : musteriler.length === 0 ? (
            <div className="p-10 md:p-16 text-center">
              <div className="mx-auto w-16 h-16 rounded-3xl bg-slate-800 flex items-center justify-center text-2xl mb-5">
                +
              </div>
              <h2 className="text-2xl font-semibold">Henüz müşteri yok</h2>
              <p className="text-slate-400 mt-2 max-w-xl mx-auto">
                İlk müşterini ekleyerek teklif, tahsilat ve müşteri geçmişini bu hesapta ayrı takip etmeye başlayabilirsin.
              </p>
              <button
                onClick={() => setYeniAcik(true)}
                className="mt-6 rounded-2xl bg-white text-slate-950 px-6 py-3 font-bold hover:bg-slate-200"
              >
                İlk müşteriyi ekle
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {musteriler.map((m) => (
                <div key={m.id} className="p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div>
                    <p className="font-semibold text-lg">
                      {m.firmaAdi || [m.ad, m.soyad].filter(Boolean).join(' ') || 'İsimsiz müşteri'}
                    </p>
                    <p className="text-sm text-slate-400">
                      {[m.telefon, m.email].filter(Boolean).join(' · ') || 'İletişim bilgisi yok'}
                    </p>
                  </div>
                  <div className="text-sm text-slate-400">
                    Açılış bakiyesi: {Number(m.acilisBakiyesi || 0).toLocaleString('tr-TR')} ₺
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {yeniAcik && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={yeniMusteriKaydet} className="w-full max-w-2xl rounded-3xl border border-slate-800 bg-[#08111f] p-6">
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <p className="text-xs tracking-[0.25em] text-slate-500 uppercase">Yeni kayıt</p>
                <h2 className="text-2xl font-semibold mt-1">Yeni Müşteri</h2>
              </div>
              <button type="button" onClick={() => setYeniAcik(false)} className="text-slate-400 hover:text-white text-2xl">×</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input label="Firma adı" value={form.firmaAdi} onChange={(v) => setForm({ ...form, firmaAdi: v })} />
              <Input label="Telefon" value={form.telefon} onChange={(v) => setForm({ ...form, telefon: v })} />
              <Input label="Ad" value={form.ad} onChange={(v) => setForm({ ...form, ad: v })} />
              <Input label="Soyad" value={form.soyad} onChange={(v) => setForm({ ...form, soyad: v })} />
              <Input label="E-posta" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
              <Input label="Açılış bakiyesi" value={form.acilisBakiyesi} onChange={(v) => setForm({ ...form, acilisBakiyesi: v })} />
            </div>

            <select
              value={form.bakiyeTipi}
              onChange={(e) => setForm({ ...form, bakiyeTipi: e.target.value })}
              className="mt-3 w-full rounded-2xl bg-[#030712] border border-slate-700 px-4 py-3 outline-none"
            >
              <option value="borc">Borç</option>
              <option value="alacak">Alacak</option>
            </select>

            <button
              disabled={kaydediliyor}
              className="mt-5 w-full rounded-2xl bg-white text-slate-950 px-5 py-3 font-bold hover:bg-slate-200 disabled:opacity-50"
            >
              {kaydediliyor ? 'Kaydediliyor...' : 'Müşteriyi Kaydet'}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}

function MiniCard({ label, value }: { label: string; value: any }) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-[#08111f] p-5">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="text-2xl font-semibold mt-2">{value}</p>
    </div>
  )
}

function Input({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="text-xs text-slate-400">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-2xl bg-[#030712] border border-slate-700 px-4 py-3 outline-none focus:border-blue-500"
      />
    </label>
  )
}
