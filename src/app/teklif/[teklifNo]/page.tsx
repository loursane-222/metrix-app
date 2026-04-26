import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function para(v: any) {
  return Number(v || 0).toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + " ₺";
}

function telTemizle(v: string) {
  const r = String(v || "").replace(/\D/g, "");
  if (!r) return "";
  if (r.startsWith("90")) return r;
  if (r.startsWith("0")) return "9" + r;
  return "90" + r;
}

export default async function Page({ params }: any) {
  const resolvedParams = await params;
  const teklifNo = resolvedParams.teklifNo;

  const is = await prisma.is.findFirst({
    where: { teklifNo },
    include: { atolye: true },
  });

  if (!is) {
    return (
      <main style={{ padding: 40, fontFamily: "Arial" }}>
        Teklif bulunamadı.
      </main>
    );
  }

  const atolye: any = is.atolye;
  const tel = telTemizle(atolye?.telefon || "");

  const toplamMetraj =
    Number(is.metrajMtul || 0) +
    Number(is.tezgahArasiMtul || 0) +
    Number(is.adaTezgahMtul || 0);

  const satis = Number(is.satisFiyati || 0);
  // 🔥 YENİ FİYAT MOTORU
  const bazMtul = Number(is.metrajMtul || 0);
  const arasiMtul = Number(is.tezgahArasiMtul || 0);
  const adaMtul = Number(is.adaTezgahMtul || 0);

  const weightedTotal =
    (bazMtul * 1) +
    (arasiMtul * 0.75) +
    (adaMtul * 1.5);

  const bazFiyat = weightedTotal > 0 ? satis / weightedTotal : 0;

  const whatsapp = tel
    ? `https://wa.me/${tel}?text=${encodeURIComponent(
        `${is.teklifNo} numaralı teklif hakkında bilgi almak istiyorum.`
      )}`
    : "#";

  const kurulusYili = Number(atolye?.kurulusYili || 0);
  const deneyim = kurulusYili
    ? `${kurulusYili} yılından bu yana porselen, doğal taş ve tezgah uygulamaları gerçekleştiriyoruz.`
    : "Porselen, doğal taş ve tezgah uygulamalarında profesyonel üretim yaklaşımıyla çalışıyoruz.";

  const teklifSatirlari = [
    Number(is.metrajMtul || 0) > 0
      ? {
          kalem: "Tezgah",
          urun: is.urunAdi || "-",
          miktar: Number(is.metrajMtul || 0),
        }
      : null,
    Number(is.tezgahArasiMtul || 0) > 0
      ? {
          kalem: "Tezgah Arası",
          urun: is.urunAdi || "-",
          miktar: Number(is.tezgahArasiMtul || 0),
        }
      : null,
    Number(is.adaTezgahMtul || 0) > 0
      ? {
          kalem: "Ada",
          urun: is.urunAdi || "-",
          miktar: Number(is.adaTezgahMtul || 0),
        }
      : null,
  ].filter(Boolean) as Array<{ kalem: string; urun: string; miktar: number }>;

  return (
    <main className="page">
      <section className="card">
        <div className="hero">
          <div className="top">
            <div className="brand">
              {atolye?.logoUrl ? <img src={atolye.logoUrl} className="logo" alt="" /> : null}
              <div>
                <h1>{atolye?.atolyeAdi || "Firma"}</h1>
                <p>PROFESYONEL ÜRETİM TEKLİFİ</p>
              </div>
            </div>

            <div className="meta">
              <div>Teklif No: <b>{is.teklifNo}</b></div>
              <div>Müşteri: <b>{is.musteriAdi}</b></div>
              <div>Ürün: <b>{is.urunAdi}</b></div>
            </div>
          </div>

          <h2>Projeniz için kontrollü, planlı ve güvenilir üretim.</h2>
          <p className="heroText">
            Bu teklif; ürün, metraj, üretim süreci ve uygulama kapsamı dikkate alınarak size özel hazırlanmıştır.
          </p>
        </div>

        <div className="section">
          <div className="eyebrow">PROJE ÖZETİ</div>
          <p>
            <b>{is.musteriAdi}</b> için <b>{is.urunAdi}</b> uygulaması planlanmıştır.
            Bu proje, atölye kapasitemiz ve üretim planlamamız dikkate alınarak özel olarak hazırlanmıştır.
          </p>

          <div className="metrics">
            <div><span>Toplam Metraj</span><b>{toplamMetraj.toFixed(2)} mtül</b></div>
            <div><span>Plaka</span><b>{Number(is.kullanilanPlakaSayisi || 0)} adet</b></div>
            <div><span>Üretim Süresi</span><b>{Math.round(Number(is.toplamSureDakika || 0))} dk</b></div>
            <div><span>Malzeme</span><b>{is.malzemeTipi || "-"}</b></div>
          </div>
        </div>

        <div className="section">
          <div className="eyebrow">SİSTEMLİ ÜRETİM YAKLAŞIMI</div>
          <div className="benefits">
            <div><b>Akıllı üretim planlama</b><span>İş akışı ve uygulama kapsamı planlı şekilde yönetilir.</span></div>
            <div><b>Fire optimizasyonu aktif</b><span>Plaka yerleşimi minimum fire hedefiyle değerlendirilir.</span></div>
            <div><b>Süre ve maliyet kontrolü</b><span>Üretim süreci kontrollü şekilde planlanır.</span></div>
          </div>
        </div>

        <div className="section">
          <div className="eyebrow">TEKLİF KAPSAMI</div>

          <table className="table">
            <thead>
              <tr>
                <th>İş Kalemi</th>
                <th>Ürün</th>
                <th>Miktar</th>
                <th>Birim Fiyat</th>
                <th>Toplam</th>
              </tr>
            </thead>
            <tbody>
              {teklifSatirlari.length > 0 ? (
                teklifSatirlari.map((row) => (
                  <tr key={row.kalem}>
                    <td>{row.kalem}</td>
                    <td>{row.urun}</td>
                    <td>{row.miktar.toFixed(2)} mtül</td>
                    <td>{para(
    row.kalem === "Tezgah"
      ? bazFiyat
      : row.kalem === "Tezgah Arası"
      ? bazFiyat * 0.75
      : bazFiyat * 1.5
  )}</td>
                    <td>{para(row.miktar * (
    row.kalem === "Tezgah"
      ? bazFiyat
      : row.kalem === "Tezgah Arası"
      ? bazFiyat * 0.75
      : bazFiyat * 1.5
  ))}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td>Ürün / Uygulama</td>
                  <td>{is.urunAdi || "-"}</td>
                  <td>-</td>
                  <td>-</td>
                  <td>{para(satis)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="section price">
          <div>
            <div className="eyebrow">TOPLAM YATIRIM</div>
            <div className="amount">{para(is.kdvDahilFiyat || is.satisFiyati)}</div>
            <p>KDV dahil toplam teklif tutarıdır.</p>
          </div>

          <a className="pdfBtn" href={`/api/isler/${is.id}/pdf`} target="_blank">
            PDF Teklifi Aç
          </a>
        </div>

        <div className="section">
          <div className="eyebrow">NEDEN BİZ?</div>
          <p>{deneyim}</p>
          <p>
            Amacımız; ölçüden uygulamaya kadar kontrollü, anlaşılır ve güven veren bir süreç sunmaktır.
          </p>
        </div>

        <form action={`/api/teklif/${is.teklifNo}/onayla`} method="post">
          <button className="approve" type="submit">
            ✔ Teklifi Onayla
          </button>
        </form>

        <a className="whatsappSecondary" href={whatsapp} target="_blank">
          WhatsApp ile soru sor
        </a>
      </section>

      <style>{`
        body { margin:0; }
        .page {
          min-height:100vh;
          background:#eef2f7;
          padding:36px;
          font-family:Arial, Helvetica, sans-serif;
          color:#0f172a;
        }
        .card {
          max-width:980px;
          margin:0 auto;
          background:white;
          border-radius:28px;
          padding:28px;
          box-shadow:0 22px 70px rgba(15,23,42,.10);
        }
        .hero {
          background:linear-gradient(135deg,#0f172a,#1e1b4b);
          color:white;
          border-radius:24px;
          padding:28px;
        }
        .top {
          display:flex;
          justify-content:space-between;
          gap:24px;
          align-items:flex-start;
        }
        .brand {
          display:flex;
          align-items:center;
          gap:14px;
        }
        .logo {
          width:62px;
          height:62px;
          border-radius:18px;
          background:white;
          padding:6px;
          object-fit:contain;
        }
        h1 {
          margin:0;
          font-size:25px;
          line-height:1.1;
        }
        .brand p {
          margin:6px 0 0;
          font-size:11px;
          color:#cbd5e1;
          letter-spacing:2px;
        }
        .meta {
          text-align:right;
          color:#dbeafe;
          font-size:13px;
          line-height:1.8;
        }
        .hero h2 {
          margin:38px 0 0;
          font-size:34px;
          max-width:720px;
          line-height:1.08;
        }
        .heroText {
          color:#dbeafe;
          max-width:720px;
          line-height:1.6;
        }
        .section {
          margin-top:18px;
          border:1px solid #e2e8f0;
          border-radius:20px;
          padding:20px;
        }
        .eyebrow {
          font-size:12px;
          color:#64748b;
          font-weight:800;
          letter-spacing:2px;
          margin-bottom:10px;
        }
        .section p {
          color:#334155;
          line-height:1.65;
        }
        .metrics {
          margin-top:16px;
          display:grid;
          grid-template-columns:repeat(4,1fr);
          gap:10px;
        }
        .metrics div, .benefits div {
          background:#f8fafc;
          border:1px solid #e2e8f0;
          border-radius:16px;
          padding:14px;
        }
        .metrics span {
          display:block;
          color:#64748b;
          font-size:12px;
          margin-bottom:6px;
        }
        .metrics b {
          font-size:16px;
        }
        .benefits {
          display:grid;
          grid-template-columns:repeat(3,1fr);
          gap:10px;
        }
        .benefits b {
          display:block;
          margin-bottom:6px;
        }
        .benefits span {
          color:#475569;
          font-size:13px;
          line-height:1.45;
        }
        .table {
          width:100%;
          border-collapse:collapse;
          font-size:13px;
          margin-top:10px;
        }
        .table th {
          background:#f1f5f9;
          padding:10px;
          text-align:left;
          color:#475569;
          font-size:12px;
        }
        .table td {
          border-top:1px solid #e2e8f0;
          padding:10px;
          color:#0f172a;
        }
        .price {
          display:flex;
          justify-content:space-between;
          align-items:center;
          gap:20px;
          background:linear-gradient(135deg,#f8fafc,#ffffff);
        }
        .amount {
          font-size:38px;
          color:#2563eb;
          font-weight:900;
          letter-spacing:-1px;
        }
        .pdfBtn {
          background:#0f172a;
          color:white;
          text-decoration:none;
          padding:16px 22px;
          border-radius:16px;
          font-weight:800;
          white-space:nowrap;
        }
        .approve {
          margin-top:18px;
          display:block;
          width:100%;
          text-align:center;
          background:#16a34a;
          color:white;
          border:0;
          cursor:pointer;
          text-decoration:none;
          border-radius:18px;
          padding:20px;
          font-size:20px;
          font-weight:900;
        }
        .whatsappSecondary {
          margin-top:10px;
          display:block;
          text-align:center;
          color:#16a34a;
          text-decoration:none;
          font-weight:800;
        }
        @media (max-width: 760px) {
          .page { padding:14px; }
          .card { padding:16px; border-radius:22px; }
          .top { flex-direction:column; }
          .meta { text-align:left; }
          .hero h2 { font-size:25px; }
          .metrics, .benefits { grid-template-columns:1fr; }
          .price { flex-direction:column; align-items:stretch; }
          .pdfBtn { text-align:center; }
          .table { font-size:12px; display:block; overflow-x:auto; white-space:nowrap; }
        }
      `}</style>
    </main>
  );
}
