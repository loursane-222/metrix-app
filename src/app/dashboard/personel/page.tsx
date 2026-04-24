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

const GOREVLER = ['Patron', 'Usta', 'Kalfa', 'Çırak', 'Ustabaşı', 'Kesimci', 'Montajcı', 'Ölçücü', 'Mimar', 'Satış', 'Muhasebe', 'Yardımcı', 'Şoför', 'Ofis', 'Diğer']

function cls(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const isNumeric = props.type === 'number'
  return (
    <input
      {...props}
      type={isNumeric ? 'text' : props.type}
      inputMode={isNumeric ? 'numeric' : props.inputMode}
      onWheel={(e) => {
        ;(e.currentTarget as HTMLInputElement).blur()
        props.onWheel?.(e)
      }}
      className={cls(
        'w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white',
        props.className
      )}
    />
  )
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cls(
        'w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white',
        props.className
      )}
    />
  )
}

function Field({
  label,
  children,
  hint,
}: {
  label: string
  children: React.ReactNode
  hint?: string
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-700">{label}</label>
      {children}
      {hint && <p className="mt-1 hidden text-xs text-slate-500 sm:block">{hint}</p>}
    </div>
  )
}

function StatCard({
  label,
  value,
  sub,
  tone = 'slate',
}: {
  label: string
  value: string
  sub?: string
  tone?: 'slate' | 'blue' | 'emerald' | 'violet'
}) {
  const tones = {
    slate: 'border-slate-200 bg-white text-slate-900',
    blue: 'border-blue-200 bg-blue-50 text-blue-700',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    violet: 'border-violet-200 bg-violet-50 text-violet-700',
  }
  return (
    <div className={cls('rounded-3xl border p-5 shadow-[0_10px_30px_rgba(15,23,42,0.06)]', tones[tone])}>
      <p className="text-sm font-medium opacity-80">{label}</p>
      <p className="mt-3 text-3xl font-bold">{value}</p>
      {sub && <p className="mt-2 text-xs opacity-80">{sub}</p>}
    </div>
  )
}

function performansRenk(not: number | null) {
  if (not === null) return 'text-slate-400'
  if (not >= 80) return 'text-emerald-600'
  if (not >= 60) return 'text-amber-600'
  return 'text-rose-600'
}

function performansBadge(not: number | null) {
  if (not === null) return 'border-slate-200 bg-slate-50 text-slate-500'
  if (not >= 80) return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  if (not >= 60) return 'border-amber-200 bg-amber-50 text-amber-700'
  return 'border-rose-200 bg-rose-50 text-rose-700'
}

function performansEtiket(not: number | null) {
  if (not === null) return 'Veri yok'
  if (not >= 80) return 'Yüksek performans'
  if (not >= 60) return 'Gelişebilir'
  return 'Riskli'
}

export default function PersonelSayfasi() {
  const [personeller, setPersoneller] = useState<Personel[]>([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const [formAcik, setFormAcik] = useState(false)
  const [duzenleId, setDuzenleId] = useState<string | null>(null)
  const [kaydediliyor, setKaydediliyor] = useState(false)
  const [arama, setArama] = useState('')

  const [form, setForm] = useState({
    ad: '',
    soyad: '',
    gorevi: GOREVLER[0],
    bagliOlduguId: '',
    calismaYili: '',
    telefon: '',
    email: '',
  })

  useEffect(() => {
    yukle()
  }, [])

  async function yukle() {
    setYukleniyor(true)

    try {
      const res = await fetch('/api/personel', {
        credentials: 'include',
        cache: 'no-store',
      })

      if (!res.ok) {
        if (res.status === 401) {
          alert('Oturum süren dolmuş veya giriş yapılmamış. Lütfen tekrar giriş yap.')
          window.location.href = '/login'
          return
        }

        let hataMesaji = 'Personel verileri alınamadı.'
        try {
          const hataVerisi = await res.json()
          if (hataVerisi?.hata) hataMesaji = hataVerisi.hata
        } catch {}

        throw new Error(hataMesaji)
      }

      const v = await res.json()
      setPersoneller(Array.isArray(v.personeller) ? v.personeller : [])
    } catch (err) {
      console.error('PERSONEL SAYFASI HATASI:', err)
      alert('Personel sayfası yüklenirken hata oluştu.')
      setPersoneller([])
    } finally {
      setYukleniyor(false)
    }
  }

  function formAc(p?: Personel) {
    if (p) {
      setDuzenleId(p.id)
      setForm({
        ad: p.ad,
        soyad: p.soyad,
        gorevi: p.gorevi,
        bagliOlduguId: p.bagliOldugu?.id || '',
        calismaYili: String(p.calismaYili ?? 0),
        telefon: p.telefon || '',
        email: p.email || '',
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
        email: '',
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

      const v = await res.json()

      if (!res.ok) {
        if (res.status === 401) {
          alert('Oturum süren dolmuş. Lütfen tekrar giriş yap.')
          window.location.href = '/login'
          return
        }

        alert(v?.hata || 'Kayıt sırasında hata oluştu.')
        return
      }

      if (v.hata) {
        alert(v.hata)
        return
      }

      setFormAcik(false)
      await yukle()
    } catch (err) {
      console.error('PERSONEL KAYDETME HATASI:', err)
      alert('Kayıt sırasında beklenmeyen bir hata oluştu.')
    } finally {
      setKaydediliyor(false)
    }
  }

  const filtreliPersoneller = useMemo(() => {
    const q = arama.trim().toLocaleLowerCase('tr-TR')
    if (!q) return personeller

    return personeller.filter((p) => {
      const metin = [
        p.ad,
        p.soyad,
        p.gorevi,
        p.telefon,
        p.email,
        p.bagliOldugu?.ad,
        p.bagliOldugu?.soyad,
      ]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase('tr-TR')

      return metin.includes(q)
    })
  }, [personeller, arama])

  const ekipOzeti = useMemo(() => {
    const aktif = personeller.filter((p) => p.aktif).length
    const skorlar = personeller
      .map((p) => p.performansNotu)
      .filter((n): n is number => n !== null)

    const ortalamaSkor = skorlar.length
      ? Math.round(skorlar.reduce((a, b) => a + b, 0) / skorlar.length)
      : 0

    const toplamGorev = personeller.reduce((acc, p) => acc + (p.toplamGorev || 0), 0)

    const tamamlanan = personeller.reduce((acc, p) => acc + (p.tamamlananGorev || 0), 0)

    return {
      aktif,
      ortalamaSkor,
      toplamGorev,
      tamamlanan,
    }
  }, [personeller])

  const ayinElemani = useMemo(() => {
    if (!personeller.length) return null

    const scored = personeller.map((p) => {
      const toplam = p.toplamGorev || 0
      const tamam = p.tamamlananGorev || 0
      const zamaninda = p.zamanindaTamamlanan || 0

      const tamamlamaOrani = toplam > 0 ? tamam / toplam : 0
      const zamanindaOrani = tamam > 0 ? zamaninda / tamam : 0
      const performans = (p.performansNotu || 0) / 100
      const hacim = Math.min(1, toplam / 20)

      const skor = tamamlamaOrani * 0.4 + zamanindaOrani * 0.3 + performans * 0.2 + hacim * 0.1
      return { ...p, superScore: skor }
    })

    scored.sort((a, b) => b.superScore - a.superScore)
    return scored[0]
  }, [personeller])

  const gorevDagilimi = useMemo(() => {
    const map = new Map<string, number>()
    personeller.forEach((p) => {
      map.set(p.gorevi, (map.get(p.gorevi) || 0) + 1)
    })
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1])
  }, [personeller])

  if (yukleniyor) {
    return <div className="p-8 text-slate-500">Yükleniyor...</div>
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl border border-slate-200 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
        <div className="relative bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.35),_transparent_35%),radial-gradient(circle_at_top_right,_rgba(124,58,237,0.35),_transparent_35%),linear-gradient(135deg,#0f172a_0%,#111827_45%,#1e1b4b_100%)] p-7 text-white">
          <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 h-32 w-32 rounded-full bg-cyan-400/10 blur-3xl" />

          <div className="relative z-10 grid gap-6 xl:grid-cols-[1.25fr_0.95fr]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-300">
                Ekip Yönetimi
              </p>
              <h1 className="mt-3 max-w-2xl text-3xl font-bold tracking-tight lg:text-4xl">
                Personel Kontrol Merkezi
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300">
                Ekip yapını, görev performansını ve bağlı çalışan ilişkilerini tek ekranda yönet. Bu ekran, iş programı atamalarının insan tarafını görünür kılar.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <span className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium">
                  Aktif ekip: {ekipOzeti.aktif}
                </span>
                <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-sm font-medium text-emerald-200">
                  Tamamlanan görev: {ekipOzeti.tamamlanan}
                </span>
                <span className="rounded-full border border-violet-400/20 bg-violet-400/10 px-4 py-2 text-sm font-medium text-violet-200">
                  Ortalama skor: %{ekipOzeti.ortalamaSkor}
                </span>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/10 p-5 backdrop-blur-sm">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-300">Ayın Elemanı</p>

              {ayinElemani ? (
                <>
                  <div className="mt-4 flex items-center gap-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/15 text-2xl font-bold text-white">
                      {ayinElemani.ad?.[0]}
                      {ayinElemani.soyad?.[0]}
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-xl font-bold">
                        {ayinElemani.ad} {ayinElemani.soyad}
                      </p>
                      <p className="mt-1 text-sm text-slate-300">{ayinElemani.gorevi}</p>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-3 gap-3">
                    <div className="rounded-2xl border border-white/10 bg-white/10 p-3 text-center">
                      <p className="text-[11px] uppercase tracking-[0.12em] text-slate-300">Skor</p>
                      <p className="mt-2 text-lg font-bold">%{ayinElemani.performansNotu || 0}</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/10 p-3 text-center">
                      <p className="text-[11px] uppercase tracking-[0.12em] text-slate-300">Görev</p>
                      <p className="mt-2 text-lg font-bold">{ayinElemani.toplamGorev || 0}</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/10 p-3 text-center">
                      <p className="text-[11px] uppercase tracking-[0.12em] text-slate-300">Tamam</p>
                      <p className="mt-2 text-lg font-bold">{ayinElemani.tamamlananGorev || 0}</p>
                    </div>
                  </div>

                  <p className="mt-4 text-sm text-slate-300">
                    Yüksek tamamlama oranı ve zamanında iş kapatma başarısı ile bu ay öne çıktı.
                  </p>
                </>
              ) : (
                <p className="mt-4 text-sm text-slate-300">Henüz veri yok.</p>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Toplam Personel"
          value={String(ekipOzeti.aktif)}
          sub={`${personeller.length}/50 kapasite`}
          tone="blue"
        />
        <StatCard
          label="Ortalama Performans"
          value={`%${ekipOzeti.ortalamaSkor}`}
          sub="Aktif skor ortalaması"
          tone="emerald"
        />
        <StatCard
          label="Toplam Görev"
          value={String(ekipOzeti.toplamGorev)}
          sub="Ekipteki iş yükü"
          tone="violet"
        />
        <StatCard
          label="Rol Çeşitliliği"
          value={String(gorevDagilimi.length)}
          sub="Farklı görev tipi"
          tone="slate"
        />
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Ekip Listesi</h3>
            <p className="mt-1 text-sm text-slate-500">Personelleri filtrele, sırala ve düzenle.</p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              value={arama}
              onChange={(e) => setArama(e.target.value)}
              placeholder="Ad, görev, telefon veya e-posta ara..."
              className="min-w-[260px]"
            />

            <button
              type="button"
              onClick={() => formAc()}
              className="rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(59,130,246,0.22)] transition hover:scale-[1.01]"
            >
              + Personel Ekle
            </button>
          </div>
        </div>
      </section>

      {filtreliPersoneller.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-16 text-center text-slate-500 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
          {personeller.length === 0 ? 'Henüz personel kaydı yok.' : 'Aramana uygun personel bulunamadı.'}
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {filtreliPersoneller.map((p, idx) => {
            const zamanindaOran =
              (p.tamamlananGorev || 0) > 0
                ? Math.round(((p.zamanindaTamamlanan || 0) / (p.tamamlananGorev || 1)) * 100)
                : 0

            return (
              <div
                key={p.id}
                className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.06)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 gap-4">
                    <div
                      className={cls(
                        'flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-bold',
                        idx === 0 && 'bg-yellow-100 text-yellow-700',
                        idx === 1 && 'bg-slate-100 text-slate-700',
                        idx > 1 && 'bg-blue-50 text-blue-700'
                      )}
                    >
                      {idx + 1}
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="truncate text-xl font-bold text-slate-900">
                          {p.ad} {p.soyad}
                        </h4>

                        <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                          {p.gorevi}
                        </span>

                        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-500">
                          {p.calismaYili} yıl kıdem
                        </span>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-500">
                        {p.telefon && <span>📞 {p.telefon}</span>}
                        {p.email && <span>✉ {p.email}</span>}
                        {p.bagliOldugu && (
                          <span>
                            👤 {p.bagliOldugu.ad} {p.bagliOldugu.soyad}&apos;e bağlı
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => formAc(p)}
                    className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
                  >
                    Düzenle
                  </button>
                </div>

                <div className="mt-4 grid grid-cols-4 gap-2">
                  <div className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50 p-2.5 sm:p-4">
                    <p className="truncate text-[9px] uppercase tracking-[0.10em] text-slate-400 sm:text-[11px] sm:tracking-[0.12em]">Performans</p>
                    <p className={cls('mt-1 text-lg font-bold sm:mt-2 sm:text-2xl', performansRenk(p.performansNotu))}>
                      {p.performansNotu !== null ? `%${p.performansNotu}` : '—'}
                    </p>
                    <p className={cls('mt-1 hidden rounded-full border px-2.5 py-1 text-[11px] font-semibold sm:inline-flex', performansBadge(p.performansNotu))}>
                      {performansEtiket(p.performansNotu)}
                    </p>
                  </div>

                  <div className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50 p-2.5 sm:p-4">
                    <p className="truncate text-[9px] uppercase tracking-[0.10em] text-slate-400 sm:text-[11px] sm:tracking-[0.12em]">Toplam Görev</p>
                    <p className="mt-1 text-lg font-bold text-slate-900 sm:mt-2 sm:text-2xl">{p.toplamGorev || 0}</p>
                    <p className="mt-1 hidden text-xs text-slate-500 sm:block">Aktif yük ve geçmiş atamalar</p>
                  </div>

                  <div className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50 p-2.5 sm:p-4">
                    <p className="truncate text-[9px] uppercase tracking-[0.10em] text-slate-400 sm:text-[11px] sm:tracking-[0.12em]">Tamamlanan</p>
                    <p className="mt-1 text-lg font-bold text-emerald-600 sm:mt-2 sm:text-2xl">{p.tamamlananGorev || 0}</p>
                    <p className="mt-1 hidden text-xs text-slate-500 sm:block">Kapanan görev sayısı</p>
                  </div>

                  <div className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50 p-2.5 sm:p-4">
                    <p className="truncate text-[9px] uppercase tracking-[0.10em] text-slate-400 sm:text-[11px] sm:tracking-[0.12em]">Zamanında</p>
                    <p className="mt-1 text-lg font-bold text-violet-600 sm:mt-2 sm:text-2xl">%{zamanindaOran}</p>
                    <p className="mt-1 hidden text-xs text-slate-500 sm:block">Termin disiplini</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {formAcik && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm"
          onClick={() => setFormAcik(false)}
        >
          <div
            className="w-full max-w-2xl rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_30px_80px_rgba(15,23,42,0.24)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-500">Ekip Yönetimi</p>
                <h3 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
                  {duzenleId ? 'Personel Düzenle' : 'Yeni Personel'}
                </h3>
                <p className="mt-2 text-sm text-slate-500">
                  Personel kartı, görev rolü ve organizasyon ilişkisini burada tanımlarsın.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setFormAcik(false)}
                className="rounded-2xl border border-slate-200 px-3 py-2 text-slate-400 transition hover:bg-slate-50 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <Field label="Ad">
                <Input
                  value={form.ad}
                  onChange={(e) => setForm((p) => ({ ...p, ad: e.target.value }))}
                  placeholder="Ad"
                />
              </Field>

              <Field label="Soyad">
                <Input
                  value={form.soyad}
                  onChange={(e) => setForm((p) => ({ ...p, soyad: e.target.value }))}
                  placeholder="Soyad"
                />
              </Field>

              <Field label="Görevi">
                <Select
                  value={form.gorevi}
                  onChange={(e) => setForm((p) => ({ ...p, gorevi: e.target.value }))}
                >
                  {GOREVLER.map((g) => (
                    <option key={g}>{g}</option>
                  ))}
                </Select>
              </Field>

              <Field label="Kıdem (çalışma yılı)">
                <Input
                  type="number"
                  value={form.calismaYili}
                  onChange={(e) => setForm((p) => ({ ...p, calismaYili: e.target.value }))}
                  placeholder="0"
                />
              </Field>

              <Field label="Telefon">
                <Input
                  value={form.telefon}
                  onChange={(e) => setForm((p) => ({ ...p, telefon: e.target.value }))}
                  placeholder="05xx..."
                />
              </Field>

              <Field label="E-posta">
                <Input
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  placeholder="ornek@firma.com"
                />
              </Field>

              <div className="md:col-span-2">
                <Field label="Kime Bağlı" hint="Bağımsız çalışanlar için boş bırakabilirsin.">
                  <Select
                    value={form.bagliOlduguId}
                    onChange={(e) => setForm((p) => ({ ...p, bagliOlduguId: e.target.value }))}
                  >
                    <option value="">— Bağımsız —</option>
                    {personeller
                      .filter((p) => p.id !== duzenleId)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.ad} {p.soyad} ({p.gorevi})
                        </option>
                      ))}
                  </Select>
                </Field>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => setFormAcik(false)}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                İptal
              </button>

              <button
                type="button"
                onClick={kaydet}
                disabled={kaydediliyor || !form.ad || !form.soyad}
                className="rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(59,130,246,0.22)] transition hover:scale-[1.01] disabled:opacity-60"
              >
                {kaydediliyor ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
