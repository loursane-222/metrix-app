"use client";

import { useEffect, useMemo, useState } from "react";

type Props = {
  aktif: any;
  analiz: any;
  onClose: () => void;
  tl: (v: any) => string;
  pct: (v: any) => string;
  musteriAdi: (m: any) => string;
};

export default function PremiumEkstreModal({ aktif, analiz, onClose, tl, pct, musteriAdi }: Props) {
  const [pdfHazirlaniyor, setPdfHazirlaniyor] = useState(false);
  const [atolye, setAtolye] = useState<any>(null);

  useEffect(() => {
    fetch("/api/atolye", { cache: "no-store", credentials: "include" })
      .then((r) => r.json())
      .then((d) => setAtolye(d?.atolye || null))
      .catch(() => setAtolye(null));
  }, []);

  const firmaAdi = atolye?.atolyeAdi?.trim() || "Metrix Tezgah";
  const logoUrl = atolye?.logoUrl?.trim() || "";

  function aiOdemeNotu() {
    const bakiye = Number(analiz?.bakiye || 0);
    const ad = musteriAdi(aktif);

    if (bakiye > 0) {
      return `${ad} hesabınızda ${tl(bakiye)} güncel bakiye görünmektedir. Uygun olduğunuzda ödeme planınızı bizimle paylaşmanızı rica ederiz. Ödemeniz tamamlandığında sistem kayıtlarımız aynı gün güncellenecektir.`;
    }

    if (bakiye < 0) {
      return `${ad} hesabınızda alacak bakiyesi görünmektedir. Kayıtlarımızı güncel tutmak adına gerekli mahsuplaşma için bizimle iletişime geçebilirsiniz.`;
    }

    return `${ad} hesabınız güncel olarak kapalı görünmektedir. Düzenli iş birliğiniz için teşekkür ederiz.`;
  }

  const hareketler = useMemo(() => {
    const rows: any[] = [];

    const acilis = Number(aktif?.acilisBakiyesi || 0);
    if (acilis > 0) {
      rows.push({
        tarih: aktif.createdAt || new Date().toISOString(),
        tip: aktif.bakiyeTipi === "alacak" ? "Açılış Alacağı" : "Açılış Borcu",
        aciklama: "Açılış bakiyesi",
        borc: aktif.bakiyeTipi === "borc" ? acilis : 0,
        alacak: aktif.bakiyeTipi === "alacak" ? acilis : 0,
      });
    }

    (aktif?.isler || [])
      .filter((i: any) => i.durum === "onaylandi")
      .forEach((i: any) => {
        rows.push({
          tarih: i.onaylanmaTarihi || i.isTarihi || i.createdAt || new Date().toISOString(),
          tip: "Onaylı İş",
          aciklama: [i.teklifNo, i.urunAdi].filter(Boolean).join(" · ") || "Onaylı iş",
          borc: Number(i.satisFiyati || 0),
          alacak: 0,
        });
      });

    (aktif?.tahsilatlar || []).forEach((t: any) => {
      rows.push({
        tarih: t.tarih || t.createdAt || new Date().toISOString(),
        tip: "Tahsilat",
        aciklama: "Alınan ödeme",
        borc: 0,
        alacak: Number(t.tutar || 0),
      });
    });

    let bakiye = 0;
    return rows
      .sort((x, y) => new Date(x.tarih).getTime() - new Date(y.tarih).getTime())
      .map((h) => {
        bakiye += Number(h.borc || 0) - Number(h.alacak || 0);
        return { ...h, bakiye };
      });
  }, [aktif]);

  function tarih(v: any) {
    const d = new Date(v || new Date());
    return Number.isNaN(d.getTime()) ? new Date().toLocaleDateString("tr-TR") : d.toLocaleDateString("tr-TR");
  }

  async function pdfIndir() {
    const el = document.getElementById("premium-ekstre-pdf");
    if (!el) return;

    setPdfHazirlaniyor(true);
    try {
      const mod: any = await import("html2pdf.js");
      const html2pdf = mod.default || mod;

      await html2pdf()
        .set({
          margin: [8, 8, 8, 8],
          filename: `Metrix-Ekstre-${musteriAdi(aktif).replace(/[^a-zA-Z0-9ğüşöçıİĞÜŞÖÇ-]+/g, "-")}.pdf`,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff" },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        })
        .from(el)
        .save();
    } finally {
      setPdfHazirlaniyor(false);
    }
  }

  function whatsappPaylas() {
    const mesaj = encodeURIComponent(
      `Merhaba, ${musteriAdi(aktif)} güncel hesap ekstreniz:\n\nOnaylı Ciro: ${tl(analiz.ciro)}\nTahsilat: ${tl(analiz.tahsilat)}\nGüncel Bakiye: ${tl(analiz.bakiye)}`
    );
    window.open(`https://wa.me/?text=${mesaj}`, "_blank");
  }

  if (!aktif || !analiz) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm md:flex md:items-center md:justify-center md:p-4">
      <div className="flex h-[100dvh] w-screen flex-col overflow-hidden bg-[#07111f] text-white md:h-[94dvh] md:w-[calc(100vw-32px)] md:max-w-[1380px] md:rounded-[28px] md:border md:border-white/10 md:shadow-[0_40px_120px_rgba(0,0,0,0.75)]">
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-white/10 bg-[#111827] p-4 md:p-5">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-blue-300">
              Premium PDF Ekstre
            </p>
            <h2 className="mt-2 truncate text-xl font-black md:text-2xl">{musteriAdi(aktif)}</h2>
            <p className="mt-1 text-xs text-slate-400">
              Güncel bakiye, onaylı işler ve tahsilat hareketleri
            </p>
          </div>

          <button
            onClick={onClose}
            className="shrink-0 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-300 hover:bg-white/10"
          >
            ✕
          </button>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[1fr_340px]">
          <div className="min-h-0 overflow-y-auto bg-slate-100 p-2 pb-28 md:p-5 lg:pb-5">
            <div
              id="premium-ekstre-pdf"
              className="mx-auto w-full bg-white p-4 text-slate-950 shadow-[0_20px_70px_rgba(15,23,42,0.18)] md:min-h-[1120px] md:max-w-[820px] md:p-8"
            >
              <div className="flex flex-col gap-5 border-b border-slate-200 pb-5 md:flex-row md:items-start md:justify-between md:gap-6 md:pb-6">
                <div className="flex items-start gap-3 md:gap-4">
                  {logoUrl ? (
                    <img src={logoUrl} alt={firmaAdi} className="h-12 w-12 rounded-2xl border border-slate-200 object-cover md:h-14 md:w-14" />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-lg font-black text-white md:h-14 md:w-14">
                      {firmaAdi.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-slate-400 md:text-[10px]">
                      {firmaAdi}
                    </p>
                    <h1 className="mt-2 text-2xl font-black tracking-tight md:text-3xl">
                      Müşteri Hesap Ekstresi
                    </h1>
                    <p className="mt-2 text-sm text-slate-500">
                      Düzenleme tarihi: {new Date().toLocaleDateString("tr-TR")}
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left md:px-5 md:py-4 md:text-right">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Güncel Bakiye
                  </p>
                  <p className={`mt-2 text-2xl font-black ${analiz.bakiye > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                    {tl(analiz.bakiye)}
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-3 md:mt-6 md:grid-cols-[1.3fr_0.7fr] md:gap-4">
                <div className="rounded-2xl border border-slate-200 p-4 md:p-5">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Müşteri</p>
                  <h2 className="mt-2 text-2xl font-black">{musteriAdi(aktif)}</h2>
                  <p className="mt-2 text-sm text-slate-500">
                    {[aktif.telefon, aktif.email].filter(Boolean).join(" · ") || "İletişim bilgisi yok"}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 p-4 md:p-5">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                    Ödeme Bilgilendirme Notu
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{aiOdemeNotu()}</p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 md:mt-5 md:grid-cols-4 md:gap-3">
                <div className="rounded-2xl bg-slate-50 p-3 md:p-4">
                  <p className="text-xs text-slate-500">Onaylı Ciro</p>
                  <p className="mt-1 text-base font-black md:text-lg">{tl(analiz.ciro)}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-3 md:p-4">
                  <p className="text-xs text-slate-500">Tahsilat</p>
                  <p className="mt-1 text-base font-black md:text-lg">{tl(analiz.tahsilat)}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-3 md:p-4">
                  <p className="text-xs text-slate-500">Teklif</p>
                  <p className="mt-1 text-base font-black md:text-lg">{analiz.teklifSayisi}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-3 md:p-4">
                  <p className="text-xs text-slate-500">Onay Oranı</p>
                  <p className="mt-1 text-base font-black md:text-lg">{pct(analiz.onayOrani)}</p>
                </div>
              </div>

              <div className="mt-6 md:mt-7">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-lg font-black">Hesap Hareketleri</h3>
                  <p className="text-xs text-slate-500">{hareketler.length} hareket</p>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="w-full min-w-[680px] border-collapse text-left text-xs">
                    <thead className="bg-slate-950 text-white">
                      <tr>
                        <th className="px-3 py-3 font-semibold">Tarih</th>
                        <th className="px-3 py-3 font-semibold">İşlem</th>
                        <th className="px-3 py-3 font-semibold">Açıklama</th>
                        <th className="px-3 py-3 text-right font-semibold">Borç</th>
                        <th className="px-3 py-3 text-right font-semibold">Alacak</th>
                        <th className="px-3 py-3 text-right font-semibold">Bakiye</th>
                      </tr>
                    </thead>
                    <tbody>
                      {hareketler.map((h, idx) => (
                        <tr key={idx} className="border-b border-slate-100 last:border-b-0">
                          <td className="px-3 py-3 text-slate-600">{tarih(h.tarih)}</td>
                          <td className="px-3 py-3 font-bold">{h.tip}</td>
                          <td className="px-3 py-3 text-slate-600">{h.aciklama}</td>
                          <td className="px-3 py-3 text-right font-semibold">{h.borc ? tl(h.borc) : "—"}</td>
                          <td className="px-3 py-3 text-right font-semibold">{h.alacak ? tl(h.alacak) : "—"}</td>
                          <td className="px-3 py-3 text-right font-black">{tl(h.bakiye)}</td>
                        </tr>
                      ))}
                      {hareketler.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-3 py-8 text-center text-slate-500">
                            Bu müşteri için henüz ekstre hareketi yok.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:mt-8 md:p-5">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Not</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Bu ekstre, kayıtlı iş ve ödeme hareketlerine göre hazırlanmıştır. Herhangi bir farklılık görmeniz halinde bizimle iletişime geçebilirsiniz.
                </p>
              </div>
            </div>
          </div>

          <aside className="hidden min-h-0 flex-col border-l border-white/10 bg-[#0B1120] p-5 lg:flex">
            <div className="grid gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <p className="text-xs text-slate-500">Onaylı Ciro</p>
                <p className="mt-1 text-lg font-black text-emerald-300">{tl(analiz.ciro)}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <p className="text-xs text-slate-500">Tahsilat</p>
                <p className="mt-1 text-lg font-black text-cyan-300">{tl(analiz.tahsilat)}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <p className="text-xs text-slate-500">Bakiye</p>
                <p className={`mt-1 text-lg font-black ${analiz.bakiye > 0 ? "text-amber-300" : "text-emerald-300"}`}>
                  {tl(analiz.bakiye)}
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3">
              <button onClick={pdfIndir} disabled={pdfHazirlaniyor} className="rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 px-5 py-4 text-sm font-black text-white shadow-[0_18px_50px_rgba(37,99,235,0.32)] disabled:opacity-60">
                {pdfHazirlaniyor ? "PDF hazırlanıyor..." : "PDF Kaydet"}
              </button>
              <button onClick={whatsappPaylas} className="rounded-2xl bg-emerald-600 px-5 py-4 text-sm font-black text-white hover:bg-emerald-500">
                WhatsApp ile Paylaş
              </button>
              <button onClick={onClose} className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-sm font-semibold text-slate-200 hover:bg-white/10">
                Kapat
              </button>
            </div>
          </aside>
        </div>

        <div className="grid shrink-0 grid-cols-3 gap-2 border-t border-white/10 bg-[#07111f]/95 p-2 lg:hidden">
          <button onClick={pdfIndir} disabled={pdfHazirlaniyor} className="rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 px-3 py-3 text-xs font-black text-white disabled:opacity-60">
            {pdfHazirlaniyor ? "PDF..." : "PDF Kaydet"}
          </button>
          <button onClick={whatsappPaylas} className="rounded-2xl bg-emerald-600 px-3 py-3 text-xs font-black text-white">
            WhatsApp
          </button>
          <button onClick={onClose} className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-xs font-bold text-slate-200">
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}
