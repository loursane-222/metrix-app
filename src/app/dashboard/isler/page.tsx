'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { paraGoster } from '@/lib/format'

type Is = {
  id: string
  musteriAdi: string
  urunAdi: string
  malzemeTipi: string
  musteriTipi: string
  metrajMtul: number
  tezgahArasiMtul: number
  adaTezgahMtul: number
  toplamMaliyet: number
  satisFiyati: number
  mtulSatisFiyati: number
  karYuzdesi: number
  durum: string
  createdAt: string
  isTarihi?: string
  tasDurumu?: string
  tahsilat?: number
  notlar?: string
}

const durumMap: Record<string, { label: string; className: string }> = {
  teklif_verildi: {
    label: 'Bekliyor',
    className: 'bg-amber-50 text-amber-700 border border-amber-200',
  },
  onaylandi: {
    label: 'Onaylandı',
    className: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  },
  kaybedildi: {
    label: 'Kaybedildi',
    className: 'bg-rose-50 text-rose-700 border border-rose-200',
  },
}

const tasDurumuMap: Record<string, { label: string; className: string }> = {
  stokta: {
    label: 'Taş Stokta',
    className: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  },
  alinacak: {
    label: 'Taş Alınacak',
    className: 'bg-orange-50 text-orange-700 border border-orange-200',
  },
}

function toplamMetrajHesapla(is: Is) {
  return (
    (Number(is.metrajMtul) || 0) +
    (Number(is.tezgahArasiMtul) || 0) +
    (Number(is.adaTezgahMtul) || 0)
  )
}

function tarihGoster(tarih?: string) {
  if (!tarih) return '—'
  return new Date(tarih).toLocaleDateString('tr-TR')
}

function cls(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

export default function IsListesi() {
  const router = useRouter()

  const [isler, setIsler] = useState<Is[]>([])
  const [yukleniyor, setYukleniyor] = useState(true)

  const [sirala, setSirala] = useState<'yeni' | 'eski' | 'tarih'>('yeni')
  const [filtre, setFiltre] = useState<'hepsi' | 'onaylandi' | 'bekliyor'>('hepsi')
  const [arama, setArama] = useState('')

  const [popupIs, setPopupIs] = useState<Is | null>(null)
  const [tasDurumu, setTasDurumu] = useState<'stokta' | 'alinacak' | ''>('')
  const [tahsilat, setTahsilat] = useState('')
  const [popupKaydediliyor, setPopupKaydediliyor] = useState(false)

  useEffect(() => {
    fetch('/api/isler')
      .then((r) => r.json())
      .then((v) => {
        if (v.isler) setIsler(v.isler)
      })
      .finally(() => setYukleniyor(false))
  }, [])

  async function durumGuncelle(id: string, yeniDurum: string, mevcutIs: Is) {
    if (yeniDurum === 'onaylandi') {
      setTasDurumu((mevcutIs.tasDurumu as 'stokta' | 'alinacak') || '')
      setTahsilat(mevcutIs.tahsilat ? String(mevcutIs.tahsilat) : '')
      setPopupIs(mevcutIs)
      return
    }

    await fetch('/api/isler/durum', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, durum: yeniDurum }),
    })

    setIsler((prev) =>
      prev.map((is) => (is.id === id ? { ...is, durum: yeniDurum } : is))
    )
  }

  async function popupKaydet() {
    if (!popupIs) return

    setPopupKaydediliyor(true)

    await fetch('/api/isler/durum', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: popupIs.id,
        durum: 'onaylandi',
        tasDurumu,
        tahsilat: parseFloat(tahsilat) || 0,
      }),
    })

    setIsler((prev) =>
      prev.map((is) =>
        is.id === popupIs.id
          ? {
              ...is,
              durum: 'onaylandi',
              tasDurumu,
              tahsilat: parseFloat(tahsilat) || 0,
            }
          : is
      )
    )

    setPopupKaydediliyor(false)
    setPopupIs(null)
  }

  const filtrelenmis = useMemo(() => {
    const aranan = arama.trim().toLocaleLowerCase('tr-TR')

    return [...isler]
      .filter((is) => {
        if (filtre === 'onaylandi') return is.durum === 'onaylandi'
        if (filtre === 'bekliyor') return is.durum === 'teklif_verildi'
        return true
      })
      .filter((is) => {
        if (!aranan) return true

        const alanlar = [
          is.musteriAdi,
          is.urunAdi,
          is.malzemeTipi,
          is.musteriTipi,
          is.notlar || '',
        ]
          .join(' ')
          .toLocaleLowerCase('tr-TR')

        return alanlar.includes(aranan)
      })
      .sort((a, b) => {
        if (sirala === 'tarih') {
          return (
            (b.isTarihi ? new Date(b.isTarihi).getTime() : 0) -
            (a.isTarihi ? new Date(a.isTarihi).getTime() : 0)
          )
        }
        if (sirala === 'eski') {
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      })
  }, [arama, filtre, isler, sirala])

  const ozet = useMemo(() => {
    const toplam = isler.length
    const onaylanan = isler.filter((i) => i.durum === 'onaylandi').length
    const bekleyen = isler.filter((i) => i.durum === 'teklif_verildi').length
    const kaybedilen = isler.filter((i) => i.durum === 'kaybedildi').length

    return { toplam, onaylanan, bekleyen, kaybedilen }
  }, [isler])

  if (yukleniyor) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-slate-500 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
        İşler yükleniyor...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl border border-slate-200 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
        <div className="relative bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.35),_transparent_35%),radial-gradient(circle_at_top_right,_rgba(124,58,237,0.35),_transparent_35%),linear-gradient(135deg,#0f172a_0%,#111827_45%,#1e1b4b_100%)] p-7 text-white">
          <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 h-32 w-32 rounded-full bg-cyan-400/10 blur-3xl" />

          <div className="relative z-10 grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-300">
                Premium İş Yönetimi
              </p>
              <h2 className="mt-3 max-w-2xl text-3xl font-bold tracking-tight lg:text-4xl">
                Teklifleri, aktif işleri ve satış aksiyonlarını tek merkezden yönet.
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300">
                Bu ekran satış pipeline’ını, tekliflerin son durumunu, onay akışını ve hızlı düzenleme operasyonlarını bir araya getirir.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <span className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium">
                  {ozet.bekleyen} teklif takip bekliyor
                </span>
                <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-sm font-medium text-emerald-200">
                  {ozet.onaylanan} iş onaylandı
                </span>
                <span className="rounded-full border border-rose-400/20 bg-rose-400/10 px-4 py-2 text-sm font-medium text-rose-200">
                  {ozet.kaybedilen} kayıp iş
                </span>
              </div>

              <div className="mt-6">
                <Link
                  href="/dashboard/yeni-is"
                  className="inline-flex rounded-2xl bg-white/10 px-5 py-3 text-sm font-semibold text-white border border-white/15 transition hover:bg-white/15"
                >
                  + Yeni İş Oluştur
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-300">Toplam İş</p>
                <p className="mt-3 text-3xl font-bold">{ozet.toplam}</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-300">Onaylanan</p>
                <p className="mt-3 text-3xl font-bold text-emerald-200">{ozet.onaylanan}</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-300">Bekleyen</p>
                <p className="mt-3 text-3xl font-bold text-amber-200">{ozet.bekleyen}</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-300">Kaybedilen</p>
                <p className="mt-3 text-3xl font-bold text-rose-200">{ozet.kaybedilen}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
        <div className="grid gap-4 xl:grid-cols-[1.2fr_auto_auto]">
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              Arama
            </label>
            <input
              value={arama}
              onChange={(e) => setArama(e.target.value)}
              placeholder="Müşteri, ürün, not veya malzeme ara..."
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              Sırala
            </label>
            <div className="flex flex-wrap gap-2">
              {([
                ['yeni', 'En Yeni'],
                ['eski', 'En Eski'],
                ['tarih', 'İş Tarihi'],
              ] as const).map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setSirala(val)}
                  className={cls(
                    'rounded-2xl px-4 py-3 text-sm font-medium transition',
                    sirala === val
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              Filtre
            </label>
            <div className="flex flex-wrap gap-2">
              {([
                ['hepsi', 'Tümü'],
                ['onaylandi', 'Onaylanan'],
                ['bekliyor', 'Bekleyen'],
              ] as const).map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setFiltre(val)}
                  className={cls(
                    'rounded-2xl px-4 py-3 text-sm font-medium transition',
                    filtre === val
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4 text-sm">
          <p className="text-slate-500">
            Görüntülenen kayıt: <span className="font-semibold text-slate-900">{filtrelenmis.length}</span>
          </p>
          <p className="text-slate-400">Canlı liste görünümü</p>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
        <div className="grid grid-cols-1 gap-4 p-4 xl:hidden">
          {filtrelenmis.length === 0 ? (
            <div className="rounded-3xl p-10 text-center text-slate-500">
              Gösterilecek iş yok
            </div>
          ) : (
            filtrelenmis.map((is) => {
              const badge = durumMap[is.durum] || {
                label: is.durum,
                className: 'bg-slate-50 text-slate-700 border border-slate-200',
              }

              const tasBadge = is.tasDurumu ? tasDurumuMap[is.tasDurumu] : null
              const toplamMetraj = toplamMetrajHesapla(is)

              return (
                <div key={is.id} className="rounded-3xl border border-slate-200 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-slate-900">{is.musteriAdi || 'Müşteri yok'}</p>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                      {is.malzemeTipi}
                    </span>
                    <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 border border-blue-200">
                      {is.musteriTipi}
                    </span>
                    <span className={cls('rounded-full px-2.5 py-1 text-xs font-semibold', badge.className)}>
                      {badge.label}
                    </span>
                    {tasBadge && (
                      <span className={cls('rounded-full px-2.5 py-1 text-xs font-medium', tasBadge.className)}>
                        {tasBadge.label}
                      </span>
                    )}
                  </div>

                  <p className="mt-2 text-sm text-slate-600">{is.urunAdi || 'Ürün yok'}</p>

                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-2xl bg-slate-50 p-3">
                      <p className="text-xs text-slate-500">Metraj</p>
                      <p className="mt-1 font-semibold text-slate-900">{toplamMetraj.toFixed(2)} mtül</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-3">
                      <p className="text-xs text-slate-500">Satış</p>
                      <p className="mt-1 font-semibold text-blue-700">{paraGoster(Number(is.satisFiyati) || 0)}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-3">
                      <p className="text-xs text-slate-500">Maliyet</p>
                      <p className="mt-1 font-semibold text-slate-900">{paraGoster(Number(is.toplamMaliyet) || 0)}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-3">
                      <p className="text-xs text-slate-500">Kar</p>
                      <p className="mt-1 font-semibold text-violet-700">%{Number(is.karYuzdesi || 0).toFixed(0)}</p>
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl bg-slate-50 p-3 text-sm">
                    <p className="text-slate-500">İş: <span className="font-medium text-slate-800">{tarihGoster(is.isTarihi)}</span></p>
                    <p className="mt-1 text-slate-400">Oluşturma: {tarihGoster(is.createdAt)}</p>
                  </div>

                  <div className="mt-4 grid gap-3">
                    <select
                      value={is.durum}
                      onChange={(e) => durumGuncelle(is.id, e.target.value, is)}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-500"
                    >
                      <option value="teklif_verildi">Teklif Verildi</option>
                      <option value="onaylandi">Onaylandı</option>
                      <option value="kaybedildi">Kaybedildi</option>
                    </select>

                    <button
                      onClick={() => router.push(`/dashboard/isler/${is.id}`)}
                      className="w-full rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
                    >
                      Düzenle
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>

        <div className="hidden xl:block">
          <table className="w-full table-fixed">
            <colgroup>
              <col className="w-[30%]" />
              <col className="w-[28%]" />
              <col className="w-[14%]" />
              <col className="w-[16%]" />
              <col className="w-[12%]" />
            </colgroup>

            <thead className="bg-slate-50">
              <tr className="text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                <th className="px-5 py-4">Müşteri / Ürün</th>
                <th className="px-5 py-4">Özet</th>
                <th className="px-5 py-4">Tarih</th>
                <th className="px-5 py-4">Durum</th>
                <th className="px-5 py-4">İşlem</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filtrelenmis.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center">
                    <div className="mx-auto max-w-md">
                      <p className="text-lg font-semibold text-slate-900">Gösterilecek iş yok</p>
                      <p className="mt-2 text-sm text-slate-500">
                        Filtreleri değiştir veya yeni iş oluşturarak listeyi doldur.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtrelenmis.map((is) => {
                  const badge = durumMap[is.durum] || {
                    label: is.durum,
                    className: 'bg-slate-50 text-slate-700 border border-slate-200',
                  }

                  const tasBadge = is.tasDurumu ? tasDurumuMap[is.tasDurumu] : null
                  const toplamMetraj = toplamMetrajHesapla(is)

                  return (
                    <tr key={is.id} className="align-top transition hover:bg-slate-50/70">
                      <td className="px-5 py-5">
                        <div className="pr-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-slate-900">
                              {is.musteriAdi || 'Müşteri yok'}
                            </p>

                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                              {is.malzemeTipi}
                            </span>

                            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-700 border border-blue-200">
                              {is.musteriTipi}
                            </span>

                            {tasBadge && (
                              <span className={cls('rounded-full px-2.5 py-1 text-[11px] font-medium', tasBadge.className)}>
                                {tasBadge.label}
                              </span>
                            )}
                          </div>

                          <p className="mt-2 text-sm text-slate-600">{is.urunAdi || 'Ürün yok'}</p>

                          {is.notlar && (
                            <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-400">
                              Not: {is.notlar}
                            </p>
                          )}
                        </div>
                      </td>

                      <td className="px-5 py-5">
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-slate-500">Metraj</span>
                            <span className="font-semibold text-slate-900">{toplamMetraj.toFixed(2)} mtül</span>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-slate-500">Maliyet</span>
                            <span className="font-semibold text-slate-900">{paraGoster(Number(is.toplamMaliyet) || 0)}</span>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-slate-500">Satış</span>
                            <span className="font-semibold text-blue-700">{paraGoster(Number(is.satisFiyati) || 0)}</span>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-slate-500">Kar</span>
                            <span className="font-semibold text-violet-700">%{Number(is.karYuzdesi || 0).toFixed(0)}</span>
                          </div>
                          {Number(is.tahsilat) > 0 && (
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-slate-500">Tahsilat</span>
                              <span className="font-semibold text-cyan-700">{paraGoster(Number(is.tahsilat) || 0)}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="px-5 py-5">
                        <div className="space-y-1 text-sm text-slate-600">
                          <p>
                            İş: <span className="font-medium text-slate-800">{tarihGoster(is.isTarihi)}</span>
                          </p>
                          <p className="text-xs text-slate-400">
                            Oluşturma: {tarihGoster(is.createdAt)}
                          </p>
                        </div>
                      </td>

                      <td className="px-5 py-5">
                        <div className="space-y-3">
                          <span className={cls('inline-flex rounded-full px-3 py-1 text-xs font-semibold', badge.className)}>
                            {badge.label}
                          </span>

                          <select
                            value={is.durum}
                            onChange={(e) => durumGuncelle(is.id, e.target.value, is)}
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-blue-500"
                          >
                            <option value="teklif_verildi">Teklif Verildi</option>
                            <option value="onaylandi">Onaylandı</option>
                            <option value="kaybedildi">Kaybedildi</option>
                          </select>
                        </div>
                      </td>

                      <td className="px-5 py-5">
                        <button
                          onClick={() => router.push(`/dashboard/isler/${is.id}`)}
                          className="w-full rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
                        >
                          Düzenle
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {popupIs && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
          onClick={() => setPopupIs(null)}
        >
          <div
            className="w-full max-w-xl rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_30px_80px_rgba(15,23,42,0.22)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-500">İş Onayı</p>
                <h3 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
                  Onay detaylarını gir
                </h3>
                <p className="mt-2 text-sm text-slate-500">
                  <span className="font-semibold text-slate-900">{popupIs.musteriAdi}</span> — {popupIs.urunAdi}
                </p>
              </div>

              <button
                onClick={() => setPopupIs(null)}
                className="rounded-2xl border border-slate-200 px-3 py-2 text-slate-400 transition hover:bg-slate-50 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="mt-6">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                Taş durumu
              </p>

              <div className="grid gap-3 sm:grid-cols-2">
                {([
                  {
                    val: 'stokta',
                    label: 'Taş Stokta',
                    desc: 'Malzeme hazır, iş ilerleyebilir.',
                    active: 'border-emerald-300 bg-emerald-50 text-emerald-700',
                  },
                  {
                    val: 'alinacak',
                    label: 'Taş Alınacak',
                    desc: 'Satın alma veya tedarik gerekiyor.',
                    active: 'border-orange-300 bg-orange-50 text-orange-700',
                  },
                ] as const).map((opt) => (
                  <label
                    key={opt.val}
                    className={cls(
                      'cursor-pointer rounded-2xl border p-4 transition',
                      tasDurumu === opt.val
                        ? opt.active
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="radio"
                        name="tas"
                        value={opt.val}
                        checked={tasDurumu === opt.val}
                        onChange={() => setTasDurumu(opt.val)}
                        className="mt-1 h-4 w-4"
                      />
                      <div>
                        <p className="font-semibold">{opt.label}</p>
                        <p className="mt-1 text-xs opacity-80">{opt.desc}</p>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="mt-6">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                Tahsilat
              </label>

              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={tahsilat}
                  onChange={(e) => setTahsilat(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 pr-12 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-400">
                  ₺
                </span>
              </div>

              <p className="mt-2 text-xs text-slate-500">
                Toplam satış fiyatı: <span className="font-semibold text-slate-900">{paraGoster(Number(popupIs.satisFiyati) || 0)}</span>
              </p>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-3">
              <button
                onClick={() => setPopupIs(null)}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                İptal
              </button>

              <button
                onClick={popupKaydet}
                disabled={popupKaydediliyor}
                className="rounded-2xl bg-gradient-to-r from-emerald-600 to-green-600 px-4 py-3 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(22,163,74,0.25)] transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {popupKaydediliyor ? 'Kaydediliyor...' : 'Kaydet ve Onayla'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
