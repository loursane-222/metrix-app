'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AbonelikPage() {
  const router = useRouter()
  const [secili, setSecili] = useState<'core' | 'pro' | null>(null)
  const [abonelikBitis, setAbonelikBitis] = useState<string | null>(null)
  const [demoBitti, setDemoBitti] = useState(false)

  useEffect(() => {
    fetch('/api/auth/current-user').then(r => r.json()).then(d => {
      if (d.abonelikBitis) {
        setAbonelikBitis(d.abonelikBitis)
        const bitis = new Date(d.abonelikBitis)
        setDemoBitti(bitis < new Date() && d.abonelikPlani === 'demo' || !d.abonelikBitis)
      }
    })
  }, [])

  return (
    <main className="min-h-screen bg-[#030712] text-white flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-3xl">

        <div className="text-center mb-10">
          <p className="text-xs uppercase tracking-[0.3em] text-emerald-300/80 mb-3">Metrix</p>
          {demoBitti ? (
            <>
              <h1 className="text-3xl font-black">Demo süreniz doldu</h1>
              <p className="mt-3 text-slate-400 text-sm max-w-md mx-auto">
                Devam edebilmek için lütfen paketinizi seçin ve ödeme yapın.
              </p>
            </>
          ) : (
            <>
              <h1 className="text-3xl font-black">Paketinizi Seçin</h1>
              <p className="mt-3 text-slate-400 text-sm max-w-md mx-auto">
                İhtiyacınıza uygun planı seçin ve Metrix'i tam kapasite kullanmaya başlayın.
              </p>
            </>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-5">

          {/* Core Plan */}
          <button
            onClick={() => setSecili('core')}
            className={`rounded-3xl border p-6 text-left transition-all ${secili === 'core' ? 'border-emerald-400/60 bg-emerald-400/10 ring-1 ring-emerald-400/30' : 'border-white/10 bg-white/[0.04] hover:bg-white/[0.07]'}`}>
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <p className="text-xs uppercase tracking-widest text-slate-400 mb-1">Core Plan</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black">₺1.490</span>
                  <span className="text-slate-400 text-sm">/ ay</span>
                </div>
              </div>
              <div className={`w-6 h-6 rounded-full border-2 shrink-0 mt-1 flex items-center justify-center ${secili === 'core' ? 'border-emerald-400 bg-emerald-400' : 'border-white/20'}`}>
                {secili === 'core' && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>
            </div>
            <div className="space-y-2.5">
              {['Sınırsız teklif', 'WhatsApp takip', 'Sıcak teklif sistemi', 'Temel AI'].map(f => (
                <div key={f} className="flex items-center gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  </div>
                  <span className="text-sm text-slate-300">{f}</span>
                </div>
              ))}
            </div>
          </button>

          {/* Pro Plan */}
          <button
            onClick={() => setSecili('pro')}
            className={`rounded-3xl border p-6 text-left transition-all relative overflow-hidden ${secili === 'pro' ? 'border-purple-400/60 bg-purple-400/10 ring-1 ring-purple-400/30' : 'border-purple-500/20 bg-gradient-to-br from-purple-500/10 to-blue-500/5 hover:from-purple-500/15'}`}>
            <div className="absolute top-4 right-14 bg-purple-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">Premium</div>
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <p className="text-xs uppercase tracking-widest text-purple-300/80 mb-1">Pro Plan</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black">₺2.990</span>
                  <span className="text-slate-400 text-sm">/ ay</span>
                </div>
              </div>
              <div className={`w-6 h-6 rounded-full border-2 shrink-0 mt-1 flex items-center justify-center ${secili === 'pro' ? 'border-purple-400 bg-purple-400' : 'border-white/20'}`}>
                {secili === 'pro' && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>
            </div>
            <div className="space-y-2.5">
              {['AI ölçü → teklif', 'Plaka planlayıcı', 'Satış tahminleri', 'Otomatik takip mesajları'].map(f => (
                <div key={f} className="flex items-center gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-purple-500/20 border border-purple-500/40 flex items-center justify-center shrink-0">
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                  </div>
                  <span className="text-sm text-slate-300">{f}</span>
                </div>
              ))}
            </div>
            <p className="mt-4 text-[11px] text-purple-300/60">Core Plan'ın tüm özellikleri dahil</p>
          </button>
        </div>

        {secili && (
          <div className="mt-6 rounded-3xl border border-white/10 bg-white/[0.04] p-5">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-sm text-slate-400">Seçilen plan</p>
                <p className="text-lg font-bold mt-0.5">{secili === 'core' ? 'Core Plan — ₺1.490/ay' : 'Pro Plan — ₺2.990/ay'}</p>
              </div>
              <button
                onClick={() => {
                  alert('Ödeme sistemi yakında aktif olacak. Lütfen info@metrix.app adresine yazın.')
                }}
                className={`rounded-2xl px-6 py-3 font-bold text-sm ${secili === 'pro' ? 'bg-purple-500 hover:bg-purple-400' : 'bg-emerald-500 hover:bg-emerald-400'} text-white transition`}>
                Ödemeye Geç →
              </button>
            </div>
          </div>
        )}

        <p className="text-center text-xs text-slate-600 mt-8">
          Sorularınız için{' '}
          <a href="mailto:info@metrix.app" className="text-slate-400 hover:text-white transition">info@metrix.app</a>
        </p>
      </div>
    </main>
  )
}
