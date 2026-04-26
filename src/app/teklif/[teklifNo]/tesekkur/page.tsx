import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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

  const whatsapp = tel
    ? `https://wa.me/${tel}?text=${encodeURIComponent(
        `${is.teklifNo} numaralı teklifinizi onayladım. Süreci başlatabilirsiniz.`
      )}`
    : "#";

  return (
    <main className="page">
      <section className="card">
        <div className="badge">TEKLİF ONAYLANDI</div>

        <h1>Teşekkürler</h1>

        <p className="lead">
          <b>{is.teklifNo}</b> numaralı teklif onayınız alınmıştır.
        </p>

        <div className="summary">
          <div>
            <span>Müşteri</span>
            <b>{is.musteriAdi}</b>
          </div>
          <div>
            <span>Ürün</span>
            <b>{is.urunAdi}</b>
          </div>
          <div>
            <span>Durum</span>
            <b>Onaylandı</b>
          </div>
        </div>

        <p className="note">
          Firma yetkilisi ölçü, üretim ve uygulama sürecini planlamak için sizinle iletişime geçecektir.
        </p>

        <a className="wa" href={whatsapp} target="_blank">
          WhatsApp ile Firmaya Mesaj Gönder
        </a>
      </section>

      <style>{`
        body { margin: 0; }
        .page {
          min-height: 100vh;
          background: #eef2f7;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          font-family: Arial, Helvetica, sans-serif;
          color: #0f172a;
        }
        .card {
          width: 100%;
          max-width: 720px;
          background: white;
          border-radius: 30px;
          padding: 36px;
          box-shadow: 0 22px 70px rgba(15,23,42,.12);
          text-align: center;
        }
        .badge {
          display: inline-block;
          background: #dcfce7;
          color: #15803d;
          border: 1px solid #86efac;
          padding: 9px 14px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 1.5px;
        }
        h1 {
          margin: 22px 0 10px;
          font-size: 42px;
        }
        .lead {
          font-size: 18px;
          color: #334155;
        }
        .summary {
          margin-top: 24px;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
        }
        .summary div {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 18px;
          padding: 16px;
          text-align: left;
        }
        .summary span {
          display: block;
          color: #64748b;
          font-size: 12px;
          margin-bottom: 6px;
        }
        .summary b {
          font-size: 16px;
        }
        .note {
          margin-top: 24px;
          color: #475569;
          line-height: 1.6;
        }
        .wa {
          margin-top: 24px;
          display: block;
          background: #16a34a;
          color: white;
          text-decoration: none;
          border-radius: 18px;
          padding: 18px;
          font-size: 18px;
          font-weight: 900;
        }
        @media (max-width: 700px) {
          .card { padding: 24px; border-radius: 24px; }
          h1 { font-size: 32px; }
          .summary { grid-template-columns: 1fr; }
        }
      `}</style>
    </main>
  );
}
