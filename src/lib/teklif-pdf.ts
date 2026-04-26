import QRCode from 'qrcode'

function para(n: number) {
  return (Number(n) || 0).toLocaleString('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function guvenliYazi(v: unknown) {
  if (v === null || v === undefined) return ''
  return String(v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function telefonTemizle(v: string) {
  const sadeceRakam = String(v || '').replace(/\D/g, '')
  if (!sadeceRakam) return ''
  if (sadeceRakam.startsWith('90')) return sadeceRakam
  if (sadeceRakam.startsWith('0')) return '9' + sadeceRakam
  return '90' + sadeceRakam
}

function satir(ad: string, deger: string) {
  return `
    <div class="info-row">
      <span>${guvenliYazi(ad)}</span>
      <strong>${guvenliYazi(deger)}</strong>
    </div>
  `
}

export async function teklifPdfIndir(veri: any) {
  const html2pdf = (await import('html2pdf.js')).default

  const firma = veri?.firma || {}
  const is = veri?.is || {}

  const firmaAdi = guvenliYazi(firma.adi || 'Firma')
  const firmaAdres = guvenliYazi(firma.adres || '')
  const firmaTelefon = guvenliYazi(firma.telefon || '')
  const firmaEmail = guvenliYazi(firma.email || '')
  const firmaLogo = guvenliYazi(firma.logoUrl || '')
  const kurulusYili = Number(firma.kurulusYili || 0)

  const musteriAdi = guvenliYazi(veri?.musteri?.adi || '')
  const musteriTipi = guvenliYazi(veri?.musteri?.tipi || '')
  const teklifNo = guvenliYazi(veri?.teklifNo || '')
  const tarih = guvenliYazi(veri?.tarih || '')
  const gecerlilikTarihi = guvenliYazi(veri?.gecerlilikTarihi || '')

  const urunAdi = guvenliYazi(is.urunAdi || '')
  const malzemeTipi = guvenliYazi(is.malzemeTipi || '')
  const notlar = guvenliYazi(is.notlar || '')

  const tezgahMtul = Number(is.metrajMtul || 0)
  const tezgahArasiMtul = Number(is.tezgahArasiMtul || 0)
  const adaTezgahMtul = Number(is.adaTezgahMtul || 0)

  const toplamMetraj = Number(is.toplamMetraj || tezgahMtul + tezgahArasiMtul + adaTezgahMtul)
  const kullanilanPlakaSayisi = Number(is.kullanilanPlakaSayisi || 0)
  const toplamSureDakika = Number(is.toplamSureDakika || 0)
  const satisFiyati = Number(is.satisFiyati || 0)
  const kdvTutari = Number(is.kdvTutari || 0)
  const kdvDahilFiyat = Number(is.kdvDahilFiyat || 0)
  const kdvOrani = Number(is.kdvOrani || 20)

  const odemeKosullari = guvenliYazi(
    veri?.odemeKosullari || 'Sipariş onayı sonrası ödeme planı ayrıca mutabık kalınacaktır.'
  )

  const teslimTarihi = guvenliYazi(
    veri?.teslimTarihi || 'Termin, ölçü ve kesin sipariş onayı sonrası netleşecektir.'
  )

  const kapasiteYazisi =
    toplamSureDakika > 0
      ? `Bu proje için üretim süreci planlanmış olup tahmini işlem süresi ${Math.round(toplamSureDakika)} dakika olarak öngörülmüştür.`
      : 'Bu proje, kontrollü üretim planlaması içinde değerlendirilecektir.'

  const deneyimYazisi =
    kurulusYili > 0
      ? `${kurulusYili} yılından bu yana porselen, doğal taş ve tezgah uygulamaları gerçekleştiriyoruz.`
      : 'Porselen, doğal taş ve tezgah uygulamalarında profesyonel üretim yaklaşımıyla çalışıyoruz.'

  const whatsappNo = telefonTemizle(String(firma.telefon || ''))
  const whatsappUrl = whatsappNo
    ? `https://wa.me/${whatsappNo}?text=${encodeURIComponent(`${teklifNo} numaralı teklifinizi onaylamak istiyorum.`)}`
    : ''

  const qrDataUrl = whatsappUrl
    ? await QRCode.toDataURL(whatsappUrl, { margin: 1, width: 120 })
    : ''

  const kalemler = [
    tezgahMtul > 0 ? { ad: `Tezgah Uygulaması`, miktar: `${tezgahMtul.toFixed(2)} mtül` } : null,
    tezgahArasiMtul > 0 ? { ad: `Tezgah Arası`, miktar: `${tezgahArasiMtul.toFixed(2)} mtül` } : null,
    adaTezgahMtul > 0 ? { ad: `Ada Tezgah`, miktar: `${adaTezgahMtul.toFixed(2)} mtül` } : null,
  ].filter(Boolean) as Array<{ ad: string; miktar: string }>

  if (kalemler.length === 0) {
    kalemler.push({ ad: urunAdi || 'Ürün / Uygulama', miktar: toplamMetraj ? `${toplamMetraj.toFixed(2)} mtül` : '-' })
  }

  const element = document.createElement('div')

  element.innerHTML = `
  <style>
    .pdf-wrap {
      width: 190mm;
      min-height: 277mm;
      box-sizing: border-box;
      background: #ffffff;
      color: #0f172a;
      font-family: Arial, Helvetica, sans-serif;
      padding: 13mm;
    }

    .hero {
      border-radius: 22px;
      overflow: hidden;
      background: linear-gradient(135deg, #0f172a 0%, #111827 52%, #1e1b4b 100%);
      color: white;
      padding: 24px;
      position: relative;
    }

    .hero::after {
      content: "";
      position: absolute;
      width: 220px;
      height: 220px;
      border-radius: 999px;
      right: -70px;
      top: -90px;
      background: rgba(37, 99, 235, 0.35);
      filter: blur(10px);
    }

    .hero-top {
      position: relative;
      z-index: 1;
      display: flex;
      justify-content: space-between;
      gap: 20px;
      align-items: flex-start;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 14px;
    }

    .logo {
      width: 58px;
      height: 58px;
      border-radius: 16px;
      background: white;
      object-fit: contain;
      padding: 5px;
    }

    .logo-fallback {
      width: 58px;
      height: 58px;
      border-radius: 16px;
      background: rgba(255,255,255,0.14);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
      font-weight: 800;
    }

    .brand-title {
      font-size: 20px;
      font-weight: 800;
      letter-spacing: .2px;
      line-height: 1.1;
    }

    .brand-sub {
      margin-top: 5px;
      font-size: 10.5px;
      color: #cbd5e1;
      letter-spacing: .12em;
      text-transform: uppercase;
    }

    .meta {
      position: relative;
      z-index: 1;
      text-align: right;
      font-size: 10.5px;
      line-height: 1.7;
      color: #dbeafe;
    }

    .title-block {
      position: relative;
      z-index: 1;
      margin-top: 34px;
      max-width: 520px;
    }

    .eyebrow {
      font-size: 10px;
      letter-spacing: .24em;
      text-transform: uppercase;
      color: #93c5fd;
      font-weight: 700;
    }

    .main-title {
      margin-top: 8px;
      font-size: 31px;
      line-height: 1.08;
      font-weight: 900;
    }

    .main-desc {
      margin-top: 10px;
      max-width: 470px;
      font-size: 12px;
      line-height: 1.6;
      color: #dbeafe;
    }

    .section {
      margin-top: 16px;
      border: 1px solid #e2e8f0;
      border-radius: 18px;
      padding: 16px;
      page-break-inside: avoid;
    }

    .section-title {
      font-size: 10px;
      letter-spacing: .22em;
      text-transform: uppercase;
      color: #64748b;
      font-weight: 800;
      margin-bottom: 8px;
    }

    .project-grid {
      display: grid;
      grid-template-columns: 1.1fr .9fr;
      gap: 14px;
    }

    .summary-text {
      font-size: 12px;
      line-height: 1.7;
      color: #334155;
    }

    .pill-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 9px;
    }

    .pill {
      border-radius: 14px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      padding: 11px;
    }

    .pill small {
      display: block;
      color: #64748b;
      font-size: 9.5px;
      margin-bottom: 4px;
    }

    .pill strong {
      font-size: 14px;
      color: #0f172a;
    }

    .benefits {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 9px;
    }

    .benefit {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 12px;
      font-size: 11px;
      line-height: 1.45;
      color: #334155;
      min-height: 58px;
    }

    .benefit b {
      display: block;
      color: #0f172a;
      margin-bottom: 4px;
      font-size: 11px;
    }

    .table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      overflow: hidden;
      border-radius: 14px;
      border: 1px solid #e2e8f0;
      font-size: 11px;
    }

    .table th {
      background: #f1f5f9;
      color: #475569;
      text-align: left;
      padding: 9px;
      font-size: 10px;
      letter-spacing: .08em;
      text-transform: uppercase;
    }

    .table td {
      padding: 10px 9px;
      border-top: 1px solid #e2e8f0;
      color: #0f172a;
    }

    .price-box {
      margin-top: 14px;
      display: grid;
      grid-template-columns: 1fr 230px;
      gap: 14px;
      align-items: stretch;
    }

    .price-note {
      border-radius: 18px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      padding: 15px;
      font-size: 11.5px;
      line-height: 1.65;
      color: #334155;
    }

    .total-card {
      border-radius: 18px;
      background: linear-gradient(135deg, #0f172a, #1e293b);
      color: white;
      padding: 16px;
      text-align: right;
    }

    .total-card small {
      display: block;
      color: #cbd5e1;
      font-size: 10px;
      letter-spacing: .14em;
      text-transform: uppercase;
    }

    .total-card .total {
      margin-top: 7px;
      font-size: 25px;
      line-height: 1.1;
      font-weight: 900;
    }

    .total-card .kdv {
      margin-top: 6px;
      font-size: 10px;
      color: #cbd5e1;
    }

    .info-row {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      padding: 8px 0;
      border-bottom: 1px solid #e2e8f0;
      font-size: 11px;
    }

    .info-row span {
      color: #64748b;
    }

    .info-row strong {
      color: #0f172a;
      text-align: right;
    }

    .approval {
      margin-top: 16px;
      border-radius: 20px;
      border: 1px solid #bfdbfe;
      background: linear-gradient(135deg, #eff6ff, #ffffff);
      padding: 16px;
      display: grid;
      grid-template-columns: 1fr 132px;
      gap: 16px;
      align-items: center;
      page-break-inside: avoid;
    }

    .approval h3 {
      margin: 0;
      font-size: 15px;
      color: #0f172a;
    }

    .approval p {
      margin: 7px 0 0 0;
      color: #334155;
      line-height: 1.55;
      font-size: 11.5px;
    }

    .qr {
      width: 112px;
      height: 112px;
      border-radius: 14px;
      background: white;
      border: 1px solid #dbeafe;
      padding: 6px;
      object-fit: contain;
    }

    .footer {
      margin-top: 16px;
      display: flex;
      justify-content: space-between;
      gap: 18px;
      align-items: flex-end;
      color: #64748b;
      font-size: 10px;
      line-height: 1.5;
    }

    .signature {
      margin-top: 16px;
      border-top: 1px solid #cbd5e1;
      padding-top: 7px;
      min-width: 170px;
      text-align: center;
      color: #334155;
      font-size: 10px;
    }
  </style>

  <div class="pdf-wrap">
    <div class="hero">
      <div class="hero-top">
        <div class="brand">
          ${
            firmaLogo
              ? `<img class="logo" src="${firmaLogo}" />`
              : `<div class="logo-fallback">${firmaAdi.charAt(0) || 'M'}</div>`
          }
          <div>
            <div class="brand-title">${firmaAdi}</div>
            <div class="brand-sub">Profesyonel üretim teklifi</div>
          </div>
        </div>

        <div class="meta">
          <div><b>Teklif No:</b> ${teklifNo}</div>
          <div><b>Tarih:</b> ${tarih}</div>
          <div><b>Geçerlilik:</b> ${gecerlilikTarihi}</div>
        </div>
      </div>

      <div class="title-block">
        <div class="eyebrow">Özel üretim porselen uygulama teklifi</div>
        <div class="main-title">Projeniz için kontrollü, planlı ve güvenilir üretim.</div>
        <div class="main-desc">
          Bu teklif, ürün seçimi, metraj, üretim süreci ve uygulama kapsamı dikkate alınarak size özel hazırlanmıştır.
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Proje Özeti</div>
      <div class="project-grid">
        <div class="summary-text">
          <b>${musteriAdi}</b> için hazırlanan bu teklif kapsamında <b>${urunAdi || 'seçili ürün'}</b>
          ${malzemeTipi ? ` (${malzemeTipi})` : ''} uygulaması planlanmıştır.
          <br/><br/>
          Bu proje, atölye kapasitemiz ve üretim planlamamız dikkate alınarak özel olarak hazırlanmıştır.
          Uygulama süreci, verimli ve kontrollü üretim modeli ile planlanmıştır.
          Plaka yerleşimi, minimum fire hedefiyle optimize edilmiştir.
        </div>

        <div class="pill-grid">
          <div class="pill"><small>Müşteri</small><strong>${musteriAdi || '-'}</strong></div>
          <div class="pill"><small>Müşteri Tipi</small><strong>${musteriTipi || '-'}</strong></div>
          <div class="pill"><small>Toplam Metraj</small><strong>${toplamMetraj.toFixed(2)} mtül</strong></div>
          <div class="pill"><small>Plaka</small><strong>${kullanilanPlakaSayisi || '-'} adet</strong></div>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Sistemli Üretim Yaklaşımı</div>
      <div class="benefits">
        <div class="benefit"><b>Akıllı üretim planlama</b>İş akışı, üretim süreci ve uygulama kapsamı planlı şekilde yönetilir.</div>
        <div class="benefit"><b>Fire optimizasyonu aktif</b>Plaka yerleşimi minimum fire hedefiyle değerlendirilir.</div>
        <div class="benefit"><b>Süre ve maliyet kontrolü</b>${guvenliYazi(kapasiteYazisi)}</div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Teklif Kapsamı</div>
      <table class="table">
        <thead>
          <tr>
            <th>İş Kalemi</th>
            <th>Ürün / Malzeme</th>
            <th style="text-align:right;">Miktar</th>
          </tr>
        </thead>
        <tbody>
          ${kalemler.map(k => `
            <tr>
              <td>${guvenliYazi(k.ad)}</td>
              <td>${urunAdi || malzemeTipi || '-'}</td>
              <td style="text-align:right;">${guvenliYazi(k.miktar)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="price-box">
        <div class="price-note">
          Bu fiyat; teklif kapsamındaki malzeme, üretim planlama, işçilik ve uygulama sürecini kapsayacak şekilde hazırlanmıştır.
          Ek talepler, proje kapsamı değişiklikleri veya sahaya özel ilave ihtiyaçlar ayrıca değerlendirilir.
        </div>

        <div class="total-card">
          <small>Toplam Yatırım</small>
          <div class="total">₺${para(kdvDahilFiyat || satisFiyati)}</div>
          <div class="kdv">KDV %${kdvOrani} ${kdvTutari ? `dahil / KDV: ₺${para(kdvTutari)}` : ''}</div>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Ödeme ve Teslim</div>
      ${satir('Ödeme Koşulları', odemeKosullari)}
      ${satir('Teslim Tarihi', teslimTarihi)}
      ${satir('Teklif Geçerliliği', gecerlilikTarihi)}
      ${notlar ? satir('Açıklama', notlar) : ''}
    </div>

    <div class="section">
      <div class="section-title">Neden Biz?</div>
      <div class="summary-text">
        ${guvenliYazi(deneyimYazisi)}
        <br/><br/>
        Amacımız yalnızca ürün satmak değil; ölçüden uygulamaya kadar kontrollü, anlaşılır ve güven veren bir üretim süreci sunmaktır.
      </div>
    </div>

    <div class="approval">
      <div>
        <h3>Teklifi onaylamak için bize ulaşabilirsiniz.</h3>
        <p>
          Onay vermeniz durumunda ölçü, üretim ve uygulama süreci planlanarak iş programına alınacaktır.
          ${whatsappUrl ? 'QR kodu okutarak WhatsApp üzerinden hızlıca onay mesajı gönderebilirsiniz.' : ''}
        </p>
      </div>

      ${
        qrDataUrl
          ? `<img class="qr" src="${qrDataUrl}" />`
          : `<div class="qr" style="display:flex;align-items:center;justify-content:center;font-size:10px;color:#64748b;text-align:center;">WhatsApp QR<br/>için telefon<br/>ekleyin</div>`
      }
    </div>

    <div class="footer">
      <div>
        <b>${firmaAdi}</b><br/>
        ${firmaAdres ? `${firmaAdres}<br/>` : ''}
        ${firmaTelefon ? `${firmaTelefon}<br/>` : ''}
        ${firmaEmail ? `${firmaEmail}` : ''}
      </div>

      <div class="signature">
        Müşteri Onayı / İmza
      </div>
    </div>
  </div>
  `

  await html2pdf()
    .set({
      margin: [0, 0, 0, 0],
      filename: `Teklif-${teklifNo || 'teklif'}.pdf`,
      image: { type: 'jpeg', quality: 1 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
      },
      jsPDF: {
        unit: 'mm',
        format: 'a4',
        orientation: 'portrait',
      },
      pagebreak: {
        mode: ['avoid-all', 'css', 'legacy'],
      },
    })
    .from(element)
    .save()
}
