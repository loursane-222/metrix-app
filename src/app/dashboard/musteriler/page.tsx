'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

function tl(v: any) {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    maximumFractionDigits: 0,
  }).format(Number(v || 0))
}

function pct(v: any) {
  return `${Number(v || 0).toFixed(0)}%`
}

function toTitleCase(str: string) {
  return (str || '')
    .toLowerCase()
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
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

  let durum = 'Yeni müşteri'
  let yorum = 'Henüz yeterli veri yok. İlk teklif ve takip süreciyle performans oluşacak.'
  let renk = 'text-slate-300'

  if (onayliCiro > 150000 && tahsilatOrani >= 80 && onayOrani >= 50) {
    durum = 'Güçlü müşteri'
    yorum = 'Yüksek ciro, iyi tahsilat ve sağlıklı onay oranı var. Öncelikli müşteri.'
    renk = 'text-emerald-300'
  } else if (bakiye > 100000 && tahsilatOrani < 50) {
    durum = 'Tahsilat riski'
    yorum = 'Açık bakiye yüksek. Yeni teklif öncesi ödeme planı netleştirilmeli.'
    renk = 'text-amber-300'
  } else if (onayOrani >= 40) {
    durum = 'Potansiyel müşteri'
    yorum = 'Teklif dönüşü iyi. Doğru takip ve hızlı terminle büyütülebilir.'
    renk = 'text-blue-300'
  } else if (teklifSayisi >= 3 && onayOrani < 30) {
    durum = 'Düşük dönüş'
    yorum = 'Çok teklif, düşük kapanış. Fiyat, ikna veya ürün stratejisi değişmeli.'
    renk = 'text-red-300'
  }

  return {
    teklifSayisi,
    onaySayisi,
    bekleyenSayisi,
    verilenTeklifCiro,
    onayliCiro,
    tahsilat,
    bakiye,
    onayOrani,
    tahsilatOrani,
    durum,
    yorum,
    renk,
  }
}

function Card({ children, className = '' }: any) {
  return (
    <div className={`rounded-3xl border border-white/10 bg-white/[0.045] shadow-2xl shadow-black/20 backdrop-blur-xl ${className}`}>
      {children}
    </div>
  )
}

function MiniStat({ label, value, tone = 'text-white' }: any) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-2.5 min-w-0">
      <p className="text-[10px] text-slate-400 truncate">{label}</p>
      <p className={`mt-1 text-sm xl:text-base font-semibold truncate ${tone}`}>{value}</p>
    </div>
  )
}

function Progress({ label, value }: any) {
  const safe = Math.max(0, Math.min(100, Number(value || 0)))
  return (
    <div>
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>{label}</span>
        <span>{pct(safe)}</span>
      </div>
      <div className="mt-2 h-2 rounded-full bg-white/10 overflow-hidden">
        <div className="h-full rounded-full bg-emerald-400" style={{ width: `${safe}%` }} />
      </div>
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
  const [excelYukleniyor, setExcelYukleniyor] = useState(false)
  const [excelMesaji, setExcelMesaji] = useState('')
  const [ekstreAcik, setEkstreAcik] = useState(false)

  const bosForm = {
    firmaAdi: '',
    ad: '',
    soyad: '',
    telefon: '',
    email: '',
    acilisBakiyesi: '',
    bakiyeTipi: 'borc',
  }

  const [form, setForm] = useState<any>(bosForm)

  async function listeYukle(secilecekId?: string) {
    setYukleniyor(true)
    try {
      const r = await fetch('/api/musteriler')
      const d = await r.json()
      const liste = Array.isArray(d.musteriler) ? d.musteriler.filter(Boolean) : []
      setMusteriler(liste)

      const secilecek =
        (secilecekId ? liste.find((m: any) => m.id === secilecekId) : null) ||
        liste[0] ||
        null

      setAktif(secilecek)
    } finally {
      setYukleniyor(false)
    }
  }

  useEffect(() => {
    listeYukle()
  }, [])

  const filtreli = useMemo(() => {
    const q = arama.trim().toLowerCase()
    if (!q) return musteriler
    return musteriler.filter((m) => {
      const text = `${musteriAdi(m)} ${m.telefon || ''} ${m.email || ''}`.toLowerCase()
      return text.includes(q)
    })
  }, [musteriler, arama])

  const toplam = useMemo(() => {
    let toplamBakiye = 0
    let toplamOnayliCiro = 0
    let toplamTeklif = 0

    musteriler.forEach((m) => {
      const a = analiz(m)
      toplamBakiye += a.bakiye
      toplamOnayliCiro += a.onayliCiro
      toplamTeklif += a.teklifSayisi
    })

    return {
      adet: musteriler.length,
      toplamBakiye,
      toplamOnayliCiro,
      toplamTeklif,
    }
  }, [musteriler])

  const a = aktif ? analiz(aktif) : null

  function yeniAc() {
    setForm(bosForm)
    setDuzenle(false)
    setModal(true)
  }

  function duzenleAc() {
    if (!aktif) return
    setForm({
      firmaAdi: aktif.firmaAdi || '',
      ad: aktif.ad || '',
      soyad: aktif.soyad || '',
      telefon: aktif.telefon || '',
      email: aktif.email || '',
      acilisBakiyesi: aktif.acilisBakiyesi || '',
      bakiyeTipi: aktif.bakiyeTipi || 'borc',
    })
    setDuzenle(true)
    setModal(true)
  }

  async function kaydet() {
    const body = duzenle ? { ...form, id: aktif?.id } : form
    const res = await fetch('/api/musteriler', {
      method: duzenle ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    const json = await res.json()
    if (!res.ok) {
      alert(json.hata || 'Müşteri kaydedilemedi.')
      return
    }

    setModal(false)
    await listeYukle(json.musteri?.id || aktif?.id)
  }

  async function excelYukle(file?: File) {
    if (!file) return
    setExcelYukleniyor(true)
    setExcelMesaji('')

    try {
      const fd = new FormData()
      fd.append('file', file)

      const res = await fetch('/api/musteriler/import', {
        method: 'POST',
        body: fd,
      })

      const json = await res.json()

      if (!res.ok) {
        const detay = json.beklenenKolonlar ? ` Beklenen: ${json.beklenenKolonlar.join(', ')}` : ''
        setExcelMesaji(json.hata ? `${json.hata}${detay}` : 'Excel yükleme başarısız.')
        return
      }

      const uyarilar = Array.isArray(json.hatalar) && json.hatalar.length ? ` Uyarı: ${json.hatalar.slice(0, 2).join(' | ')}` : ''
      setExcelMesaji(`Excel yüklendi. Eklenen: ${json.eklenen || 0}, Atlanan: ${json.atlanan || 0}.${uyarilar}`)
      await listeYukle()
    } catch (err: any) {
      setExcelMesaji(err.message || 'Excel yükleme sırasında hata oluştu.')
    } finally {
      setExcelYukleniyor(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  function pdfIndir() {
    if (!aktif || !a) return

    const hareketler = (aktif.isler || [])
      .filter((i: any) => i.durum === 'onaylandi')
      .slice(0, 8)
      .map((i: any) => `
        <tr>
          <td>${i.onaylanmaTarihi ? new Date(i.onaylanmaTarihi).toLocaleDateString('tr-TR') : '-'}</td>
          <td><b>Onaylı İş</b></td>
          <td>${i.teklifNo || 'Teklif'} · ${i.urunAdi || 'Ürün'}</td>
          <td class="right"><b>${tl(i.satisFiyati)}</b></td>
          <td class="right">—</td>
          <td class="right"><b>${tl(i.satisFiyati)}</b></td>
        </tr>
      `)
      .join('')

    const html = `
      <!doctype html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Müşteri Hesap Ekstresi</title>
        <style>
          @page { size: A4; margin: 10mm; }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            font-family: Arial, Helvetica, sans-serif;
            color: #020617;
            background: #ffffff;
          }
          .page {
            width: 100%;
            padding: 8px 10px 12px;
          }
          .header {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 24px;
            padding-bottom: 22px;
            border-bottom: 1px solid #e5e7eb;
          }
          .brand {
            display: flex;
            align-items: center;
            gap: 16px;
          }
          .logo {
            width: 58px;
            height: 58px;
            border-radius: 16px;
            background: #020617;
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 10px;
            font-weight: 800;
            letter-spacing: 1px;
          }
          .company {
            font-size: 11px;
            font-weight: 800;
            color: #94a3b8;
            letter-spacing: 5px;
            text-transform: uppercase;
          }
          h1 {
            margin: 8px 0 0;
            font-size: 30px;
            line-height: 1.05;
            letter-spacing: -1px;
          }
          .date {
            margin-top: 8px;
            color: #64748b;
            font-size: 14px;
          }
          .balanceBox {
            min-width: 190px;
            border: 1px solid #e5e7eb;
            background: #f8fafc;
            border-radius: 18px;
            padding: 18px 20px;
            text-align: right;
          }
          .balanceBox .label {
            font-size: 11px;
            color: #94a3b8;
            font-weight: 800;
            letter-spacing: 3px;
            text-transform: uppercase;
          }
          .balanceBox .value {
            margin-top: 10px;
            font-size: 26px;
            color: #d97706;
            font-weight: 900;
          }
          .topGrid {
            display: grid;
            grid-template-columns: 1.45fr 0.85fr;
            gap: 18px;
            margin-top: 24px;
          }
          .panel {
            border: 1px solid #e5e7eb;
            border-radius: 22px;
            padding: 22px;
            min-height: 185px;
          }
          .panelLabel {
            font-size: 11px;
            color: #94a3b8;
            font-weight: 900;
            letter-spacing: 4px;
            text-transform: uppercase;
          }
          .customerName {
            margin-top: 22px;
            font-size: 24px;
            font-weight: 900;
          }
          .muted {
            color: #64748b;
            font-size: 14px;
            margin-top: 8px;
          }
          .noteText {
            margin-top: 18px;
            color: #475569;
            line-height: 1.65;
            font-size: 14px;
            font-weight: 600;
          }
          .kpis {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 14px;
            margin-top: 22px;
          }
          .kpi {
            background: #f8fafc;
            border-radius: 16px;
            padding: 15px 16px;
          }
          .kpi .k {
            color: #64748b;
            font-size: 12px;
            font-weight: 700;
          }
          .kpi .v {
            margin-top: 10px;
            font-size: 18px;
            font-weight: 900;
          }
          .tableHead {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            margin-top: 30px;
          }
          h2 {
            margin: 0;
            font-size: 20px;
          }
          table {
            width: 100%;
            border-collapse: separate;
            border-spacing: 0;
            margin-top: 12px;
            overflow: hidden;
            border: 1px solid #e5e7eb;
            border-radius: 14px;
            font-size: 12px;
          }
          thead th {
            background: #020617;
            color: white;
            padding: 12px 10px;
            text-align: left;
            font-weight: 800;
          }
          tbody td {
            padding: 12px 10px;
            border-top: 1px solid #e5e7eb;
          }
          .right { text-align: right; }
          .empty {
            text-align: center;
            color: #64748b;
            padding: 24px !important;
          }
          .footerNote {
            margin-top: 28px;
            border: 1px solid #e5e7eb;
            background: #f8fafc;
            border-radius: 18px;
            padding: 20px;
          }
          .footerNote .title {
            font-size: 11px;
            color: #94a3b8;
            font-weight: 900;
            letter-spacing: 4px;
            text-transform: uppercase;
          }
          .footerNote .text {
            margin-top: 12px;
            color: #475569;
            font-size: 14px;
            line-height: 1.6;
            font-weight: 600;
          }
        </style>
      </head>
      <body>
        <div class="page">
          <div class="header">
            <div class="brand">
              <div class="logo">METRIX</div>
              <div>
                <div class="company">Duru Mermer</div>
                <h1>Müşteri Hesap Ekstresi</h1>
                <div class="date">Düzenleme tarihi: ${new Date().toLocaleDateString('tr-TR')}</div>
              </div>
            </div>
            <div class="balanceBox">
              <div class="label">Güncel Bakiye</div>
              <div class="value">${tl(a.bakiye)}</div>
            </div>
          </div>

          <div class="topGrid">
            <div class="panel">
              <div class="panelLabel">Müşteri</div>
              <div class="customerName">Sayın ${musteriAdi(aktif)}</div>
              <div class="muted">${[aktif.telefon, aktif.email].filter(Boolean).join(' · ') || 'İletişim bilgisi yok'}</div>
            </div>

            <div class="panel">
              <div class="panelLabel">Ödeme Bilgilendirme Notu</div>
              <div class="noteText">
                Sayın ${musteriAdi(aktif)}, hesabınızda <b>${tl(a.bakiye)}</b> güncel bakiye görünmektedir.
                Uygun olduğunuzda ödeme planınızı bizimle paylaşmanızı rica ederiz.
              </div>
            </div>
          </div>

          <div class="kpis">
            <div class="kpi"><div class="k">Onaylı Ciro</div><div class="v">${tl(a.onayliCiro)}</div></div>
            <div class="kpi"><div class="k">Tahsilat</div><div class="v">${tl(a.tahsilat)}</div></div>
            <div class="kpi"><div class="k">Teklif</div><div class="v">${a.teklifSayisi}</div></div>
            <div class="kpi"><div class="k">Onay Oranı</div><div class="v">${pct(a.onayOrani)}</div></div>
          </div>

          <div class="tableHead">
            <h2>Hesap Hareketleri</h2>
            <div class="muted">${(aktif.isler || []).length} hareket</div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Tarih</th>
                <th>İşlem</th>
                <th>Açıklama</th>
                <th class="right">Borç</th>
                <th class="right">Alacak</th>
                <th class="right">Bakiye</th>
              </tr>
            </thead>
            <tbody>
              ${hareketler || `<tr><td colspan="6" class="empty">Henüz onaylı hesap hareketi yok.</td></tr>`}
            </tbody>
          </table>

          <div class="footerNote">
            <div class="title">Not</div>
            <div class="text">
              Bu ekstre, kayıtlı iş ve ödeme hareketlerine göre hazırlanmıştır. Herhangi bir farklılık görmeniz halinde bizimle iletişime geçebilirsiniz.
            </div>
          </div>
        </div>
      </body>
      </html>
    `

    const printWindow = window.open('', '_blank', 'width=900,height=1200')
    if (!printWindow) return

    printWindow.document.open()
    printWindow.document.write(html)
    printWindow.document.close()
    printWindow.focus()

    setTimeout(() => {
      printWindow.print()
      printWindow.close()
    }, 500)
  }

  function whatsappEkstreGonder() {
    if (!aktif || !a) return
    const phone = telefonTemizle(aktif.telefon || '')
    const mesaj = `Merhaba ${musteriAdi(aktif)},

Cari ekstre özetiniz:

Onaylı ciro: ${tl(a.onayliCiro)}
Tahsilat: ${tl(a.tahsilat)}
Bakiye: ${tl(a.bakiye)}

Detaylar için bizimle iletişime geçebilirsiniz.`
    const url = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(mesaj)}`
      : `https://wa.me/?text=${encodeURIComponent(mesaj)}`
    window.open(url, '_blank')
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
                <div>
                  <p className="text-xs text-slate-400">Müşteri portföyü</p>
                  <h2 className="text-lg font-semibold">Liste</h2>
                </div>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">{filtreli.length} kayıt</span>
              </div>

              <input
                value={arama}
                onChange={(e) => setArama(e.target.value)}
                placeholder="Müşteri ara..."
                className="mt-4 w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm outline-none placeholder:text-slate-500 focus:border-emerald-400/50"
              />

              <div className="mt-3 grid grid-cols-3 gap-2">
                <MiniStat label="Adet" value={toplam.adet} />
                <MiniStat label="Bakiye" value={tl(toplam.toplamBakiye)} tone={toplam.toplamBakiye > 0 ? 'text-amber-300' : 'text-emerald-300'} />
                <MiniStat label="Ciro" value={tl(toplam.toplamOnayliCiro)} tone="text-emerald-300" />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3">
              {yukleniyor && <p className="p-4 text-sm text-slate-400">Müşteriler yükleniyor...</p>}

              {!yukleniyor && filtreli.length === 0 && (
                <div className="rounded-2xl border border-dashed border-white/10 p-5 text-sm text-slate-400">
                  Müşteri bulunamadı. Sağ panelden yeni müşteri oluşturabilir veya Excel ile içe aktarabilirsin.
                </div>
              )}

              <div className="space-y-2">
                {filtreli.map((m) => {
                  const ma = analiz(m)
                  const secili = aktif?.id === m.id
                  return (
                    <button
                      key={m.id}
                      onClick={() => setAktif(m)}
                      className={`w-full rounded-2xl border p-3 text-left transition ${
                        secili
                          ? 'border-emerald-300/70 bg-gradient-to-br from-emerald-400/20 via-emerald-300/10 to-cyan-400/10 shadow-[0_0_32px_rgba(16,185,129,0.22)] ring-1 ring-emerald-300/30'
                          : 'border-white/10 bg-white/[0.035] hover:bg-white/[0.07]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">{musteriAdi(m)}</p>
                          <p className="mt-1 truncate text-xs text-slate-500">{m.telefon || m.email || 'İletişim bilgisi yok'}</p>
                        </div>
                        <span className={`shrink-0 text-xs ${ma.bakiye > 0 ? 'text-amber-300' : 'text-emerald-300'}`}>
                          {tl(ma.bakiye)}
                        </span>
                      </div>
                      <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                        <span>{ma.teklifSayisi} teklif</span>
                        <span>{pct(ma.onayOrani)} onay</span>
                        <span>{tl(ma.onayliCiro)}</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </Card>

          <Card className="min-h-[560px] p-3 lg:min-h-0 lg:overflow-hidden">
            {!aktif || !a ? (
              <div className="flex h-full min-h-[480px] flex-col items-center justify-center rounded-3xl border border-dashed border-white/10 p-6 text-center">
                <p className="text-2xl font-semibold">Müşteri bulunamadı</p>
                <p className="mt-2 max-w-md text-sm text-slate-400">Yeni müşteri ekleyerek veya Excel şablonu yükleyerek portföyünü oluşturmaya başlayabilirsin.</p>
                <button onClick={yeniAc} className="mt-6 rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-slate-950">
                  + Yeni Müşteri
                </button>
              </div>
            ) : (
              <div className="grid h-full grid-rows-[auto_auto_auto_1fr] gap-2">
                <div className="flex min-w-0 flex-col gap-2 rounded-3xl border border-white/10 bg-black/20 p-3 xl:flex-row xl:items-center xl:justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs uppercase tracking-[0.24em] text-emerald-300/80">Seçili müşteri</p>
                    <h2 className="mt-1 truncate text-xl xl:text-2xl font-semibold">{musteriAdi(aktif)}</h2>
                    <p className="mt-1 truncate text-sm text-slate-400">{[aktif.telefon, aktif.email].filter(Boolean).join(' · ') || 'İletişim bilgisi yok'}</p>
                  </div>
                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    <button onClick={() => setEkstreAcik(true)} className="shrink-0 rounded-2xl border border-blue-400/30 bg-blue-400/10 px-3 py-2 text-xs xl:text-sm font-semibold text-blue-200">
                      PDF Ekstre
                    </button>
                    <button onClick={duzenleAc} className="shrink-0 rounded-2xl border border-white/10 bg-white/10 px-3 py-2 text-xs xl:text-sm font-semibold">
                      Düzenle
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
                  <MiniStat label="Toplam Verilen Teklif" value={a.teklifSayisi} />
                  <MiniStat label="Teklif Cirosu" value={tl(a.verilenTeklifCiro)} tone="text-blue-300" />
                  <MiniStat label="Onaylanan Teklif" value={a.onaySayisi} tone="text-emerald-300" />
                  <MiniStat label="Onaylı Ciro" value={tl(a.onayliCiro)} tone="text-emerald-300" />
                </div>

                <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
                  <MiniStat label="Onay Yüzdesi" value={pct(a.onayOrani)} tone="text-blue-300" />
                  <MiniStat label="Tahsilat" value={tl(a.tahsilat)} tone="text-emerald-300" />
                  <MiniStat label="Tahsilat Oranı" value={pct(a.tahsilatOrani)} tone="text-purple-300" />
                  <MiniStat label="Bakiye" value={tl(a.bakiye)} tone={a.bakiye > 0 ? 'text-amber-300' : 'text-emerald-300'} />
                </div>

                <div className="grid min-h-0 gap-2 xl:grid-cols-[0.82fr_1.18fr]">
                  <div className="rounded-3xl border border-white/10 bg-black/20 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs text-slate-400">Müşteri performansı</p>
                        <h3 className={`mt-1 text-xl font-semibold ${a.renk}`}>{a.durum}</h3>
                      </div>
                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs">{a.bekleyenSayisi} bekleyen</span>
                    </div>
                    <p className="mt-2 text-sm leading-5 text-slate-300">{a.yorum}</p>
                    <div className="mt-3 space-y-3">
                      <Progress label="Teklif onay oranı" value={a.onayOrani} />
                      <Progress label="Tahsilat oranı" value={a.tahsilatOrani} />
                    </div>
                  </div>

                  <div className="rounded-3xl border border-white/10 bg-black/20 p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-slate-400">Son işler</p>
                        <h3 className="mt-1 text-lg font-semibold">Kısa geçmiş</h3>
                      </div>
                      <button
                        onClick={() => router.push(`/dashboard/yeni-is-v3?musteriId=${aktif.id}&musteriAdi=${encodeURIComponent(musteriAdi(aktif))}`)}
                        className="shrink-0 rounded-2xl bg-emerald-500 px-2.5 py-2 text-[11px] font-bold text-slate-950"
                      >
                        Teklif aç
                      </button>
                    </div>

                    <div className="mt-2 space-y-2">
                      {(aktif.isler || []).slice(0, 4).map((i: any) => (
                        <div key={i.id} className="rounded-2xl border border-white/10 bg-white/[0.035] p-2.5">
                          <div className="flex items-center justify-between gap-3">
                            <p className="truncate text-sm font-medium">{i.teklifNo || 'Teklif'}</p>
                            <p className="shrink-0 text-sm text-emerald-300">{tl(i.satisFiyati)}</p>
                          </div>
                          <p className="mt-1 truncate text-xs text-slate-500">{i.urunAdi || 'Ürün'} · {i.durum || 'durum yok'}</p>
                        </div>
                      ))}

                      {(aktif.isler || []).length === 0 && (
                        <div className="rounded-2xl border border-dashed border-white/10 p-4 text-sm text-slate-400">
                          Bu müşteriye henüz teklif oluşturulmamış.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </Card>

          <Card className="p-2.5 lg:overflow-y-auto">
            <div className="space-y-3">
              <button onClick={yeniAc} className="w-full rounded-2xl bg-emerald-500 px-4 py-3 text-left font-bold text-slate-950 shadow-lg shadow-emerald-500/10">
                + Yeni Müşteri
                <span className="block text-xs font-medium text-slate-800/80">Cari kart oluştur</span>
              </button>

              <a href="/api/musteriler/sablon" className="block w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 font-semibold">
                Excel Şablon İndir
                <span className="block text-xs font-normal text-slate-400">Standart içe aktarma dosyası</span>
              </a>

              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(e) => excelYukle(e.target.files?.[0])}
              />

              <button
                onClick={() => fileRef.current?.click()}
                disabled={excelYukleniyor}
                className="w-full rounded-2xl border border-blue-400/30 bg-blue-400/10 px-4 py-3 text-left font-semibold text-blue-100 disabled:opacity-50"
              >
                {excelYukleniyor ? 'Excel Yükleniyor...' : 'Excel Yükle'}
                <span className="block text-xs font-normal text-blue-100/70">Toplu müşteri aktar</span>
              </button>

              {excelMesaji && (
                <div className="rounded-2xl border border-white/10 bg-black/25 p-3 text-xs text-slate-300">
                  {excelMesaji}
                </div>
              )}

              <div className="rounded-3xl border border-white/10 bg-black/20 p-3">
                <p className="text-xs text-slate-400">Hızlı aksiyon</p>
                <div className="mt-2 space-y-2">
                  <button
                    disabled={!aktif}
                    onClick={() => aktif && router.push(`/dashboard/yeni-is-v3?musteriId=${aktif.id}&musteriAdi=${encodeURIComponent(musteriAdi(aktif))}`)}
                    className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-left text-sm font-semibold disabled:opacity-40"
                  >
                    Seçili müşteriye teklif oluştur
                  </button>
                  <button
                    disabled={!aktif}
                    onClick={() => setEkstreAcik(true)}
                    className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-left text-sm font-semibold disabled:opacity-40"
                  >
                    Cari ekstre görüntüle
                  </button>
                </div>
              </div>

              {a && (
                <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-emerald-400/10 to-blue-400/10 p-4">
                  <p className="text-xs text-slate-400">Seçili müşteri özeti</p>
                  <p className="mt-2 text-lg font-semibold">{musteriAdi(aktif)}</p>
                  <p className={`mt-2 text-sm ${a.renk}`}>{a.durum}</p>
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
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-emerald-300/80">{duzenle ? 'Düzenle' : 'Yeni kayıt'}</p>
                <h2 className="mt-1 text-xl font-semibold">{duzenle ? 'Müşteri Bilgileri' : 'Yeni Müşteri'}</h2>
              </div>
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
                <option value="borc">Müşteri borçlu</option>
                <option value="alacak">Müşteri alacaklı</option>
              </select>
            </div>

            <button onClick={kaydet} className="mt-5 w-full rounded-2xl bg-emerald-500 px-4 py-3 font-bold text-slate-950">
              {duzenle ? 'Değişiklikleri Kaydet' : 'Müşteri Oluştur'}
            </button>
          </div>
        </div>
      )}

      {ekstreAcik && aktif && a && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-3 sm:items-center">
          <div className="flex max-h-[92vh] w-full max-w-4xl flex-col rounded-3xl border border-white/10 bg-[#0B1120] p-4 shadow-2xl">
            <div id="ekstre-pdf" className="flex-1 overflow-y-auto rounded-3xl bg-white p-6 text-slate-950">
              <div className="flex items-start justify-between gap-6 border-b border-slate-200 pb-5">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950 text-xs font-bold text-white">
                    METRIX
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.35em] text-slate-400">Duru Mermer</p>
                    <h2 className="mt-1 text-3xl font-black tracking-tight">Müşteri Hesap Ekstresi</h2>
                    <p className="mt-1 text-sm text-slate-500">Düzenleme tarihi: {new Date().toLocaleDateString('tr-TR')}</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-6 py-4 text-right">
                  <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-slate-400">Güncel Bakiye</p>
                  <p className="mt-2 text-2xl font-black text-amber-600">{tl(a.bakiye)}</p>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-[1.5fr_0.8fr] gap-4">
                <div className="min-h-[190px] rounded-3xl border border-slate-200 p-5">
                  <p className="text-[11px] font-bold uppercase tracking-[0.35em] text-slate-400">Müşteri</p>
                  <h3 className="mt-4 text-2xl font-black">Sayın {musteriAdi(aktif)}</h3>
                  <p className="mt-2 text-sm text-slate-500">{[aktif.telefon, aktif.email].filter(Boolean).join(' · ') || 'İletişim bilgisi yok'}</p>
                </div>

                <div className="min-h-[190px] rounded-3xl border border-slate-200 p-5">
                  <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-slate-400">Ödeme Bilgilendirme Notu</p>
                  <p className="mt-4 text-sm font-medium leading-6 text-slate-600">
                    Sayın {musteriAdi(aktif)}, hesabınızda <b>{tl(a.bakiye)}</b> güncel bakiye görünmektedir.
                    Uygun olduğunuzda ödeme planınızı bizimle paylaşmanızı rica ederiz.
                  </p>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-4 gap-3">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold text-slate-500">Onaylı Ciro</p>
                  <p className="mt-2 text-lg font-black">{tl(a.onayliCiro)}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold text-slate-500">Tahsilat</p>
                  <p className="mt-2 text-lg font-black">{tl(a.tahsilat)}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold text-slate-500">Teklif</p>
                  <p className="mt-2 text-lg font-black">{a.teklifSayisi}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold text-slate-500">Onay Oranı</p>
                  <p className="mt-2 text-lg font-black">{pct(a.onayOrani)}</p>
                </div>
              </div>

              <div className="mt-7 flex items-end justify-between">
                <h3 className="text-xl font-black">Hesap Hareketleri</h3>
                <p className="text-sm text-slate-500">{(aktif.isler || []).length} hareket</p>
              </div>

              <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200">
                <table className="w-full text-sm">
                  <thead className="bg-slate-950 text-white">
                    <tr>
                      <th className="px-4 py-3 text-left">Tarih</th>
                      <th className="px-4 py-3 text-left">İşlem</th>
                      <th className="px-4 py-3 text-left">Açıklama</th>
                      <th className="px-4 py-3 text-right">Borç</th>
                      <th className="px-4 py-3 text-right">Alacak</th>
                      <th className="px-4 py-3 text-right">Bakiye</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(aktif.isler || []).filter((i: any) => i.durum === 'onaylandi').slice(0, 8).map((i: any) => (
                      <tr key={i.id} className="border-t border-slate-200">
                        <td className="px-4 py-3">{i.onaylanmaTarihi ? new Date(i.onaylanmaTarihi).toLocaleDateString('tr-TR') : '-'}</td>
                        <td className="px-4 py-3 font-bold">Onaylı İş</td>
                        <td className="px-4 py-3">{i.teklifNo || 'Teklif'} · {i.urunAdi || 'Ürün'}</td>
                        <td className="px-4 py-3 text-right font-bold">{tl(i.satisFiyati)}</td>
                        <td className="px-4 py-3 text-right">—</td>
                        <td className="px-4 py-3 text-right font-bold">{tl(i.satisFiyati)}</td>
                      </tr>
                    ))}

                    {(aktif.isler || []).filter((i: any) => i.durum === 'onaylandi').length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-6 text-center text-slate-500">Henüz onaylı hesap hareketi yok.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.35em] text-slate-400">Not</p>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  Bu ekstre, kayıtlı iş ve ödeme hareketlerine göre hazırlanmıştır. Herhangi bir farklılık görmeniz halinde bizimle iletişime geçebilirsiniz.
                </p>
              </div>
            </div>

            <div className="shrink-0 border-t border-white/10 pt-3">
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
