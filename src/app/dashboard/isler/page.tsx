'use client'
import SwipeToDelete from '@/components/ui/SwipeToDelete'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { paraGoster } from '@/lib/format'
import { PlakaPlanlayiciV2 } from '@/components/plaka-planlayici/PlakaPlanlayiciV2'
import UretimPlaniModal from '@/components/schedule/UretimPlaniModal'

function whatsappTeklifGonder(is: any) {
  if (!is?.musteriTelefonu) { alert("Müşteri telefon numarası yok."); return; }
  let phone = is.musteriTelefonu.replace(/\D/g, "");
  if (phone.startsWith("0")) phone = "90" + phone.slice(1);
  if (!phone.startsWith("90")) phone = "90" + phone;
  const teklifLink = `${window.location.origin}/teklif/${is.teklifNo}`;
  const mesaj = `Merhaba ${is.musteriAdi || ""},\n\nSizin için hazırladığımız teklifi aşağıdaki linkten inceleyebilirsiniz:\n\n${teklifLink}\n\nHerhangi bir sorunuz olursa memnuniyetle yardımcı olurum.`;
  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(mesaj)}`, "_blank");
}

export default function IslerPage() {
  const router = useRouter()
  const [mobileView, setMobileView] = useState<'list' | 'detail'>('list')
  const [mobileActionsOpen, setMobileActionsOpen] = useState(false)
  const [isArama, setIsArama] = useState("")
  const [silinenIsId, setSilinenIsId] = useState<string|null>(null)
  const [durumFiltre, setDurumFiltre] = useState<string>("tumu")
  const [zamanFiltre, setZamanFiltre] = useState<string>("tumu")
  const [durumDegistirAcik, setDurumDegistirAcik] = useState(false)
  const [odemePopupAcik, setOdemePopupAcik] = useState(false)
  const [odemeSablonlar, setOdemeSablonlar] = useState<any[]>([])
  const [odemeSecili, setOdemeSecili] = useState<string | null>(null)
  const [odemeYukleniyor, setOdemeYukleniyor] = useState(false)
  const [bekleyenDurum, setBekleyenDurum] = useState<string | null>(null)
  const [durumDegistirYukleniyor, setDurumDegistirYukleniyor] = useState(false)
  const [filterSheetAcik, setFilterSheetAcik] = useState(false)
  const [draftDurum, setDraftDurum] = useState("tumu")
  const [draftZaman, setDraftZaman] = useState("tumu")

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

  function formatMusteriAdi(ad: string) {
    if (!ad) return "Sayın Müşteri"
    return "Sayın " + ad.toLowerCase().split(" ").map(k => k.charAt(0).toUpperCase() + k.slice(1)).join(" ")
  }

  function teklifTakipDurumu(i: any) {
    if (!i) return { seviye: "boş", baslik: "İş seçilmedi", metin: "", renk: "text-slate-400", skor: 0, etiket: "Boş", aksiyon: "İş seç", barColor: "#64748b" }
    const goruntulenme = Number(i.teklifGoruntulenmeSayisi || 0)
    const onaylandi = i.durum === "onaylandi"
    const simdi = Date.now()
    const created = i.createdAt ? new Date(i.createdAt).getTime() : simdi
    const sonBakis = i.teklifSonGoruntulenmeTarihi ? new Date(i.teklifSonGoruntulenmeTarihi).getTime() : null
    const teklifYasiSaat = (simdi - created) / 1000 / 60 / 60
    const son24SaatteBakildi = sonBakis ? (simdi - sonBakis) / 1000 / 60 / 60 <= 24 : false
    if (onaylandi) return { seviye: "onay", baslik: "Teklif onaylandı", metin: "Bu iş artık satış sonrası operasyon akışında.", renk: "text-emerald-300", skor: 5, etiket: "", aksiyon: "Operasyona al", barColor: "#10b981" }
    if (goruntulenme === 0) {
      if (teklifYasiSaat >= 72) return { seviye: "72s", baslik: "72 saattir açılmadı", metin: "Bu teklif soğuyor. Telefonla arama veya güçlü takip mesajı gerekli.", renk: "text-red-300", skor: 0, etiket: "Soğuk", aksiyon: "Ara veya yeniden gönder", barColor: "#ef4444" }
      if (teklifYasiSaat >= 48) return { seviye: "48s", baslik: "48 saattir açılmadı", metin: "İkinci takip mesajı zamanı.", renk: "text-amber-300", skor: 1, etiket: "Zayıf", aksiyon: "Takip mesajı gönder", barColor: "#f59e0b" }
      if (teklifYasiSaat >= 24) return { seviye: "24s", baslik: "24 saattir açılmadı", metin: "Nazik hatırlatma mesajı gönderilebilir.", renk: "text-blue-300", skor: 1, etiket: "Beklemede", aksiyon: "Nazik hatırlat", barColor: "#3b82f6" }
      return { seviye: "bekle", baslik: "Teklif beklemede", metin: "Henüz takip için erken.", renk: "text-slate-300", skor: 0, etiket: "Yeni", aksiyon: "Bekle", barColor: "#64748b" }
    }
    let skor = 1
    if (goruntulenme >= 2) skor = 2
    if (son24SaatteBakildi) skor = Math.max(skor, 3)
    if (goruntulenme >= 3) skor = Math.max(skor, 4)
    if (goruntulenme >= 5 || (goruntulenme >= 3 && son24SaatteBakildi)) skor = 5
    if (skor >= 5) return { seviye: "sıcak", baslik: "Çok sıcak müşteri", metin: "Müşteri teklife tekrar tekrar bakmış.", renk: "text-red-300", skor, etiket: "Ara hemen", aksiyon: "Hemen ara", barColor: "#ef4444" }
    if (skor >= 4) return { seviye: "sıcak", baslik: "Sıcak müşteri", metin: "Teklif birkaç kez incelenmiş.", renk: "text-orange-300", skor, etiket: "Sıcak", aksiyon: "Bugün dönüş yap", barColor: "#f97316" }
    if (skor >= 3) return { seviye: "bakıldı", baslik: "Müşteri teklife baktı", metin: "Son 24 saat içinde teklif açılmış.", renk: "text-blue-300", skor, etiket: "Aktif", aksiyon: "Takip et", barColor: "#3b82f6" }
    if (skor >= 2) return { seviye: "ilgili", baslik: "İlgili müşteri", metin: "Teklif tekrar incelenmiş.", renk: "text-amber-300", skor, etiket: "Isınıyor", aksiyon: "Mesaj gönder", barColor: "#f59e0b" }
    return { seviye: "bakıldı", baslik: "Müşteri teklife baktı", metin: "Teklif bir kez açılmış.", renk: "text-blue-300", skor, etiket: "Baktı", aksiyon: "Kısa takip", barColor: "#60a5fa" }
  }

  async function aktifTakipMesajiKopyala() {
    if (!aktifIs) return
    const link = aktifTeklifLinki()
    const takip = teklifTakipDurumu(aktifIs)
    const ad = formatMusteriAdi(aktifIs.musteriAdi)
    const urun = aktifIs.urunAdi || "teklif"
    let mesaj = ""
    if (aktifIs.durum === "onaylandi") {
      mesaj = `${ad}, teklif onayınız için teşekkür ederiz. ${urun} uygulamanız için üretim sürecini başlatıyoruz.`
    } else if (takip.skor >= 5) {
      mesaj = `${ad}, teklifinizi birkaç kez incelediğinizi gördüm. Fiyat, termin veya uygulama detayını netleştirip süreci bugün planlayabiliriz.\n\nTeklif linki:\n${link}`
    } else if (takip.skor === 4) {
      mesaj = `${ad}, teklifinizi tekrar incelediğinizi gördüm. Aklınıza takılan bir konu varsa hemen yardımcı olayım.\n\nTeklif linki:\n${link}`
    } else if (takip.skor === 3) {
      mesaj = `${ad}, teklifimizi incelediğinizi gördüm. Sormak istediğiniz bir konu varsa hemen yardımcı olabilirim.\n\nTeklif linki:\n${link}`
    } else if (takip.skor === 2) {
      mesaj = `${ad}, teklifimizi tekrar paylaşmak istedim. Aklınıza takılan bir detay varsa memnuniyetle yardımcı olurum.\n\nTeklif linki:\n${link}`
    } else if (takip.seviye === "24s") {
      mesaj = `${ad}, teklifimizi dün iletmiştim. Uygunsa aşağıdaki linkten inceleyebilirsiniz.\n\n${link}`
    } else if (takip.seviye === "48s") {
      mesaj = `${ad}, karar sürecinizde destek olmamı ister misiniz? Revize gerekiyorsa birlikte netleştirebiliriz.\n\n${link}`
    } else if (takip.seviye === "72s") {
      mesaj = `${ad}, teklifimizin hâlâ geçerli olduğunu hatırlatmak isterim. Fiyat/termin tarafını hızlıca revize edebiliriz.\n\n${link}`
    } else {
      mesaj = `${ad}, teklifinizi aşağıdaki linkten inceleyip onaylayabilirsiniz.\n\n${link}`
    }
    await navigator.clipboard.writeText(mesaj)
    alert("Akıllı takip mesajı kopyalandı.")
  }

  function aktifRevizeEt() {
    if (!aktifIs?.id) return
    router.push(`/is/detay?id=${aktifIs.id}`)
  }

  async function durumDegistir(yeniDurum: string) {
    if (!aktifIs?.id) return
    if (yeniDurum === "onaylandi") {
      setBekleyenDurum(yeniDurum)
      setOdemeSecili(null)
      setOdemePopupAcik(true)
      setOdemeYukleniyor(true)
      setDurumDegistirAcik(false)
      fetch(`/api/teklif/${aktifIs.teklifNo}/odeme-sablonlari`)
        .then(r => r.json())
        .then(d => { setOdemeSablonlar(d.sablonlar || []); setOdemeYukleniyor(false); })
        .catch(() => setOdemeYukleniyor(false))
      return
    }
    setDurumDegistirYukleniyor(true)
    try {
      const res = await fetch(`/api/isler/${aktifIs.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ durum: yeniDurum }),
      })
      if (!res.ok) throw new Error("Güncelleme başarısız")
      setIsler(prev => prev.map(x => x.id === aktifIs.id ? { ...x, durum: yeniDurum } : x))
      setAktifIs((prev: any) => prev ? { ...prev, durum: yeniDurum } : prev)
      setDurumDegistirAcik(false)
    } catch {
      alert("Durum güncellenemedi.")
    } finally {
      setDurumDegistirYukleniyor(false)
    }
  }

  async function odemeIleOnayla() {
    if (!aktifIs?.id || !odemeSecili) return
    setDurumDegistirYukleniyor(true)
    try {
      const res = await fetch(`/api/isler/${aktifIs.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ durum: "onaylandi", sablonId: odemeSecili }),
      })
      if (!res.ok) throw new Error("Güncelleme başarısız")
      setIsler(prev => prev.map(x => x.id === aktifIs.id ? { ...x, durum: "onaylandi" } : x))
      setAktifIs((prev: any) => prev ? { ...prev, durum: "onaylandi" } : prev)
      setOdemePopupAcik(false)
    } catch {
      alert("Durum güncellenemedi.")
    } finally {
      setDurumDegistirYukleniyor(false)
    }
  }

  const [isler, setIsler] = useState<any[]>([])
  const [aktifIs, setAktifIs] = useState<any | null>(null)
  const [scheduleMap, setScheduleMap] = useState<Record<string, any[]>>({})
  const [plakaAcik, setPlakaAcik] = useState(false)
  const [uretimPlaniAcik, setUretimPlaniAcik] = useState(false)
  const [tahsilatAcik, setTahsilatAcik] = useState(false)
  const [tahsilatDeger, setTahsilatDeger] = useState("")

  useEffect(() => {
    fetch('/api/isler').then(async r => {
      const text = await r.text()
      if (!text) return []
      try { return JSON.parse(text) } catch { return [] }
    }).then(v => {
      const liste = Array.isArray(v) ? v : (v.isler || [])
      liste.sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      setIsler(liste)
      if (liste.length > 0) setAktifIs(liste[0])
    })

    const now = new Date()
    fetch(`/api/schedule?year=${now.getFullYear()}&month=${now.getMonth() + 1}`).then(async r => {
      try {
        const data = await r.json()
        const arr = Array.isArray(data) ? data : []
        const map: Record<string, any[]> = {}
        arr.forEach((s: any) => {
          if (s.isId) map[s.isId] = s.phases || []
        })
        setScheduleMap(map)
      } catch {}
    })
  }, [])

  // Back button → açık mobil modal/drawer'ı kapat (route değişimi olmadan)
  const _modalPushed = useRef(false)
  useEffect(() => {
    const anyOpen = mobileActionsOpen || durumDegistirAcik || odemePopupAcik || plakaAcik || tahsilatAcik || uretimPlaniAcik || filterSheetAcik
    if (anyOpen && !_modalPushed.current) {
      _modalPushed.current = true
      window.history.pushState({ metrixIslerModal: true }, '')
      const onPop = () => {
        _modalPushed.current = false
        setMobileActionsOpen(false)
        setDurumDegistirAcik(false)
        setOdemePopupAcik(false)
        setPlakaAcik(false)
        setTahsilatAcik(false)
        setUretimPlaniAcik(false)
        setFilterSheetAcik(false)
      }
      window.addEventListener('popstate', onPop, { once: true })
    }
    if (!anyOpen && _modalPushed.current) {
      _modalPushed.current = false
      if (window.history.state?.metrixIslerModal) window.history.back()
    }
  }, [mobileActionsOpen, durumDegistirAcik, odemePopupAcik, plakaAcik, tahsilatAcik, uretimPlaniAcik])

  const ozet = useMemo(() => {
    const toplam = isler.length
    const onaylanan = isler.filter(i => i.durum === 'onaylandi').length
    const bekleyen = isler.filter(i => i.durum === 'teklif_verildi').length
    const kayip = isler.filter(i => i.durum === 'kaybedildi').length
    const montajTamamlandi = isler.filter(i => i.durum === 'montaj_tamamlandi').length
    return { toplam, onaylanan, bekleyen, kayip, montajTamamlandi }
  }, [isler])

  const aktifMaliyet = Number(aktifIs?.toplamMaliyet || 0)
  const aktifSatis = Number(aktifIs?.satisFiyati || 0)
  const aktifKar = aktifSatis - aktifMaliyet
  const aktifKarYuzde = aktifMaliyet > 0 ? (aktifKar / aktifMaliyet) * 100 : 0
  const isYuku = Math.round((Number(aktifIs?.toplamSureDakika || 0) / 720) * 100)

  function aktifFazBilgisi(isId: string) {
    const phases: any[] = scheduleMap[isId] || []
    if (!phases.length) return null
    const SIRA = ['OLCU', 'IMALAT', 'MONTAJ']
    const fazEtiket: Record<string, string> = { OLCU: 'Ölçü', IMALAT: 'İmalat', MONTAJ: 'Montaj' }
    // Tamamlanmamış en erken faz
    const aktif = SIRA.map(p => phases.find((ph: any) => ph.phase === p)).filter(Boolean)
      .find((ph: any) => !ph.isCompleted)
    if (!aktif) {
      // Hepsi tamamlanmış
      const montaj = phases.find((ph: any) => ph.phase === 'MONTAJ')
      if (montaj?.completedAt) return { label: 'Teslim Edildi', date: null, done: true }
      return null
    }
    const tarih = aktif.plannedStart ? new Date(aktif.plannedStart).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' }) : null
    return { label: (fazEtiket[aktif.phase] || aktif.phase) + ' Programı', date: tarih, done: false }
  }

  function durumRenk(durum?: string) {
    if (durum === 'onaylandi') return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
    if (durum === 'montaj_tamamlandi') return 'text-teal-400 border-teal-500/30 bg-teal-500/10'
    if (durum === 'kaybedildi') return 'text-red-400 border-red-500/30 bg-red-500/10'
    return 'text-amber-400 border-amber-500/30 bg-amber-500/10'
  }

  function durumEtiket(durum?: string) {
    if (durum === 'onaylandi') return 'Onaylandı'
    if (durum === 'montaj_tamamlandi') return '✓ Montaj Tamam'
    if (durum === 'kaybedildi') return 'Kaybedildi'
    if (durum === 'teklif_verildi') return 'Beklemede'
    if (durum === 'program_bekliyor') return 'Program Bekliyor'
    return durum || 'Belirsiz'
  }

  async function isSil(id: string) {
    if (!confirm('Bu işi silmek istediğinize emin misiniz?')) return
    await fetch(`/api/isler?id=${id}`, { method: 'DELETE' })
    setIsler(prev => prev.filter(x => x.id !== id))
    if (aktifIs?.id === id) setAktifIs(null)
  }

  const filtreliIsler = useMemo(() => {
    const q = isArama.trim().toLowerCase()
    let liste = isler

    if (durumFiltre !== "tumu") {
      if (durumFiltre === "program_bekliyor") {
        liste = liste.filter((item: any) => item.durum === "onaylandi" && !item.hasPlan)
      } else {
        liste = liste.filter((item: any) => item.durum === durumFiltre)
      }
    }

    if (zamanFiltre !== "tumu") {
      const simdi = Date.now()
      const sinir = zamanFiltre === "hafta" ? 7 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000
      liste = liste.filter((item: any) => {
        const t = item.createdAt ? new Date(item.createdAt).getTime() : 0
        return simdi - t <= sinir
      })
    }

    if (!q) return liste
    return liste.filter((item: any) =>
      [item.musteriAdi, item.urunAdi, item.teklifNo, item.durum, item.malzemeTipi]
        .filter(Boolean).join(" ").toLowerCase().includes(q)
    )
  }, [isler, isArama, durumFiltre, zamanFiltre])

  const aktifFiltreCount = (durumFiltre !== "tumu" ? 1 : 0) + (zamanFiltre !== "tumu" ? 1 : 0)

  function TasBadge({ durum }: { durum?: string }) {
    if (!durum) return null
    return (
      <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${durum === 'alinacak' ? 'border-amber-500/30 bg-amber-500/10 text-amber-300' : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'}`}>
        {durum === 'alinacak' ? 'Taş Alınacak' : 'Taş Stokta'}
      </span>
    )
  }

  return (
    <div className="h-[100dvh] flex flex-col md:flex-row bg-[#030712] text-white overflow-hidden">

      {/* MOBİL */}
      <div className="md:hidden flex h-full min-h-0 flex-col bg-[#030712] text-white">
        {mobileView === 'list' && (
          <div className="flex h-full min-h-0 flex-col">
            <div className="shrink-0 border-b border-slate-800 bg-[#030712] px-4 pb-4" style={{paddingTop:"max(16px, env(safe-area-inset-top, 16px))"}}>
              <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500">İş Takibi</p>
              <div className="mt-1 flex items-center justify-between gap-3">
                <h1 className="text-2xl font-black">İşler</h1>
                <button onClick={() => router.push('/dashboard/yeni-is-v3?fresh=1')} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold">+ Yeni</button>
              </div>

              {/* Arama */}
              <div className="mt-4 relative">
                <input
                  value={isArama}
                  onChange={(e) => setIsArama(e.target.value)}
                  placeholder="Müşteri, ürün veya teklif ara..."
                  className="w-full rounded-2xl border border-slate-800 bg-[#0B1120] px-4 py-4 pr-12 text-base text-white outline-none placeholder:text-slate-600"
                />
                {isArama && (
                  <button onClick={() => setIsArama("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                  </button>
                )}
              </div>

              {/* Compact filter toolbar */}
              <div className="mt-3 flex items-center gap-2 overflow-x-auto">
                <button
                  onClick={() => { setDraftDurum(durumFiltre); setDraftZaman(zamanFiltre); setFilterSheetAcik(true); }}
                  className="flex shrink-0 items-center gap-1.5 rounded-xl border border-white/[0.10] bg-white/[0.05] px-3 py-2 text-xs font-semibold text-slate-300"
                  aria-label="Filtreleri aç"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 4.5h18M7 9.5h10M11 14.5h2"/></svg>
                  Filtrele
                  {aktifFiltreCount > 0 && (
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 text-[9px] font-bold text-white">{aktifFiltreCount}</span>
                  )}
                </button>
                {durumFiltre !== "tumu" && (
                  <button onClick={() => setDurumFiltre("tumu")}
                    className="flex shrink-0 items-center gap-1 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-xs font-medium text-slate-300">
                    {durumEtiket(durumFiltre)}
                    <svg className="h-3 w-3 shrink-0 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                  </button>
                )}
                {zamanFiltre !== "tumu" && (
                  <button onClick={() => setZamanFiltre("tumu")}
                    className="flex shrink-0 items-center gap-1 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-xs font-medium text-slate-300">
                    {zamanFiltre === "ay" ? "Bu Ay" : "Bu Hafta"}
                    <svg className="h-3 w-3 shrink-0 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                  </button>
                )}
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto pb-8">
              {filtreliIsler.length === 0 && (
                <div className="flex flex-col items-center justify-center gap-3 p-12 text-center">
                  <div className="text-4xl">🔍</div>
                  <p className="text-slate-400 font-medium">İş bulunamadı</p>
                  <p className="text-slate-600 text-sm">Farklı bir filtre veya arama deneyin</p>
                  {(isArama || durumFiltre !== "tumu" || zamanFiltre !== "tumu") && (
                    <button onClick={() => { setIsArama(""); setDurumFiltre("tumu"); setZamanFiltre("tumu"); }}
                      className="mt-2 rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300">
                      Filtreleri Temizle
                    </button>
                  )}
                </div>
              )}
              {filtreliIsler.map((is: any) => (
                <SwipeToDelete key={is.id} onDelete={() => isSil(is.id)}>
                <button onClick={() => { setAktifIs(is); setMobileView('detail') }}
                  className="block w-full border-b border-slate-800 p-4 text-left active:bg-[#111827]">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-base font-black">{is.musteriAdi}</p>
                      {(() => {
                        const faz = aktifFazBilgisi(is.id);
                        if (is.durum === 'onaylandi' && !scheduleMap[is.id]?.length) return (
                          <div onClick={e => { e.stopPropagation(); setAktifIs(is); setUretimPlaniAcik(true); }}
                            className="mt-1 flex items-center gap-1 rounded-full bg-orange-500/10 border border-orange-500/30 px-2 py-0.5 text-[11px] font-semibold text-orange-300 cursor-pointer">
                            ⚠ Program Bekliyor
                          </div>
                        );
                        if (!faz) return null;
                        return (
                          <div className={`mt-1 flex items-center gap-1 text-[11px] font-semibold ${faz.done ? 'text-teal-400' : 'text-blue-300'}`}>
                            <span>{faz.done ? '✓ Teslim Edildi' : `${faz.label}${faz.date ? ': ' + faz.date : ''}`}</span>
                          </div>
                        );
                      })()}
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm text-slate-400">{is.urunAdi}</p>
                        {is.tasDurumu && (
                          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${is.tasDurumu === 'alinacak' ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30' : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'}`}>
                            {is.tasDurumu === 'alinacak' ? 'Taş alınacak' : 'Stokta'}
                          </span>
                        )}
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <p className="text-sm text-slate-500">{paraGoster(Number(is.satisFiyati || 0))}</p>
                        {is.createdAt && (
                          <p className="text-[10px] text-slate-600">{new Date(is.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}</p>
                        )}
                        {(() => {
                          const t = teklifTakipDurumu(is)
                          if (t.skor === 0 && t.seviye === "bekle") return null
                          return (
                            <span className="shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold"
                              style={{ color: t.barColor, borderColor: t.barColor + "44", background: t.barColor + "15" }}>
                              {t.etiket}
                            </span>
                          )
                        })()}
                      </div>
                    </div>
                    <span className={`shrink-0 rounded-full border px-3 py-1 text-xs ${durumRenk(is.durum)}`}>
                      {durumEtiket(is.durum)}
                    </span>
                  </div>
                </button>
                </SwipeToDelete>
              ))}
            </div>
          </div>
        )}

        {mobileView === 'detail' && aktifIs && (
          <div className="flex h-full min-h-0 flex-col">
            <div className="shrink-0 border-b border-slate-800 bg-[#030712] px-4 pb-3" style={{paddingTop:"max(16px, env(safe-area-inset-top, 16px))"}}>
              <div className="flex items-center justify-between gap-3">
                <button onClick={() => setMobileView('list')} className="rounded-xl border border-slate-700 bg-[#0B1120] px-4 py-3 text-sm font-bold min-w-[96px]">← İşler</button>
                <div className="flex gap-2">
                  <button onClick={() => router.push(`/dashboard/isler/${aktifIs?.id}`)} disabled={!aktifIs?.id} className="rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-sm font-bold text-blue-300 disabled:opacity-40">✏️</button>
                  <button onClick={aktifWhatsappGonder} disabled={!aktifIs?.teklifNo} className="rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm font-bold text-green-300 disabled:opacity-40">WA</button>
                  <button onClick={() => window.open(`/api/isler/${aktifIs?.id}/pdf`, "_blank")} disabled={!aktifIs?.id} className="rounded-xl border border-slate-700 bg-[#0B1120] px-4 py-3 text-sm font-bold disabled:opacity-40">PDF</button>
                  <button onClick={() => setMobileActionsOpen(true)} className="rounded-xl border border-slate-700 bg-[#0B1120] px-4 py-3 text-sm font-bold">···</button>
                </div>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4 pb-10">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500">Seçili İş</p>
                  <h2 className="mt-2 text-2xl font-black leading-tight">{aktifIs.musteriAdi}</h2>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <p className="text-base text-slate-400">{aktifIs.urunAdi}</p>
                    {aktifIs.tasDurumu && (
                      <span className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${aktifIs.tasDurumu === 'alinacak' ? 'border-amber-500/30 bg-amber-500/10 text-amber-300' : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'}`}>
                        {aktifIs.tasDurumu === 'alinacak' ? 'Taş alınacak' : 'Stokta'}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  {/* Durum değiştir butonu */}
                  <button onClick={() => setDurumDegistirAcik(true)}
                    className={`rounded-full border px-3 py-1 text-xs cursor-pointer hover:opacity-80 transition ${durumRenk(aktifIs.durum)}`}>
                    {durumEtiket(aktifIs.durum)} ▾
                  </button>
                  <span className="rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-xs font-bold text-purple-300">
                    v{Number(aktifIs.versiyon || 1)}
                  </span>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-slate-800 bg-[#111827] p-4"><p className="text-xs text-slate-400">Teklif Tutarı</p><p className="mt-2 text-xl text-emerald-400">{paraGoster(aktifSatis)}</p></div>
                <div className="rounded-2xl border border-slate-800 bg-[#111827] p-4"><p className="text-xs text-slate-400">Maliyet</p><p className="mt-2 text-xl">{paraGoster(aktifMaliyet)}</p></div>
                <div className="rounded-2xl border border-slate-800 bg-[#111827] p-4"><p className="text-xs text-slate-400">Kâr</p><p className="mt-2 text-xl text-yellow-400">{paraGoster(aktifKar)}</p></div>
                <div className="rounded-2xl border border-slate-800 bg-[#111827] p-4"><p className="text-xs text-slate-400">Kazanç</p><p className="mt-2 text-xl text-blue-400">%{aktifKarYuzde.toFixed(1)}</p></div>
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
                          <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, Math.max(0, takip.skor * 20))}%`, backgroundColor: takip.barColor }} />
                        </div>
                        <p className="mt-2 text-xs text-slate-400">Önerilen aksiyon: <b>{takip.aksiyon}</b></p>
                      </div>
                      <p className="mt-3 text-xs text-slate-500">
                        Görüntülenme: {Number(aktifIs.teklifGoruntulenmeSayisi || 0)} kez
                        {aktifIs.teklifSonGoruntulenmeTarihi ? ` · Son bakış: ${new Date(aktifIs.teklifSonGoruntulenmeTarihi).toLocaleString("tr-TR")}` : " · Henüz açılmadı"}
                      </p>
                      <button onClick={aktifTakipMesajiKopyala} className="mt-4 w-full rounded-2xl bg-slate-800 px-4 py-4 text-sm font-bold hover:bg-slate-700">Akıllı Takip Mesajı Kopyala</button>
                    </div>
                  )
                })()}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-slate-800 bg-[#0B1120] p-4"><p className="text-xs text-slate-400">Taş / Ürün</p><p className="mt-2 text-base font-bold">{aktifIs.urunAdi || '-'}</p><p className="mt-1 text-xs text-slate-500">{aktifIs.malzemeTipi || '-'}</p></div>
                <div className="rounded-2xl border border-slate-800 bg-[#0B1120] p-4"><p className="text-xs text-slate-400">Kaç Plaka?</p><p className="mt-2 text-2xl font-black">{Number(aktifIs.kullanilanPlakaSayisi || 0)} plaka</p><p className="mt-1 text-xs text-slate-500">{aktifIs.plakaGenislikCm || '-'} × {aktifIs.plakaUzunlukCm || '-'} cm</p></div>
                <div className="rounded-2xl border border-slate-800 bg-[#0B1120] p-4"><p className="text-xs text-slate-400">Toplam Süre</p><p className="mt-2 text-2xl font-black">{Number(aktifIs.toplamSureDakika || 0).toFixed(0)} dk</p></div>
                <div className="rounded-2xl border border-slate-800 bg-[#0B1120] p-4"><p className="text-xs text-slate-400">Tahsilat</p><p className="mt-2 text-2xl font-black text-cyan-400">{paraGoster(Number(aktifIs.tahsilat || 0))}</p></div>
              </div>

              {aktifIs.createdAt && (
                <div className="mt-4 rounded-2xl border border-slate-800 bg-[#0B1120] p-4">
                  <p className="text-xs text-slate-400">Oluşturulma</p>
                  <p className="mt-1 text-sm text-slate-300">{new Date(aktifIs.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                </div>
              )}

              <div className="mt-4 rounded-2xl border border-slate-800 bg-[#0B1120] p-4">
                <p className="text-xs text-slate-400">Notlar</p>
                <p className="mt-2 text-sm text-slate-300">{aktifIs.notlar || 'Bu iş için not girilmemiş.'}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MASAÜSTÜ SOL — LİSTE */}
      <div className="hidden md:flex md:w-[25%] border-r border-slate-800 flex-col">
        <div className="p-5 border-b border-slate-800">
          <p className="text-xs tracking-[0.25em] text-slate-500 uppercase">İş Takibi</p>
          <h1 className="text-xl mt-2">İşler</h1>
          <div className="grid grid-cols-4 gap-2 mt-4">
            <div className="bg-[#111827] rounded-lg p-2 text-center"><p className="text-[10px] text-slate-500">Toplam</p><p className="text-sm">{ozet.toplam}</p></div>
            <div className="bg-[#111827] rounded-lg p-2 text-center"><p className="text-[10px] text-slate-500">Bek.</p><p className="text-sm text-amber-400">{ozet.bekleyen}</p></div>
            <div className="bg-[#111827] rounded-lg p-2 text-center"><p className="text-[10px] text-slate-500">Onay</p><p className="text-sm text-emerald-400">{ozet.onaylanan}</p></div>
            <div className="bg-[#111827] rounded-lg p-2 text-center"><p className="text-[10px] text-slate-500">Kayıp</p><p className="text-sm text-red-400">{ozet.kayip}</p></div>
          </div>
        </div>

        <div className="border-b border-slate-800 p-3 flex flex-col gap-2">
          {/* Arama */}
          <div className="relative">
            <input value={isArama} onChange={(e) => setIsArama(e.target.value)} placeholder="İş ara..."
              className="w-full rounded-xl border border-slate-800 bg-[#0B1120] px-4 py-3 pr-10 text-sm text-white outline-none placeholder:text-slate-600" />
            {isArama && (
              <button onClick={() => setIsArama("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            )}
          </div>
          {/* Compact filter toolbar */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center rounded-xl border border-white/[0.06] bg-white/[0.03] p-1">
              {[
                { key: "tumu", label: "Tümü" },
                { key: "teklif_verildi", label: "Bekliyor" },
                { key: "onaylandi", label: "Onaylı" },
                { key: "program_bekliyor", label: "Program" },
                { key: "montaj_tamamlandi", label: "Montaj" },
                { key: "kaybedildi", label: "Kayıp" },
              ].map((opt) => (
                <button key={opt.key} onClick={() => setDurumFiltre(opt.key)}
                  className={`flex-1 rounded-lg py-1.5 text-[10px] font-semibold transition ${durumFiltre === opt.key ? 'bg-white/[0.10] text-white' : 'text-slate-500 hover:text-slate-300'}`}>
                  {opt.label}
                </button>
              ))}
            </div>
            <div className="flex items-center rounded-xl border border-white/[0.06] bg-white/[0.03] p-1">
              {[
                { key: "tumu", label: "Tüm Zamanlar" },
                { key: "ay", label: "Bu Ay" },
                { key: "hafta", label: "Bu Hafta" },
              ].map((opt) => (
                <button key={opt.key} onClick={() => setZamanFiltre(opt.key)}
                  className={`flex-1 rounded-lg py-1.5 text-[10px] font-semibold transition ${zamanFiltre === opt.key ? 'bg-white/[0.10] text-white' : 'text-slate-500 hover:text-slate-300'}`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-y-auto flex-1">
          {filtreliIsler.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-2 p-8 text-center">
              <p className="text-slate-500 text-sm">İş bulunamadı</p>
              {(isArama || durumFiltre !== "tumu" || zamanFiltre !== "tumu") && (
                <button onClick={() => { setIsArama(""); setDurumFiltre("tumu"); setZamanFiltre("tumu"); }}
                  className="text-xs text-blue-400 underline">Filtreleri temizle</button>
              )}
            </div>
          )}
          {filtreliIsler.map((is) => (
            <div key={is.id} onClick={() => setAktifIs(is)}
              className={`group relative p-4 border-b border-slate-800 cursor-pointer hover:bg-[#111827] ${aktifIs?.id === is.id ? 'bg-[#111827]' : ''}`}>

              <div className="flex justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">{is.musteriAdi}</p>
                  {(() => {
                    const faz = aktifFazBilgisi(is.id);
                    if (is.durum === 'onaylandi' && !scheduleMap[is.id]?.length) return (
                      <button onClick={e => { e.stopPropagation(); setAktifIs(is); setUretimPlaniAcik(true); }}
                        className="mt-0.5 flex items-center gap-1 rounded-full bg-orange-500/10 border border-orange-500/30 px-2 py-0.5 text-[10px] font-semibold text-orange-300">
                        ⚠ Program Bekliyor
                      </button>
                    );
                    if (!faz) return null;
                    return (
                      <p className={`text-[11px] font-semibold ${faz.done ? 'text-teal-400' : 'text-blue-300'}`}>
                        {faz.done ? '✓ Teslim Edildi' : `${faz.label}${faz.date ? ': ' + faz.date : ''}`}
                      </p>
                    );
                  })()}
                  <div className="mt-1 flex items-center gap-2">
                    <p className="text-xs text-slate-400">{is.urunAdi}</p>
                    {is.tasDurumu && (
                      <span className={`rounded-full px-2 py-0.5 text-[10px] ${is.tasDurumu === 'alinacak' ? 'bg-amber-500/10 text-amber-300' : 'bg-emerald-500/10 text-emerald-300'}`}>
                        {is.tasDurumu === 'alinacak' ? 'Taş alınacak' : 'Stokta'}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`h-fit rounded-full border px-2 py-1 text-[10px] ${durumRenk(is.durum)}`}>{durumEtiket(is.durum)}</span>
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between gap-2">
                <p className="text-xs text-slate-500">{paraGoster(Number(is.satisFiyati || 0))}</p>
                <div className="flex items-center gap-2">
                  {is.createdAt && <p className="text-[10px] text-slate-700">{new Date(is.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}</p>}
                  {(() => {
                    const t = teklifTakipDurumu(is)
                    if (t.skor === 0 && t.seviye === "bekle") return null
                    return (
                      <span className="shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold"
                        style={{ color: t.barColor, borderColor: t.barColor + "44", background: t.barColor + "15" }}>
                        {t.etiket}
                      </span>
                    )
                  })()}
                  <button onClick={e => { e.stopPropagation(); isSil(is.id); }}
                    className="hidden group-hover:flex items-center gap-1 rounded-lg bg-red-500/10 border border-red-500/30 px-2 py-0.5 text-[10px] font-bold text-red-400 hover:bg-red-500/25 transition">
                    🗑 Sil
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* MASAÜSTÜ ORTA — DETAY */}
      <div className="hidden md:flex md:w-[50%] p-6 flex-col gap-5 overflow-hidden">
        {!aktifIs && <div className="text-slate-400">Bir iş seç</div>}
        {aktifIs && (
          <>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs tracking-[0.25em] text-slate-500 uppercase">Seçili İş</p>
                <div className="mt-2 flex items-center gap-3">
                  <h2 className="text-xl md:text-2xl leading-tight">{aktifIs.musteriAdi}</h2>
                  <span className="rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-xs font-bold text-purple-300">v{Number(aktifIs.versiyon || 1)}</span>
                </div>
                <div className="mt-2 flex items-center gap-3">
                  <p className="text-slate-400 text-sm">{aktifIs.urunAdi}</p>
                  <TasBadge durum={aktifIs.tasDurumu} />
                </div>
                {aktifIs.createdAt && (
                  <p className="mt-1 text-xs text-slate-600">{new Date(aktifIs.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                )}
              </div>
              {/* Durum değiştir */}
              <button onClick={() => setDurumDegistirAcik(true)}
                className={`rounded-full border px-3 py-1 text-xs cursor-pointer hover:opacity-80 transition ${durumRenk(aktifIs.durum)}`}>
                {durumEtiket(aktifIs.durum)} ▾
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              <div className="bg-[#111827] border border-slate-800 p-3 md:p-4 rounded-xl"><p className="text-xs text-slate-400">Teklif Tutarı</p><p className="text-lg mt-2 text-emerald-400">{paraGoster(aktifSatis)}</p></div>
              <div className="bg-[#111827] border border-slate-800 p-3 md:p-4 rounded-xl"><p className="text-xs text-slate-400">Maliyet</p><p className="text-lg mt-2">{paraGoster(aktifMaliyet)}</p></div>
              <div className="bg-[#111827] border border-slate-800 p-3 md:p-4 rounded-xl"><p className="text-xs text-slate-400">Kâr</p><p className="text-lg mt-2 text-yellow-400">{paraGoster(aktifKar)}</p></div>
              <div className="bg-[#111827] border border-slate-800 p-3 md:p-4 rounded-xl"><p className="text-xs text-slate-400">Kazanç</p><p className="text-lg mt-2 text-blue-400">%{aktifKarYuzde.toFixed(1)}</p></div>
            </div>

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
                          <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, Math.max(0, takip.skor * 20))}%`, backgroundColor: takip.barColor }} />
                        </div>
                        <p className="mt-2 text-xs text-slate-400">Önerilen aksiyon: <b>{takip.aksiyon}</b></p>
                      </div>
                      <p className="mt-2 text-xs text-slate-500">
                        Görüntülenme: {Number(aktifIs.teklifGoruntulenmeSayisi || 0)} kez
                        {aktifIs.teklifSonGoruntulenmeTarihi ? ` · Son bakış: ${new Date(aktifIs.teklifSonGoruntulenmeTarihi).toLocaleString("tr-TR")}` : " · Henüz açılmadı"}
                      </p>
                    </div>
                    <button onClick={aktifTakipMesajiKopyala} className="w-full md:w-auto shrink-0 rounded-xl bg-slate-800 px-4 py-3 text-sm font-bold hover:bg-slate-700">Akıllı Takip Mesajı Kopyala</button>
                  </div>
                )
              })()}
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="bg-[#0B1120] border border-slate-800 p-3 md:p-4 rounded-xl"><p className="text-xs text-slate-400">Taş / Ürün</p><p className="mt-2 text-sm">{aktifIs.urunAdi || '-'}</p><p className="mt-1 text-xs text-slate-500">{aktifIs.malzemeTipi || '-'}</p></div>
              <div className="bg-[#0B1120] border border-slate-800 p-3 md:p-4 rounded-xl"><p className="text-xs text-slate-400">Kaç Plaka Lazım?</p><p className="mt-2 text-xl">{Number(aktifIs.kullanilanPlakaSayisi || 0)} plaka</p><p className="mt-1 text-xs text-slate-500">{aktifIs.plakaGenislikCm || '-'} × {aktifIs.plakaUzunlukCm || '-'} cm</p></div>
              <div className="bg-[#0B1120] border border-slate-800 p-3 md:p-4 rounded-xl"><p className="text-xs text-slate-400">Taş Durumu</p><p className={`mt-2 text-lg ${aktifIs.tasDurumu === 'alinacak' ? 'text-amber-400' : aktifIs.tasDurumu ? 'text-emerald-400' : 'text-slate-400'}`}>{aktifIs.tasDurumu === 'alinacak' ? 'Taş Alınacak' : aktifIs.tasDurumu ? 'Taş Stokta' : 'Belirsiz'}</p></div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="bg-[#0B1120] border border-slate-800 p-3 md:p-4 rounded-xl"><p className="text-xs text-slate-400">Toplam Süre</p><p className="mt-2 text-xl">{Number(aktifIs.toplamSureDakika || 0).toFixed(0)} dk</p></div>
              <div className="bg-[#0B1120] border border-slate-800 p-3 md:p-4 rounded-xl"><p className="text-xs text-slate-400">Atölye İş Yükü</p><p className={`mt-2 text-xl ${isYuku > 100 ? 'text-red-400' : isYuku > 70 ? 'text-amber-400' : 'text-emerald-400'}`}>%{isYuku}</p></div>
              <div className="bg-[#0B1120] border border-slate-800 p-3 md:p-4 rounded-xl"><p className="text-xs text-slate-400">Tahsilat</p><p className="mt-2 text-xl text-cyan-400">{paraGoster(Number(aktifIs.tahsilat || 0))}</p></div>
            </div>

            <div className="bg-[#0B1120] border border-slate-800 p-5 rounded-xl flex-1">
              <p className="text-xs text-slate-400 mb-3">Notlar</p>
              <p className="text-sm text-slate-300">{aktifIs.notlar || 'Bu iş için not girilmemiş.'}</p>
            </div>
          </>
        )}
      </div>

      {/* MASAÜSTÜ SAĞ — AKSIYONLAR */}
      <div className="hidden md:flex md:w-[25%] p-6 border-l border-slate-800 flex-col gap-4">
        <button onClick={() => router.push('/dashboard/yeni-is-v3?fresh=1')} className="bg-blue-600 hover:bg-blue-500 p-4 rounded-xl font-semibold">+ Yeni İş</button>
        <button disabled={!aktifIs} onClick={() => router.push(`/dashboard/yeni-is-v3?duzenle=${aktifIs?.id}`)} className="bg-blue-600 hover:bg-blue-500 p-4 rounded-xl disabled:bg-slate-700">✏️ Düzenle</button>
        <button disabled={!aktifIs} onClick={() => router.push(`/is/detay?id=${aktifIs?.id}`)} className="bg-emerald-600 hover:bg-emerald-500 p-4 rounded-xl disabled:bg-slate-700">Satış Paneli</button>
        <button disabled={!aktifIs} onClick={() => setPlakaAcik(true)} className="bg-indigo-600 hover:bg-indigo-500 p-4 rounded-xl disabled:bg-slate-700">Plaka Optimizasyonu</button>
        <button disabled={!aktifIs} onClick={() => router.push(aktifIs?.musteriId ? `/dashboard/tahsilatlar?isId=${aktifIs.id}` : '/dashboard/tahsilatlar')} className="bg-amber-600 hover:bg-amber-500 p-4 rounded-xl disabled:bg-slate-700">Tahsilat</button>
        <button disabled={!aktifIs} onClick={() => setUretimPlaniAcik(true)} className="bg-purple-600 hover:bg-purple-500 p-4 rounded-xl disabled:bg-slate-700">Üretim Planı</button>
        <button disabled={!aktifIs} onClick={() => window.open(`/api/isler/${aktifIs?.id}/pdf`, "_blank")} className="bg-slate-700 hover:bg-slate-600 p-4 rounded-xl disabled:bg-slate-800">PDF Teklif</button>
        <button onClick={aktifWhatsappGonder} disabled={!aktifIs?.teklifNo} className="w-full rounded-2xl bg-green-600 px-5 py-4 text-white font-bold hover:bg-green-500 disabled:opacity-40">📲 WhatsApp ile Gönder</button>
        <button onClick={aktifLinkKopyala} disabled={!aktifIs?.teklifNo} className="w-full rounded-2xl bg-slate-800 px-5 py-4 text-white font-bold hover:bg-slate-700 disabled:opacity-40">🔗 Linki Kopyala</button>
        <button onClick={aktifRevizeEt} disabled={!aktifIs} className="w-full rounded-2xl bg-purple-600 px-5 py-4 text-white font-bold hover:bg-purple-500 disabled:opacity-40">✏️ Revize Teklif</button>
        <button onClick={aktifTakipMesajiKopyala} disabled={!aktifIs?.teklifNo} className="w-full rounded-2xl bg-amber-600 px-5 py-4 text-white font-bold hover:bg-amber-500 disabled:opacity-40">⏱ Akıllı Takip Mesajı Kopyala</button>
      </div>

      {/* FİLTRE BOTTOM SHEET */}
      {filterSheetAcik && (
        <div className="fixed inset-0 z-[200] flex items-end md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setFilterSheetAcik(false)} />
          <div className="relative w-full rounded-t-3xl border-t border-white/[0.08] bg-[#0B1120]" style={{paddingBottom:"env(safe-area-inset-bottom, 0px)"}}>
            <div className="flex justify-center pb-1 pt-3">
              <div className="h-1 w-10 rounded-full bg-white/20" />
            </div>
            <div className="px-5 pb-6 pt-2">
              <h3 className="mb-4 text-sm font-semibold text-white">Filtrele</h3>
              <p className="mb-2 text-[11px] uppercase tracking-[0.15em] text-slate-500">Durum</p>
              <div className="mb-5 flex flex-wrap gap-2">
                {[
                  { key: "tumu", label: "Tümü" },
                  { key: "teklif_verildi", label: "Beklemede" },
                  { key: "onaylandi", label: "Onaylı" },
                  { key: "program_bekliyor", label: "Program Bekliyor" },
                  { key: "montaj_tamamlandi", label: "Montaj Tamam" },
                  { key: "kaybedildi", label: "Kayıp" },
                ].map((opt) => (
                  <button key={opt.key} onClick={() => setDraftDurum(opt.key)}
                    className={`rounded-xl border px-4 py-2.5 text-xs font-semibold transition ${draftDurum === opt.key ? 'border-blue-500/50 bg-blue-500/15 text-blue-300' : 'border-white/[0.08] bg-white/[0.03] text-slate-400'}`}>
                    {opt.label}
                  </button>
                ))}
              </div>
              <p className="mb-2 text-[11px] uppercase tracking-[0.15em] text-slate-500">Zaman</p>
              <div className="mb-6 flex gap-2">
                {[
                  { key: "tumu", label: "Tüm Zamanlar" },
                  { key: "ay", label: "Bu Ay" },
                  { key: "hafta", label: "Bu Hafta" },
                ].map((opt) => (
                  <button key={opt.key} onClick={() => setDraftZaman(opt.key)}
                    className={`rounded-xl border px-4 py-2.5 text-xs font-semibold transition ${draftZaman === opt.key ? 'border-blue-500/50 bg-blue-500/15 text-blue-300' : 'border-white/[0.08] bg-white/[0.03] text-slate-400'}`}>
                    {opt.label}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => { setDraftDurum("tumu"); setDraftZaman("tumu"); }}
                  className="rounded-xl border border-white/[0.08] bg-white/[0.03] py-3.5 text-sm font-semibold text-slate-400">
                  Temizle
                </button>
                <button onClick={() => { setDurumFiltre(draftDurum); setZamanFiltre(draftZaman); setFilterSheetAcik(false); }}
                  className="rounded-xl bg-blue-600 py-3.5 text-sm font-semibold text-white">
                  Uygula{(draftDurum !== "tumu" || draftZaman !== "tumu") ? ` (${(draftDurum !== "tumu" ? 1 : 0) + (draftZaman !== "tumu" ? 1 : 0)})` : ""}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MOBİL DRAWER */}
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
              <button onClick={() => router.push('/dashboard/yeni-is-v3?fresh=1')} className="rounded-2xl bg-blue-600 px-5 py-4 font-bold">+ Yeni İş</button>
              <button disabled={!aktifIs} onClick={() => router.push(`/dashboard/yeni-is-v3?duzenle=${aktifIs?.id}`)} className="rounded-2xl bg-blue-600 px-5 py-4 font-bold disabled:bg-slate-700">✏️ Düzenle</button>
              <button disabled={!aktifIs} onClick={() => router.push(`/is/detay?id=${aktifIs?.id}`)} className="rounded-2xl bg-emerald-600 px-5 py-4 font-bold disabled:bg-slate-700">Satış Paneli</button>
              <button disabled={!aktifIs} onClick={() => { setPlakaAcik(true); setMobileActionsOpen(false); }} className="rounded-2xl bg-indigo-600 px-5 py-4 font-bold disabled:bg-slate-700">Plaka Optimizasyonu</button>
              <button disabled={!aktifIs} onClick={() => { setMobileActionsOpen(false); setUretimPlaniAcik(true); }} className="rounded-2xl bg-purple-600 px-5 py-4 font-bold disabled:bg-slate-700">Üretim Planı</button>
              <button disabled={!aktifIs} onClick={() => { setMobileActionsOpen(false); router.push(aktifIs?.musteriId ? `/dashboard/tahsilatlar?isId=${aktifIs.id}` : '/dashboard/tahsilatlar'); }} className="rounded-2xl bg-amber-600 px-5 py-4 font-bold disabled:bg-slate-700">Tahsilat</button>
              <button disabled={!aktifIs} onClick={() => window.open(`/api/isler/${aktifIs?.id}/pdf`, "_blank")} className="rounded-2xl bg-slate-700 px-5 py-4 font-bold disabled:bg-slate-800">PDF Teklif</button>
              <button disabled={!aktifIs?.teklifNo} onClick={aktifWhatsappGonder} className="rounded-2xl bg-green-600 px-5 py-4 font-bold disabled:opacity-40">📲 WhatsApp ile Gönder</button>
              <button disabled={!aktifIs?.teklifNo} onClick={aktifLinkKopyala} className="rounded-2xl bg-slate-800 px-5 py-4 font-bold disabled:opacity-40">🔗 Linki Kopyala</button>
              <button disabled={!aktifIs} onClick={aktifRevizeEt} className="rounded-2xl bg-purple-600 px-5 py-4 font-bold disabled:opacity-40">✏️ Revize Teklif</button>
              <button disabled={!aktifIs?.teklifNo} onClick={aktifTakipMesajiKopyala} className="rounded-2xl bg-amber-600 px-5 py-4 font-bold disabled:opacity-40">⏱ Akıllı Takip Mesajı Kopyala</button>
            </div>
          </div>
        </div>
      )}

      {/* DURUM DEĞİŞTİR MODAL */}
      
      {odemePopupAcik && aktifIs && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 p-4" onClick={() => setOdemePopupAcik(false)}>
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-[#0B1120] p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <p className="text-xs tracking-[0.25em] text-slate-500 uppercase">Ödeme Planı</p>
            <h2 className="mt-2 text-xl font-semibold mb-1">Ödeme planı seçin</h2>
            <p className="text-sm text-slate-400 mb-4">{aktifIs.musteriAdi} · {Number(aktifIs.kdvDahilFiyat || aktifIs.satisFiyati || 0).toLocaleString('tr-TR', {minimumFractionDigits:2})} ₺</p>
            {odemeYukleniyor && <p className="text-slate-400 text-sm">Yükleniyor…</p>}
            <div className="grid gap-3 mb-4">
              {odemeSablonlar.map((s: any) => {
                const aktif = odemeSecili === s.id
                const tutar = Number(aktifIs.kdvDahilFiyat || aktifIs.satisFiyati || 0)
                return (
                  <div key={s.id} onClick={() => setOdemeSecili(s.id)}
                    className={`rounded-xl border px-4 py-3 cursor-pointer ${aktif ? 'border-blue-500 bg-blue-600/20' : 'border-slate-700 hover:bg-slate-800'}`}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-semibold">{s.ad}</span>
                      {aktif && <span className="text-xs bg-blue-600 text-white rounded-full px-2 py-0.5">Seçildi</span>}
                    </div>
                    {s.aciklama && <p className="text-xs text-slate-400 mb-2">{s.aciklama}</p>}
                    <div className="flex flex-col gap-1">
                      {s.taksitler.map((t: any) => (
                        <div key={t.taksitNo} className="text-xs text-slate-300">
                          {t.aciklama} — <b>{((tutar * t.yuzde) / 100).toLocaleString('tr-TR', {minimumFractionDigits:2})} ₺</b> <span className="text-slate-500">(%{t.yuzde})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="grid gap-2">
              <button disabled={!odemeSecili || durumDegistirYukleniyor} onClick={odemeIleOnayla}
                className={`rounded-xl px-4 py-3 font-semibold ${odemeSecili ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-slate-700 text-slate-400 cursor-not-allowed'}`}>
                {durumDegistirYukleniyor ? 'İşleniyor…' : '✔ Onayla'}
              </button>
              <button onClick={() => setOdemePopupAcik(false)} className="rounded-xl border border-slate-700 px-4 py-3 text-slate-300 hover:bg-slate-800">Vazgeç</button>
            </div>
          </div>
        </div>
      )}

      {durumDegistirAcik && aktifIs && (
        <div className="fixed inset-0 z-[150] flex items-end md:items-center justify-center bg-black/70" onClick={() => setDurumDegistirAcik(false)}>
          <div className="w-full md:w-[360px] bg-[#0B1120] border border-slate-800 rounded-t-2xl md:rounded-2xl p-6" onClick={e => e.stopPropagation()}>
            <p className="text-xs uppercase tracking-widest text-slate-500 mb-1">Durum Değiştir</p>
            <h3 className="text-base font-bold text-white mb-5">{aktifIs.musteriAdi}</h3>
            <div className="flex flex-col gap-3">
              {[
                { key: "teklif_verildi", label: "Beklemede", renk: "bg-amber-500/10 border-amber-500/30 text-amber-300" },
                { key: "onaylandi", label: "Onaylandı", renk: "bg-emerald-500/10 border-emerald-500/30 text-emerald-300" },
                { key: "montaj_tamamlandi", label: "Montaj Tamam", renk: "bg-teal-500/10 border-teal-500/30 text-teal-300" },
                { key: "kaybedildi", label: "Kaybedildi", renk: "bg-red-500/10 border-red-500/30 text-red-300" },
              ].map(d => (
                <button key={d.key} onClick={() => durumDegistir(d.key)} disabled={durumDegistirYukleniyor || aktifIs.durum === d.key}
                  className={`w-full rounded-xl border px-4 py-3 text-sm font-semibold transition ${d.renk} ${aktifIs.durum === d.key ? 'opacity-40 cursor-not-allowed' : 'hover:opacity-80'}`}>
                  {aktifIs.durum === d.key ? `✓ ${d.label} (mevcut)` : d.label}
                </button>
              ))}
            </div>
            <button onClick={() => setDurumDegistirAcik(false)} className="mt-4 w-full rounded-xl bg-slate-800 py-3 text-sm text-slate-400">İptal</button>
          </div>
        </div>
      )}

      {/* ÜRETİM PLANI MODAL */}
      {uretimPlaniAcik && (
        <UretimPlaniModal
          is={aktifIs}
          onClose={() => setUretimPlaniAcik(false)}
          onSuccess={() => { setUretimPlaniAcik(false) }}
        />
      )}

      {/* PLAKA MODAl */}
      {plakaAcik && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center" onClick={() => setPlakaAcik(false)}>
          <div className="w-[95vw] h-[95vh] bg-[#030712] rounded-xl p-4 overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <div><h2 className="text-xl">Plaka Optimizasyonu</h2><p className="text-sm text-slate-400">{aktifIs?.musteriAdi} · {aktifIs?.urunAdi}</p></div>
              <button onClick={() => setPlakaAcik(false)} className="border border-slate-700 px-4 py-2 rounded">Kapat</button>
            </div>
            <PlakaPlanlayiciV2 embedded onApply={() => setPlakaAcik(false)} />
          </div>
        </div>
      )}

      {/* TAHSİLAT MODAl */}
      {tahsilatAcik && aktifIs && (
        <div className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center" onClick={() => setTahsilatAcik(false)}>
          <div className="w-[480px] bg-[#0B1120] border border-slate-800 rounded-xl p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl mb-2">Tahsilat</h2>
            <p className="text-sm text-slate-400 mb-1">{aktifIs.musteriAdi}</p>
            <p className="text-xs text-slate-500 mb-4">{aktifIs.teklifNo} · {aktifIs.urunAdi} — bu işe otomatik bağlanacak</p>
            <input value={tahsilatDeger} onChange={(e) => setTahsilatDeger(e.target.value)} placeholder="Tahsilat tutarı (₺)"
              type="number" min="0"
              className="w-full rounded-xl bg-[#111827] border border-slate-700 px-4 py-3 mb-3 outline-none text-xl font-semibold" />
            <input type="date" defaultValue={new Date().toISOString().slice(0,10)} id="tahsilatTarih"
              className="w-full rounded-xl bg-[#111827] border border-slate-700 px-4 py-3 mb-4 outline-none" />
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setTahsilatAcik(false)} className="w-full bg-slate-700 p-3 rounded">Kapat</button>
              <button onClick={async () => {
                const tutar = Number(tahsilatDeger || 0)
                if (!tutar || tutar <= 0) { alert("Geçerli bir tutar girin."); return; }
                if (!aktifIs.musteriId) { alert("Bu işe bağlı müşteri yok."); return; }
                const tarihEl = document.getElementById("tahsilatTarih") as HTMLInputElement
                const res = await fetch("/api/tahsilatlar", {
                  method: "POST", headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ musteriId: aktifIs.musteriId, isId: aktifIs.id, tutar, tarih: tarihEl?.value || new Date().toISOString().slice(0,10) }),
                })
                const json = await res.json()
                if (!res.ok) { alert(json.hata || "Tahsilat kaydedilemedi."); return; }
                setTahsilatAcik(false)
                setTahsilatDeger("")
              }} className="w-full bg-emerald-600 p-3 rounded font-bold">Kaydet</button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
