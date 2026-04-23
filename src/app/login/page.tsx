'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

function MetricPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 backdrop-blur-sm">
      <p className="text-[10px] uppercase tracking-[0.18em] text-white/45">{label}</p>
      <p className="mt-1.5 text-base font-bold text-white">{value}</p>
    </div>
  )
}

function MockDashboardCard({
  title,
  value,
  tone = 'blue',
}: {
  title: string
  value: string
  tone?: 'blue' | 'emerald' | 'violet' | 'amber'
}) {
  const toneClass = {
    blue: 'from-blue-500/25 to-cyan-500/10 border-blue-400/20',
    emerald: 'from-emerald-500/25 to-teal-500/10 border-emerald-400/20',
    violet: 'from-violet-500/25 to-fuchsia-500/10 border-violet-400/20',
    amber: 'from-amber-500/25 to-orange-500/10 border-amber-400/20',
  }[tone]

  return (
    <div className={`rounded-3xl border bg-gradient-to-br ${toneClass} p-3.5 backdrop-blur-sm`}>
      <p className="text-[10px] uppercase tracking-[0.18em] text-white/45">{title}</p>
      <p className="mt-2 text-xl font-bold text-white">{value}</p>
    </div>
  )
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [form, setForm] = useState({
    email: '',
    password: '',
    beniHatirla: false,
  })
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
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          beniHatirla: form.beniHatirla,
        }),
      })

      const veri = await yanit.json()

      if (yanit.ok) {
        router.push('/dashboard')
      } else {
        setHata(veri.hata || 'Giriş başarısız.')
      }
    } catch {
      setHata('Bağlantı kurulamadı. Lütfen tekrar deneyin.')
    } finally {
      setYukleniyor(false)
    }
  }

  return (
    <div className="relative h-screen overflow-hidden bg-[#07101F]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.22),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(139,92,246,0.22),transparent_28%),linear-gradient(135deg,#07101F_0%,#091327_35%,#0B1020_100%)]" />
      <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-blue-500/15 blur-[110px]" />
      <div className="absolute right-0 top-1/3 h-80 w-80 rounded-full bg-violet-500/15 blur-[120px]" />
      <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-cyan-400/10 blur-[120px]" />

      <div className="relative z-10 mx-auto flex h-screen max-w-[1600px] flex-col lg:flex-row">
        <section className="relative hidden lg:flex lg:w-[58%] lg:flex-col lg:justify-between lg:px-8 lg:pb-8 lg:pt-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.3)]">
              <img
                src="/icon.png"
                alt="Metrix Logo"
                className="h-full w-full object-cover"
              />
            </div>

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/40">
                Metrix Tezgah
              </p>
              <h1 className="mt-1 text-base font-semibold text-white/95">
                Premium Operasyon Platformu
              </h1>
            </div>
          </div>

          <div className="py-6">
            <div className="max-w-2xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-cyan-300/80">
                Teklif • Operasyon • Karlılık
              </p>

              <h2 className="mt-4 text-4xl font-bold leading-[1.02] text-white xl:text-5xl">
                Atölyeni sadece yönetme.
                <span className="mt-2 block bg-gradient-to-r from-blue-400 via-cyan-300 to-violet-400 bg-clip-text text-transparent">
                  Tek ekrandan kontrol et.
                </span>
              </h2>

              <p className="mt-5 max-w-xl text-base leading-7 text-white/60">
                Teklif hacmini, onay oranını, iş programını, ekip performansını ve maliyet motorunu tek merkezde gör.
              </p>

              <div className="mt-6 grid max-w-xl grid-cols-4 gap-3">
                <MetricPill label="Aktif" value="15" />
                <MetricPill label="Onay" value="%26,7" />
                <MetricPill label="Tahsilat" value="₺150K" />
                <MetricPill label="Kontrol" value="Canlı" />
              </div>
            </div>

            <div className="mt-8 max-w-3xl rounded-[28px] border border-white/10 bg-white/5 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.22em] text-white/35">Canlı Önizleme</p>
                  <h3 className="mt-1 text-xl font-bold text-white">Premium Yönetim Paneli</h3>
                </div>

                <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/65">
                  Bugün
                </div>
              </div>

              <div className="grid gap-3 xl:grid-cols-[1.2fr_0.8fr]">
                <div className="rounded-[24px] border border-white/10 bg-[linear-gradient(135deg,rgba(37,99,235,0.28),rgba(124,58,237,0.18),rgba(2,6,23,0.2))] p-4">
                  <p className="text-[10px] uppercase tracking-[0.22em] text-white/45">Premium Genel Bakış</p>
                  <h4 className="mt-3 max-w-lg text-2xl font-bold leading-tight text-white">
                    Satış, kârlılık ve operasyon gücünü tek ekranda yönet.
                  </h4>
                  <p className="mt-3 max-w-md text-sm leading-6 text-white/60">
                    Teklif akışını ve takip baskısını aynı panelde görerek daha hızlı karar al.
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs text-white/85">
                      11 teklif takip bekliyor
                    </span>
                    <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-xs text-emerald-200">
                      4 iş onaylandı
                    </span>
                  </div>
                </div>

                <div className="grid gap-3 grid-cols-2 xl:grid-cols-2">
                  <MockDashboardCard title="Onaylanan" value="₺596K" tone="blue" />
                  <MockDashboardCard title="Kar" value="₺199K" tone="violet" />
                  <MockDashboardCard title="Tahsilat" value="₺150K" tone="emerald" />
                  <MockDashboardCard title="Yoğunluk" value="11 takip" tone="amber" />
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6 text-xs text-white/35">
            <span>Operasyon gücü</span>
            <span className="h-1 w-1 rounded-full bg-white/20" />
            <span>Premium deneyim</span>
            <span className="h-1 w-1 rounded-full bg-white/20" />
            <span>Gerçek zamanlı kontrol</span>
          </div>
        </section>

        <section className="flex w-full items-center justify-center px-5 py-5 lg:w-[42%] lg:px-8 lg:py-6">
          <div className="w-full max-w-[430px]">
            <div className="rounded-[32px] border border-white/10 bg-white/5 p-6 shadow-[0_30px_80px_rgba(0,0,0,0.45)] backdrop-blur-2xl sm:p-7">
              <div className="mx-auto flex h-16 w-16 items-center justify-center overflow-hidden rounded-[22px] border border-white/10 bg-white/10 shadow-[0_16px_40px_rgba(0,0,0,0.35)]">
                <img
                  src="/icon.png"
                  alt="Metrix Logo"
                  className="h-full w-full object-cover"
                />
              </div>

              <div className="mt-5 text-center">
                <h3 className="text-2xl font-bold tracking-tight text-white">Metrix&apos;e Giriş Yap</h3>
                <p className="mt-2 text-sm leading-6 text-white/50">
                  Teklifleri, operasyonu ve ekibini kaldığın yerden yönet.
                </p>
              </div>

              {basari && (
                <div className="mt-5 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-3.5 text-sm text-emerald-300">
                  {basari}
                </div>
              )}

              {hata && (
                <div className="mt-5 rounded-2xl border border-rose-400/20 bg-rose-500/10 p-3.5 text-sm text-rose-300">
                  {hata}
                </div>
              )}

              <form onSubmit={girisYap} className="mt-5 space-y-3.5">
                <div>
                  <label className="mb-2 block text-sm font-medium text-white/70">E-posta</label>
                  <input
                    type="email"
                    required
                    placeholder="ornek@email.com"
                    value={form.email}
                    onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/35 outline-none transition focus:border-blue-400 focus:bg-white/[0.07]"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-white/70">Şifre</label>
                  <input
                    type="password"
                    required
                    placeholder="Şifreniz"
                    value={form.password}
                    onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/35 outline-none transition focus:border-blue-400 focus:bg-white/[0.07]"
                  />
                </div>

                <label className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-2.5 text-sm text-white/60">
                  <input
                    type="checkbox"
                    checked={form.beniHatirla}
                    onChange={(e) => setForm((p) => ({ ...p, beniHatirla: e.target.checked }))}
                    className="h-4 w-4 rounded border-white/20 bg-transparent"
                  />
                  Beni hatırla
                </label>

                <button
                  type="submit"
                  disabled={yukleniyor}
                  className="w-full rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-500 to-violet-600 px-4 py-3 text-base font-semibold text-white shadow-[0_16px_40px_rgba(59,130,246,0.32)] transition hover:scale-[1.01] hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {yukleniyor ? 'Giriş yapılıyor...' : 'Giriş Yap'}
                </button>
              </form>

              <p className="mt-5 text-center text-sm text-white/45">
                Hesabın yok mu?{' '}
                <Link href="/register" className="font-semibold text-blue-300 transition hover:text-blue-200">
                  Kayıt Ol
                </Link>
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

export default function Login() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-[#07101F] text-white">
          Yükleniyor...
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  )
}
