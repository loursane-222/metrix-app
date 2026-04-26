'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { paraGoster } from '@/lib/format'
import { PlakaPlanlayiciV2 } from '@/components/plaka-planlayici/PlakaPlanlayiciV2'

export default function IslerPage() {
  const router = useRouter()

  const [mobileView, setMobileView] = useState<'list' | 'detail'>('list')
  const [mobileActionsOpen, setMobileActionsOpen] = useState(false)
  const [isArama, setIsArama] = useState("")


  function aktifTeklifLinki() {
    if (!aktifIs?.teklifNo) return ""
    return `${window.location.origin}/teklif/${aktifIs.teklifNo}`
  }

  function aktifWhatsappGonder() {
    const link = aktifTeklifLinki()
    if (!link) return
    const mesaj = encodeURIComponent(`Merhaba, teklifinizi aşağıdaki linkten inceleyip onaylayabilirsiniz:\n\n${link}`)
    window.open(`https://wa.me/?text=${mesaj}`, "_blank")
  }

  async function aktifLinkKopyala() {
    const link = aktifTeklifLinki()
    if (!link) return
    await navigator.clipboard.writeText(link)
    alert("Teklif linki kopyalandı.")
  }

  // METRIX_SALES_AI_HELPERS
  

function formatMusteriAdi(ad: string) {
  if (!ad) return "Sayın Müşteri"

  return "Sayın " + ad
    .toLowerCase()
    .split(" ")
    .map(k => k.charAt(0).toUpperCase() + k.slice(1))
    .join(" ")
}

function teklifTakipDurumu(i: any) {
    if (!i) {
      return {
        seviye: "boş",
        baslik: "İş seçilmedi",
        metin: "",
        renk: "text-slate-400",
        skor: 0,
        etiket: "Boş",
        aksiyon: "İş seç",
        barColor: "#64748b",
      }
    }

    const goruntulenme = Number(i.teklifGoruntulenmeSayisi || 0)
    const onaylandi = i.durum === "onaylandi"
    const simdi = Date.now()
    const created = i.createdAt ? new Date(i.createdAt).getTime() : simdi
    const sonBakis = i.teklifSonGoruntulenmeTarihi ? new Date(i.teklifSonGoruntulenmeTarihi).getTime() : null
    const teklifYasiSaat = (simdi - created) / 1000 / 60 / 60
    const son24SaatteBakildi = sonBakis ? (simdi - sonBakis) / 1000 / 60 / 60 <= 24 : false

    if (onaylandi) {
      return {
        seviye: "onay",
        baslik: "Teklif onaylandı",
        metin: "Bu iş artık satış sonrası operasyon akışında.",
        renk: "text-emerald-300",
        skor: 5,
        etiket: "Kapandı",
        aksiyon: "Operasyona al",
        barColor: "#10b981",
      }
    }

    if (goruntulenme === 0) {
      if (teklifYasiSaat >= 72) {
        return {
          seviye: "72s",
          baslik: "72 saattir açılmadı",
          metin: "Bu teklif soğuyor. Telefonla arama veya güçlü takip mesajı gerekli.",
          renk: "text-red-300",
          skor: 0,
          etiket: "Soğuk",
          aksiyon: "Ara veya yeniden gönder",
          barColor: "#ef4444",
        }
      }

      if (teklifYasiSaat >= 48) {
        return {
          seviye: "48s",
          baslik: "48 saattir açılmadı",
          metin: "İkinci takip mesajı zamanı. Müşteri henüz reaksiyon vermedi.",
          renk: "text-amber-300",
          skor: 1,
          etiket: "Zayıf",
          aksiyon: "Takip mesajı gönder",
          barColor: "#f59e0b",
        }
      }

      if (teklifYasiSaat >= 24) {
        return {
          seviye: "24s",
          baslik: "24 saattir açılmadı",
          metin: "Nazik hatırlatma mesajı gönderilebilir.",
          renk: "text-blue-300",
          skor: 1,
          etiket: "Beklemede",
          aksiyon: "Nazik hatırlat",
          barColor: "#3b82f6",
        }
      }

      return {
        seviye: "bekle",
        baslik: "Teklif beklemede",
        metin: "Henüz takip için erken. İlk reaksiyonu bekle.",
        renk: "text-slate-300",
        skor: 0,
        etiket: "Yeni",
        aksiyon: "Bekle",
        barColor: "#64748b",
      }
    }

    let skor = 1
    if (goruntulenme >= 2) skor = 2
    if (son24SaatteBakildi) skor = Math.max(skor, 3)
    if (goruntulenme >= 3) skor = Math.max(skor, 4)
    if (goruntulenme >= 5 || (goruntulenme >= 3 && son24SaatteBakildi)) skor = 5

    if (skor >= 5) {
      return {
        seviye: "sıcak",
        baslik: "Çok sıcak müşteri",
        metin: "Müşteri teklife tekrar tekrar bakmış. Bu müşteri karar aşamasında olabilir.",
        renk: "text-red-300",
        skor,
        etiket: "Ara hemen",
        aksiyon: "Hemen ara",
        barColor: "#ef4444",
      }
    }

    if (skor >= 4) {
      return {
        seviye: "sıcak",
        baslik: "Sıcak müşteri",
        metin: "Teklif birkaç kez incelenmiş. Fiyat, termin veya ödeme koşulu konuşulmalı.",
        renk: "text-orange-300",
        skor,
        etiket: "Sıcak",
        aksiyon: "Bugün dönüş yap",
        barColor: "#f97316",
      }
    }

    if (skor >= 3) {
      return {
        seviye: "bakıldı",
        baslik: "Müşteri teklife baktı",
        metin: "Son 24 saat içinde teklif açılmış. Takip için doğru zamandasın.",
        renk: "text-blue-300",
        skor,
        etiket: "Aktif",
        aksiyon: "Takip et",
        barColor: "#3b82f6",
      }
    }

    if (skor >= 2) {
      return {
        seviye: "ilgili",
        baslik: "İlgili müşteri",
        metin: "Teklif tekrar incelenmiş. Karar süreci başlamış olabilir.",
        renk: "text-amber-300",
        skor,
        etiket: "Isınıyor",
        aksiyon: "Mesaj gönder",
        barColor: "#f59e0b",
      }
    }

    return {
      seviye: "bakıldı",
      baslik: "Müşteri teklife baktı",
      metin: "Teklif bir kez açılmış. Çok erken ama takip fırsatı doğdu.",
      renk: "text-blue-300",
      skor,
      etiket: "Baktı",
      aksiyon: "Kısa takip",
      barColor: "#60a5fa",
    }
  }

  async function aktifTakipMesajiKopyala() {
    if (!aktifIs) return

    const link = aktifTeklifLinki()
    const takip = teklifTakipDurumu(aktifIs)
    const ad = formatMusteriAdi(aktifIs.musteriAdi)
    const urun = aktifIs.urunAdi || "teklif"

    let mesaj = ""

    if (aktifIs.durum === "onaylandi") {
      mesaj = `${ad}, teklif onayınız için teşekkür ederiz. ${urun} uygulamanız için üretim/planlama sürecini başlatıyoruz. Gelişmeleri size ayrıca ileteceğiz.`
    } else if (takip.skor >= 5) {
      mesaj = `${ad}, teklifinizi birkaç kez incelediğinizi gördüm. Büyük ihtimalle karar aşamasındasınız. İsterseniz fiyat, termin veya uygulama detayını hızlıca netleştirip süreci bugün planlayabiliriz.\n\nTeklif linki:\n${link}`
    } else if (takip.skor === 4) {
      mesaj = `${ad}, teklifinizi tekrar incelediğinizi gördüm. Aklınıza takılan fiyat, ödeme, termin veya uygulama detayı varsa hemen yardımcı olayım. Uygunsa bugün kısa bir görüşmeyle netleştirebiliriz.\n\nTeklif linki:\n${link}`
    } else if (takip.skor === 3) {
      mesaj = `${ad}, teklifimizi incelediğinizi gördüm. Uygulama detayları, teslim süresi veya fiyatla ilgili sormak istediğiniz bir konu varsa hemen yardımcı olabilirim.\n\nTeklif linki:\n${link}`
    } else if (takip.skor === 2) {
      mesaj = `${ad}, teklifimizi tekrar paylaşmak istedim. İnceleme fırsatınız olduysa, aklınıza takılan bir detay varsa memnuniyetle yardımcı olurum.\n\nTeklif linki:\n${link}`
    } else if (takip.seviye === "24s") {
      mesaj = `${ad}, teklifimizi dün iletmiştim. Uygunsa aşağıdaki linkten inceleyebilirsiniz. Sorunuz olursa hızlıca yardımcı olurum.\n\n${link}`
    } else if (takip.seviye === "48s") {
      mesaj = `${ad}, teklifimizle ilgili karar sürecinizde destek olmamı ister misiniz? Fiyat, ürün veya termin konusunda revize gerekiyorsa birlikte netleştirebiliriz.\n\n${link}`
    } else if (takip.seviye === "72s") {
      mesaj = `${ad}, teklifimizin hâlâ geçerli olduğunu hatırlatmak isterim. Dilerseniz fiyat/termin tarafını hızlıca revize edip size en uygun hale getirebiliriz.\n\n${link}`
    } else {
      mesaj = `${ad}, teklifinizi aşağıdaki linkten inceleyip onaylayabilirsiniz. Herhangi bir sorunuz olursa memnuniyetle yardımcı olurum.\n\n${link}`
    }

    await navigator.clipboard.writeText(mesaj)
    alert("Akıllı takip mesajı kopyalandı.")
  }

  function aktifRevizeEt() {
    if (!aktifIs?.id) return
    router.push(`/is/detay?id=${aktifIs.id}`)
  }


  const [isler, setIsler] = useState<any[]>([])
  const [aktifIs, setAktifIs] = useState<any | null>(null)
  const [plakaAcik, setPlakaAcik] = useState(false)
  const [tahsilatAcik, setTahsilatAcik] = useState(false)
  const [tahsilatDeger, setTahsilatDeger] = useState("")

  useEffect(() => {
    fetch('/api/isler')
      .then(r => r.json())
      .then(v => {
        const liste = Array.isArray(v) ? v : (v.isler || [])
        setIsler(liste)
        if (liste.length > 0) setAktifIs(liste[0])
      })
  }, [])

  const ozet = useMemo(() => {
    const toplam = isler.length
    const onaylanan = isler.filter(i => i.durum === 'onaylandi').length
    const bekleyen = isler.filter(i => i.durum === 'teklif_verildi').length
    const kayip = isler.filter(i => i.durum === 'kaybedildi').length
    return { toplam, onaylanan, bekleyen, kayip }
  }, [isler])

  const aktifMaliyet = Number(aktifIs?.toplamMaliyet || 0)
  const aktifSatis = Number(aktifIs?.satisFiyati || 0)
  const aktifKar = aktifSatis - aktifMaliyet
  const aktifKarYuzde = aktifMaliyet > 0 ? (aktifKar / aktifMaliyet) * 100 : 0
  const isYuku = Math.round((Number(aktifIs?.toplamSureDakika || 0) / 720) * 100)

  function durumRenk(durum?: string) {
    if (durum === 'onaylandi') return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
    if (durum === 'kaybedildi') return 'text-red-400 border-red-500/30 bg-red-500/10'
    return 'text-amber-400 border-amber-500/30 bg-amber-500/10'
  }


  const filtreliIsler = useMemo(() => {
    const q = isArama.trim().toLowerCase()
    if (!q) return isler

    return isler.filter((item: any) => {
      return [
        item.musteriAdi,
        item.urunAdi,
        item.teklifNo,
        item.durum,
        item.malzemeTipi,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q)
    })
  }, [isler, isArama])

  function TasBadge({ durum }: { durum?: string }) {
    if (!durum) return null

    return (
      <span
        className={`rounded-full border px-3 py-1 text-xs font-semibold ${
          durum === 'alinacak'
            ? 'border-amber-500/30 bg-amber-500/10 text-amber-300'
            : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
        }`}
      >
        {durum === 'alinacak' ? 'Taş Alınacak' : 'Taş Stokta'}
      </span>
    )
  }

  return (
    <div className="h-[100dvh] flex flex-col md:flex-row bg-[#030712] text-white overflow-hidden">

      {/* MOBILE_LIST_DETAIL_APP */}
      <div className="md:hidden flex h-full min-h-0 flex-col bg-[#030712] text-white">
        {mobileView === 'list' && (
          <div className="flex h-full min-h-0 flex-col">
            <div className="shrink-0 border-b border-slate-800 bg-[#030712] pl-20 pr-4 py-4">
              <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500">Metrix</p>
              <div className="mt-1 flex items-center justify-between gap-3">
                <h1 className="text-2xl font-black">İşler</h1>
                <button
                  onClick={() => router.push('/dashboard/yeni-is-v3')}
                  className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold"
                >
                  + Yeni
                </button>
              </div>

              <input
                value={isArama}
                onChange={(e) => setIsArama(e.target.value)}
                placeholder="Müşteri, ürün veya teklif ara..."
                className="mt-4 w-full rounded-2xl border border-slate-800 bg-[#0B1120] px-4 py-4 text-base text-white outline-none placeholder:text-slate-600"
              />

              <div className="mt-4 grid grid-cols-4 gap-2">
                <div className="rounded-xl bg-[#111827] p-2 text-center">
                  <p className="text-[10px] text-slate-500">Toplam</p>
                  <p className="text-sm font-bold">{ozet.toplam}</p>
                </div>
                <div className="rounded-xl bg-[#111827] p-2 text-center">
                  <p className="text-[10px] text-slate-500">Bek.</p>
                  <p className="text-sm font-bold text-amber-400">{ozet.bekleyen}</p>
                </div>
                <div className="rounded-xl bg-[#111827] p-2 text-center">
                  <p className="text-[10px] text-slate-500">Onay</p>
                  <p className="text-sm font-bold text-emerald-400">{ozet.onaylanan}</p>
                </div>
                <div className="rounded-xl bg-[#111827] p-2 text-center">
                  <p className="text-[10px] text-slate-500">Kayıp</p>
                  <p className="text-sm font-bold text-red-400">{ozet.kayip}</p>
                </div>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto pb-8">
              {filtreliIsler.map((is: any) => (
                <button
                  key={is.id}
                  onClick={() => {
                    setAktifIs(is)
                    setMobileView('detail')
                  }}
                  className="block w-full border-b border-slate-800 p-4 text-left active:bg-[#111827]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-base font-black">{is.musteriAdi}</p>
                      <p className="mt-1 truncate text-sm text-slate-400">{is.urunAdi}</p>
                      <p className="mt-2 text-sm text-slate-500">{paraGoster(Number(is.satisFiyati || 0))}</p>
                    </div>

                    <span className={`shrink-0 rounded-full border px-3 py-1 text-xs ${durumRenk(is.durum)}`}>
                      {is.durum}
                    </span>
                  </div>
                </button>
              ))}

              {filtreliIsler.length === 0 && (
                <div className="p-8 text-center text-slate-500">
                  Aramaya uygun iş bulunamadı.
                </div>
              )}
            </div>
          </div>
        )}

        {mobileView === 'detail' && aktifIs && (
          <div className="flex h-full min-h-0 flex-col">
            <div className="shrink-0 border-b border-slate-800 bg-[#030712] px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <button
                  onClick={() => setMobileView('list')}
                  className="rounded-xl border border-slate-700 bg-[#0B1120] px-4 py-3 text-sm font-bold"
                >
                  ← İşler
                </button>

                <button
                  onClick={() => setMobileActionsOpen(true)}
                  className="rounded-xl border border-slate-700 bg-[#0B1120] px-4 py-3 text-sm font-bold"
                >
                  Aksiyon
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4 pb-10">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500">Seçili İş</p>
                  <h2 className="mt-2 text-2xl font-black leading-tight">{aktifIs.musteriAdi}</h2>
                  <p className="mt-2 text-base text-slate-400">{aktifIs.urunAdi}</p>
                </div>

                <div className="flex shrink-0 flex-col items-end gap-2">
                  <span className={`rounded-full border px-3 py-1 text-xs ${durumRenk(aktifIs.durum)}`}>
                    {aktifIs.durum}
                  </span>
                  <span className="rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-xs font-bold text-purple-300">
                    v{Number(aktifIs.versiyon || 1)}
                  </span>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-slate-800 bg-[#111827] p-4">
                  <p className="text-xs text-slate-400">Teklif Tutarı</p>
                  <p className="mt-2 text-xl text-emerald-400">{paraGoster(aktifSatis)}</p>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-[#111827] p-4">
                  <p className="text-xs text-slate-400">Maliyet</p>
                  <p className="mt-2 text-xl">{paraGoster(aktifMaliyet)}</p>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-[#111827] p-4">
                  <p className="text-xs text-slate-400">Kâr</p>
                  <p className="mt-2 text-xl text-yellow-400">{paraGoster(aktifKar)}</p>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-[#111827] p-4">
                  <p className="text-xs text-slate-400">Kazanç</p>
                  <p className="mt-2 text-xl text-blue-400">%{aktifKarYuzde.toFixed(1)}</p>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-slate-800 bg-[#0B1120] p-4">
                {(() => {
                  const takip = teklifTakipDurumu(aktifIs)
                  return (
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Satış Takip Uyarısı</p>
                      <p className={`mt-2 text-2xl font-black ${takip.renk}`}>{takip.baslik}</p>
                      <p className="mt-2 text-sm text-slate-400">{takip.metin}</p>

                      <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950/50 p-3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Sıcaklık Skoru</p>
                          <p className={`text-sm font-black ${takip.renk}`}>{takip.skor}/5 · {takip.etiket}</p>
                        </div>

                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${Math.min(100, Math.max(0, takip.skor * 20))}%`,
                              backgroundColor: takip.barColor,
                            }}
                          />
                        </div>

                        <p className="mt-2 text-xs text-slate-400">Önerilen aksiyon: <b>{takip.aksiyon}</b></p>
                      </div>

                      <p className="mt-3 text-xs text-slate-500">
                        Görüntülenme: {Number(aktifIs.teklifGoruntulenmeSayisi || 0)} kez
                        {aktifIs.teklifSonGoruntulenmeTarihi
                          ? ` · Son bakış: ${new Date(aktifIs.teklifSonGoruntulenmeTarihi).toLocaleString("tr-TR")}`
                          : " · Henüz açılmadı"}
                      </p>

                      <button
                        onClick={aktifTakipMesajiKopyala}
                        className="mt-4 w-full rounded-2xl bg-slate-800 px-4 py-4 text-sm font-bold hover:bg-slate-700"
                      >
                        Akıllı Takip Mesajı Kopyala
                      </button>
                    </div>
                  )
                })()}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-slate-800 bg-[#0B1120] p-4">
                  <p className="text-xs text-slate-400">Taş / Ürün</p>
                  <p className="mt-2 text-base font-bold">{aktifIs.urunAdi || '-'}</p>
                  <p className="mt-1 text-xs text-slate-500">{aktifIs.malzemeTipi || '-'}</p>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-[#0B1120] p-4">
                  <p className="text-xs text-slate-400">Kaç Plaka?</p>
                  <p className="mt-2 text-2xl font-black">{Number(aktifIs.kullanilanPlakaSayisi || 0)} plaka</p>
                  <p className="mt-1 text-xs text-slate-500">{aktifIs.plakaGenislikCm || '-'} × {aktifIs.plakaUzunlukCm || '-'} cm</p>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-[#0B1120] p-4">
                  <p className="text-xs text-slate-400">Toplam Süre</p>
                  <p className="mt-2 text-2xl font-black">{Number(aktifIs.toplamSureDakika || 0).toFixed(0)} dk</p>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-[#0B1120] p-4">
                  <p className="text-xs text-slate-400">Tahsilat</p>
                  <p className="mt-2 text-2xl font-black text-cyan-400">{paraGoster(Number(aktifIs.tahsilat || 0))}</p>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-slate-800 bg-[#0B1120] p-4">
                <p className="text-xs text-slate-400">Notlar</p>
                <p className="mt-2 text-sm text-slate-300">{aktifIs.notlar || 'Bu iş için not girilmemiş.'}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="hidden md:flex md:w-[25%] border-r border-slate-800 flex-col">
        <div className="p-5 border-b border-slate-800">
          <p className="text-xs tracking-[0.25em] text-slate-500 uppercase">Metrix</p>
          <h1 className="text-xl mt-2">İşler</h1>

          <div className="grid grid-cols-4 gap-2 mt-4">
            <div className="bg-[#111827] rounded-lg p-2 text-center">
              <p className="text-[10px] text-slate-500">Toplam</p>
              <p className="text-sm">{ozet.toplam}</p>
            </div>
            <div className="bg-[#111827] rounded-lg p-2 text-center">
              <p className="text-[10px] text-slate-500">Bek.</p>
              <p className="text-sm text-amber-400">{ozet.bekleyen}</p>
            </div>
            <div className="bg-[#111827] rounded-lg p-2 text-center">
              <p className="text-[10px] text-slate-500">Onay</p>
              <p className="text-sm text-emerald-400">{ozet.onaylanan}</p>
            </div>
            <div className="bg-[#111827] rounded-lg p-2 text-center">
              <p className="text-[10px] text-slate-500">Kayıp</p>
              <p className="text-sm text-red-400">{ozet.kayip}</p>
            </div>
          </div>
        </div>

        
        {/* DESKTOP_IS_ARAMA */}
        <div className="border-b border-slate-800 p-3">
          <input
            value={isArama}
            onChange={(e) => setIsArama(e.target.value)}
            placeholder="İş ara..."
            className="w-full rounded-xl border border-slate-800 bg-[#0B1120] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600"
          />
        </div>

        <div className="overflow-y-auto flex-1">
          {filtreliIsler.map((is) => (
            <div
              key={is.id}
              onClick={() => setAktifIs(is)}
              className={`p-4 border-b border-slate-800 cursor-pointer hover:bg-[#111827] ${
                aktifIs?.id === is.id ? 'bg-[#111827]' : ''
              }`}
            >
              <div className="flex justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">{is.musteriAdi}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <p className="text-xs text-slate-400">{is.urunAdi}</p>
                    {is.tasDurumu && (
                      <span className={`rounded-full px-2 py-0.5 text-[10px] ${
                        is.tasDurumu === 'alinacak'
                          ? 'bg-amber-500/10 text-amber-300'
                          : 'bg-emerald-500/10 text-emerald-300'
                      }`}>
                        {is.tasDurumu === 'alinacak' ? 'Taş alınacak' : 'Stokta'}
                      </span>
                    )}
                  </div>
                </div>
                <span className={`h-fit rounded-full border px-2 py-1 text-[10px] ${durumRenk(is.durum)}`}>
                  {is.durum}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-2">{paraGoster(Number(is.satisFiyati || 0))}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="hidden md:flex md:w-[50%] p-6 flex-col gap-5 overflow-hidden">
        {!aktifIs && <div className="text-slate-400">Bir iş seç</div>}

        {aktifIs && (
          <>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs tracking-[0.25em] text-slate-500 uppercase">Seçili İş</p>
                <div className="mt-2 flex items-center gap-3">
                  <h2 className="text-xl md:text-2xl leading-tight">{aktifIs.musteriAdi}</h2>
                  {/* METRIX_VERSION_BADGE */}
                  <span className="rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-xs font-bold text-purple-300">
                    v{Number(aktifIs.versiyon || 1)}
                  </span>
                </div>

                <div className="mt-2 flex items-center gap-3">
                  <p className="text-slate-400 text-sm">{aktifIs.urunAdi}</p>
                  <TasBadge durum={aktifIs.tasDurumu} />
                </div>
              </div>

              <span className={`rounded-full border px-3 py-1 text-xs ${durumRenk(aktifIs.durum)}`}>
                {aktifIs.durum}
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              <div className="bg-[#111827] border border-slate-800 p-3 md:p-4 rounded-xl min-h-[92px] md:min-h-0">
                <p className="text-xs text-slate-400">Teklif Tutarı</p>
                <p className="text-lg mt-2 text-emerald-400">{paraGoster(aktifSatis)}</p>
              </div>

              <div className="bg-[#111827] border border-slate-800 p-3 md:p-4 rounded-xl min-h-[92px] md:min-h-0">
                <p className="text-xs text-slate-400">Maliyet</p>
                <p className="text-lg mt-2">{paraGoster(aktifMaliyet)}</p>
              </div>

              <div className="bg-[#111827] border border-slate-800 p-3 md:p-4 rounded-xl min-h-[92px] md:min-h-0">
                <p className="text-xs text-slate-400">Kâr</p>
                <p className="text-lg mt-2 text-yellow-400">{paraGoster(aktifKar)}</p>
              </div>

              <div className="bg-[#111827] border border-slate-800 p-3 md:p-4 rounded-xl min-h-[92px] md:min-h-0">
                <p className="text-xs text-slate-400">Kazanç</p>
                <p className="text-lg mt-2 text-blue-400">%{aktifKarYuzde.toFixed(1)}</p>
              </div>
            </div>


            {/* METRIX_SALES_AI_ALERT_FORCE */}
            {aktifIs && (
              <div className="rounded-2xl border border-slate-800 bg-[#0B1120] p-3 md:p-4">
                {(() => {
                  const takip = teklifTakipDurumu(aktifIs)
                  return (
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 md:gap-4">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Satış Takip Uyarısı</p>
                        <p className={`mt-2 text-xl font-black ${takip.renk}`}>{takip.baslik}</p>
                        <p className="mt-2 text-sm text-slate-400">{takip.metin}</p>

                        <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950/50 p-3">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Sıcaklık Skoru</p>
                            <p className={`text-sm font-black ${takip.renk}`}>{takip.skor}/5 · {takip.etiket}</p>
                          </div>

                          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${Math.min(100, Math.max(0, takip.skor * 20))}%`,
                                backgroundColor: takip.barColor,
                              }}
                            />
                          </div>

                          <p className="mt-2 text-xs text-slate-400">Önerilen aksiyon: <b>{takip.aksiyon}</b></p>
                        </div>
                        <p className="mt-2 text-xs text-slate-500">
                          Görüntülenme: {Number(aktifIs.teklifGoruntulenmeSayisi || 0)} kez
                          {aktifIs.teklifSonGoruntulenmeTarihi
                            ? ` · Son bakış: ${new Date(aktifIs.teklifSonGoruntulenmeTarihi).toLocaleString("tr-TR")}`
                            : " · Henüz açılmadı"}
                        </p>
                      </div>

                      <button
                        onClick={aktifTakipMesajiKopyala}
                        className="w-full md:w-auto shrink-0 rounded-xl bg-slate-800 px-4 py-3 text-sm font-bold hover:bg-slate-700"
                      >
                        Akıllı Takip Mesajı Kopyala
                      </button>
                    </div>
                  )
                })()}
              </div>
            )}



            <div className="grid grid-cols-3 gap-4">
              <div className="bg-[#0B1120] border border-slate-800 p-3 md:p-4 rounded-xl min-h-[96px] md:min-h-0">
                <p className="text-xs text-slate-400">Taş / Ürün</p>
                <p className="mt-2 text-sm">{aktifIs.urunAdi || '-'}</p>
                <p className="mt-1 text-xs text-slate-500">{aktifIs.malzemeTipi || '-'}</p>
              </div>

              <div className="bg-[#0B1120] border border-slate-800 p-3 md:p-4 rounded-xl min-h-[96px] md:min-h-0">
                <p className="text-xs text-slate-400">Kaç Plaka Lazım?</p>
                <p className="mt-2 text-xl">{Number(aktifIs.kullanilanPlakaSayisi || 0)} plaka</p>
                <p className="mt-1 text-xs text-slate-500">
                  {aktifIs.plakaGenislikCm || '-'} × {aktifIs.plakaUzunlukCm || '-'} cm
                </p>
              </div>

              <div className="bg-[#0B1120] border border-slate-800 p-3 md:p-4 rounded-xl min-h-[96px] md:min-h-0">
                <p className="text-xs text-slate-400">Taş Durumu</p>
                <p className={`mt-2 text-lg ${
                  aktifIs.tasDurumu === 'alinacak'
                    ? 'text-amber-400'
                    : aktifIs.tasDurumu
                    ? 'text-emerald-400'
                    : 'text-slate-400'
                }`}>
                  {aktifIs.tasDurumu === 'alinacak'
                    ? 'Taş Alınacak'
                    : aktifIs.tasDurumu
                    ? 'Taş Stokta'
                    : 'Belirsiz'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="bg-[#0B1120] border border-slate-800 p-3 md:p-4 rounded-xl min-h-[96px] md:min-h-0">
                <p className="text-xs text-slate-400">Toplam Süre</p>
                <p className="mt-2 text-xl">{Number(aktifIs.toplamSureDakika || 0).toFixed(0)} dk</p>
              </div>

              <div className="bg-[#0B1120] border border-slate-800 p-3 md:p-4 rounded-xl min-h-[96px] md:min-h-0">
                <p className="text-xs text-slate-400">Atölye İş Yükü</p>
                <p className={`mt-2 text-xl ${isYuku > 100 ? 'text-red-400' : isYuku > 70 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  %{isYuku}
                </p>
              </div>

              <div className="bg-[#0B1120] border border-slate-800 p-3 md:p-4 rounded-xl min-h-[96px] md:min-h-0">
                <p className="text-xs text-slate-400">Tahsilat</p>
                <p className="mt-2 text-xl text-cyan-400">{paraGoster(Number(aktifIs.tahsilat || 0))}</p>
              </div>
            </div>

            <div className="bg-[#0B1120] border border-slate-800 p-5 rounded-xl flex-1">
              <p className="text-xs text-slate-400 mb-3">Notlar</p>
              <p className="text-sm text-slate-300">
                {aktifIs.notlar || 'Bu iş için not girilmemiş.'}
              </p>
            </div>
          </>
        )}
      </div>

      <div className="hidden md:flex md:w-[25%] p-6 border-l border-slate-800 flex-col gap-4">
        <button
          onClick={() => router.push('/dashboard/yeni-is-v3')}
          className="bg-blue-600 hover:bg-blue-500 p-4 rounded-xl font-semibold"
        >
          + Yeni İş Oluştur
        </button>

        <button
          disabled={!aktifIs}
          onClick={() => router.push(`/is/detay?id=${aktifIs?.id}`)}
          className="bg-emerald-600 hover:bg-emerald-500 p-4 rounded-xl disabled:bg-slate-700"
        >
          Satış Paneli
        </button>

        <button
          disabled={!aktifIs}
          onClick={() => setPlakaAcik(true)}
          className="bg-indigo-600 hover:bg-indigo-500 p-4 rounded-xl disabled:bg-slate-700"
        >
          Plaka Optimizasyonu
        </button>

        <button
          disabled={!aktifIs}
          onClick={() => {
            setTahsilatDeger(String(aktifIs?.tahsilat || ""))
            setTahsilatAcik(true)
          }}
          className="bg-amber-600 hover:bg-amber-500 p-4 rounded-xl disabled:bg-slate-700"
        >
          Tahsilat
        </button>

        <button
          disabled={!aktifIs}
          onClick={() => alert("Üretim planı bağlantısı bir sonraki adımda iş programına bağlanacak.")}
          className="bg-purple-600 hover:bg-purple-500 p-4 rounded-xl disabled:bg-slate-700"
        >
          Üretim Planı
        </button>

        <button
          disabled={!aktifIs}
          onClick={() => window.open(`/api/isler/${aktifIs?.id}/pdf`, "_blank")}
          className="bg-slate-700 hover:bg-slate-600 p-4 rounded-xl disabled:bg-slate-800"
        >
          PDF Teklif
        </button>

        <button
          onClick={aktifWhatsappGonder}
          disabled={!aktifIs?.teklifNo}
          className="w-full rounded-2xl bg-green-600 px-5 py-4 text-white font-bold hover:bg-green-500 disabled:opacity-40"
        >
          📲 WhatsApp ile Gönder
        </button>

        <button
          onClick={aktifLinkKopyala}
          disabled={!aktifIs?.teklifNo}
          className="w-full rounded-2xl bg-slate-800 px-5 py-4 text-white font-bold hover:bg-slate-700 disabled:opacity-40"
        >
          🔗 Linki Kopyala
        </button>

        <button
          onClick={aktifRevizeEt}
          disabled={!aktifIs}
          className="w-full rounded-2xl bg-purple-600 px-5 py-4 text-white font-bold hover:bg-purple-500 disabled:opacity-40"
        >
          ✏️ Revize Teklif
        </button>

        <button
          onClick={aktifTakipMesajiKopyala}
          disabled={!aktifIs?.teklifNo}
          className="w-full rounded-2xl bg-amber-600 px-5 py-4 text-white font-bold hover:bg-amber-500 disabled:opacity-40"
        >
          ⏱ Akıllı Takip Mesajı Kopyala
        </button>
      </div>

      {/* MOBILE_ACTIONS_DRAWER_NATIVE */}
      {mobileActionsOpen && (
        <div className="fixed inset-0 z-[200] md:hidden">
          <div className="absolute inset-0 bg-black/70" onClick={() => setMobileActionsOpen(false)} />
          <div className="absolute right-0 top-0 h-full w-[86vw] max-w-[360px] overflow-y-auto border-l border-slate-800 bg-[#030712] p-4 text-white shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Aksiyon</p>
                <h2 className="truncate text-lg font-black">{aktifIs?.musteriAdi || 'İş seçilmedi'}</h2>
              </div>
              <button onClick={() => setMobileActionsOpen(false)} className="rounded-xl border border-slate-700 px-3 py-2 text-sm">Kapat</button>
            </div>

            <div className="flex flex-col gap-3">
              <button onClick={() => router.push('/dashboard/yeni-is-v3')} className="rounded-2xl bg-blue-600 px-5 py-4 font-bold">+ Yeni İş Oluştur</button>
              <button disabled={!aktifIs} onClick={() => router.push(`/is/detay?id=${aktifIs?.id}`)} className="rounded-2xl bg-emerald-600 px-5 py-4 font-bold disabled:bg-slate-700">Satış Paneli</button>
              <button disabled={!aktifIs} onClick={() => { setPlakaAcik(true); setMobileActionsOpen(false); }} className="rounded-2xl bg-indigo-600 px-5 py-4 font-bold disabled:bg-slate-700">Plaka Optimizasyonu</button>
              <button disabled={!aktifIs} onClick={() => { setTahsilatDeger(String(aktifIs?.tahsilat || "")); setTahsilatAcik(true); setMobileActionsOpen(false); }} className="rounded-2xl bg-amber-600 px-5 py-4 font-bold disabled:bg-slate-700">Tahsilat</button>
              <button disabled={!aktifIs} onClick={() => window.open(`/api/isler/${aktifIs?.id}/pdf`, "_blank")} className="rounded-2xl bg-slate-700 px-5 py-4 font-bold disabled:bg-slate-800">PDF Teklif</button>
              <button disabled={!aktifIs?.teklifNo} onClick={aktifWhatsappGonder} className="rounded-2xl bg-green-600 px-5 py-4 font-bold disabled:opacity-40">📲 WhatsApp ile Gönder</button>
              <button disabled={!aktifIs?.teklifNo} onClick={aktifLinkKopyala} className="rounded-2xl bg-slate-800 px-5 py-4 font-bold disabled:opacity-40">🔗 Linki Kopyala</button>
              <button disabled={!aktifIs} onClick={aktifRevizeEt} className="rounded-2xl bg-purple-600 px-5 py-4 font-bold disabled:opacity-40">✏️ Revize Teklif</button>
              <button disabled={!aktifIs?.teklifNo} onClick={aktifTakipMesajiKopyala} className="rounded-2xl bg-amber-600 px-5 py-4 font-bold disabled:opacity-40">⏱ Akıllı Takip Mesajı Kopyala</button>
            </div>
          </div>
        </div>
      )}


      {plakaAcik && (
        <div
          className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center"
          onClick={() => setPlakaAcik(false)}
        >
          <div
            className="w-[95vw] h-[95vh] bg-[#030712] rounded-xl p-4 overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-xl">Plaka Optimizasyonu</h2>
                <p className="text-sm text-slate-400">{aktifIs?.musteriAdi} · {aktifIs?.urunAdi}</p>
              </div>

              <button onClick={() => setPlakaAcik(false)} className="border border-slate-700 px-4 py-2 rounded">
                Kapat
              </button>
            </div>

            <PlakaPlanlayiciV2 embedded onApply={() => setPlakaAcik(false)} />
          </div>
        </div>
      )}

      {tahsilatAcik && aktifIs && (
        <div
          className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center"
          onClick={() => setTahsilatAcik(false)}
        >
          <div
            className="w-[480px] bg-[#0B1120] border border-slate-800 rounded-xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl mb-2">Tahsilat</h2>
            <p className="text-sm text-slate-400 mb-6">{aktifIs.musteriAdi}</p>

            <input
              value={tahsilatDeger}
              onChange={(e) => setTahsilatDeger(e.target.value)}
              placeholder="Tahsilat tutarı"
              className="w-full rounded-xl bg-[#111827] border border-slate-700 px-4 py-3 mb-3 outline-none"
            />

            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setTahsilatAcik(false)} className="w-full bg-slate-700 p-3 rounded">
                Kapat
              </button>

              <button
                onClick={async () => {
                  const res = await fetch("/api/is-tahsilat", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ id: aktifIs.id, tahsilat: tahsilatDeger }),
                  })

                  const json = await res.json()

                  if (!res.ok) {
                    alert(json.error || "Tahsilat kaydedilemedi.")
                    return
                  }

                  setIsler((prev) =>
                    prev.map((x) => x.id === aktifIs.id ? { ...x, tahsilat: Number(tahsilatDeger || 0) } : x)
                  )
                  setAktifIs((prev: any) => prev ? { ...prev, tahsilat: Number(tahsilatDeger || 0) } : prev)
                  setTahsilatAcik(false)
                }}
                className="w-full bg-emerald-600 p-3 rounded"
              >
                Kaydet
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}