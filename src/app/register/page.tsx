'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function RegisterPage() {
  const router = useRouter()

  const [form, setForm] = useState({
    ad: '',
    email: '',
    password: '',
    passwordTekrar: '',
  })

  const [hata, setHata] = useState('')
  const [yukleniyor, setYukleniyor] = useState(false)
  const [kullanimOnay, setKullanimOnay] = useState(false)
  const [kvkkOnay, setKvkkOnay] = useState(false)
  const [modal, setModal] = useState<null | 'kullanim' | 'kvkk'>(null)

  function guncelle(field: string, value: string) {
    setForm(p => ({ ...p, [field]: value }))
  }

  async function kayitOl(e: React.FormEvent) {
    e.preventDefault()
    setHata('')

    if (form.password !== form.passwordTekrar) {
      setHata('Şifreler eşleşmiyor.')
      return
    }

    if (!kullanimOnay || !kvkkOnay) {
      setHata('Kullanım koşullarını ve KVKK metnini onaylamanız gerekmektedir.')
      return
    }

    setYukleniyor(true)

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      const data = await res.json()

      if (res.ok) {
        router.push('/login?kayit=basarili')
      } else {
        setHata(data.hata || 'Hata oluştu')
      }
    } catch {
      setHata('Bağlantı hatası')
    } finally {
      setYukleniyor(false)
    }
  }

  return (
    <div className="relative h-screen overflow-hidden bg-[#07101F] flex items-center justify-center">

      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setModal(null)}
        >
          <div
            className="w-full max-w-2xl rounded-[28px] border border-white/10 bg-[#111827]/95 p-6 text-white shadow-[0_30px_80px_rgba(0,0,0,0.5)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-white/40">
                  Yasal Onay
                </p>
                <h2 className="mt-2 text-2xl font-bold">
                  {modal === 'kullanim' ? 'Kullanım Koşulları' : 'KVKK Aydınlatma Metni'}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setModal(null)}
                className="rounded-xl border border-white/10 px-3 py-2 text-white/60 hover:bg-white/10"
              >
                ✕
              </button>
            </div>

            <div className="max-h-[55vh] overflow-y-auto rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm leading-7 text-white/70">
              {modal === 'kullanim' ? (
                <div>
                  <p className="font-semibold text-white">METRIX ATÖLYE YÖNETİM SİSTEMİ KULLANIM KOŞULLARI</p>
                  <p className="mt-3">Metrix, tezgah atölyeleri için maliyet hesaplama, teklif yönetimi ve operasyon takibi hizmeti sunar.</p>
                  <p className="mt-3">Kullanıcı, kayıt sırasında doğru bilgi vermeyi ve hesap güvenliğinden sorumlu olduğunu kabul eder.</p>
                  <p className="mt-3">Kayıt sonrası 30 gün ücretsiz deneme hakkı tanınır. Deneme sonunda abonelik koşulları geçerlidir.</p>
                  <p className="mt-3">Sisteme girilen verilerin doğruluğundan kullanıcı sorumludur. Hesaplama sonuçları bilgi amaçlıdır.</p>
                </div>
              ) : (
                <div>
                  <p className="font-semibold text-white">KVKK AYDINLATMA METNİ</p>
                  <p className="mt-3">İşlenen veriler: ad-soyad/firma adı, e-posta adresi ve sisteme girilen operasyon/maliyet verileridir.</p>
                  <p className="mt-3">Veriler hesap oluşturma, abonelik yönetimi, teknik destek ve yasal yükümlülükler için işlenir.</p>
                  <p className="mt-3">Veriler yasal zorunluluklar dışında üçüncü kişilerle paylaşılmaz.</p>
                  <p className="mt-3">KVKK kapsamındaki haklarınız için sistem yöneticisine başvurabilirsiniz.</p>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                if (modal === 'kullanim') setKullanimOnay(true)
                if (modal === 'kvkk') setKvkkOnay(true)
                setModal(null)
              }}
              className="mt-5 w-full rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-3 font-semibold text-white"
            >
              Okudum, Onaylıyorum
            </button>
          </div>
        </div>
      )}

      {/* BG EFFECT */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.22),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(139,92,246,0.22),transparent_28%),linear-gradient(135deg,#07101F_0%,#091327_35%,#0B1020_100%)]" />

      {/* CARD */}
      <div className="relative z-10 w-full max-w-md p-7 rounded-[32px] border border-white/10 bg-white/5 backdrop-blur-2xl shadow-[0_30px_80px_rgba(0,0,0,0.45)]">

        {/* LOGO */}
        <div className="mx-auto w-16 h-16 rounded-2xl overflow-hidden border border-white/10 mb-5">
          <img src="/icon.png" className="w-full h-full object-cover" />
        </div>

        <h2 className="text-2xl font-bold text-white text-center">
          Hesap Oluştur
        </h2>

        <p className="text-center text-white/50 text-sm mt-2 mb-5">
          30 gün ücretsiz deneme ile başla
        </p>

        {hata && (
          <div className="mb-4 text-sm text-red-400 bg-red-500/10 border border-red-500/20 p-3 rounded-xl">
            {hata}
          </div>
        )}

        <form onSubmit={kayitOl} className="space-y-3">

          <input
            placeholder="Firma / Atölye adı"
            value={form.ad}
            onChange={e => guncelle('ad', e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 focus:border-blue-500 outline-none"
          />

          <input
            type="email"
            placeholder="E-posta"
            value={form.email}
            onChange={e => guncelle('email', e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 focus:border-blue-500 outline-none"
          />

          <input
            type="password"
            placeholder="Şifre"
            value={form.password}
            onChange={e => guncelle('password', e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 focus:border-blue-500 outline-none"
          />

          <input
            type="password"
            placeholder="Şifre tekrar"
            value={form.passwordTekrar}
            onChange={e => guncelle('passwordTekrar', e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 focus:border-blue-500 outline-none"
          />

          <div className="space-y-2 pt-1">
            <label className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/60">
              <input
                type="checkbox"
                checked={kullanimOnay}
                onChange={(e) => setKullanimOnay(e.target.checked)}
                className="mt-1 h-4 w-4 shrink-0"
              />
              <span>
                <button
                  type="button"
                  onClick={() => setModal('kullanim')}
                  className="font-semibold text-blue-300 hover:text-blue-200"
                >
                  Kullanım Koşullarını
                </button>{' '}
                okudum ve kabul ediyorum.
              </span>
            </label>

            <label className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/60">
              <input
                type="checkbox"
                checked={kvkkOnay}
                onChange={(e) => setKvkkOnay(e.target.checked)}
                className="mt-1 h-4 w-4 shrink-0"
              />
              <span>
                <button
                  type="button"
                  onClick={() => setModal('kvkk')}
                  className="font-semibold text-blue-300 hover:text-blue-200"
                >
                  KVKK Aydınlatma Metnini
                </button>{' '}
                okudum ve onaylıyorum.
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={yukleniyor}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold mt-3 disabled:opacity-60"
          >
            {yukleniyor ? 'Kaydediliyor...' : 'Kayıt Ol'}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-white/50">
          Zaten hesabın var mı?{" "}
          <Link href="/login" className="text-blue-400">
            Giriş Yap
          </Link>
        </p>

      </div>
    </div>
  )
}
