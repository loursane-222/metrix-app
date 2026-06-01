'use client'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getPurchasablePlanDetails } from '@/lib/subscription/plans'

type Step = 'form' | 'verify'

export default function RegisterPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('form')
  const [form, setForm] = useState({ ad: '', email: '', password: '', passwordTekrar: '' })
  const [code, setCode] = useState('')
  const [hata, setHata] = useState('')
  const [yukleniyor, setYukleniyor] = useState(false)
  const [kullanimOnay, setKullanimOnay] = useState(false)
  const [kvkkOnay, setKvkkOnay] = useState(false)
  const [modal, setModal] = useState<null | 'kullanim' | 'kvkk'>(null)
  const plans = useMemo(() => getPurchasablePlanDetails(), [])

  function guncelle(field: string, value: string) {
    setForm(p => ({ ...p, [field]: value }))
  }

  async function kodGonder(e: React.FormEvent) {
    e.preventDefault()
    setHata('')
    if (form.password !== form.passwordTekrar) return setHata('Şifreler eşleşmiyor.')
    if (form.password.length < 6) return setHata('Şifre en az 6 karakter olmalı.')
    if (!kullanimOnay || !kvkkOnay) return setHata('Kullanım koşullarını ve KVKK metnini onaylamanız gerekiyor.')
    setYukleniyor(true)
    try {
      const res = await fetch('/api/auth/send-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email }),
      })
      const data = await res.json()
      if (!res.ok) { setHata(data.hata || 'Hata oluştu'); return; }
      setStep('verify')
    } catch { setHata('Bağlantı hatası') }
    finally { setYukleniyor(false) }
  }

  async function kayitOl(e: React.FormEvent) {
    e.preventDefault()
    setHata('')
    if (!code || code.length !== 6) return setHata('6 haneli kodu girin.')
    setYukleniyor(true)
    try {
      const verRes = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, code }),
      })
      const verData = await verRes.json()
      if (!verRes.ok) { setHata(verData.hata || 'Kod hatalı.'); return; }

      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (res.ok) { router.push('/login?kayit=basarili') }
      else { setHata(data.hata || 'Hata oluştu') }
    } catch { setHata('Bağlantı hatası') }
    finally { setYukleniyor(false) }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#07101F] flex items-center justify-center py-8 px-4">
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={() => setModal(null)}>
          <div className="w-full max-w-2xl rounded-[28px] border border-white/10 bg-[#111827]/95 p-6 text-white shadow-[0_30px_80px_rgba(0,0,0,0.5)]" onClick={e => e.stopPropagation()}>
            <div className="mb-4 flex items-start justify-between gap-4">
              <h2 className="text-2xl font-bold">{modal === 'kullanim' ? 'Kullanım Koşulları' : 'KVKK Aydınlatma Metni'}</h2>
              <button type="button" onClick={() => setModal(null)} className="rounded-xl border border-white/10 px-3 py-2 text-white/60 hover:bg-white/10">✕</button>
            </div>
            <div className="max-h-[55vh] overflow-y-auto rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm leading-7 text-white/70">
              {modal === 'kullanim' ? (
                <div>
                  <p className="font-semibold text-white">METRIX ATÖLYE YÖNETİM SİSTEMİ KULLANIM KOŞULLARI</p>
                  <p className="mt-3">Metrix, tezgah atölyeleri için maliyet hesaplama, teklif yönetimi ve operasyon takibi hizmeti sunar.</p>
                  <p className="mt-3">Kullanıcı, kayıt sırasında doğru bilgi vermeyi ve hesap güvenliğinden sorumlu olduğunu kabul eder.</p>
                  <p className="mt-3">Kayıt sonrası 14 gün ücretsiz deneme hakkı tanınır. Deneme sonunda abonelik koşulları geçerlidir.</p>
                  <p className="mt-3">Sisteme girilen verilerin doğruluğundan kullanıcı sorumludur.</p>
                </div>
              ) : (
                <div>
                  <p className="font-semibold text-white">KVKK AYDINLATMA METNİ</p>
                  <p className="mt-3">İşlenen veriler: ad-soyad/firma adı, e-posta adresi ve sisteme girilen operasyon/maliyet verileridir.</p>
                  <p className="mt-3">Veriler hesap oluşturma, abonelik yönetimi ve teknik destek için işlenir.</p>
                  <p className="mt-3">Veriler yasal zorunluluklar dışında üçüncü kişilerle paylaşılmaz.</p>
                  <p className="mt-3">KVKK kapsamındaki haklarınız için sistem yöneticisine başvurabilirsiniz.</p>
                </div>
              )}
            </div>
            <button type="button" onClick={() => { if (modal === 'kullanim') setKullanimOnay(true); if (modal === 'kvkk') setKvkkOnay(true); setModal(null); }} className="mt-5 w-full rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-3 font-semibold text-white">Okudum, Onaylıyorum</button>
          </div>
        </div>
      )}

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.22),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(139,92,246,0.22),transparent_28%)]" />
      <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-blue-500/15 blur-[110px]" />
      <div className="absolute right-0 top-1/3 h-80 w-80 rounded-full bg-violet-500/15 blur-[120px]" />

      <div className="relative z-10 grid w-full max-w-6xl gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(360px,420px)] lg:items-start">
        <section className="rounded-[32px] border border-white/10 bg-white/[0.045] p-6 text-white backdrop-blur-2xl shadow-[0_30px_80px_rgba(0,0,0,0.35)] sm:p-7">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-300">Metrix2 Demo</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">14 gün ücretsiz dene</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
            Demo süresince tüm özellikler açıktır. 14 gün sonunda Basic, Pro veya Business paketlerinden sana uygun olanla devam edebilirsin.
          </p>

          <div className="mt-5 grid grid-cols-1 gap-3 xl:grid-cols-3">
            {plans.map((plan) => (
              <article key={plan.plan} className="flex min-h-[390px] flex-col rounded-3xl border border-white/10 bg-slate-950/35 p-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{plan.shortLabel}</p>
                  <h2 className="mt-2 text-xl font-black text-white">{plan.label}</h2>
                  <p className="mt-3 text-2xl font-black text-white">{plan.price}</p>
                  {plan.priceNote && <p className="mt-1 text-xs font-semibold text-slate-400">{plan.priceNote}</p>}
                </div>

                <div className="mt-4 flex-1 space-y-2">
                  {plan.features.map((feature) => (
                    <div key={feature.title} className="flex items-start gap-2 rounded-2xl border border-white/10 bg-white/[0.035] p-2.5">
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-300" />
                      <p className="text-xs font-semibold leading-5 text-white">{feature.title}</p>
                    </div>
                  ))}
                </div>

                {plan.checkoutUrl && (
                  <a
                    href={plan.checkoutUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 inline-flex min-h-[42px] items-center justify-center rounded-2xl border border-white/10 bg-white text-sm font-bold text-slate-950 transition hover:bg-blue-100"
                  >
                    Paketi incele
                  </a>
                )}
              </article>
            ))}
          </div>
        </section>

      <div className="w-full rounded-[32px] border border-white/10 bg-white/5 p-7 backdrop-blur-2xl shadow-[0_30px_80px_rgba(0,0,0,0.45)]">
        <div className="mx-auto w-16 h-16 rounded-2xl overflow-hidden border border-white/10 mb-5 flex items-center justify-center bg-white/10">
          <img src="/icon.png" className="w-full h-full object-cover" alt="Metrix" />
        </div>

        {step === 'form' ? (
          <>
            <h2 className="text-2xl font-bold text-white text-center">Hesap Oluştur</h2>
            <p className="text-center text-white/50 text-sm mt-2 mb-5">14 gün ücretsiz deneme ile başla</p>
            {hata && <div className="mb-4 text-sm text-red-400 bg-red-500/10 border border-red-500/20 p-3 rounded-xl">{hata}</div>}
            <form onSubmit={kodGonder} className="space-y-3">
              <input placeholder="Firma / Atölye adı" value={form.ad} onChange={e => guncelle('ad', e.target.value)} required className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 focus:border-blue-500 outline-none transition" />
              <input type="email" placeholder="Gerçek e-posta adresiniz" value={form.email} onChange={e => guncelle('email', e.target.value)} required className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 focus:border-blue-500 outline-none transition" />
              <input type="password" placeholder="Şifre (en az 6 karakter)" value={form.password} onChange={e => guncelle('password', e.target.value)} required className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 focus:border-blue-500 outline-none transition" />
              <input type="password" placeholder="Şifre tekrar" value={form.passwordTekrar} onChange={e => guncelle('passwordTekrar', e.target.value)} required className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 focus:border-blue-500 outline-none transition" />
              <div className="space-y-2 pt-1">
                <label className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/60 cursor-pointer">
                  <input type="checkbox" checked={kullanimOnay} onChange={e => setKullanimOnay(e.target.checked)} className="mt-1 h-4 w-4 shrink-0" />
                  <span><button type="button" onClick={() => setModal('kullanim')} className="font-semibold text-blue-300 hover:text-blue-200">Kullanım Koşullarını</button> okudum ve kabul ediyorum.</span>
                </label>
                <label className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/60 cursor-pointer">
                  <input type="checkbox" checked={kvkkOnay} onChange={e => setKvkkOnay(e.target.checked)} className="mt-1 h-4 w-4 shrink-0" />
                  <span><button type="button" onClick={() => setModal('kvkk')} className="font-semibold text-blue-300 hover:text-blue-200">KVKK Aydınlatma Metnini</button> okudum ve onaylıyorum.</span>
                </label>
              </div>
              <button type="submit" disabled={yukleniyor} className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold mt-3 disabled:opacity-60 transition hover:opacity-90">
                {yukleniyor ? 'Kod gönderiliyor...' : '14 gün ücretsiz başla'}
              </button>
            </form>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-white text-center">E-postanı Doğrula</h2>
            <p className="text-center text-white/50 text-sm mt-2 mb-2">
              <span className="text-blue-300 font-semibold">{form.email}</span>
            </p>
            <p className="text-center text-white/40 text-xs mb-6">adresine 6 haneli kod gönderdik. Spam kutusunu da kontrol edin.</p>
            {hata && <div className="mb-4 text-sm text-red-400 bg-red-500/10 border border-red-500/20 p-3 rounded-xl">{hata}</div>}
            <form onSubmit={kayitOl} className="space-y-4">
              <input
                type="text"
                inputMode="numeric"
                placeholder="_ _ _ _ _ _"
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
                required
                autoFocus
                className="w-full px-4 py-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/20 focus:border-blue-500 outline-none text-center text-3xl font-black tracking-[0.5em] transition"
              />
              <button type="submit" disabled={yukleniyor || code.length !== 6} className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold disabled:opacity-50 transition">
                {yukleniyor ? 'Hesap oluşturuluyor...' : '14 gün ücretsiz başla'}
              </button>
              <div className="flex items-center justify-between">
                <button type="button" onClick={() => { setStep('form'); setHata(''); setCode(''); }} className="text-sm text-white/40 hover:text-white/60 transition">
                  ← Geri dön
                </button>
                <button type="button" onClick={async () => {
                  setHata(''); setCode('');
                  const res = await fetch('/api/auth/send-verification', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: form.email }) });
                  if (res.ok) alert('Kod tekrar gönderildi.'); else setHata('Gönderilemedi.');
                }} className="text-sm text-blue-400 hover:text-blue-300 transition">
                  Kodu tekrar gönder
                </button>
              </div>
            </form>
          </>
        )}

        <p className="mt-6 text-center text-sm text-white/50">
          Zaten hesabın var mı? <Link href="/login" className="text-blue-400 hover:text-blue-300">Giriş Yap</Link>
        </p>
      </div>
      </div>
    </div>
  )
}
