"use client";

import { useEffect, useMemo, useState } from "react";

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((json) => {
        if (json?.error) setError(json.error);
        setData(json);
      })
      .catch((err) => {
        console.error(err);
        setError("Dashboard verisi alınamadı.");
      });
  }, []);

  
const sicakTeklifler = useMemo(() => data?.sicakTeklifler || [], [data]);

const [aiMesajlar, setAiMesajlar] = useState<Record<string, any>>({});

useEffect(() => {
  if (sicakTeklifler.length === 0) return;

  const run = async () => {
    const top = sicakTeklifler.slice(0, 3);

    const entries = await Promise.all(
      top.map(async (t: any) => {
        try {
          const res = await fetch("/api/ai-sales", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              musteri: t.musteri,
              tutar: t.tutar,
              goruntulenme: t.goruntulenme,
              pdf: t.pdf
            })
          });
          const json = await res.json();
          return [t.teklifNo, json] as const;
        } catch {
          return [t.teklifNo, null] as const;
        }
      })
    );

    setAiMesajlar(Object.fromEntries(entries.filter(([, v]) => v !== null)));
  };

  run();
}, [sicakTeklifler]);

  const operasyonPlan = useMemo(() => data?.operasyonPlan || [], [data]);
  const anaAkis = useMemo(() => data?.anaAkis || [], [data]);

  function phoneClean(t: any) {
    const raw = String(t?.telefon || t?.musteriTelefon || t?.cepTelefon || t?.phone || "").trim();
    let clean = raw.replace(/\D/g, "");
    if (clean.startsWith("0")) clean = "90" + clean.slice(1);
    if (clean.length === 10) clean = "90" + clean;
    return clean;
  }

  function aiMessage(t: any) {
    const score = Number(t?.ihtimal || 0);
    const musteriAdi = t?.musteri || t?.musteriAdi || "Müşterimiz";
    const musteriTipi = t?.musteriTipi || "Standart müşteri";

    if (musteriTipi === "Hızlı karar veren") {
      return `Merhaba ${musteriAdi}, teklifimizi incelediğinizi gördüm. Uygun görürseniz bugün ölçü, termin ve uygulama detaylarını netleştirip işi hızlıca programa alabiliriz.`;
    }

    if (musteriTipi === "Çok inceleyen") {
      return `Merhaba ${musteriAdi}, teklifimizi incelediğinizi gördüm. İsterseniz uygulama, termin ve fiyat detaylarını sade şekilde birlikte netleştirebiliriz.`;
    }

    if (score >= 85) {
      return `Merhaba ${musteriAdi}, teklifimizi tekrar incelediğinizi gördüm. Dilerseniz bugün kısa bir görüşmeyle ölçü, termin ve uygulama detaylarını netleştirip süreci ilerletebiliriz.`;
    }

    return `Merhaba ${musteriAdi}, gönderdiğimiz teklifle ilgili bir sorunuz olursa memnuniyetle yardımcı olurum. Uygulama, termin veya fiyat detaylarını netleştirmek isterseniz buradayım.`;
  }

  if (!data && !error) {
    const sicakTeklifler = data?.sicakTeklifler || [];

  return (
      <div className="min-h-screen bg-[#030712] text-slate-400 flex items-center justify-center">
        Yükleniyor...
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#030712] text-red-400 flex items-center justify-center">
        {error}
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#030712] text-white p-6 space-y-6">
      <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-800 bg-[#0B1120] p-6">
          <p className="text-sm text-slate-400">Toplam Ciro</p>
          <p className="text-2xl font-black mt-2">
            {Number(data?.finans?.toplamCiro || 0).toLocaleString("tr-TR")}₺
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-[#0B1120] p-6">
          <p className="text-sm text-slate-400">Bugün Kapanabilir</p>
          <p className="text-2xl font-black mt-2 text-emerald-400">
            {Number(data?.finans?.bugunKapanabilirCiro || 0).toLocaleString("tr-TR")}₺
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-[#0B1120] p-6">
          <p className="text-sm text-slate-400">Atölye Doluluk</p>
          <p className="text-2xl font-black mt-2">%{Number(data?.atelye?.doluluk || 0)}</p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-[#0B1120] p-6">
          <p className="text-sm text-slate-400">Bugünkü Operasyon</p>
          <p className="text-2xl font-black mt-2">
            {Number(data?.atelye?.bekleyenOperasyon || 0)} / {Number(data?.atelye?.bugunOperasyon || 0)}
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-emerald-500/20 bg-[#08111f] p-6">
        <h2 className="text-sm text-emerald-400 font-bold">Satış Skoru Yüksek Teklifler</h2>
        <p className="text-xs text-slate-500 mt-1 mb-4">
          Teklif görüntüleme, PDF açma ve müşteri davranışına göre AI WhatsApp mesajı hazırlar.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sicakTeklifler.map((t: any) => {
            const score = Number(t?.ihtimal || 0);
            const ai = aiMesajlar[t.teklifNo];
            let message = ai?.mesaj || aiMessage(t);

            if (t.aksiyonTipi === "satis") {
              const musteriAdi = t?.musteri || "Müşterimiz";
              message = `Merhaba ${musteriAdi}, teklifimizi incelediğinizi görüyorum. Uygun görürseniz bugün ölçü ve termin planlamasını netleştirip işi programa alabiliriz. Size ne zaman ulaşmam uygun olur?`;
            }
            const phone = phoneClean(t);
            let finalMessage = message;

            if (t.aksiyonTipi === "satis") {
              const musteriAdi = t?.musteri || "Müşterimiz";
              finalMessage = `Merhaba ${musteriAdi}, teklifimizi incelediğinizi görüyorum. Uygun görürseniz bugün ölçü ve termin planlamasını netleştirip işi programa alabiliriz. Size ne zaman ulaşmam uygun olur?`;
            }

            const whatsappUrl = phone
              ? `https://wa.me/${phone}?text=${encodeURIComponent(finalMessage)}`
              : `https://wa.me/?text=${encodeURIComponent(finalMessage)}`;

            return (
              <div key={t?.teklifNo || t?.id} className={`rounded-xl p-4 border ${score >= 85 ? "border-red-500 shadow-[0_0_20px_rgba(255,0,0,0.3)]" : score >= 65 ? "border-amber-500" : "border-slate-800"} bg-[#0B1120]`}>
                <div className="flex justify-between gap-4">
                  <div>
                    <p className="text-sm font-black">{t?.musteri || t?.musteriAdi || "Müşteri"}</p>
                    <p className="text-xs text-slate-500 mt-1">{t?.teklifNo || "-"}</p>
                    <p className="text-xs text-slate-400 mt-2">
                      {Number(t?.tutar || 0).toLocaleString("tr-TR")}₺
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-emerald-400 font-black">%{score}</p>
                    <p className="text-[10px] text-slate-500 mt-1">
                      {score >= 85 ? "Çok sıcak" : score >= 65 ? "Sıcak" : "Takip"}
                    </p>

                    {t.aksiyonTipi && (
                      <div className="mt-2 text-[11px] font-bold text-red-400">
                        {t.aksiyonMesaji}
                        <div className="text-[10px] text-slate-500 mt-1">
                          {t.aksiyonSaati} saat geçti
                          <div className="text-[10px] text-slate-600 mt-1">
                            Son hareket: {t.sonEvent ? new Date(t.sonEvent).toLocaleString("tr-TR") : "-"}
                          </div>
                        </div>
                      </div>
                    )}
                    {aiMesajlar[t.teklifNo]?.aksiyon && (
                      <>
                        <p className="text-[11px] mt-1 font-bold text-amber-400">
                          {aiMesajlar[t.teklifNo].aksiyon.toUpperCase()}
                        </p>

                        {aiMesajlar[t.teklifNo].aksiyon === "hemen ara" && phone && (
                          <a
                            href={`tel:${phone}`}
                            className="text-xs mt-1 inline-block px-2 py-1 bg-red-600 text-white rounded"
                          >
                            📞 Şimdi Ara
                          </a>
                        )}

                        {aiMesajlar[t.teklifNo].aksiyon === "hemen ara" && !phone && (
                          <button
                            type="button"
                            onClick={() => alert("Bu müşteri için telefon numarası kayıtlı değil. Lütfen müşteri kartına telefon ekleyin.")}
                            className="text-xs mt-1 inline-block px-2 py-1 bg-slate-700 text-slate-200 rounded"
                          >
                            Telefon Ekle
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 mt-3 text-[11px] flex-wrap">
                  <span className="px-2 py-1 rounded bg-slate-800 text-slate-300">
                    Açıldı: {Number(t?.goruntulenme || 0)}
                  </span>
                  <span className="px-2 py-1 rounded bg-blue-950/60 text-blue-300">
                    PDF: {Number(t?.pdf || 0)}
                  </span>
                  {t?.musteriTipi && (
                    <span className="px-2 py-1 rounded bg-amber-500/15 text-amber-300">
                      {t.musteriTipi}
                    </span>
                  )}
                </div>

                

                <div className="mt-3 rounded-lg bg-slate-950/70 border border-slate-800 p-3">
                  <p className="text-[11px] text-emerald-400 mb-2 font-semibold">AI WhatsApp mesaj şablonu (Gerçek AI)</p>
                  <p className="text-xs text-slate-200 leading-relaxed select-text">{message}</p>
                </div>

                <div className="flex gap-2 mt-3 flex-wrap">

                  {t.aksiyonTipi === "ara" && (
                    phone ? (
                      <a
                        href={`tel:${phone}`}
                        className="px-3 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-black"
                      >
                        🔥 Hemen Ara
                      </a>
                    ) : (
                      <button
                        onClick={() => alert("Telefon yok")}
                        className="px-3 py-2 rounded-lg bg-slate-700 text-white text-xs"
                      >
                        Telefon Ekle
                      </button>
                    )
                  )}

                  {t.aksiyonTipi === "whatsapp" && (
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      className="px-3 py-2 rounded-lg bg-green-500 text-black text-xs font-black"
                    >
                      WhatsApp Takip
                    </a>
                  )}

                  {t.aksiyonTipi === "satis" && (
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-black"
                    >
                      Satışı Kapat
                    </a>
                  )}

                  {t.aksiyonTipi === "risk" && (
                    <div className="px-3 py-2 rounded-lg bg-red-900 text-red-200 text-xs font-black">
                      ⚠️ Kaybediliyor
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(message);
                      alert("AI WhatsApp mesajı kopyalandı.");
                    }}
                    className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
                  >
                    Mesajı Kopyala
                  </button>

                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black"
                  >
                    WhatsApp’ta Aç
                  </a>
                </div>
              </div>
            );
          })}

          {sicakTeklifler.length === 0 && (
            <div className="text-sm text-slate-500">Şu an sıcak teklif yok.</div>
          )}
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-slate-800 bg-[#0B1120] p-6">
          <h2 className="text-sm text-slate-400 mb-4">Bugünün Atölye Planı</h2>
          <div className="space-y-3">
            {operasyonPlan.map((o: any) => (
              <div key={o?.id} className="rounded-xl border border-slate-800 bg-[#111827] p-4">
                <p className="font-bold">{o?.saat || "-"} · {o?.tip || "Operasyon"}</p>
                <p className="text-sm text-slate-400 mt-1">{o?.musteri || ""}</p>
                {o?.urun && <p className="text-sm text-slate-500 mt-1">{o.urun}</p>}
              </div>
            ))}
            {operasyonPlan.length === 0 && (
              <p className="text-sm text-slate-500">Bugün operasyon yok.</p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-[#0B1120] p-6">
          <h2 className="text-sm text-slate-400 mb-4">Ana Akış</h2>
          <div className="space-y-3">
            {anaAkis.map((a: any, i: number) => (
              <div key={i} className="rounded-xl bg-[#111827] p-4">
                <p className="text-xs text-blue-400 uppercase">{a?.type || "İşlem"}</p>
                <p className="text-sm mt-1">{a?.message || ""}</p>
              </div>
            ))}
            {anaAkis.length === 0 && (
              <p className="text-sm text-slate-500">Henüz akış kaydı yok.</p>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
