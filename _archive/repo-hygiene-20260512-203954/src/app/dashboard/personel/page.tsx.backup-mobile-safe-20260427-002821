'use client'

import { useEffect, useMemo, useState } from 'react'

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

type Yetki = {
  personelId?: string
  isProgramiGorebilir: boolean
  isProgramiDuzenleyebilir: boolean
  imalatTamamlayabilir: boolean
  maliyetGorebilir: boolean
  musteriGorebilir: boolean
  teklifOlusturabilir: boolean
  atolyeAyarGorebilir: boolean
}

const GOREVLER = ['Patron', 'Usta', 'Kalfa', 'Çırak', 'Ustabaşı', 'Kesimci', 'Montajcı', 'Ölçücü', 'Mimar', 'Satış', 'Muhasebe', 'Yardımcı', 'Şoför', 'Ofis', 'Diğer']

const BOS_YETKI: Yetki = {
  isProgramiGorebilir: true,
  isProgramiDuzenleyebilir: false,
  imalatTamamlayabilir: false,
  maliyetGorebilir: false,
  musteriGorebilir: false,
  teklifOlusturabilir: false,
  atolyeAyarGorebilir: false,
}

function cls(...v: any[]) {
  return v.filter(Boolean).join(' ')
}

function oran(a: number, b: number) {
  if (!b) return 0
  return Math.round((a / b) * 100)
}

function performansEtiket(not: number | null) {
  if (not === null) return 'Veri Yok'
  if (not >= 80) return 'Yüksek Performans'
  if (not >= 60) return 'Gelişebilir'
  return 'Riskli'
}

function performansTone(not: number | null) {
  if (not === null) return 'border-slate-700 bg-slate-800/40 text-slate-300'
  if (not >= 80) return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
  if (not >= 60) return 'border-amber-500/30 bg-amber-500/10 text-amber-300'
  return 'border-red-500/30 bg-red-500/10 text-red-300'
}

export default function PersonelSayfasi() {
  const [personeller, setPersoneller] = useState<Personel[]>([])
  const [aktif, setAktif] = useState<Personel | null>(null)
  const [arama, setArama] = useState('')
  const [rol, setRol] = useState('Tümü')
  const [formAcik, setFormAcik] = useState(false)
  const [duzenleId, setDuzenleId] = useState<string | null>(null)
  const [kaydediliyor, setKaydediliyor] = useState(false)
  const [yetki, setYetki] = useState<Yetki>(BOS_YETKI)
  const [yetkiKaydediliyor, setYetkiKaydediliyor] = useState(false)

  const [form, setForm] = useState({
    ad: '',
    soyad: '',
    gorevi: GOREVLER[0],
    bagliOlduguId: '',
    calismaYili: '',
    telefon: '',
    email: '',    password: '',
  })

  useEffect(() => {
    yukle()
  }, [])

  useEffect(() => {
    if (aktif?.id) yetkiYukle(aktif.id)
  }, [aktif?.id])

  async function yukle(secilecekId?: string) {
    const res = await fetch('/api/personel', { credentials: 'include', cache: 'no-store' })

    if (res.status === 401) {
      alert('Oturum süren dolmuş. Lütfen tekrar giriş yap.')
      window.location.href = '/login'
      return
    }

    const json = await res.json()
    const liste = Array.isArray(json.personeller) ? json.personeller : []

    setPersoneller(liste)

    if (secilecekId) {
      setAktif(liste.find((p: Personel) => p.id === secilecekId) || liste[0] || null)
    } else {
      setAktif((prev) => prev ? liste.find((p: Personel) => p.id === prev.id) || liste[0] || null : liste[0] || null)
    }
  }

  async function yetkiYukle(personelId: string) {
    const res = await fetch(`/api/personel-yetki?personelId=${personelId}`, { cache: 'no-store' })
    const json = await res.json()
    setYetki(json.yetki || { ...BOS_YETKI, personelId })
  }

  async function yetkiKaydet() {
    if (!aktif) return

    setYetkiKaydediliyor(true)
    try {
      const res = await fetch('/api/personel-yetki', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...yetki, personelId: aktif.id }),
      })

      const json = await res.json()
      if (!res.ok) {
        alert(json.hata || 'Yetki kaydedilemedi.')
        return
      }

      setYetki(json.yetki || yetki)
    } finally {
      setYetkiKaydediliyor(false)
    }
  }

  function formAc(p?: Personel) {
    if (p) {
      setDuzenleId(p.id)
      setForm({
        ad: p.ad || '',
        soyad: p.soyad || '',
        gorevi: p.gorevi || GOREVLER[0],
        bagliOlduguId: p.bagliOldugu?.id || '',
        calismaYili: String(p.calismaYili ?? 0),
        telefon: p.telefon || '',
        email: p.email || '',    password: '',
      })
    } else {
      setDuzenleId(null)
      setForm({
        ad: '',
        soyad: '',
        gorevi: GOREVLER[0],
        bagliOlduguId: '',
        calismaYili: '',
        telefon: '',
        email: '',    password: '',
      })
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
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const json = await res.json()

      if (!res.ok) {
        alert(json.hata || 'Personel kaydedilemedi.')
        return
      }

      setFormAcik(false)
      await yukle(json.personel?.id || duzenleId || undefined)
    } finally {
      setKaydediliyor(false)
    }
  }

  const filtreli = useMemo(() => {
    const q = arama.trim().toLocaleLowerCase('tr-TR')

    return personeller.filter((p) => {
      const rolOk = rol === 'Tümü' || p.gorevi === rol
      const qOk = !q || [p.ad, p.soyad, p.gorevi, p.telefon, p.email].filter(Boolean).join(' ').toLocaleLowerCase('tr-TR').includes(q)
      return rolOk && qOk
    })
  }, [personeller, arama, rol])

  const ozet = useMemo(() => {
    const aktifSayi = personeller.filter(p => p.aktif).length
    const toplamGorev = personeller.reduce((a, p) => a + (p.toplamGorev || 0), 0)
    const tamamlanan = personeller.reduce((a, p) => a + (p.tamamlananGorev || 0), 0)
    const skorlar = personeller.map(p => p.performansNotu).filter((x): x is number => x !== null)
    const ortalama = skorlar.length ? Math.round(skorlar.reduce((a, b) => a + b, 0) / skorlar.length) : 0

    return { aktifSayi, toplamGorev, tamamlanan, ortalama }
  }, [personeller])

  const ayinElemani = useMemo(() => {
    if (!personeller.length) return null

    const scored = personeller.map((p) => {
      const toplam = p.toplamGorev || 0
      const tamam = p.tamamlananGorev || 0
      const zamaninda = p.zamanindaTamamlanan || 0
      const tamamlama = toplam ? tamam / toplam : 0
      const zaman = tamam ? zamaninda / tamam : 0
      const performans = (p.performansNotu || 0) / 100
      const hacim = Math.min(1, toplam / 20)
      const score = tamamlama * 0.4 + zaman * 0.3 + performans * 0.2 + hacim * 0.1
      return { ...p, superScore: score }
    })

    scored.sort((a, b) => b.superScore - a.superScore)
    return scored[0]
  }, [personeller])

  const aktifOran = aktif ? oran(aktif.tamamlananGorev || 0, aktif.toplamGorev || 0) : 0
  const aktifZamaninda = aktif ? oran(aktif.zamanindaTamamlanan || 0, aktif.tamamlananGorev || 0) : 0

  return (
    <div className="h-screen overflow-hidden bg-[#030712] p-3 text-white">
      <div className="grid h-full grid-cols-[310px_minmax(0,1fr)_310px] gap-3">

        <aside className="flex flex-col overflow-hidden rounded-3xl border border-slate-800 bg-[#0B1120] p-4">
          <p className="text-xs tracking-[0.25em] text-slate-500 uppercase">Ekip Radarı</p>
          <h1 className="mt-2 text-2xl font-semibold">Personel</h1>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <Mini label="Aktif" value={ozet.aktifSayi} />
            <Mini label="Skor" value={`%${ozet.ortalama}`} tone="text-emerald-300" />
            <Mini label="Görev" value={ozet.toplamGorev} tone="text-blue-300" />
            <Mini label="Tamam" value={ozet.tamamlanan} tone="text-violet-300" />
          </div>

          <input
            value={arama}
            onChange={(e) => setArama(e.target.value)}
            placeholder="Ara..."
            className="mt-4 h-11 rounded-xl border border-slate-700 bg-[#111827] px-4 text-sm outline-none focus:border-blue-500"
          />

          <select
            value={rol}
            onChange={(e) => setRol(e.target.value)}
            className="mt-2 h-11 rounded-xl border border-slate-700 bg-[#111827] px-4 text-sm outline-none focus:border-blue-500"
          >
            <option>Tümü</option>
            {GOREVLER.map(g => <option key={g}>{g}</option>)}
          </select>

          <div className="mt-3 flex-1 space-y-2 overflow-y-auto pr-1">
            {filtreli.map((p) => (
              <button
                key={p.id}
                onClick={() => setAktif(p)}
                className={cls(
                  'w-full rounded-2xl border p-3 text-left transition',
                  aktif?.id === p.id ? 'border-blue-500/50 bg-blue-500/10' : 'border-slate-800 bg-[#111827] hover:bg-slate-800'
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{p.ad} {p.soyad}</p>
                    <p className="mt-1 text-xs text-slate-400">{p.gorevi} · {p.toplamGorev || 0} görev</p>
                  </div>

                  <span className={cls('rounded-full border px-2 py-1 text-[10px]', performansTone(p.performansNotu))}>
                    {p.performansNotu === null ? '-' : `%${p.performansNotu}`}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </aside>

        <main className="overflow-hidden rounded-3xl border border-slate-800 bg-[#0B1120] p-5">
          {!aktif ? (
            <div className="flex h-full items-center justify-center text-slate-500">Personel yok.</div>
          ) : (
            <div className="flex h-full flex-col">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs tracking-[0.25em] text-slate-500 uppercase">Seçili Personel</p>
                  <h2 className="mt-2 text-3xl font-semibold">{aktif.ad} {aktif.soyad}</h2>
                  <p className="mt-1 text-sm text-slate-400">
                    {aktif.gorevi} · {aktif.calismaYili || 0} yıl kıdem
                  </p>
                </div>

                <span className={cls('rounded-full border px-4 py-2 text-sm font-semibold', performansTone(aktif.performansNotu))}>
                  {performansEtiket(aktif.performansNotu)}
                </span>
              </div>

              <div className="mt-5 grid grid-cols-4 gap-3">
                <Kpi label="Performans" value={aktif.performansNotu === null ? '-' : `%${aktif.performansNotu}`} tone="text-emerald-300" />
                <Kpi label="Tamamlama" value={`%${aktifOran}`} tone="text-blue-300" />
                <Kpi label="Zamanında" value={`%${aktifZamaninda}`} tone="text-violet-300" />
                <Kpi label="Toplam Görev" value={aktif.toplamGorev || 0} />
              </div>

              <div className="mt-5 grid grid-cols-[1fr_0.82fr] gap-4">
                <section className="rounded-3xl border border-slate-800 bg-[#111827] p-5">
                  <p className="text-sm text-slate-400">Performans Paneli</p>

                  <div className="mt-5 space-y-5">
                    <Bar label="Tamamlama Oranı" value={aktifOran} />
                    <Bar label="Zamanında Tamamlama" value={aktifZamaninda} />
                    <Bar label="Genel Performans" value={aktif.performansNotu || 0} />
                  </div>

                  <div className="mt-6 grid gap-2">
                    <Small label="Tamamlanan" value={aktif.tamamlananGorev || 0} />
                    <Small label="Zamanında" value={aktif.zamanindaTamamlanan || 0} />
                    <Small label="Aktif / Açık" value={Math.max(0, (aktif.toplamGorev || 0) - (aktif.tamamlananGorev || 0))} />
                  </div>
                </section>

                <section className="rounded-3xl border border-slate-800 bg-[#111827] p-5">
                  <p className="text-sm text-slate-400">Bağlılık & İletişim</p>

                  <div className="mt-4 space-y-3">
                    <Info label="Telefon" value={aktif.telefon || '-'} />
                    <Info label="E-posta" value={aktif.email || '-'} />
                    <Info label="Bağlı Olduğu" value={aktif.bagliOldugu ? `${aktif.bagliOldugu.ad} ${aktif.bagliOldugu.soyad}` : 'Bağımsız'} />
                  </div>
                </section>
              </div>

              <section className="mt-4 flex-1 rounded-3xl border border-slate-800 bg-[#111827] p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-slate-400">Operasyon Yorumu</p>
                  <p className="text-xs text-slate-500">Görev verisine göre</p>
                </div>

                <p className="mt-4 text-lg font-semibold">
                  {(aktif.performansNotu || 0) >= 80
                    ? 'Bu personel güvenilir ve yüksek performanslı. Kritik görevlere atanabilir.'
                    : (aktif.performansNotu || 0) >= 60
                    ? 'Performans kabul edilebilir. Gecikme ve görev hacmi takip edilmeli.'
                    : aktif.performansNotu === null
                    ? 'Henüz yeterli görev verisi yok. Performans için birkaç atama sonrası değerlendirme yapılmalı.'
                    : 'Riskli performans. Görev atamaları ve sorumluluk seviyesi yeniden değerlendirilmeli.'}
                </p>
              </section>
            </div>
          )}
        </main>

        <aside className="flex flex-col overflow-hidden rounded-3xl border border-slate-800 bg-[#0B1120] p-4">
          <p className="text-xs tracking-[0.25em] text-slate-500 uppercase">Kontrol Paneli</p>
          <h2 className="mt-2 text-xl font-semibold">Yetki & Aksiyon</h2>

          {ayinElemani && (
            <div className="mt-4 rounded-3xl border border-amber-500/30 bg-amber-500/10 p-4">
              <p className="text-xs tracking-[0.18em] text-amber-300 uppercase">Ayın Elemanı</p>
              <p className="mt-2 text-lg font-semibold">{ayinElemani.ad} {ayinElemani.soyad}</p>
              <p className="text-xs text-slate-400">{ayinElemani.gorevi} · %{ayinElemani.performansNotu || 0}</p>
            </div>
          )}

          <div className="mt-4 flex-1 overflow-y-auto pr-1">
            <div className="space-y-2">
              <Toggle label="İş programı görebilir" value={yetki.isProgramiGorebilir} onChange={v => setYetki({ ...yetki, isProgramiGorebilir: v })} />
              <Toggle label="İş programı düzenleyebilir" value={yetki.isProgramiDuzenleyebilir} onChange={v => setYetki({ ...yetki, isProgramiDuzenleyebilir: v })} />
              <Toggle label="İmalat tamamlayabilir" value={yetki.imalatTamamlayabilir} onChange={v => setYetki({ ...yetki, imalatTamamlayabilir: v })} />
              <Toggle label="Maliyet görebilir" value={yetki.maliyetGorebilir} onChange={v => setYetki({ ...yetki, maliyetGorebilir: v })} />
              <Toggle label="Müşteri görebilir" value={yetki.musteriGorebilir} onChange={v => setYetki({ ...yetki, musteriGorebilir: v })} />
              <Toggle label="Teklif oluşturabilir" value={yetki.teklifOlusturabilir} onChange={v => setYetki({ ...yetki, teklifOlusturabilir: v })} />
              <Toggle label="Atölye ayarı görebilir" value={yetki.atolyeAyarGorebilir} onChange={v => setYetki({ ...yetki, atolyeAyarGorebilir: v })} />
            </div>
          </div>

          <div className="mt-4 grid gap-2">
            <button
              onClick={yetkiKaydet}
              disabled={yetkiKaydediliyor || !aktif}
              className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold hover:bg-emerald-500 disabled:bg-slate-700"
            >
              {yetkiKaydediliyor ? 'Kaydediliyor...' : 'Yetkileri Kaydet'}
            </button>

            <button
              onClick={() => aktif && formAc(aktif)}
              disabled={!aktif}
              className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold hover:bg-blue-500 disabled:bg-slate-700"
            >
              Personeli Düzenle
            </button>

            <button
              onClick={() => formAc()}
              className="rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold hover:bg-violet-500"
            >
              + Personel Ekle
            </button>
          </div>
        </aside>
      </div>

      {formAcik && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 p-4" onClick={() => setFormAcik(false)}>
          <div className="w-full max-w-2xl rounded-3xl border border-slate-800 bg-[#0B1120] p-6 text-white shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-xs tracking-[0.22em] text-slate-500 uppercase">Personel</p>
                <h2 className="mt-1 text-xl font-semibold">{duzenleId ? 'Personel Düzenle' : 'Yeni Personel'}</h2>
              </div>
              <button onClick={() => setFormAcik(false)} className="rounded-xl border border-slate-700 px-3 py-2 text-sm text-slate-300">Kapat</button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input label="Ad" value={form.ad} onChange={v => setForm({ ...form, ad: v })} />
              <Input label="Soyad" value={form.soyad} onChange={v => setForm({ ...form, soyad: v })} />

              <label>
                <p className="mb-1 text-xs text-slate-400">Görevi</p>
                <select value={form.gorevi} onChange={e => setForm({ ...form, gorevi: e.target.value })} className="h-10 w-full rounded-xl border border-slate-700 bg-[#111827] px-3 text-sm">
                  {GOREVLER.map(g => <option key={g}>{g}</option>)}
                </select>
              </label>

              <label>
                <p className="mb-1 text-xs text-slate-400">Bağlı Olduğu</p>
                <select value={form.bagliOlduguId} onChange={e => setForm({ ...form, bagliOlduguId: e.target.value })} className="h-10 w-full rounded-xl border border-slate-700 bg-[#111827] px-3 text-sm">
                  <option value="">Bağımsız</option>
                  {personeller.filter(p => p.id !== duzenleId).map(p => (
                    <option key={p.id} value={p.id}>{p.ad} {p.soyad}</option>
                  ))}
                </select>
              </label>

              <Input label="Çalışma Yılı" value={form.calismaYili} onChange={v => setForm({ ...form, calismaYili: v })} />
              <Input label="Telefon" value={form.telefon} onChange={v => setForm({ ...form, telefon: v })} />
              <Input label="E-posta" value={form.email} onChange={v => setForm({ ...form, email: v })} />
              <Input
                label={duzenleId ? "Yeni Şifre / boş bırakılırsa değişmez" : "Giriş Şifresi"}
                value={form.password}
                onChange={v => setForm({ ...form, password: v })}
              />
            </div>

            <button
              onClick={kaydet}
              disabled={kaydediliyor}
              className="mt-5 w-full rounded-xl bg-emerald-600 py-3 font-semibold hover:bg-emerald-500 disabled:bg-slate-700"
            >
              {kaydediliyor ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function Input({ label, value, onChange }: any) {
  return (
    <label>
      <p className="mb-1 text-xs text-slate-400">{label}</p>
      <input value={value} onChange={e => onChange(e.target.value)} className="h-10 w-full rounded-xl border border-slate-700 bg-[#111827] px-3 text-sm outline-none focus:border-blue-500" />
    </label>
  )
}

function Mini({ label, value, tone = 'text-white' }: any) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-[#111827] p-3">
      <p className="text-[10px] tracking-[0.16em] text-slate-500 uppercase">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${tone}`}>{value}</p>
    </div>
  )
}

function Kpi({ label, value, tone = 'text-white' }: any) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-[#111827] p-4">
      <p className="text-xs text-slate-400">{label}</p>
      <p className={`mt-2 text-xl font-semibold ${tone}`}>{value}</p>
    </div>
  )
}

function Small({ label, value }: any) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-[#0B1120] px-4 py-3">
      <p className="min-w-0 truncate text-xs text-slate-400">{label}</p>
      <p className="shrink-0 text-xl font-semibold tabular-nums">{value}</p>
    </div>
  )
}

function Info({ label, value }: any) {
  return (
    <div className="rounded-2xl bg-[#0B1120] p-4">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-2 truncate font-semibold">{value}</p>
    </div>
  )
}

function Bar({ label, value }: any) {
  const safe = Math.max(0, Math.min(100, Number(value || 0)))
  return (
    <div>
      <div className="mb-2 flex justify-between text-xs">
        <span className="text-slate-400">{label}</span>
        <span className="text-slate-300">%{safe}</span>
      </div>
      <div className="h-2 rounded-full bg-slate-800">
        <div className="h-full rounded-full bg-blue-500" style={{ width: `${safe}%` }} />
      </div>
    </div>
  )
}

function Toggle({ label, value, onChange }: any) {
  return (
    <button onClick={() => onChange(!value)} className="flex w-full items-center justify-between rounded-2xl border border-slate-800 bg-[#111827] p-3 text-left">
      <span className="text-sm text-slate-300">{label}</span>
      <span className={cls('h-6 w-11 rounded-full p-1 transition', value ? 'bg-emerald-600' : 'bg-slate-700')}>
        <span className={cls('block h-4 w-4 rounded-full bg-white transition', value ? 'translate-x-5' : 'translate-x-0')} />
      </span>
    </button>
  )
}
