export interface TeklifVerisi {
  teklifNo: string
  tarih: string
  gecerlilikTarihi: string
  firma: {
    adi: string
    adres: string
    telefon: string
    email: string
    sehir: string
    ilce: string
    logoUrl: string
  }
  musteri: {
    adi: string
    tipi: string
  }
  is: {
    urunAdi: string
    malzemeTipi: string
    metrajMtul: number
    tezgahArasiMtul: number
    adaTezgahMtul: number
    toplamMetraj: number
    plakaGenislikCm: number
    plakaUzunlukCm: number
    plakadanAlinanMtul: number
    kullanilanPlakaSayisi: number
    plakaFiyatiEuro: number
    kullanilanKur: number
    toplamSureDakika: number
    iscilikMaliyeti: number
    malzemeMaliyeti: number
    toplamMaliyet: number
    karYuzdesi: number
    satisFiyati: number
    kdvOrani: number
    kdvTutari: number
    kdvDahilFiyat: number
    mtulSatisFiyati: number
    notlar: string
  }
}

function para(tutar: number, ondalik = 2): string {
  return tutar.toLocaleString('tr-TR', {
    minimumFractionDigits: ondalik,
    maximumFractionDigits: ondalik,
  })
}

export async function teklifPdfIndir(veri: TeklifVerisi) {
  const html2pdf = (await import('html2pdf.js')).default

  const satirlar = []
  if (veri.is.metrajMtul > 0) {
    satirlar.push({ tanim: 'Tezgah', miktar: veri.is.metrajMtul })
  }
  if (veri.is.tezgahArasiMtul > 0) {
    satirlar.push({ tanim: 'Tezgah Arası', miktar: veri.is.tezgahArasiMtul })
  }
  if (veri.is.adaTezgahMtul > 0) {
    satirlar.push({ tanim: 'Ada Tezgah', miktar: veri.is.adaTezgahMtul })
  }

  const birimFiyat = veri.is.toplamMetraj > 0 ? veri.is.satisFiyati / veri.is.toplamMetraj : 0

  const satirHtml = satirlar.map((s, i) => `
    <tr style="background: ${i % 2 === 0 ? '#ffffff' : '#f9fafb'};">
      <td style="padding: 10px 12px; font-size: 13px;">${s.tanim}</td>
      <td style="padding: 10px 12px; font-size: 13px;">${veri.is.urunAdi} — ${veri.is.malzemeTipi}</td>
      <td style="padding: 10px 12px; font-size: 13px; text-align: center;">${veri.is.plakaGenislikCm > 0 ? `${veri.is.plakaGenislikCm}x${veri.is.plakaUzunlukCm} cm` : '—'}</td>
      <td style="padding: 10px 12px; font-size: 13px; text-align: right;">${para(s.miktar, 2)} mtül</td>
      <td style="padding: 10px 12px; font-size: 13px; text-align: right;">₺${para(birimFiyat)}</td>
      <td style="padding: 10px 12px; font-size: 13px; text-align: right; font-weight: 600;">₺${para(birimFiyat * s.miktar)}</td>
    </tr>
  `).join('')

  const icerik = `
    <div style="font-family: Arial, sans-serif; padding: 32px; max-width: 794px; margin: 0 auto; color: #1f2937; font-size: 13px;">
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
        <tr>
          <td style="width: 50%; vertical-align: top;">
            ${veri.firma.logoUrl ? `<img src="${window.location.origin}${veri.firma.logoUrl}" style="height: 60px; object-fit: contain; margin-bottom: 8px;" /><br/>` : ''}
            <strong style="font-size: 16px; color: #111827;">${veri.firma.adi}</strong>
          </td>
          <td style="width: 50%; vertical-align: top; text-align: right; font-size: 12px; color: #4b5563; line-height: 1.8;">
            ${veri.firma.adres ? `${veri.firma.adres}<br/>` : ''}
            ${veri.firma.sehir ? `${veri.firma.sehir}${veri.firma.ilce ? ' / ' + veri.firma.ilce : ''}<br/>` : ''}
            ${veri.firma.telefon ? `${veri.firma.telefon}<br/>` : ''}
            ${veri.firma.email ? `${veri.firma.email}` : ''}
          </td>
        </tr>
      </table>
      <hr style="border: none; border-top: 2px solid #1e40af; margin-bottom: 20px;" />
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; border: 1px solid #e5e7eb;">
        <tr>
          <td style="padding: 8px 12px; border: 1px solid #e5e7eb; background: #f9fafb; font-weight: 600; width: 30%;">Teklif Verilen Kuruluş</td>
          <td style="padding: 8px 12px; border: 1px solid #e5e7eb; width: 36%;">${veri.musteri.adi}</td>
          <td style="padding: 8px 12px; border: 1px solid #e5e7eb; background: #f9fafb; font-weight: 600; width: 16%;">Teklif No</td>
          <td style="padding: 8px 12px; border: 1px solid #e5e7eb; width: 18%; font-weight: 700; color: #1e40af;">${veri.teklifNo}</td>
        </tr>
        <tr>
          <td style="padding: 8px 12px; border: 1px solid #e5e7eb; background: #f9fafb; font-weight: 600;">Müşteri Tipi</td>
          <td style="padding: 8px 12px; border: 1px solid #e5e7eb;">${veri.musteri.tipi}</td>
          <td style="padding: 8px 12px; border: 1px solid #e5e7eb; background: #f9fafb; font-weight: 600;">Teklif Tarihi</td>
          <td style="padding: 8px 12px; border: 1px solid #e5e7eb;">${veri.tarih}</td>
        </tr>
        <tr>
          <td style="padding: 8px 12px; border: 1px solid #e5e7eb; background: #f9fafb; font-weight: 600;">Ürün</td>
          <td style="padding: 8px 12px; border: 1px solid #e5e7eb;">${veri.is.urunAdi}</td>
          <td style="padding: 8px 12px; border: 1px solid #e5e7eb; background: #f9fafb; font-weight: 600;">Geçerlilik Tarihi</td>
          <td style="padding: 8px 12px; border: 1px solid #e5e7eb;">${veri.gecerlilikTarihi}</td>
        </tr>
      </table>
      <p style="margin: 0 0 20px; line-height: 1.7;">
        Sayın <strong>${veri.musteri.adi}</strong>,<br/>
        Yapmış olduğumuz görüşmeler sonucunda hazırlamış olduğumuz fiyat teklifimizi görüşlerinize sunarız.
      </p>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
        <thead>
          <tr style="background: #1e40af; color: white;">
            <th style="padding: 10px 12px; text-align: left; font-size: 12px; font-weight: 600;">Kalem</th>
            <th style="padding: 10px 12px; text-align: left; font-size: 12px; font-weight: 600;">Ürün Adı</th>
            <th style="padding: 10px 12px; text-align: center; font-size: 12px; font-weight: 600;">Plaka Ölçüsü</th>
            <th style="padding: 10px 12px; text-align: right; font-size: 12px; font-weight: 600;">Miktar</th>
            <th style="padding: 10px 12px; text-align: right; font-size: 12px; font-weight: 600;">Birim Fiyat</th>
            <th style="padding: 10px 12px; text-align: right; font-size: 12px; font-weight: 600;">Toplam</th>
          </tr>
        </thead>
        <tbody>${satirHtml}</tbody>
      </table>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <tr>
          <td style="width: 60%;"></td>
          <td style="width: 40%;">
            <table style="width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb;">
              <tr style="background: #f9fafb;">
                <td style="padding: 8px 12px; font-weight: 600; border: 1px solid #e5e7eb;">Alt Toplam</td>
                <td style="padding: 8px 12px; text-align: right; border: 1px solid #e5e7eb;">₺${para(veri.is.satisFiyati)}</td>
              </tr>
              <tr>
                <td style="padding: 8px 12px; border: 1px solid #e5e7eb;">KDV %${veri.is.kdvOrani}</td>
                <td style="padding: 8px 12px; text-align: right; border: 1px solid #e5e7eb;">₺${para(veri.is.kdvTutari)}</td>
              </tr>
              <tr style="background: #1e40af; color: white;">
                <td style="padding: 10px 12px; font-weight: 700; font-size: 14px;">Genel Toplam</td>
                <td style="padding: 10px 12px; text-align: right; font-weight: 700; font-size: 14px;">₺${para(veri.is.kdvDahilFiyat)}</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
      ${veri.is.notlar ? `
      <div style="border: 1px solid #e5e7eb; border-radius: 4px; padding: 12px 16px; margin-bottom: 20px; background: #f9fafb;">
        <p style="margin: 0 0 4px; font-weight: 600; font-size: 12px;">Notlar:</p>
        <p style="margin: 0; font-size: 13px; color: #374151;">${veri.is.notlar}</p>
      </div>
      ` : ''}
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin-bottom: 16px;" />
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="vertical-align: top; font-size: 12px; color: #6b7280; line-height: 1.8; width: 60%;">
            Bu teklif <strong>${veri.gecerlilikTarihi}</strong> tarihine kadar geçerlidir.
          </td>
          <td style="vertical-align: top; text-align: right; font-size: 13px;">
            <p style="margin: 0 0 4px; color: #6b7280;">Saygılarımızla,</p>
            <p style="margin: 0; font-weight: 700; color: #111827;">${veri.firma.adi}</p>
          </td>
        </tr>
      </table>
    </div>
  `

  const element = document.createElement('div')
  element.innerHTML = icerik
  document.body.appendChild(element)

  const options = {
    margin: 8,
    filename: `Teklif-${veri.teklifNo}-${veri.musteri.adi}.pdf`,
    image: { type: 'jpeg' as const, quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'mm' as const, format: 'a4', orientation: 'portrait' as const },
  }

  await html2pdf().set(options).from(element).save()
  document.body.removeChild(element)
}