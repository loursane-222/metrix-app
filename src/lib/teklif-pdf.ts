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

export async function teklifPdfIndir(veri: any) {
  const html2pdf = (await import('html2pdf.js')).default

  const element = document.createElement('div')

  const firmaAdi = guvenliYazi(veri?.firma?.adi)
  const firmaAdres = guvenliYazi(veri?.firma?.adres)
  const firmaTelefon = guvenliYazi(veri?.firma?.telefon)
  const firmaEmail = guvenliYazi(veri?.firma?.email)
  const firmaLogo = guvenliYazi(veri?.firma?.logoUrl)

  const musteriAdi = guvenliYazi(veri?.musteri?.adi)

  const teklifNo = guvenliYazi(veri?.teklifNo)
  const tarih = guvenliYazi(veri?.tarih)
  const gecerlilikTarihi = guvenliYazi(veri?.gecerlilikTarihi)

  const urunAdi = guvenliYazi(veri?.is?.urunAdi)
  const malzemeTipi = guvenliYazi(veri?.is?.malzemeTipi)
  const notlar = guvenliYazi(veri?.is?.notlar)

  const odemeKosullari = guvenliYazi(
    veri?.odemeKosullari || 'Sipariş onayı sonrası ödeme planı ayrıca mutabık kalınacaktır.'
  )

  const teslimTarihi = guvenliYazi(
    veri?.teslimTarihi || 'Termin, ölçü ve kesin sipariş onayı sonrası netleşecektir.'
  )

  const tezgahMtul = Number(veri?.is?.metrajMtul || 0)
  const tezgahArasiMtul = Number(veri?.is?.tezgahArasiMtul || 0)
  const adaTezgahMtul = Number(veri?.is?.adaTezgahMtul || 0)

  const toplamMetraj = Number(
    veri?.is?.toplamMetraj || (tezgahMtul + tezgahArasiMtul + adaTezgahMtul)
  )

  const mtulSatisFiyati = Number(veri?.is?.mtulSatisFiyati || 0)
  const satisFiyati = Number(veri?.is?.satisFiyati || 0)
  const kdvTutari = Number(veri?.is?.kdvTutari || 0)
  const kdvDahilFiyat = Number(veri?.is?.kdvDahilFiyat || 0)
  const kdvOrani = Number(veri?.is?.kdvOrani || 20)

  function satirOlustur(ad: string, mtul: number) {
    return `
      <tr>
        <td style="border:1px solid #6b7280; padding:8px;">${guvenliYazi(ad)}</td>
        <td style="border:1px solid #6b7280; padding:8px;">${malzemeTipi || '-'}</td>
        <td style="border:1px solid #6b7280; padding:8px; text-align:center;">${mtul.toFixed(2)} mtül</td>
        <td style="border:1px solid #6b7280; padding:8px; text-align:right;">₺${para(mtulSatisFiyati)}</td>
        <td style="border:1px solid #6b7280; padding:8px; text-align:right;">₺${para(mtul * mtulSatisFiyati)}</td>
      </tr>
    `
  }

  const tabloSatirlari: string[] = []

  if (tezgahMtul > 0) {
    tabloSatirlari.push(satirOlustur(`Tezgah - ${urunAdi || 'Ürün'}`, tezgahMtul))
  }

  if (tezgahArasiMtul > 0) {
    tabloSatirlari.push(satirOlustur('Tezgah Arası', tezgahArasiMtul))
  }

  if (adaTezgahMtul > 0) {
    tabloSatirlari.push(satirOlustur('Ada Tezgah', adaTezgahMtul))
  }

  if (tabloSatirlari.length === 0) {
    tabloSatirlari.push(satirOlustur(urunAdi || 'Ürün / Uygulama', toplamMetraj))
  }

  element.innerHTML = `
  <div style="
    width: 182mm;
    box-sizing: border-box;
    background: #ffffff;
    color: #111827;
    font-family: Arial, Helvetica, sans-serif;
    padding: 14mm 12mm 12mm 12mm;
  ">

    <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:16px; margin-bottom:10px;">
      <div style="display:flex; align-items:flex-start; gap:14px; max-width:60%;">
        ${firmaLogo ? `<img src="${firmaLogo}" style="max-height:42px; max-width:140px; object-fit:contain;" />` : ''}
        <div>
          <div style="font-size:20px; font-weight:700; line-height:1.2; margin-bottom:4px;">${firmaAdi}</div>
          <div style="font-size:11px; color:#4b5563; line-height:1.45;">
            ${firmaAdres || ''}
          </div>
        </div>
      </div>

      <div style="text-align:right; font-size:11px; line-height:1.6; color:#111827; max-width:32%;">
        <div>${firmaTelefon || ''}</div>
        <div>${firmaEmail || ''}</div>
      </div>
    </div>

    <div style="height:3px; background:#1d4ed8; margin:8px 0 16px 0;"></div>

    <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:16px; margin-bottom:16px;">
      <div>
        <div style="font-size:23px; font-weight:800; letter-spacing:0.2px;">FİYAT TEKLİFİ</div>
      </div>
      <div style="text-align:right; font-size:11.5px; line-height:1.7;">
        <div><strong>No:</strong> ${teklifNo}</div>
        <div><strong>Tarih:</strong> ${tarih}</div>
      </div>
    </div>

    <table style="width:100%; border-collapse:collapse; font-size:11px; margin-bottom:14px;">
      <tr>
        <td style="width:30%; border:1px solid #9ca3af; padding:8px; background:#f9fafb;"><strong>Teklif Verilen Kuruluş</strong></td>
        <td style="width:70%; border:1px solid #9ca3af; padding:8px;">${musteriAdi}</td>
      </tr>
      <tr>
        <td style="border:1px solid #9ca3af; padding:8px; background:#f9fafb;"><strong>İlgili</strong></td>
        <td style="border:1px solid #9ca3af; padding:8px;">${musteriAdi}</td>
      </tr>
      <tr>
        <td style="border:1px solid #9ca3af; padding:8px; background:#f9fafb;"><strong>Teklif Tarihi</strong></td>
        <td style="border:1px solid #9ca3af; padding:8px;">${tarih}</td>
      </tr>
      <tr>
        <td style="border:1px solid #9ca3af; padding:8px; background:#f9fafb;"><strong>Geçerlilik Tarihi</strong></td>
        <td style="border:1px solid #9ca3af; padding:8px;">${gecerlilikTarihi}</td>
      </tr>
    </table>

    <div style="font-size:11.5px; line-height:1.6; margin-bottom:12px;">
      Sayın İlgili,
    </div>
    <div style="font-size:11.5px; line-height:1.6; margin-bottom:16px;">
      Yapmış olduğumuz görüşmeler sonucunda hazırlamış olduğumuz fiyat teklifimizi görüşlerinize sunarız.
    </div>

    <table style="width:100%; border-collapse:collapse; font-size:11px; margin-bottom:0;">
      <thead>
        <tr style="background:#f3f4f6;">
          <th style="border:1px solid #6b7280; padding:8px; text-align:left;">Ürün / Açıklama</th>
          <th style="border:1px solid #6b7280; padding:8px; text-align:left;">Malzeme</th>
          <th style="border:1px solid #6b7280; padding:8px; text-align:center;">Miktar</th>
          <th style="border:1px solid #6b7280; padding:8px; text-align:right;">Birim Fiyat</th>
          <th style="border:1px solid #6b7280; padding:8px; text-align:right;">Toplam</th>
        </tr>
      </thead>
      <tbody>
        ${tabloSatirlari.join('')}
      </tbody>
    </table>

    <div style="display:flex; justify-content:flex-end; margin-top:0; margin-bottom:18px;">
      <table style="width:320px; border-collapse:collapse; font-size:11px;">
        <tr>
          <td style="border:1px solid #6b7280; padding:7px; background:#f9fafb;">Alt Toplam</td>
          <td style="border:1px solid #6b7280; padding:7px; text-align:right;">₺${para(satisFiyati)}</td>
        </tr>
        <tr>
          <td style="border:1px solid #6b7280; padding:7px; background:#f9fafb;">KDV %${kdvOrani}</td>
          <td style="border:1px solid #6b7280; padding:7px; text-align:right;">₺${para(kdvTutari)}</td>
        </tr>
        <tr>
          <td style="border:1px solid #6b7280; padding:8px; background:#eef2ff; font-weight:700;">Genel Toplam</td>
          <td style="border:1px solid #6b7280; padding:8px; text-align:right; background:#eef2ff; font-weight:700;">₺${para(kdvDahilFiyat)}</td>
        </tr>
      </table>
    </div>

    <div style="border:1px solid #6b7280; padding:12px; font-size:10.8px; line-height:1.65;">
      <div style="margin-bottom:10px;">
        <strong>Ödeme Koşulları:</strong> ${odemeKosullari}
      </div>

      <div style="margin-bottom:10px;">
        <strong>Teslim Tarihi:</strong> ${teslimTarihi}
      </div>

      <div style="margin-bottom:8px;">
        <strong>Şartlar ve Koşullar:</strong>
      </div>

      <div style="margin-bottom:10px; text-align:justify;">
        Bu teklif belirtilen geçerlilik tarihine kadar geçerlidir. Proje, ölçü, uygulama şekli, malzeme tercihi veya iş kapsamındaki değişiklikler fiyatlara ayrıca yansıtılabilir. Nakliye, montaj, ek paketleme ve sahaya özel ilave talepler, aksi açıkça belirtilmediği sürece bu teklife dahil değildir.
      </div>

      ${notlar ? `
      <div style="margin-top:8px;">
        <strong>Açıklamalar:</strong> ${notlar}
      </div>
      ` : ''}

      <div style="margin-top:16px;">
        Saygılarımızla
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
