'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

function tl(v: any) {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(Number(v || 0))
}
function pct(v: any) { return `${Number(v || 0).toFixed(0)}%` }
function toTitleCase(str: string) {
  return (str || '').toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}
function musteriAdi(m: any) {
  if (!m) return 'İsimsiz müşteri'
  return toTitleCase(m.firmaAdi || [m.ad, m.soyad].filter(Boolean).join(' ') || 'İsimsiz müşteri')
}
function telefonTemizle(v: string) {
  let phone = String(v || '').replace(/\D/g, '')
  if (phone.startsWith('0')) phone = '90' + phone.slice(1)
  if (phone && !phone.startsWith('90')) phone = '90' + phone
  return phone
}
function tarihFmt(d: any) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function musteriTipiLabel(tip: string) {
  const tipler: Record<string, string> = {
    bayi: 'Bayi', mimar: 'Mimar', son_kullanici: 'Son Kullanıcı', muteahhit: 'Müteahhit'
  }
  return tipler[tip] || tip
}

function musteriTipiRenk(tip: string) {
  const renkler: Record<string, string> = {
    bayi: 'border-purple-500/30 bg-purple-500/10 text-purple-300',
    mimar: 'border-blue-500/30 bg-blue-500/10 text-blue-300',
    son_kullanici: 'border-slate-500/30 bg-slate-500/10 text-slate-300',
    muteahhit: 'border-orange-500/30 bg-orange-500/10 text-orange-300',
  }
  return renkler[tip] || 'border-white/10 bg-white/5 text-slate-400'
}

function analiz(m: any) {
  const isler = Array.isArray(m?.isler) ? m.isler : []
  const tahsilatlar = Array.isArray(m?.tahsilatlar) ? m.tahsilatlar : []
  const teklifSayisi = isler.length
  const onayli = isler.filter((i: any) => i.durum === 'onaylandi')
  const bekleyen = isler.filter((i: any) => i.durum === 'teklif_verildi')
  const onaySayisi = onayli.length
  const bekleyenSayisi = bekleyen.length
  const verilenTeklifCiro = isler.reduce((a: number, i: any) => a + Number(i.satisFiyati || 0), 0)
  const onayliCiro = onayli.reduce((a: number, i: any) => a + Number(i.satisFiyati || 0), 0)
  const tahsilat = tahsilatlar.reduce((a: number, t: any) => a + Number(t.tutar || 0), 0)
  const acilis = Number(m?.acilisBakiyesi || 0) * (m?.bakiyeTipi === 'alacak' ? -1 : 1)
  const bakiye = onayliCiro - tahsilat + acilis
  const onayOrani = teklifSayisi > 0 ? (onaySayisi / teklifSayisi) * 100 : 0
  const tahsilatOrani = onayliCiro > 0 ? (tahsilat / onayliCiro) * 100 : 0
  const aylikCiro: Record<string, number> = {}
  const simdi = new Date()
  for (let i = 5; i >= 0; i--) {
    const d = new Date(simdi.getFullYear(), simdi.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    aylikCiro[key] = 0
  }
  onayli.forEach((is: any) => {
    const t = is.onaylanmaTarihi || is.createdAt
    if (!t) return
    const d = new Date(t)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (key in aylikCiro) aylikCiro[key] += Number(is.satisFiyati || 0)
  })
  let durum = 'Yeni müşteri'
  let yorum = 'Henüz yeterli veri yok. İlk teklif ve takip süreciyle performans oluşacak.'
  let renk = 'text-slate-300'
  if (onayliCiro > 150000 && tahsilatOrani >= 80 && onayOrani >= 50) {
    durum = 'Güçlü müşteri'; yorum = 'Yüksek ciro, iyi tahsilat ve sağlıklı onay oranı var. Öncelikli müşteri.'; renk = 'text-emerald-300'
  } else if (bakiye > 100000 && tahsilatOrani < 50) {
    durum = 'Tahsilat riski'; yorum = 'Açık bakiye yüksek. Yeni teklif öncesi ödeme planı netleştirilmeli.'; renk = 'text-amber-300'
  } else if (onayOrani >= 40) {
    durum = 'Potansiyel müşteri'; yorum = 'Teklif dönüşü iyi. Doğru takip ve hızlı terminle büyütülebilir.'; renk = 'text-blue-300'
  } else if (teklifSayisi >= 3 && onayOrani < 30) {
    durum = 'Düşük dönüş'; yorum = 'Çok teklif, düşük kapanış. Fiyat, ikna veya ürün stratejisi değişmeli.'; renk = 'text-red-300'
  }
  return { teklifSayisi, onaySayisi, bekleyenSayisi, verilenTeklifCiro, onayliCiro, tahsilat, bakiye, onayOrani, tahsilatOrani, durum, yorum, renk, aylikCiro }
}

function Card({ children, className = '' }: any) {
  return <div className={`rounded-3xl border border-white/10 bg-white/[0.045] shadow-2xl shadow-black/20 backdrop-blur-xl ${className}`}>{children}</div>
}

function MiniStat({ label, value, tone = 'text-white', sub }: any) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-2.5 min-w-0">
      <p className="text-[10px] text-slate-400 truncate">{label}</p>
      <p className={`mt-1 text-sm xl:text-base font-semibold truncate ${tone}`}>{value}</p>
      {sub && <p className="mt-0.5 text-[10px] text-slate-500 truncate">{sub}</p>}
    </div>
  )
}

function Progress({ label, value }: any) {
  const safe = Math.max(0, Math.min(100, Number(value || 0)))
  return (
    <div>
      <div className="flex items-center justify-between text-xs text-slate-400"><span>{label}</span><span>{pct(safe)}</span></div>
      <div className="mt-2 h-2 rounded-full bg-white/10 overflow-hidden">
        <div className="h-full rounded-full bg-emerald-400" style={{ width: `${safe}%` }} />
      </div>
    </div>
  )
}

function DurumBadge({ durum }: { durum: string }) {
  const cls = durum === 'onaylandi' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : durum === 'kaybedildi' ? 'border-red-500/30 bg-red-500/10 text-red-300' : 'border-amber-500/30 bg-amber-500/10 text-amber-300'
  const label = durum === 'onaylandi' ? 'Onaylandı' : durum === 'kaybedildi' ? 'Kaybedildi' : 'Beklemede'
  return <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${cls}`}>{label}</span>
}

function AylikCiroChart({ aylikCiro }: { aylikCiro: Record<string, number> }) {
  const entries = Object.entries(aylikCiro)
  const maxVal = Math.max(...entries.map(([, v]) => v), 1)
  const ayAdlari: Record<string, string> = { '01':'Oca','02':'Şub','03':'Mar','04':'Nis','05':'May','06':'Haz','07':'Tem','08':'Ağu','09':'Eyl','10':'Eki','11':'Kas','12':'Ara' }
  return (
    <div className="flex items-end gap-1.5 h-16">
      {entries.map(([key, val]) => {
        const ay = key.split('-')[1]
        const yuzde = (val / maxVal) * 100
        return (
          <div key={key} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full rounded-t-lg bg-emerald-400/20 hover:bg-emerald-400/40 transition relative group" style={{ height: `${Math.max(yuzde, 4)}%`, minHeight: 4 }}>
              {val > 0 && <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-800 border border-white/10 rounded-lg px-2 py-1 text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition z-10">{tl(val)}</div>}
              {val > 0 && <div className="w-full h-full rounded-t-lg bg-emerald-400/60" />}
            </div>
            <span className="text-[9px] text-slate-500">{ayAdlari[ay] || ay}</span>
          </div>
        )
      })}
    </div>
  )
}

export default function MusterilerPage() {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement | null>(null)
  const [musteriler, setMusteriler] = useState<any[]>([])
  const [aktif, setAktif] = useState<any>(null)
  const [arama, setArama] = useState('')
  const [yukleniyor, setYukleniyor] = useState(true)
  const [modal, setModal] = useState(false)
  const [duzenle, setDuzenle] = useState(false)
  const [mobilDetayAcik, setMobilDetayAcik] = useState(false)
  const [mobilYeniAcik, setMobilYeniAcik] = useState(false)
  const [excelYukleniyor, setExcelYukleniyor] = useState(false)
  const [excelMesaji, setExcelMesaji] = useState('')
  const [ekstreAcik, setEkstreAcik] = useState(false)
  const [atolyeLogo, setAtolyelogo] = useState({ ad: "Duru Mermer", logoUrl: "" })
  const [durumFiltre, setDurumFiltre] = useState<string>('tumu')
  const [aktifTab, setAktifTab] = useState<'ozet' | 'isler' | 'tahsilatlar'>('ozet')
  const [islerDurum, setIslerDurum] = useState<string>('tumu')
  const [tahsilatModal, setTahsilatModal] = useState(false)
  const [tahsilatForm, setTahsilatForm] = useState({ tutar: '', tarih: new Date().toISOString().slice(0, 10), isId: '' })
  const [tahsilatYukleniyor, setTahsilatYukleniyor] = useState(false)
  const bosForm = { firmaAdi: '', ad: '', soyad: '', telefon: '', email: '', acilisBakiyesi: '', bakiyeTipi: 'borc', musteriTipi: 'son_kullanici' }
  const [form, setForm] = useState<any>(bosForm)

  async function listeYukle(secilecekId?: string) {
    setYukleniyor(true)
    try {
      const r = await fetch('/api/musteriler')
      const d = await r.json()
      const liste = Array.isArray(d.musteriler) ? d.musteriler.filter(Boolean) : []
      setMusteriler(liste)
      const secilecek = (secilecekId ? liste.find((m: any) => m.id === secilecekId) : null) || (aktif ? liste.find((m: any) => m.id === aktif.id) : null) || liste[0] || null
      setAktif(secilecek)
    } finally { setYukleniyor(false) }
  }

  useEffect(() => {
    listeYukle()
    fetch('/api/atolye').then(r=>r.json()).then(d=>{
      if(d?.atolye) setAtolyelogo({ ad: d.atolye.atolyeAdi||'Duru Mermer', logoUrl: d.atolye.logoUrl||'' })
    }).catch(()=>{})
  }, [])

  const filtreli = useMemo(() => {
    const q = arama.trim().toLowerCase()
    let liste = musteriler
    if (durumFiltre !== 'tumu') {
      liste = liste.filter((m) => {
        const ma = analiz(m)
        if (durumFiltre === 'guclu') return ma.durum === 'Güçlü müşteri'
        if (durumFiltre === 'riskli') return ma.durum === 'Tahsilat riski'
        if (durumFiltre === 'potansiyel') return ma.durum === 'Potansiyel müşteri'
        if (durumFiltre === 'dusuk') return ma.durum === 'Düşük dönüş'
        return true
      })
    }
    if (!q) return liste
    return liste.filter((m) => `${musteriAdi(m)} ${m.telefon || ''} ${m.email || ''}`.toLowerCase().includes(q))
  }, [musteriler, arama, durumFiltre])

  const toplam = useMemo(() => {
    let toplamBakiye = 0, toplamOnayliCiro = 0, toplamTeklif = 0
    musteriler.forEach((m) => { const a = analiz(m); toplamBakiye += a.bakiye; toplamOnayliCiro += a.onayliCiro; toplamTeklif += a.teklifSayisi })
    return { adet: musteriler.length, toplamBakiye, toplamOnayliCiro, toplamTeklif }
  }, [musteriler])

  const a = aktif ? analiz(aktif) : null

  const filtreliIsler = useMemo(() => {
    const isler = aktif?.isler || []
    if (islerDurum === 'tumu') return isler
    return isler.filter((i: any) => i.durum === islerDurum)
  }, [aktif, islerDurum])

  function yeniAc() { setForm(bosForm); setDuzenle(false); setMobilDetayAcik(false); setModal(true) }
  function duzenleAc() {
    if (!aktif) return
    setForm({ firmaAdi: aktif.firmaAdi || '', ad: aktif.ad || '', soyad: aktif.soyad || '', telefon: aktif.telefon || '', email: aktif.email || '', acilisBakiyesi: aktif.acilisBakiyesi || '', bakiyeTipi: aktif.bakiyeTipi || 'borc', musteriTipi: aktif.musteriTipi || 'son_kullanici' })
    setDuzenle(true); setModal(true)
  }

  async function kaydet() {
    const body = duzenle ? { ...form, id: aktif?.id } : form
    const res = await fetch('/api/musteriler', { method: duzenle ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const json = await res.json()
    if (!res.ok) { alert(json.hata || 'Müşteri kaydedilemedi.'); return }
    setModal(false)
    await listeYukle(json.musteri?.id || aktif?.id)
  }

  async function tahsilatKaydet() {
    if (!aktif) return
    const tutar = Number(tahsilatForm.tutar)
    if (!tutar || tutar <= 0) { alert('Geçerli bir tutar girin.'); return }
    setTahsilatYukleniyor(true)
    try {
      const res = await fetch('/api/tahsilatlar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ musteriId: aktif.id, tutar, tarih: tahsilatForm.tarih, isId: tahsilatForm.isId || undefined }) })
      const json = await res.json()
      if (!res.ok) { alert(json.hata || 'Tahsilat kaydedilemedi.'); return }
      setTahsilatModal(false)
      setTahsilatForm({ tutar: '', tarih: new Date().toISOString().slice(0, 10), isId: '' })
      await listeYukle(aktif.id)
    } finally { setTahsilatYukleniyor(false) }
  }

  async function tahsilatSil(id: string) {
    if (!confirm('Bu tahsilat silinsin mi?')) return
    await fetch(`/api/tahsilatlar?id=${id}`, { method: 'DELETE' })
    await listeYukle(aktif?.id)
  }

  async function excelYukle(file?: File) {
    if (!file) return
    setExcelYukleniyor(true); setExcelMesaji('')
    try {
      const fd = new FormData(); fd.append('file', file)
      const res = await fetch('/api/musteriler/import', { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok) { setExcelMesaji(json.hata || 'Excel yükleme başarısız.'); return }
      setExcelMesaji(`Excel yüklendi. Eklenen: ${json.eklenen || 0}, Atlanan: ${json.atlanan || 0}.`)
      await listeYukle()
    } catch (err: any) { setExcelMesaji(err.message || 'Hata oluştu.')
    } finally { setExcelYukleniyor(false); if (fileRef.current) fileRef.current.value = '' }
  }

  function pdfIndir() {
    if (!aktif || !a) return
    const isHareketler = (aktif.isler || []).filter((i: any) => i.durum === 'onaylandi').slice(0, 8)
      .map((i: any) => `<tr><td>${tarihFmt(i.onaylanmaTarihi)}</td><td><b>Onaylı İş</b></td><td>${i.teklifNo || ''} · ${i.urunAdi || ''}</td><td class="r"><b>${tl(i.satisFiyati)}</b></td><td class="r">—</td><td class="r"><b>${tl(i.satisFiyati)}</b></td></tr>`).join('')
    const tahHareketler = (aktif.tahsilatlar || []).slice(0, 8)
      .map((t: any) => `<tr><td>${tarihFmt(t.tarih)}</td><td><b>Tahsilat</b></td><td>Ödeme</td><td class="r">—</td><td class="r"><b>${tl(t.tutar)}</b></td><td class="r">—</td></tr>`).join('')
    const html = `<!doctype html><html><head><meta charset="utf-8"/><title>Ekstre</title><style>@page{size:A4;margin:10mm}body{font-family:Arial,sans-serif;color:#020617}table{width:100%;border-collapse:collapse;font-size:12px;margin-top:12px}th{background:#020617;color:white;padding:10px;text-align:left}td{padding:10px;border-top:1px solid #e5e7eb}.r{text-align:right}.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:18px}.kpi{background:#f8fafc;border-radius:12px;padding:14px}.kpi .k{color:#64748b;font-size:12px}.kpi .v{font-size:18px;font-weight:900;margin-top:8px}h1{font-size:28px;margin:8px 0 0}h2{margin-top:24px}</style></head><body>
    <div style="display:flex;justify-content:space-between;padding-bottom:20px;border-bottom:1px solid #e5e7eb">
    <div><div style="font-size:11px;color:#94a3b8;font-weight:800;letter-spacing:4px">DURU MERMER</div><h1>Müşteri Hesap Ekstresi</h1><div style="color:#64748b;margin-top:6px">${new Date().toLocaleDateString('tr-TR')}</div></div>
    <div style="text-align:right;border:1px solid #e5e7eb;border-radius:16px;padding:16px 20px"><div style="font-size:11px;color:#94a3b8;font-weight:800">GÜNCEL BAKİYE</div><div style="font-size:26px;font-weight:900;color:#d97706;margin-top:8px">${tl(a.bakiye)}</div></div></div>
    <div style="margin-top:18px;font-size:22px;font-weight:900">Sayın ${musteriAdi(aktif)}</div>
    <div style="color:#64748b;margin-top:4px">${[aktif.telefon, aktif.email].filter(Boolean).join(' · ') || ''}</div>
    <div class="kpis"><div class="kpi"><div class="k">Onaylı Ciro</div><div class="v">${tl(a.onayliCiro)}</div></div><div class="kpi"><div class="k">Tahsilat</div><div class="v">${tl(a.tahsilat)}</div></div><div class="kpi"><div class="k">Teklif</div><div class="v">${a.teklifSayisi}</div></div><div class="kpi"><div class="k">Onay Oranı</div><div class="v">${pct(a.onayOrani)}</div></div></div>
    <h2>Hesap Hareketleri</h2>
    <table><thead><tr><th>Tarih</th><th>İşlem</th><th>Açıklama</th><th class="r">Borç</th><th class="r">Alacak</th><th class="r">Bakiye</th></tr></thead><tbody>${isHareketler}${tahHareketler}${!isHareketler && !tahHareketler ? '<tr><td colspan="6" style="text-align:center;padding:20px;color:#64748b">Hareket yok.</td></tr>' : ''}</tbody></table>
    </body></html>`
    const w = window.open('', '_blank', 'width=900,height=1200')
    if (!w) return
    w.document.open(); w.document.write(html); w.document.close(); w.focus()
    setTimeout(() => { w.print(); w.close() }, 500)
  }

  function whatsappEkstreGonder() {
    if (!aktif || !a) return
    const phone = telefonTemizle(aktif.telefon || '')
    const mesaj = `Merhaba ${musteriAdi(aktif)},\n\nCari ekstre özetiniz:\n\nOnaylı ciro: ${tl(a.onayliCiro)}\nTahsilat: ${tl(a.tahsilat)}\nBakiye: ${tl(a.bakiye)}\n\nDetaylar için bizimle iletişime geçebilirsiniz.`
    window.open(phone ? `https://wa.me/${phone}?text=${encodeURIComponent(mesaj)}` : `https://wa.me/?text=${encodeURIComponent(mesaj)}`, '_blank')
  }

  function OzetTab() {
    if (!aktif || !a) return null
    return (
      <div className="space-y-3 h-full overflow-y-auto">
        <div className={`rounded-3xl border p-4 ${a.bakiye > 0 ? 'border-amber-400/30 bg-amber-400/5' : 'border-emerald-400/30 bg-emerald-400/5'}`}>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs text-slate-400">Güncel Bakiye</p>
              <p className={`mt-1 text-3xl font-black ${a.bakiye > 0 ? 'text-amber-300' : 'text-emerald-300'}`}>{tl(a.bakiye)}</p>
              <p className="mt-1 text-xs text-slate-500">{a.bakiye > 0 ? `Müşteri ${tl(a.bakiye)} borçlu` : a.bakiye < 0 ? `Müşteri ${tl(Math.abs(a.bakiye))} alacaklı` : 'Hesap kapalı'}</p>
            </div>
            <div className="text-right space-y-1">
              <div><p className="text-[10px] text-slate-500">Onaylı Ciro</p><p className="text-sm font-semibold text-emerald-300">{tl(a.onayliCiro)}</p></div>
              <div><p className="text-[10px] text-slate-500">Tahsilat</p><p className="text-sm font-semibold text-cyan-300">{tl(a.tahsilat)}</p></div>
            </div>
          </div>
          {a.onayliCiro > 0 && (
            <div className="mt-3">
              <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1"><span>Tahsilat oranı</span><span>{pct(a.tahsilatOrani)}</span></div>
              <div className="h-2 rounded-full bg-white/10 overflow-hidden"><div className="h-full rounded-full bg-cyan-400" style={{ width: `${Math.min(a.tahsilatOrani, 100)}%` }} /></div>
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-2">
          <MiniStat label="Toplam Teklif" value={a.teklifSayisi} />
          <MiniStat label="Onaylanan" value={a.onaySayisi} tone="text-emerald-300" sub={pct(a.onayOrani) + ' oran'} />
          <MiniStat label="Bekleyen" value={a.bekleyenSayisi} tone="text-amber-300" />
          <MiniStat label="Teklif Cirosu" value={tl(a.verilenTeklifCiro)} tone="text-blue-300" />
        </div>
        <div className="grid xl:grid-cols-2 gap-2">
          <div className="rounded-3xl border border-white/10 bg-black/20 p-3">
            <p className="text-xs text-slate-400">Müşteri performansı</p>
            <p className={`mt-1 text-lg font-semibold ${a.renk}`}>{a.durum}</p>
            <p className="mt-2 text-xs leading-5 text-slate-300">{a.yorum}</p>
            <div className="mt-3 space-y-2.5"><Progress label="Teklif onay oranı" value={a.onayOrani} /><Progress label="Tahsilat oranı" value={a.tahsilatOrani} /></div>
          </div>
          <div className="rounded-3xl border border-white/10 bg-black/20 p-3">
            <p className="text-xs text-slate-400">Aylık onaylı ciro (son 6 ay)</p>
            <p className="mt-1 text-sm font-semibold">Ciro trendi</p>
            <div className="mt-3"><AylikCiroChart aylikCiro={a.aylikCiro} /></div>
            <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500">
              <span>6 aylık toplam</span>
              <span className="text-emerald-300 font-semibold">{tl(Object.values(a.aylikCiro).reduce((s, v) => s + v, 0))}</span>
            </div>
          </div>
        </div>
        {Number(aktif.acilisBakiyesi) > 0 && (
          <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-xs text-slate-400">
            Açılış bakiyesi: <span className="font-semibold text-white">{tl(aktif.acilisBakiyesi)}</span> ({aktif.bakiyeTipi === 'alacak' ? 'müşteri alacaklı' : 'müşteri borçlu'})
          </div>
        )}
      </div>
    )
  }

  function IslerTab() {
    if (!aktif) return null
    return (
      <div className="flex flex-col h-full gap-2">
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex gap-1.5 overflow-x-auto pb-0.5 flex-1">
            {[{ key: 'tumu', label: 'Tümü' }, { key: 'onaylandi', label: 'Onaylı' }, { key: 'teklif_verildi', label: 'Bekleyen' }, { key: 'kaybedildi', label: 'Kaybedildi' }].map(f => (
              <button key={f.key} onClick={() => setIslerDurum(f.key)}
                className={`shrink-0 rounded-full border px-3 py-1 text-[11px] font-semibold transition ${islerDurum === f.key ? 'border-emerald-400/50 bg-emerald-400/10 text-emerald-300' : 'border-white/10 bg-transparent text-slate-500'}`}>
                {f.label}
              </button>
            ))}
          </div>
          <button onClick={() => router.push(`/dashboard/yeni-is-v3?musteriId=${aktif.id}&musteriAdi=${encodeURIComponent(musteriAdi(aktif))}`)}
            className="shrink-0 rounded-2xl bg-emerald-500 px-3 py-2 text-[11px] font-bold text-slate-950">+ Yeni İş</button>
        </div>
        <div className="flex-1 overflow-y-auto space-y-2">
          {filtreliIsler.length === 0 && (
            <div className="rounded-2xl border border-dashed border-white/10 p-6 text-sm text-slate-400 text-center">
              {islerDurum === 'tumu' ? 'Bu müşteriye henüz iş kaydı yok.' : 'Bu filtreye uygun iş bulunamadı.'}
            </div>
          )}
          {filtreliIsler.map((i: any) => (
            <button key={i.id} onClick={() => router.push(`/dashboard/isler/${i.id}`)}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.035] hover:bg-white/[0.07] p-3 text-left transition">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap"><p className="text-sm font-semibold">{i.teklifNo || 'Teklif'}</p><DurumBadge durum={i.durum} /></div>
                  <p className="mt-1 truncate text-xs text-slate-500">{i.urunAdi || 'Ürün'} · {i.malzemeTipi || ''}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold text-emerald-300">{tl(i.satisFiyati)}</p>
                  <p className="mt-0.5 text-[10px] text-slate-500">{tarihFmt(i.onaylanmaTarihi || i.createdAt)}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
        {filtreliIsler.length > 0 && (
          <div className="shrink-0 rounded-2xl border border-white/10 bg-black/20 px-3 py-2 flex items-center justify-between text-xs text-slate-400">
            <span>{filtreliIsler.length} iş</span>
            <span className="text-emerald-300 font-semibold">{tl(filtreliIsler.reduce((s: number, i: any) => s + Number(i.satisFiyati || 0), 0))}</span>
          </div>
        )}
      </div>
    )
  }

  function TahsilatlarTab() {
    const localAktif = aktif
    const localA = localAktif ? analiz(localAktif) : null
    if (!localAktif || !localA) return null
    const tahsilatlar = (localAktif.tahsilatlar || []).slice().sort((x: any, y: any) => new Date(y.tarih).getTime() - new Date(x.tarih).getTime())

    // İşe göre grupla
    const gruplar: Record<string, { isLabel: string; tahsilatlar: any[]; toplam: number }> = {}

    // Önce onaylı işleri grup olarak ekle (tahsilat olmasa bile ödeme planı görmek için)
    ;(localAktif.isler || []).filter((i: any) => i.durum === 'onaylandi').forEach((i: any) => {
      if (!gruplar[i.id]) {
        gruplar[i.id] = {
          isLabel: `${i.teklifNo || 'Teklif'} · ${i.urunAdi || 'İş'} (${tl(i.satisFiyati || 0)})`,
          tahsilatlar: [],
          toplam: 0
        }
      }
    })

    // Sonra tahsilatları gruplara ekle
    tahsilatlar.forEach((t: any) => {
      const key = t.isId || '__genel__'
      if (!gruplar[key]) {
        const is = t.is || (localAktif.isler || []).find((i: any) => i.id === t.isId)
        gruplar[key] = {
          isLabel: key === '__genel__' ? 'Genel Tahsilatlar' : `${is?.teklifNo || 'Teklif'} · ${is?.urunAdi || 'İş'} (${tl(is?.satisFiyati || 0)})`,
          tahsilatlar: [],
          toplam: 0
        }
      }
      gruplar[key].tahsilatlar.push(t)
      gruplar[key].toplam += Number(t.tutar || 0)
    })

    // Genel tahsilatlar en sona
    const genel = gruplar['__genel__']
    if (genel) {
      delete gruplar['__genel__']
      gruplar['__genel__'] = genel
    }

    return (
      <div className="flex flex-col h-full gap-2">
        <div className="shrink-0 flex items-center justify-between gap-3">
          <div><p className="text-xs text-slate-400">Toplam tahsilat</p><p className="mt-0.5 text-xl font-black text-cyan-300">{tl(localA.tahsilat)}</p></div>
          <button onClick={() => setTahsilatModal(true)} className="shrink-0 rounded-2xl bg-cyan-500 px-3 py-2 text-[11px] font-bold text-slate-950">+ Tahsilat Ekle</button>
        </div>
        <div className="shrink-0 grid grid-cols-3 gap-2">
          <MiniStat label="Onaylı Ciro" value={tl(localA.onayliCiro)} tone="text-emerald-300" />
          <MiniStat label="Tahsilat" value={tl(localA.tahsilat)} tone="text-cyan-300" />
          <MiniStat label="Kalan Bakiye" value={tl(localA.bakiye)} tone={localA.bakiye > 0 ? 'text-amber-300' : 'text-emerald-300'} />
        </div>
        <div className="flex-1 overflow-y-auto space-y-3">
          {tahsilatlar.length === 0 && (
            <div className="rounded-2xl border border-dashed border-white/10 p-6 text-sm text-slate-400 text-center">Tahsilat kaydı yok. Yukarıdan ekleyebilirsin.</div>
          )}
          {Object.entries(gruplar).map(([key, grup]) => (
            <div key={key} className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 bg-white/[0.04] border-b border-white/10">
                <p className="text-[11px] font-semibold text-slate-300 truncate">{grup.isLabel}</p>
                <span className="shrink-0 ml-2 text-[11px] font-bold text-cyan-300">{tl(grup.toplam)}</span>
              </div>
              {/* Ödeme Planı Taksitleri */}
              {(() => {
                const isObj = key !== '__genel__' ? (localAktif?.isler || []).find((i: any) => i.id === key) : null
                const plan = isObj?.odemePlani
                            if (!plan) return null
                return (
                  <div className="px-3 py-2 border-b border-white/5">
                    <p className="text-[10px] text-slate-500 font-semibold mb-2 uppercase tracking-wider">Ödeme Planı · {isObj?.musteri?.musteriTipi || plan.musteriTipi}</p>
                    <div className="space-y-1.5">
                      {plan.taksitler.map((t: any) => (
                        <div key={t.id} className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className={`w-2 h-2 rounded-full shrink-0 ${t.odendiMi ? 'bg-emerald-400' : new Date(t.vadeTarihi) < new Date() ? 'bg-red-400' : 'bg-amber-400'}`} />
                            <span className="text-[11px] text-slate-400 truncate">{t.aciklama}</span>
                            <span className="text-[10px] text-slate-600 shrink-0">{tarihFmt(t.vadeTarihi)}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`text-[11px] font-semibold ${t.odendiMi ? 'text-emerald-300 line-through' : 'text-white'}`}>{tl(t.tutar)}</span>
                            <button
                              onClick={async () => {
                                await fetch('/api/odeme-plani', { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ taksitId: t.id, odendiMi: !t.odendiMi }) })
                                await listeYukle(aktif?.id)
                              }}
                              className={`rounded-lg border px-2 py-0.5 text-[10px] font-semibold transition ${t.odendiMi ? 'border-slate-600 text-slate-500 hover:border-red-500/30 hover:text-red-400' : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'}`}>
                              {t.odendiMi ? 'Geri al' : 'Ödendi'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })()}
              <div className="divide-y divide-white/5">
                {grup.tahsilatlar.map((t: any) => (
                  <div key={t.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-cyan-300">{tl(t.tutar)}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{tarihFmt(t.tarih)}</p>
                    </div>
                    <button onClick={() => tahsilatSil(t.id)} className="shrink-0 rounded-xl border border-red-500/20 bg-red-500/5 px-2.5 py-1.5 text-[10px] text-red-400 hover:bg-red-500/10 transition">Sil</button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        {tahsilatlar.length > 0 && (
          <div className="shrink-0 rounded-2xl border border-white/10 bg-black/20 px-3 py-2 flex items-center justify-between text-xs text-slate-400">
            <span>{tahsilatlar.length} tahsilat · {Object.keys(gruplar).length} grup</span>
            <span className="text-cyan-300 font-semibold">{tl(localA.tahsilat)}</span>
          </div>
        )}
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-[#030712] text-white pt-16 lg:pt-0">
      <div className="mx-auto max-w-none px-3 py-3 lg:h-screen lg:overflow-hidden">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-emerald-300/80">Metrix CRM</p>
            <h1 className="mt-1 text-2xl lg:text-4xl font-semibold">Müşteriler</h1>
            <p className="mt-1 text-sm text-slate-400">Müşteri, teklif, ciro, tahsilat ve cari performans merkezi.</p>
          </div>
          <div className="grid grid-cols-3 gap-2 lg:w-[520px]">
            <MiniStat label="Müşteri" value={toplam.adet} />
            <MiniStat label="Toplam Bakiye" value={tl(toplam.toplamBakiye)} tone={toplam.toplamBakiye > 0 ? 'text-amber-300' : 'text-emerald-300'} />
            <MiniStat label="Onaylı Ciro" value={tl(toplam.toplamOnayliCiro)} tone="text-emerald-300" />
          </div>
        </div>

        <div className="grid gap-2 lg:h-[calc(100vh-118px)] lg:grid-cols-[260px_minmax(0,1fr)_235px] xl:grid-cols-[280px_minmax(0,1fr)_250px] 2xl:grid-cols-[300px_minmax(0,1fr)_270px]">

          <Card className="flex min-h-[520px] flex-col overflow-hidden lg:min-h-0">
            <div className="border-b border-white/10 p-4">
              <div className="flex items-center justify-between gap-3">
                <div><p className="text-xs text-slate-400">Müşteri portföyü</p><h2 className="text-lg font-semibold">Liste</h2></div>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">{filtreli.length} kayıt</span>
              </div>
              <input value={arama} onChange={(e) => setArama(e.target.value)} placeholder="İsim, telefon, e-posta ara..."
                className="mt-4 w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm outline-none placeholder:text-slate-500 focus:border-emerald-400/50" />
              <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">
                {[{ key: 'tumu', label: 'Tümü', renk: 'text-white border-slate-600 bg-slate-700' }, { key: 'guclu', label: 'Güçlü', renk: 'text-emerald-300 border-emerald-500/40 bg-emerald-500/10' }, { key: 'potansiyel', label: 'Potansiyel', renk: 'text-blue-300 border-blue-500/40 bg-blue-500/10' }, { key: 'riskli', label: 'Riskli', renk: 'text-amber-300 border-amber-500/40 bg-amber-500/10' }, { key: 'dusuk', label: 'Düşük', renk: 'text-red-300 border-red-500/40 bg-red-500/10' }].map((chip) => (
                  <button key={chip.key} onClick={() => setDurumFiltre(chip.key)}
                    className={`shrink-0 rounded-full border px-3 py-1 text-[11px] font-semibold transition ${durumFiltre === chip.key ? chip.renk : 'border-white/10 bg-transparent text-slate-500'}`}>
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              {yukleniyor && <p className="p-4 text-sm text-slate-400">Müşteriler yükleniyor...</p>}
              {!yukleniyor && filtreli.length === 0 && <div className="rounded-2xl border border-dashed border-white/10 p-5 text-sm text-slate-400">Müşteri bulunamadı.</div>}
              <div className="space-y-2">
                {filtreli.map((m) => {
                  const ma = analiz(m)
                  const secili = aktif?.id === m.id
                  return (
                    <button key={m.id} onClick={() => { setAktif(m); setMobilDetayAcik(true) }}
                      className={`w-full rounded-2xl border p-3 text-left transition ${secili ? 'border-emerald-300/70 bg-gradient-to-br from-emerald-400/20 via-emerald-300/10 to-cyan-400/10 shadow-[0_0_32px_rgba(16,185,129,0.22)] ring-1 ring-emerald-300/30' : 'border-white/10 bg-white/[0.035] hover:bg-white/[0.07]'}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">{musteriAdi(m)}</p>
                          <p className="mt-1 truncate text-xs text-slate-500">{m.telefon || m.email || 'İletişim bilgisi yok'}</p>
                        {m.musteriTipi && m.musteriTipi !== 'son_kullanici' && (
                          <span className={`mt-1 inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold ${musteriTipiRenk(m.musteriTipi)}`}>{musteriTipiLabel(m.musteriTipi)}</span>
                        )}
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className={`text-xs font-semibold ${ma.bakiye > 0 ? 'text-amber-300' : 'text-emerald-300'}`}>{tl(ma.bakiye)}</span>
                          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${ma.durum === 'Güçlü müşteri' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : ma.durum === 'Tahsilat riski' ? 'border-amber-500/30 bg-amber-500/10 text-amber-300' : ma.durum === 'Düşük dönüş' ? 'border-red-500/30 bg-red-500/10 text-red-300' : ma.durum === 'Potansiyel müşteri' ? 'border-blue-500/30 bg-blue-500/10 text-blue-300' : 'border-white/10 bg-white/5 text-slate-400'}`}>{ma.durum}</span>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
                        <span>{ma.teklifSayisi} teklif · {pct(ma.onayOrani)} onay</span>
                        <span className="text-emerald-300/70">{tl(ma.onayliCiro)}</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </Card>

          <Card className="min-h-[560px] p-3 lg:min-h-0 lg:overflow-hidden flex flex-col">
            {!aktif || !a ? (
              <div className="flex h-full min-h-[480px] flex-col items-center justify-center rounded-3xl border border-dashed border-white/10 p-6 text-center">
                <p className="text-2xl font-semibold">Müşteri seçin</p>
                <p className="mt-2 max-w-md text-sm text-slate-400">Sol listeden bir müşteri seçin veya yeni müşteri oluşturun.</p>
                <button onClick={yeniAc} className="mt-6 rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-slate-950">+ Yeni Müşteri</button>
              </div>
            ) : (
              <div className="flex flex-col h-full gap-2 min-h-0">
                <div className="shrink-0 flex min-w-0 flex-col gap-2 rounded-3xl border border-white/10 bg-black/20 p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs uppercase tracking-[0.24em] text-emerald-300/80">Seçili müşteri</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="truncate text-xl xl:text-2xl font-semibold">{musteriAdi(aktif)}</h2>
                      {aktif.musteriTipi && <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${musteriTipiRenk(aktif.musteriTipi)}`}>{musteriTipiLabel(aktif.musteriTipi)}</span>}
                    </div>
                    <p className="mt-1 truncate text-sm text-slate-400">{[aktif.telefon, aktif.email].filter(Boolean).join(' · ') || 'İletişim bilgisi yok'}</p>
                  </div>
                  <div className="flex flex-wrap gap-2 sm:justify-end">
                    <button onClick={() => setEkstreAcik(true)} className="shrink-0 rounded-2xl border border-blue-400/30 bg-blue-400/10 px-3 py-2 text-xs font-semibold text-blue-200">PDF Ekstre</button>
                    <button onClick={duzenleAc} className="shrink-0 rounded-2xl border border-white/10 bg-white/10 px-3 py-2 text-xs font-semibold">Düzenle</button>
                  </div>
                </div>
                <div className="shrink-0 flex gap-1 rounded-2xl border border-white/10 bg-black/20 p-1">
                  {([{ key: 'ozet', label: 'Özet' }, { key: 'isler', label: `İşler (${(aktif.isler || []).length})` }, { key: 'tahsilatlar', label: `Tahsilatlar (${(aktif.tahsilatlar || []).length})` }] as const).map(tab => (
                    <button key={tab.key} onClick={() => setAktifTab(tab.key)}
                      className={`flex-1 rounded-xl py-2 text-xs font-semibold transition ${aktifTab === tab.key ? 'bg-white/10 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}>
                      {tab.label}
                    </button>
                  ))}
                </div>
                <div className="flex-1 min-h-0 overflow-hidden">
                  {aktifTab === 'ozet' && <OzetTab />}
                  {aktifTab === 'isler' && <IslerTab />}
                  {aktifTab === 'tahsilatlar' && <TahsilatlarTab />}
                </div>
              </div>
            )}
          </Card>

          <Card className="p-2.5 lg:overflow-y-auto">
            <div className="space-y-3">
              <button onClick={yeniAc} className="w-full rounded-2xl bg-emerald-500 px-4 py-3 text-left font-bold text-slate-950 shadow-lg shadow-emerald-500/10">
                + Yeni Müşteri<span className="block text-xs font-medium text-slate-800/80">Cari kart oluştur</span>
              </button>
              <a href="/api/musteriler/sablon" className="block w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 font-semibold">
                Excel Şablon İndir<span className="block text-xs font-normal text-slate-400">Standart içe aktarma dosyası</span>
              </a>
              <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => excelYukle(e.target.files?.[0])} />
              <button onClick={() => fileRef.current?.click()} disabled={excelYukleniyor}
                className="w-full rounded-2xl border border-blue-400/30 bg-blue-400/10 px-4 py-3 text-left font-semibold text-blue-100 disabled:opacity-50">
                {excelYukleniyor ? 'Excel Yükleniyor...' : 'Excel Yükle'}<span className="block text-xs font-normal text-blue-100/70">Toplu müşteri aktar</span>
              </button>
              {excelMesaji && <div className="rounded-2xl border border-white/10 bg-black/25 p-3 text-xs text-slate-300">{excelMesaji}</div>}
              <div className="rounded-3xl border border-white/10 bg-black/20 p-3">
                <p className="text-xs text-slate-400 mb-2">Hızlı aksiyon</p>
                <div className="space-y-2">
                  <button disabled={!aktif} onClick={() => aktif && router.push(`/dashboard/yeni-is-v3?musteriId=${aktif.id}&musteriAdi=${encodeURIComponent(musteriAdi(aktif))}`)}
                    className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-left text-sm font-semibold disabled:opacity-40">Seçili müşteriye teklif oluştur</button>
                  <button disabled={!aktif} onClick={() => { if (aktif) { setAktifTab('tahsilatlar'); setTahsilatModal(true) } }}
                    className="w-full rounded-2xl border border-cyan-400/20 bg-cyan-400/5 px-4 py-3 text-left text-sm font-semibold text-cyan-200 disabled:opacity-40">Tahsilat kaydet</button>
                  <button disabled={!aktif} onClick={() => setEkstreAcik(true)}
                    className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-left text-sm font-semibold disabled:opacity-40">Cari ekstre görüntüle</button>
                </div>
              </div>
              {a && (
                <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-emerald-400/10 to-blue-400/10 p-4">
                  <p className="text-xs text-slate-400">Seçili müşteri özeti</p>
                  <p className="mt-2 text-lg font-semibold">{musteriAdi(aktif)}</p>
                  <p className={`mt-1 text-sm ${a.renk}`}>{a.durum}</p>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div><p className="text-slate-500">Bakiye</p><p className={`font-semibold ${a.bakiye > 0 ? 'text-amber-300' : 'text-emerald-300'}`}>{tl(a.bakiye)}</p></div>
                    <div><p className="text-slate-500">Tahsilat</p><p className="font-semibold text-cyan-300">{tl(a.tahsilat)}</p></div>
                  </div>
                  <p className="mt-3 text-xs leading-5 text-slate-400">{a.yorum}</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-3 sm:items-center">
          <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-[#0B1120] p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div><p className="text-xs uppercase tracking-[0.24em] text-emerald-300/80">{duzenle ? 'Düzenle' : 'Yeni kayıt'}</p><h2 className="mt-1 text-xl font-semibold">{duzenle ? 'Müşteri Bilgileri' : 'Yeni Müşteri'}</h2></div>
              <button onClick={() => setModal(false)} className="rounded-xl border border-white/10 px-3 py-2 text-sm">Kapat</button>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <input className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 outline-none" placeholder="Firma adı" value={form.firmaAdi} onChange={(e) => setForm({ ...form, firmaAdi: e.target.value })} />
              <input className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 outline-none" placeholder="Telefon" value={form.telefon} onChange={(e) => setForm({ ...form, telefon: e.target.value })} />
              <input className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 outline-none" placeholder="Ad" value={form.ad} onChange={(e) => setForm({ ...form, ad: e.target.value })} />
              <input className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 outline-none" placeholder="Soyad" value={form.soyad} onChange={(e) => setForm({ ...form, soyad: e.target.value })} />
              <input className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 outline-none sm:col-span-2" placeholder="E-posta" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              <input className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 outline-none" placeholder="Açılış bakiyesi" value={form.acilisBakiyesi} onChange={(e) => setForm({ ...form, acilisBakiyesi: e.target.value })} />
              <select className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 outline-none" value={form.bakiyeTipi} onChange={(e) => setForm({ ...form, bakiyeTipi: e.target.value })}>
                <option value="borc">Müşteri borçlu</option><option value="alacak">Müşteri alacaklı</option>
              </select>
              <select className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 outline-none sm:col-span-2" value={form.musteriTipi} onChange={(e) => setForm({ ...form, musteriTipi: e.target.value })}>
                <option value="son_kullanici">Son Kullanıcı</option>
                <option value="bayi">Bayi</option>
                <option value="mimar">Mimar</option>
                <option value="muteahhit">Müteahhit</option>
              </select>
            </div>
            <button onClick={kaydet} className="mt-5 w-full rounded-2xl bg-emerald-500 px-4 py-3 font-bold text-slate-950">{duzenle ? 'Değişiklikleri Kaydet' : 'Müşteri Oluştur'}</button>
          </div>
        </div>
      )}

      {tahsilatModal && aktif && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-3 sm:items-center">
          <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-[#0B1120] p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div><p className="text-xs uppercase tracking-[0.24em] text-cyan-300/80">Tahsilat</p><h2 className="mt-1 text-xl font-semibold">Tahsilat Ekle</h2><p className="mt-0.5 text-sm text-slate-400">{musteriAdi(aktif)}</p></div>
              <button onClick={() => setTahsilatModal(false)} className="rounded-xl border border-white/10 px-3 py-2 text-sm">Kapat</button>
            </div>
            <div className="mt-5 space-y-3">
              <div><label className="text-xs text-slate-400 mb-1 block">Tutar (₺)</label>
                <input type="number" min="0" step="1" placeholder="0" value={tahsilatForm.tutar}
                  onChange={(e) => setTahsilatForm({ ...tahsilatForm, tutar: e.target.value })}
                  className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-xl font-semibold outline-none focus:border-cyan-400/50" />
              </div>
              <div><label className="text-xs text-slate-400 mb-1 block">Tarih</label>
                <input type="date" value={tahsilatForm.tarih}
                  onChange={(e) => setTahsilatForm({ ...tahsilatForm, tarih: e.target.value })}
                  className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 outline-none focus:border-cyan-400/50" />
              </div>
              <div><label className="text-xs text-slate-400 mb-1 block">İlgili İş (opsiyonel)</label>
                <select value={tahsilatForm.isId} onChange={(e) => setTahsilatForm({ ...tahsilatForm, isId: e.target.value })}
                  className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 outline-none focus:border-cyan-400/50">
                  <option value="">— Genel tahsilat —</option>
                  {(aktif?.isler || []).filter((i: any) => i.durum === 'onaylandi').map((i: any) => (
                    <option key={i.id} value={i.id}>{i.teklifNo || 'Teklif'} · {i.urunAdi || 'Ürün'} · {tl(i.satisFiyati)}</option>
                  ))}
                </select>
              </div>
            </div>
            <button onClick={tahsilatKaydet} disabled={tahsilatYukleniyor}
              className="mt-5 w-full rounded-2xl bg-cyan-500 px-4 py-3 font-bold text-slate-950 disabled:opacity-50">
              {tahsilatYukleniyor ? 'Kaydediliyor...' : 'Tahsilat Kaydet'}
            </button>
          </div>
        </div>
      )}

      {mobilYeniAcik && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950 px-4 py-5 md:hidden">
          <div className="mb-5 flex items-center justify-between">
            <div><p className="text-xs uppercase tracking-[0.22em] text-emerald-300/80">Yeni Kayıt</p><h2 className="mt-1 text-xl font-black text-white">Yeni Müşteri</h2></div>
            <button onClick={() => setMobilYeniAcik(false)} className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 font-bold text-white">Kapat</button>
          </div>
          <div className="space-y-3">
            <input className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none" placeholder="Firma adı" value={form.firmaAdi || ''} onChange={(e) => setForm({ ...form, firmaAdi: e.target.value })} />
            <input className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none" placeholder="Ad" value={form.ad || ''} onChange={(e) => setForm({ ...form, ad: e.target.value })} />
            <input className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none" placeholder="Soyad" value={form.soyad || ''} onChange={(e) => setForm({ ...form, soyad: e.target.value })} />
            <input className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none" placeholder="Telefon" value={form.telefon || ''} onChange={(e) => setForm({ ...form, telefon: e.target.value })} />
            <input className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none" placeholder="E-posta" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <input className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none" placeholder="Açılış bakiyesi" value={form.acilisBakiyesi || ''} onChange={(e) => setForm({ ...form, acilisBakiyesi: e.target.value })} />
            <select className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none" value={form.bakiyeTipi || 'borc'} onChange={(e) => setForm({ ...form, bakiyeTipi: e.target.value })}>
              <option value="borc">Borç</option><option value="alacak">Alacak</option>
            </select>
            <select className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none" value={form.musteriTipi || 'son_kullanici'} onChange={(e) => setForm({ ...form, musteriTipi: e.target.value })}>
              <option value="son_kullanici">Son Kullanıcı</option>
              <option value="bayi">Bayi</option>
              <option value="mimar">Mimar</option>
              <option value="muteahhit">Müteahhit</option>
            </select>
            <button onClick={async () => { await kaydet(); setMobilYeniAcik(false) }} className="mt-3 w-full rounded-2xl bg-emerald-500 px-4 py-4 font-black text-slate-950">Müşteri Oluştur</button>
          </div>
        </div>
      )}

      {mobilDetayAcik && aktif && a && (
        <div className="fixed inset-0 z-50 flex flex-col bg-[#030712] md:hidden" style={{ paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0px))' }}>
          <div className="shrink-0 border-b border-white/10 px-4 pb-4" style={{ paddingTop: 'max(16px, env(safe-area-inset-top, 16px))' }}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-[0.22em] text-emerald-300/80">Müşteri Detayı</p>
                <h2 className="mt-1 truncate text-xl font-black text-white">{musteriAdi(aktif)}</h2>
                <p className="mt-1 truncate text-sm text-slate-400">{[aktif.telefon, aktif.email].filter(Boolean).join(' · ') || 'İletişim bilgisi yok'}</p>
              </div>
              <button onClick={() => setMobilDetayAcik(false)} className="shrink-0 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-bold text-white">← Geri</button>
            </div>
            <div className="mt-4 grid grid-cols-4 gap-2">
              <button onClick={() => router.push(`/dashboard/yeni-is-v3?musteriId=${aktif.id}&musteriAdi=${encodeURIComponent(musteriAdi(aktif))}`)} className="rounded-2xl bg-emerald-500 px-3 py-3 text-xs font-black text-slate-950">+ Yeni İş</button>
              <button onClick={() => setTahsilatModal(true)} className="rounded-2xl border border-cyan-400/30 bg-cyan-400/10 px-3 py-3 text-xs font-bold text-cyan-200">Tahsilat</button>
              <button onClick={() => setEkstreAcik(true)} className="rounded-2xl border border-blue-400/30 bg-blue-400/10 px-3 py-3 text-xs font-bold text-blue-200">Ekstre</button>
              <button onClick={() => { duzenleAc(); setMobilDetayAcik(false) }} className="rounded-2xl border border-white/10 bg-white/10 px-3 py-3 text-xs font-bold text-white">Düzenle</button>
            </div>
          </div>
          <div className="shrink-0 flex gap-1 border-b border-white/10 px-4 py-2">
            {([{ key: 'ozet', label: 'Özet' }, { key: 'isler', label: `İşler (${(aktif.isler || []).length})` }, { key: 'tahsilatlar', label: 'Tahsilatlar' }] as const).map(tab => (
              <button key={tab.key} onClick={() => setAktifTab(tab.key)}
                className={`flex-1 rounded-xl py-2 text-xs font-semibold transition ${aktifTab === tab.key ? 'bg-white/10 text-white' : 'text-slate-500'}`}>
                {tab.label}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {aktifTab === 'ozet' && <OzetTab />}
            {aktifTab === 'isler' && <IslerTab />}
            {aktifTab === 'tahsilatlar' && <TahsilatlarTab />}
          </div>
        </div>
      )}

      <button onClick={() => { setAktif(null); setDuzenle(false); setMobilDetayAcik(false); setMobilYeniAcik(true); setForm({ firmaAdi: '', ad: '', soyad: '', telefon: '', email: '', acilisBakiyesi: '', bakiyeTipi: 'borc' }) }}
        className="fixed right-4 z-40 rounded-full bg-emerald-500 px-5 py-4 text-sm font-black text-slate-950 shadow-2xl md:hidden"
        style={{ bottom: 'calc(80px + env(safe-area-inset-bottom, 0px))' }}>
        + Yeni
      </button>

      {ekstreAcik && aktif && a && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-0 sm:p-3 sm:items-center">
          <div className="flex h-[100dvh] w-full max-w-4xl flex-col rounded-none border-0 bg-[#0B1120] shadow-2xl sm:h-auto sm:max-h-[92vh] sm:rounded-3xl sm:border sm:border-white/10 sm:p-4">
            <div className="flex-1 overflow-y-auto rounded-3xl bg-white p-4 md:p-6 text-slate-950">
              <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                <div className="flex items-center gap-3">
                  {atolyeLogo.logoUrl ? (
                    <img src={atolyeLogo.logoUrl} alt={atolyeLogo.ad} className="h-10 w-10 rounded-xl border border-slate-200 object-cover sm:h-14 sm:w-14 sm:rounded-2xl" />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-xs font-bold text-white sm:h-14 sm:w-14 sm:rounded-2xl">{atolyeLogo.ad.charAt(0)}</div>
                  )}
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">{atolyeLogo.ad}</p>
                    <h2 className="mt-0.5 text-lg font-black tracking-tight sm:text-2xl md:text-3xl">Müşteri Hesap Ekstresi</h2>
                    <p className="mt-0.5 text-xs text-slate-500">Düzenleme tarihi: {new Date().toLocaleDateString('tr-TR')}</p>
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left sm:px-6 sm:py-4 sm:text-right">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Güncel Bakiye</p>
                  <p className="mt-1 text-xl font-black text-amber-600 sm:text-2xl">{tl(a.bakiye)}</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-[1.5fr_0.8fr]">
                <div className="rounded-2xl border border-slate-200 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">Müşteri</p>
                  <h3 className="mt-2 text-lg font-black sm:text-2xl">Sayın {musteriAdi(aktif)}</h3>
                  <p className="mt-1 text-sm text-slate-500">{[aktif.telefon, aktif.email].filter(Boolean).join(' · ') || 'İletişim bilgisi yok'}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Ödeme Notu</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">Sayın {musteriAdi(aktif)}, hesabınızda <b>{tl(a.bakiye)}</b> güncel bakiye görünmektedir.</p>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[{ k: 'Onaylı Ciro', v: tl(a.onayliCiro) }, { k: 'Tahsilat', v: tl(a.tahsilat) }, { k: 'Teklif', v: String(a.teklifSayisi) }, { k: 'Onay Oranı', v: pct(a.onayOrani) }].map(x => (
                  <div key={x.k} className="rounded-2xl bg-slate-50 p-3"><p className="text-xs font-semibold text-slate-500">{x.k}</p><p className="mt-1 text-base font-black sm:text-lg">{x.v}</p></div>
                ))}
              </div>
              <div className="mt-7 flex items-end justify-between">
                <h3 className="text-xl font-black">Hesap Hareketleri</h3>
                <p className="text-sm text-slate-500">{(aktif.isler || []).length + (aktif.tahsilatlar || []).length} hareket</p>
              </div>
              <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200">
                <table className="w-full text-sm">
                  <thead className="bg-slate-950 text-white">
                    <tr><th className="px-4 py-3 text-left">Tarih</th><th className="px-4 py-3 text-left">İşlem</th><th className="px-4 py-3 text-left">Açıklama</th><th className="px-4 py-3 text-right">Borç</th><th className="px-4 py-3 text-right">Alacak</th><th className="px-4 py-3 text-right">Bakiye</th></tr>
                  </thead>
                  <tbody>
                    {(aktif.isler || []).filter((i: any) => i.durum === 'onaylandi').slice(0, 8).map((i: any) => (
                      <tr key={i.id} className="border-t border-slate-200">
                        <td className="px-4 py-3">{tarihFmt(i.onaylanmaTarihi)}</td><td className="px-4 py-3 font-bold">Onaylı İş</td>
                        <td className="px-4 py-3">{i.teklifNo || 'Teklif'} · {i.urunAdi || 'Ürün'}</td>
                        <td className="px-4 py-3 text-right font-bold">{tl(i.satisFiyati)}</td><td className="px-4 py-3 text-right">—</td><td className="px-4 py-3 text-right font-bold">{tl(i.satisFiyati)}</td>
                      </tr>
                    ))}
                    {(aktif.tahsilatlar || []).slice(0, 8).map((t: any) => (
                      <tr key={t.id} className="border-t border-slate-200 bg-emerald-50">
                        <td className="px-4 py-3">{tarihFmt(t.tarih)}</td><td className="px-4 py-3 font-bold text-emerald-700">Tahsilat</td>
                        <td className="px-4 py-3">Ödeme</td><td className="px-4 py-3 text-right">—</td>
                        <td className="px-4 py-3 text-right font-bold text-emerald-700">{tl(t.tutar)}</td><td className="px-4 py-3 text-right">—</td>
                      </tr>
                    ))}
                    {(aktif.isler || []).filter((i: any) => i.durum === 'onaylandi').length === 0 && (aktif.tahsilatlar || []).length === 0 && (
                      <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-500">Henüz hesap hareketi yok.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.35em] text-slate-400">Not</p>
                <p className="mt-3 text-sm leading-6 text-slate-600">Bu ekstre kayıtlı iş ve ödeme hareketlerine göre hazırlanmıştır.</p>
              </div>
            </div>
            <div className="shrink-0 border-t border-white/10 p-3" style={{paddingBottom: "calc(80px + env(safe-area-inset-bottom, 12px))"}}>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={pdfIndir} className="rounded-2xl bg-blue-600 py-3 font-bold">PDF indir / yazdır</button>
                <button onClick={whatsappEkstreGonder} className="rounded-2xl bg-emerald-600 py-3 font-bold">WhatsApp gönder</button>
              </div>
              <button onClick={() => setEkstreAcik(false)} className="mt-3 w-full rounded-2xl border border-white/10 py-3">Kapat</button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
