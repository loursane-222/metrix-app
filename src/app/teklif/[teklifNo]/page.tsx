import { prisma } from "@/lib/prisma";
import TeklifClient from "@/components/teklif/TeklifClient";
import { TeklifViewTracker, PdfTrackButton } from "@/components/teklif/TeklifTracking";
import { normalizeMtulInput, normalizeMtulDisplay } from "@/lib/normalizeMtul";
import type { Metadata } from "next";
export const dynamic = "force-dynamic";

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

function guvenliFirmaAdi(atolye: any) {
  return String(atolye?.atolyeAdi || "").trim() || "Firma";
}

function initials(v: string) {
  const parts = String(v || "Firma")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);
  return (parts.map((p) => p[0]).join("") || "F").toLocaleUpperCase("tr-TR");
}

function norm(v: any) {
  return String(v || "")
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .replace(/İ/g, "i")
    .replace(/ş/g, "s")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

type TeklifSatiri = {
  id: string;
  kalem: string;
  urun: string;
  miktar: number;
  birimFiyat: number;
  toplam: number;
};

type LayoutSatiri = {
  piece: any;
  index: number;
  tip: string;
  miktar: number;
  katsayi: number;
};

function parcaTipi(piece: any) {
  const raw = norm(`${piece?.parcaTuru || ""} ${piece?.label || ""}`);
  if (raw.includes("on alin")) return "on_alin";
  if (raw.includes("tezgah arasi")) return "tezgah_arasi";
  if (raw.includes("ada tezgah")) return "ada_tezgah";
  if (raw.includes("ada ayak")) return "ada_ayak";
  if (raw.includes("tezgah") && !raw.includes("arasi")) return "tezgah";
  if (raw.includes("supurgelik")) return "supurgelik";
  return "diger";
}

function parcaKatsayi(tip: string) {
  if (tip === "tezgah_arasi") return 0.75;
  if (tip === "ada_tezgah") return 1.5;
  if (tip === "ada_ayak") return 1.2;
  if (tip === "on_alin") return 0.35;
  return 1;
}

function kalemAdi(piece: any, tip: string) {
  const label = String(piece?.label || "")
    .replace(/\s+#\d+$/g, "")
    .trim();
  if (label) return label;
  if (tip === "on_alin") return "Ön Alın";
  if (tip === "tezgah_arasi") return "Tezgah Arası";
  if (tip === "ada_tezgah") return "Ada Tezgah";
  if (tip === "ada_ayak") return "Ada Ayak";
  if (tip === "supurgelik") return "Süpürgelik";
  return "Tezgah";
}

function layoutParcalari(plakaLayoutJson: any) {
  const slabs = Array.isArray(plakaLayoutJson?.slabs) ? plakaLayoutJson.slabs : [];
  return slabs.flatMap((slab: any) => Array.isArray(slab?.yerlesim) ? slab.yerlesim : [])
    .filter((piece: any) => Number(piece?.genislik || 0) > 0);
}

function teklifSatirlariOlustur(
  is: any,
  satis: number,
  fiyatlar: { tezgah: number; arasi: number; ada: number },
  overrides: { tezgah: number; arasi: number; ada: number }
) {
  const pieces = layoutParcalari(is.plakaLayoutJson);

  if (pieces.length > 0) {
    const enriched: LayoutSatiri[] = pieces.map((piece: any, index: number) => {
      const tip = parcaTipi(piece);
      const miktar = Number(piece?.genislik || 0) / 100;
      const katsayi = parcaKatsayi(tip);
      return { piece, index, tip, miktar, katsayi };
    }).filter((row: LayoutSatiri) => row.miktar > 0);

    const weightedTotal = enriched.reduce((acc: number, row: LayoutSatiri) => acc + row.miktar * row.katsayi, 0);
    const baseFiyat = weightedTotal > 0 ? satis / weightedTotal : 0;

    return enriched.map((row: LayoutSatiri) => {
      const birimFiyat =
        row.tip === "tezgah_arasi" && overrides.arasi > 0 ? overrides.arasi :
        row.tip === "ada_tezgah" && overrides.ada > 0 ? overrides.ada :
        row.tip === "tezgah" && overrides.tezgah > 0 ? overrides.tezgah :
        baseFiyat * row.katsayi;

      return {
        id: `${row.piece?.id || row.index}-${row.tip}`,
        kalem: kalemAdi(row.piece, row.tip),
        urun: is.urunAdi || "-",
        miktar: row.miktar,
        birimFiyat,
        toplam: row.miktar * birimFiyat,
      };
    });
  }

  return [
    normalizeMtulInput(is.metrajMtul || 0) > 0
      ? {
          id: "tezgah",
          kalem: "Tezgah",
          urun: is.urunAdi || "-",
          miktar: normalizeMtulInput(is.metrajMtul || 0),
          birimFiyat: fiyatlar.tezgah,
          toplam: normalizeMtulInput(is.metrajMtul || 0) * fiyatlar.tezgah,
        }
      : null,
    normalizeMtulInput(is.tezgahArasiMtul || 0) > 0
      ? {
          id: "tezgah-arasi",
          kalem: "Tezgah Arası",
          urun: is.urunAdi || "-",
          miktar: normalizeMtulInput(is.tezgahArasiMtul || 0),
          birimFiyat: fiyatlar.arasi,
          toplam: normalizeMtulInput(is.tezgahArasiMtul || 0) * fiyatlar.arasi,
        }
      : null,
    normalizeMtulInput(is.adaTezgahMtul || 0) > 0
      ? {
          id: "ada",
          kalem: "Ada",
          urun: is.urunAdi || "-",
          miktar: normalizeMtulInput(is.adaTezgahMtul || 0),
          birimFiyat: fiyatlar.ada,
          toplam: normalizeMtulInput(is.adaTezgahMtul || 0) * fiyatlar.ada,
        }
      : null,
  ].filter(Boolean) as TeklifSatiri[];
}

export async function generateMetadata({ params }: any): Promise<Metadata> {
  const resolvedParams = await params;
  const teklifNo = resolvedParams.teklifNo;
  const is = await prisma.is.findFirst({
    where: { teklifNo },
    include: { atolye: true },
  });

  if (!is) {
    return {
      title: "Teklif bulunamadı",
      description: "Teklif bağlantısı geçerli değil veya kaldırılmış olabilir.",
    };
  }

  const firmaAdi = guvenliFirmaAdi(is.atolye);
  const logoUrl = String(is.atolye?.logoUrl || "").trim();
  const title = `${firmaAdi} — Teklifiniz hazır`;
  const description = "Teklifinizi inceleyip onaylayabilirsiniz.";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      images: logoUrl ? [{ url: logoUrl, alt: firmaAdi }] : undefined,
    },
    twitter: {
      card: logoUrl ? "summary_large_image" : "summary",
      title,
      description,
      images: logoUrl ? [logoUrl] : undefined,
    },
  };
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
        <p>Teklif bulunamadı.</p>
      </main>
    );
  }

  await prisma.is.update({
    where: { id: is.id },
    data: {
      teklifGoruntulenmeSayisi: { increment: 1 },
      teklifIlkGoruntulenmeTarihi: is.teklifIlkGoruntulenmeTarihi || new Date(),
      teklifSonGoruntulenmeTarihi: new Date(),
    },
  });

  const atolye: any = is.atolye;
  const firmaAdi = guvenliFirmaAdi(atolye);
  const firmaInitials = initials(firmaAdi);
  const tel = telTemizle(atolye?.telefon || "");

  const toplamMetraj =
    normalizeMtulInput(is.metrajMtul || 0) +
    normalizeMtulInput(is.tezgahArasiMtul || 0) +
    normalizeMtulInput(is.adaTezgahMtul || 0);

  const satis = Number(is.satisFiyati || 0);
  // 🔥 YENİ FİYAT MOTORU
  const bazMtul = normalizeMtulInput(is.metrajMtul || 0);
  const arasiMtul = normalizeMtulInput(is.tezgahArasiMtul || 0);
  const adaMtul = normalizeMtulInput(is.adaTezgahMtul || 0);

  const weightedTotal =
    (bazMtul * 1) +
    (arasiMtul * 0.75) +
    (adaMtul * 1.5);

  const bazFiyat = weightedTotal > 0 ? satis / weightedTotal : 0;

  const overrideTezgah = Number((is as any).tezgahBirimFiyatOverride || 0);
  const overrideArasi = Number((is as any).tezgahArasiBirimFiyatOverride || 0);
  const overrideAda = Number((is as any).adaBirimFiyatOverride || 0);

  const fiyatTezgah = overrideTezgah > 0 ? overrideTezgah : bazFiyat;
  const fiyatArasi = overrideArasi > 0 ? overrideArasi : bazFiyat * 0.75;
  const fiyatAda = overrideAda > 0 ? overrideAda : bazFiyat * 1.5;

  const whatsapp = tel
    ? `https://wa.me/${tel}?text=${encodeURIComponent(
        `${is.teklifNo} numaralı teklif hakkında bilgi almak istiyorum.`
      )}`
    : "#";

  const kurulusYili = Number(atolye?.kurulusYili || 0);
  const deneyim = kurulusYili
    ? `${kurulusYili} yılından bu yana porselen, doğal taş ve tezgah uygulamaları gerçekleştiriyoruz.`
    : "Porselen, doğal taş ve tezgah uygulamalarında profesyonel üretim yaklaşımıyla çalışıyoruz.";

  const teklifSatirlari = teklifSatirlariOlustur(is, satis, {
    tezgah: fiyatTezgah,
    arasi: fiyatArasi,
    ada: fiyatAda,
  }, {
    tezgah: overrideTezgah,
    arasi: overrideArasi,
    ada: overrideAda,
  });

  return (



    <main className="page">
      <TeklifViewTracker teklifNo={is.teklifNo} />
      <section className="card">
        <div className="hero">
          <div className="top">
            <div className="brand">
              {atolye?.logoUrl ? (
                <img src={atolye.logoUrl} className="logo" alt={firmaAdi} />
              ) : (
                <div className="logoFallback" aria-label={firmaAdi}>{firmaInitials}</div>
              )}
              <div>
                <h1>{firmaAdi}</h1>
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
                  <tr key={row.id}>
                    <td>{row.kalem}</td>
                    <td>{row.urun}</td>
                    <td>{row.miktar.toFixed(2)} mtül</td>
                    <td>{para(row.birimFiyat)}</td>
                    <td>{para(row.toplam)}</td>
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

          <PdfTrackButton teklifNo={is.teklifNo} pdfUrl={`/api/isler/${is.id}/pdf`} />
        </div>

        <div className="section">
          <div className="eyebrow">NEDEN BİZ?</div>
          <p>{deneyim}</p>
          <p>
            Amacımız; ölçüden uygulamaya kadar kontrollü, anlaşılır ve güven veren bir süreç sunmaktır.
          </p>
        </div>

        <a className="approve" href={`/teklif/${is.teklifNo}/odeme-sec`}>✔ Teklifi Onayla</a>

        <a className="whatsappSecondary" href={whatsapp} target="_blank">
          WhatsApp ile soru sor
        </a>

        <div className="powered">powered by Metrix</div>
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
        .logoFallback {
          width:62px;
          height:62px;
          border-radius:18px;
          background:rgba(255,255,255,.14);
          border:1px solid rgba(255,255,255,.24);
          display:flex;
          align-items:center;
          justify-content:center;
          color:white;
          font-weight:900;
          letter-spacing:.04em;
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
          display:inline-flex;
          align-items:center;
          justify-content:center;
          background:#0f172a;
          color:white;
          text-decoration:none;
          padding:16px 22px;
          border-radius:16px;
          font-weight:800;
          white-space:nowrap;
        }
        .pdfBtn.disabled {
          background:#e2e8f0;
          color:#64748b;
          cursor:not-allowed;
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
        .powered {
          margin-top:14px;
          text-align:center;
          color:#94a3b8;
          font-size:11px;
          font-weight:700;
          letter-spacing:.08em;
          text-transform:uppercase;
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
    
      <TeklifClient
        teklifNo={is.teklifNo}
        pdfUrl={`/api/isler/${is.id}/pdf`}
      />
    </main>

  );
}
