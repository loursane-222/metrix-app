'use client'
import { useEffect, useState } from 'react'

interface Personel {
  id: string
  ad: string
  soyad: string
  gorevi?: string
}

interface PlanData {
  OLCU: string
  IMALAT: string
  MONTAJ: string
}

interface Props {
  is: { id: string; musteriAdi: string; urunAdi?: string } | null
  onClose: () => void
  onSuccess: () => void
}

const FAZ_LABELS: Record<string, string> = {
  OLCU: 'Ölçü',
  IMALAT: 'İmalat',
  MONTAJ: 'Montaj',
}

const FAZ_RENK: Record<string, string> = {
  OLCU: 'blue',
  IMALAT: 'amber',
  MONTAJ: 'emerald',
}

const FAZ_MAX_PERSONEL: Record<string, number> = {
  OLCU: 1,
  IMALAT: 5,
  MONTAJ: 5,
}

function isoToDateInput(iso: string) {
  if (!iso) return ''
  return iso.slice(0, 10)
}

function dateInputToIso(ymd: string) {
  if (!ymd) return ''
  return new Date(ymd + 'T09:00:00').toISOString()
}

function formatTR(iso: string) {
  if (!iso) return '-'
  return new Date(iso).toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

export default function UretimPlaniModal({ is, onClose, onSuccess }: Props) {
  const [adim, setAdim] = useState<'yukleniyor' | 'plan' | 'personel' | 'kaydediliyor' | 'hata'>('yukleniyor')
  const [hata, setHata] = useState('')
  const [plan, setPlan] = useState<PlanData>({ OLCU: '', IMALAT: '', MONTAJ: '' })
  const [reasons, setReasons] = useState<string[]>([])
  const [personeller, setPersoneller] = useState<Personel[]>([])
  const [seciliPersonel, setSeciliPersonel] = useState<Record<string, string[]>>({
    OLCU: [], IMALAT: [], MONTAJ: []
  })
  const [zatenProgram, setZatenProgram] = useState(false)

  useEffect(() => {
    if (!is?.id) return
    setAdim('yukleniyor')
    setHata('')
    setZatenProgram(false)

    // AI öneri al + personel listesi al
    Promise.all([
      fetch('/api/schedule/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isId: is.id }),
      }).then(r => r.json()),
      fetch('/api/personel').then(r => r.json()),
    ]).then(([recData, perData]) => {
      if (recData.error === 'Bu iş zaten programa alınmış') {
        setZatenProgram(true)
        setAdim('hata')
        setHata('Bu iş zaten iş programına alınmış.')
        return
      }
      if (recData.error || !recData.plan) {
        setAdim('hata')
        setHata(recData.error || 'Öneri alınamadı.')
        return
      }
      setPlan({
        OLCU: isoToDateInput(recData.plan.OLCU),
        IMALAT: isoToDateInput(recData.plan.IMALAT),
        MONTAJ: isoToDateInput(recData.plan.MONTAJ),
      })
      setReasons(recData.reasons || [])
      const pList: Personel[] = perData.personeller || []
      setPersoneller(pList)
      setSeciliPersonel({ OLCU: [], IMALAT: [], MONTAJ: [] })
      setAdim('plan')
    }).catch(() => {
      setAdim('hata')
      setHata('Sunucuya bağlanılamadı.')
    })
  }, [is?.id])

  function togglePersonel(faz: string, id: string) {
    setSeciliPersonel(prev => {
      const mevcut = prev[faz] || []
      const max = FAZ_MAX_PERSONEL[faz] || 1
      if (mevcut.includes(id)) {
        return { ...prev, [faz]: mevcut.filter(x => x !== id) }
      }
      if (mevcut.length >= max) {
        return { ...prev, [faz]: [...mevcut.slice(1), id] }
      }
      return { ...prev, [faz]: [...mevcut, id] }
    })
  }

  async function kaydet() {
    if (!is?.id) return
    setAdim('kaydediliyor')

    try {
      // 1. Önce schedule oluştur
      const createRes = await fetch('/api/schedule/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isId: is.id,
          plan: {
            OLCU: dateInputToIso(plan.OLCU),
            IMALAT: dateInputToIso(plan.IMALAT),
            MONTAJ: dateInputToIso(plan.MONTAJ),
          },
        }),
      })
      const createData = await createRes.json()
      if (!createRes.ok || !createData.schedule) {
        setAdim('hata')
        setHata(createData.error || 'Program oluşturulamadı.')
        return
      }

      // 2. Personel atamalarını yap
      const phases = createData.schedule.phases as Array<{ id: string; phase: string }>
      for (const faz of ['OLCU', 'IMALAT', 'MONTAJ']) {
        const phaseObj = phases.find(p => p.phase === faz)
        if (!phaseObj) continue
        const personelIds = seciliPersonel[faz] || []
        for (const personelId of personelIds) {
          await fetch('/api/faz-atama', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ schedulePhaseId: phaseObj.id, personelId }),
          })
        }
      }

      onSuccess()
      onClose()
    } catch {
      setAdim('hata')
      setHata('Kaydetme sırasında hata oluştu.')
    }
  }

  if (!is) return null

  return (
    <div className="fixed inset-0 z-[300] flex items-end md:items-center justify-center bg-black/80 px-0 md:px-4">
      <div
        className="w-full md:max-w-2xl max-h-[92dvh] md:max-h-[90vh] overflow-y-auto bg-[#030712] border border-slate-800 rounded-t-2xl md:rounded-2xl flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Başlık */}
        <div className="sticky top-0 z-10 bg-[#030712] border-b border-slate-800 px-5 pt-5 pb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Üretim Planı</p>
            <h2 className="mt-1 text-lg font-black leading-tight truncate">{is.musteriAdi}</h2>
            {is.urunAdi && <p className="text-sm text-slate-400 truncate">{is.urunAdi}</p>}
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-xl border border-slate-700 bg-[#0B1120] px-4 py-2 text-sm font-bold text-slate-300 hover:bg-slate-800"
          >
            ✕ Geri
          </button>
        </div>

        <div className="flex-1 px-5 py-5 space-y-5">

          {/* YÜKLENİYOR */}
          {adim === 'yukleniyor' && (
            <div className="flex flex-col items-center justify-center gap-4 py-16">
              <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-slate-400 text-sm">AI takvim analiz ediliyor...</p>
            </div>
          )}

          {/* HATA */}
          {adim === 'hata' && (
            <div className="flex flex-col items-center gap-4 py-12 text-center">
              <div className="text-4xl">{zatenProgram ? '📅' : '⚠️'}</div>
              <p className="text-slate-300 font-bold">{hata}</p>
              {zatenProgram && (
                <p className="text-slate-500 text-sm">İş programını görmek için İş Programı sayfasını ziyaret edin.</p>
              )}
              <button onClick={onClose} className="mt-2 rounded-xl border border-slate-700 px-5 py-3 text-sm text-slate-300">Kapat</button>
            </div>
          )}

          {/* KAYDEDİLİYOR */}
          {adim === 'kaydediliyor' && (
            <div className="flex flex-col items-center justify-center gap-4 py-16">
              <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-slate-400 text-sm">Takvime kaydediliyor...</p>
            </div>
          )}

          {/* PLAN ADIMI */}
          {(adim === 'plan' || adim === 'personel') && (
            <>
              {/* AI Açıklaması */}
              {adim === 'plan' && reasons.length > 0 && (
                <div className="rounded-2xl border border-purple-500/20 bg-purple-500/5 p-4">
                  <p className="text-xs uppercase tracking-widest text-purple-400 mb-3 font-bold">🤖 AI Takvim Analizi</p>
                  <ul className="space-y-1.5">
                    {reasons.map((r, i) => (
                      <li key={i} className="text-xs text-slate-400 flex gap-2">
                        <span className="text-purple-500 shrink-0">•</span>
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Tarih Seçimleri */}
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-widest text-slate-500 font-bold">
                  {adim === 'plan' ? 'Tarihleri Onaylayın veya Düzenleyin' : 'Seçilen Tarihler'}
                </p>
                {(['OLCU', 'IMALAT', 'MONTAJ'] as const).map(faz => {
                  const renk = FAZ_RENK[faz]
                  const renkMap: Record<string, string> = {
                    blue: 'border-blue-500/30 bg-blue-500/5',
                    amber: 'border-amber-500/30 bg-amber-500/5',
                    emerald: 'border-emerald-500/30 bg-emerald-500/5',
                  }
                  const textMap: Record<string, string> = {
                    blue: 'text-blue-400',
                    amber: 'text-amber-400',
                    emerald: 'text-emerald-400',
                  }
                  return (
                    <div key={faz} className={`rounded-2xl border p-4 ${renkMap[renk]}`}>
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <p className={`text-sm font-bold ${textMap[renk]}`}>{FAZ_LABELS[faz]}</p>
                        {adim === 'personel' && (
                          <p className="text-xs text-slate-500">{formatTR(plan[faz] ? plan[faz] + 'T09:00:00' : '')}</p>
                        )}
                      </div>
                      {adim === 'plan' ? (
                        <input
                          type="date"
                          value={plan[faz]}
                          onChange={e => setPlan(prev => ({ ...prev, [faz]: e.target.value }))}
                          className="w-full rounded-xl border border-slate-700 bg-[#0B1120] px-4 py-3 text-white text-sm outline-none focus:border-slate-500"
                        />
                      ) : (
                        <p className="text-sm text-slate-300 font-semibold">
                          {plan[faz] ? formatTR(plan[faz] + 'T09:00:00') : '-'}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* PERSONEL ATAMASteps */}
              {adim === 'personel' && (
                <div className="space-y-4">
                  <p className="text-xs uppercase tracking-widest text-slate-500 font-bold">Personel Ataması</p>
                  {(['OLCU', 'IMALAT', 'MONTAJ'] as const).map(faz => {
                    const max = FAZ_MAX_PERSONEL[faz]
                    const secili = seciliPersonel[faz] || []
                    const renk = FAZ_RENK[faz]
                    const textMap: Record<string, string> = {
                      blue: 'text-blue-400',
                      amber: 'text-amber-400',
                      emerald: 'text-emerald-400',
                    }
                    return (
                      <div key={faz} className="rounded-2xl border border-slate-800 bg-[#0B1120] p-4">
                        <div className="flex items-center justify-between mb-3">
                          <p className={`text-sm font-bold ${textMap[renk]}`}>{FAZ_LABELS[faz]}</p>
                          <p className="text-xs text-slate-500">{secili.length}/{max} kişi seçili</p>
                        </div>
                        {personeller.length === 0 && (
                          <p className="text-xs text-slate-600">Personel bulunamadı</p>
                        )}
                        <div className="grid grid-cols-2 gap-2">
                          {personeller.map(p => {
                            const isSecili = secili.includes(p.id)
                            return (
                              <button
                                key={p.id}
                                onClick={() => togglePersonel(faz, p.id)}
                                className={`rounded-xl border px-3 py-2.5 text-left text-xs transition ${
                                  isSecili
                                    ? 'border-purple-500/40 bg-purple-500/10 text-purple-300'
                                    : 'border-slate-700 bg-[#111827] text-slate-400 hover:border-slate-600'
                                }`}
                              >
                                <p className="font-semibold truncate">{p.ad} {p.soyad}</p>
                                {p.gorevi && <p className="text-slate-500 text-[10px] truncate mt-0.5">{p.gorevi}</p>}
                              </button>
                            )
                          })}
                        </div>
                        {secili.length > 0 && (
                          <p className="mt-2 text-[10px] text-slate-600">
                            Seçili: {secili.map(id => {
                              const p = personeller.find(x => x.id === id)
                              return p ? `${p.ad} ${p.soyad}` : id
                            }).join(', ')}
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* Alt Butonlar */}
        {(adim === 'plan' || adim === 'personel') && (
          <div className="sticky bottom-0 bg-[#030712] border-t border-slate-800 px-5 py-4 flex gap-3">
            {adim === 'plan' ? (
              <>
                <button
                  onClick={onClose}
                  className="flex-1 rounded-2xl border border-slate-700 py-4 text-sm font-bold text-slate-300 hover:bg-slate-800"
                >
                  ← Geri Dön
                </button>
                <button
                  onClick={() => setAdim('personel')}
                  disabled={!plan.OLCU || !plan.IMALAT || !plan.MONTAJ}
                  className="flex-1 rounded-2xl bg-purple-600 py-4 text-sm font-bold text-white hover:bg-purple-500 disabled:opacity-40"
                >
                  Personel Ata →
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setAdim('plan')}
                  className="flex-1 rounded-2xl border border-slate-700 py-4 text-sm font-bold text-slate-300 hover:bg-slate-800"
                >
                  ← Geri
                </button>
                <button
                  onClick={kaydet}
                  className="flex-1 rounded-2xl bg-emerald-600 py-4 text-sm font-bold text-white hover:bg-emerald-500"
                >
                  ✓ Takvime Kaydet
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
