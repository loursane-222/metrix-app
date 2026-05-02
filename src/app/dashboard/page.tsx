"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import PushPermission from '@/components/push/PushPermission'

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then(setData);
  }, []);

  if (!data) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#030712] text-slate-400">
        Yükleniyor...
      </div>
    );
  }

  if (data.error) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#030712] text-red-400">
        {data.error}
      </div>
    );
  }

  return (
    <>
      {/* MOBIL DASHBOARD */}
      <div className="md:hidden h-[100dvh] w-full bg-[#030712] text-white flex flex-col">
        <div className="shrink-0 p-4 border-b border-slate-800">
          <h1 className="text-xl font-black">Bugün Yapılacaklar</h1>
          <p className="text-xs text-slate-500 mt-1">Operasyon ve sıcak satış takibi</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-10">
          <section>
            <h2 className="text-xs text-slate-400 mb-3 uppercase tracking-widest">Operasyon</h2>

            <div className="space-y-3">
              {data.operasyonPlan.map((o: any) => (
                <div
                  key={o.id}
                  onClick={() => o.isId && router.push(`/is/detay?id=${o.isId}`)}
                  className="bg-[#0B1120] p-4 rounded-xl border border-slate-800 cursor-pointer"
                >
                  <div className="flex justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold">{o.saat} · {o.tip}</p>
                      <p className="text-xs text-slate-400 mt-1">{o.musteri}</p>
                      {o.urun && <p className="text-xs text-slate-500 mt-1">{o.urun}</p>}
                    </div>
                    <span className={`text-xs ${o.tamamlandi ? "text-emerald-400" : "text-amber-400"}`}>
                      {o.durum}
                    </span>
                  </div>
                </div>
              ))}

              {data.operasyonPlan.length === 0 && (
                <div className="text-slate-500 text-sm">Bugün operasyon yok.</div>
              )}
            </div>
          </section>



          <div className="rounded-2xl border border-emerald-500/20 bg-[#08111f] p-6">
            <h2 className="text-sm text-emerald-400 font-bold">Satış Skoru Yüksek Teklifler</h2>
            <p className="text-xs text-slate-500 mt-1 mb-4">Teklif görüntüleme, PDF açma ve tekrar ilgi sinyallerine göre AI WhatsApp mesajı hazırlar.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(data.sicakTeklifler || []).map((t: any) => {
                const score = Number(t.ihtimal || 0);
                const musteriAdi = t.musteri || t.musteriAdi || "Müşterimiz";
                const teklifNo = t.teklifNo || "";
                const tutar = Number(t.tutar || 0).toLocaleString("tr-TR");

                const rawPhone = String(t.telefon || t.musteriTelefon || t.cepTelefon || t.phone || "").trim();
                let cleanPhone = rawPhone.replace(/\D/g, "");
                if (cleanPhone.startsWith("0")) cleanPhone = "90" + cleanPhone.slice(1);
                if (cleanPhone.length === 10) cleanPhone = "90" + cleanPhone;

                const aiMessage =
                  score >= 90
                    ? `Merhaba ${musteriAdi}, teklifimizi birkaç kez incelediğinizi gördüm. İsterseniz bugün ölçü, termin ve uygulama detaylarını netleştirip işi hızlıca programa alabiliriz. Uygun olduğunuzda kısa bir görüşme yapalım mı?`
                    : score >= 75
                    ? `Merhaba ${musteriAdi}, teklifimizi incelediğinizi gördüm. Aklınıza takılan bir konu varsa hemen netleştirebilirim. Dilerseniz bugün kısa bir görüşmeyle süreci birlikte ilerletebiliriz.`
                    : `Merhaba ${musteriAdi}, gönderdiğimiz teklifle ilgili bir sorunuz olursa memnuniyetle yardımcı olurum. Uygulama, termin veya fiyat detaylarını netleştirmek isterseniz buradayım.`;

                const whatsappUrl = cleanPhone
                  ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(aiMessage)}`
                  : `https://wa.me/?text=${encodeURIComponent(aiMessage)}`;

                return (
                  <div key={teklifNo || t.id} className="bg-[#0B1120] p-4 rounded-xl border border-slate-800">
                    <div className="flex justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold">{musteriAdi}</p>
                        <p className="text-xs text-slate-500 mt-1">{teklifNo}</p>
                        <p className="text-xs text-slate-400 mt-1">{tutar}₺</p>
                      </div>
                      <div className="text-right">
                        <span className="text-emerald-400 text-sm font-black">%{score}</span>
                        <p className="text-[10px] text-slate-500 mt-1">
                          {score >= 90 ? "Çok sıcak" : score >= 75 ? "Sıcak" : "Takip"}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2 mt-3 text-[11px] flex-wrap">
                      <span className="px-2 py-1 rounded bg-slate-800 text-slate-300">Açıldı: {t.goruntulenme}</span>
                      <span className="px-2 py-1 rounded bg-blue-950/60 text-blue-300">PDF: {t.pdf}</span>
                      {score >= 75 && (
                        <span className="px-2 py-1 rounded bg-amber-500/15 text-amber-300">
                          Bugün WhatsApp takibi önerilir
                        </span>
                      )}
                    </div>

                    <div className="mt-3 rounded-lg bg-slate-950/70 border border-slate-800 p-3">
                      <p className="text-[11px] text-emerald-400 mb-2 font-semibold">AI WhatsApp mesaj şablonu</p>
                      <p className="text-xs text-slate-200 leading-relaxed select-text">{aiMessage}</p>
                    </div>

                    <div className="flex gap-2 mt-3 flex-wrap">
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(aiMessage);
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

              {(data.sicakTeklifler || []).length === 0 && (
                <div className="text-slate-500 text-sm">Son 24 saatte sıcak teklif yok.</div>
              )}
            </div>
          </div>

          <section>
            <h2 className="text-xs text-emerald-400 mb-3 uppercase tracking-widest">Satış Radar</h2>

            <div className="space-y-3">
              {data.kapanabilirTeklifler
                .filter((t: any) => t.ihtimal >= 50)
                .map((t: any) => (
                  <div
                    key={t.id}
                    
                    className="bg-[#0B1120] p-4 rounded-xl border border-slate-800 cursor-pointer"
                  >
                    <div className="flex justify-between items-center gap-3">
                      <div>
                        <p className="text-sm font-bold">{t.musteri}</p>
                        <p className="text-xs text-slate-400">{t.tutar.toLocaleString("tr-TR")}₺</p>
                      </div>
                      <span className="text-emerald-400 text-sm font-black">%{t.ihtimal}</span>
                    </div>
                  </div>
                ))}

              {data.kapanabilirTeklifler.filter((t: any) => t.ihtimal >= 50).length === 0 && (
                <div className="text-slate-500 text-sm">Satış aksiyonu yok.</div>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* DESKTOP DASHBOARD */}
      <div className="hidden md:flex min-h-screen w-full bg-[#030712] text-slate-200 p-6 flex-col gap-6">
        <PushPermission />

<div className="grid grid-cols-4 gap-4">
          <div className="bg-[#0B1120] p-5 rounded-xl border border-slate-800">
            <p className="text-xs text-slate-400">Toplam Ciro</p>
            <p className="text-2xl">{data.finans.toplamCiro.toLocaleString("tr-TR")}₺</p>
          </div>

          <div className="bg-[#0B1120] p-5 rounded-xl border border-slate-800">
            <p className="text-xs text-slate-400">Bugün Kapanabilir</p>
            <p className="text-2xl text-emerald-400">
              {data.finans.bugunKapanabilirCiro.toLocaleString("tr-TR")}₺
            </p>
          </div>

          <div className="bg-[#0B1120] p-5 rounded-xl border border-slate-800">
            <p className="text-xs text-slate-400">Atölye Doluluk</p>
            <p className="text-2xl">%{data.atelye.doluluk}</p>
          </div>

          <div className="bg-[#0B1120] p-5 rounded-xl border border-slate-800">
            <p className="text-xs text-slate-400">Bugünkü Operasyon</p>
            <p className="text-2xl">{data.atelye.bekleyenOperasyon} / {data.atelye.bugunOperasyon}</p>
          </div>
        </div>

        <PushPermission />



          <div className="rounded-2xl border border-emerald-500/20 bg-[#08111f] p-6">
            <h2 className="text-sm text-emerald-400 font-bold">Satış Skoru Yüksek Teklifler</h2>
            <p className="text-xs text-slate-500 mt-1 mb-4">Teklif görüntüleme, PDF açma ve tekrar ilgi sinyallerine göre AI WhatsApp mesajı hazırlar.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(data.sicakTeklifler || []).map((t: any) => {
                const score = Number(t.ihtimal || 0);
                const musteriAdi = t.musteri || t.musteriAdi || "Müşterimiz";
                const teklifNo = t.teklifNo || "";
                const tutar = Number(t.tutar || 0).toLocaleString("tr-TR");

                const rawPhone = String(t.telefon || t.musteriTelefon || t.cepTelefon || t.phone || "").trim();
                let cleanPhone = rawPhone.replace(/\D/g, "");
                if (cleanPhone.startsWith("0")) cleanPhone = "90" + cleanPhone.slice(1);
                if (cleanPhone.length === 10) cleanPhone = "90" + cleanPhone;

                const aiMessage =
                  score >= 90
                    ? `Merhaba ${musteriAdi}, teklifimizi birkaç kez incelediğinizi gördüm. İsterseniz bugün ölçü, termin ve uygulama detaylarını netleştirip işi hızlıca programa alabiliriz. Uygun olduğunuzda kısa bir görüşme yapalım mı?`
                    : score >= 75
                    ? `Merhaba ${musteriAdi}, teklifimizi incelediğinizi gördüm. Aklınıza takılan bir konu varsa hemen netleştirebilirim. Dilerseniz bugün kısa bir görüşmeyle süreci birlikte ilerletebiliriz.`
                    : `Merhaba ${musteriAdi}, gönderdiğimiz teklifle ilgili bir sorunuz olursa memnuniyetle yardımcı olurum. Uygulama, termin veya fiyat detaylarını netleştirmek isterseniz buradayım.`;

                const whatsappUrl = cleanPhone
                  ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(aiMessage)}`
                  : `https://wa.me/?text=${encodeURIComponent(aiMessage)}`;

                return (
                  <div key={teklifNo || t.id} className="bg-[#0B1120] p-4 rounded-xl border border-slate-800">
                    <div className="flex justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold">{musteriAdi}</p>
                        <p className="text-xs text-slate-500 mt-1">{teklifNo}</p>
                        <p className="text-xs text-slate-400 mt-1">{tutar}₺</p>
                      </div>
                      <div className="text-right">
                        <span className="text-emerald-400 text-sm font-black">%{score}</span>
                        <p className="text-[10px] text-slate-500 mt-1">
                          {score >= 90 ? "Çok sıcak" : score >= 75 ? "Sıcak" : "Takip"}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2 mt-3 text-[11px] flex-wrap">
                      <span className="px-2 py-1 rounded bg-slate-800 text-slate-300">Açıldı: {t.goruntulenme}</span>
                      <span className="px-2 py-1 rounded bg-blue-950/60 text-blue-300">PDF: {t.pdf}</span>
                      {score >= 75 && (
                        <span className="px-2 py-1 rounded bg-amber-500/15 text-amber-300">
                          Bugün WhatsApp takibi önerilir
                        </span>
                      )}
                    </div>

                    <div className="mt-3 rounded-lg bg-slate-950/70 border border-slate-800 p-3">
                      <p className="text-[11px] text-emerald-400 mb-2 font-semibold">AI WhatsApp mesaj şablonu</p>
                      <p className="text-xs text-slate-200 leading-relaxed select-text">{aiMessage}</p>
                    </div>

                    <div className="flex gap-2 mt-3 flex-wrap">
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(aiMessage);
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

              {(data.sicakTeklifler || []).length === 0 && (
                <div className="text-slate-500 text-sm">Son 24 saatte sıcak teklif yok.</div>
              )}
            </div>
          </div>


        <div className="grid grid-cols-12 gap-6 flex-1">

          <div className="col-span-4 bg-[#0B1120] p-6 rounded-xl border border-slate-800">
            <h2 className="text-sm text-slate-400 mb-4">Bugünün Atölye Planı</h2>

            <div className="space-y-3">
              {data.operasyonPlan.map((o: any) => (
                <div
                  key={o.id}
                  className={`bg-[#111827] p-4 rounded-lg border ${
                    o.tamamlandi ? "border-emerald-500/30" : "border-slate-800"
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium">{o.saat} · {o.tip}</p>
                      <p className="text-xs text-slate-400 mt-1">{o.musteri}</p>
                      {o.urun && <p className="text-xs text-slate-500 mt-1">{o.urun}</p>}
                    </div>

                    <span className={`text-xs ${o.tamamlandi ? "text-emerald-400" : "text-amber-400"}`}>
                      {o.durum}
                    </span>
                  </div>
                </div>
              ))}

              {data.operasyonPlan.length === 0 && (
                <div className="text-slate-500 text-sm">Bugün operasyon planı yok.</div>
              )}
            </div>
          </div>

          <div className="col-span-3 bg-[#0B1120] p-6 rounded-xl border border-slate-800">
            <h2 className="text-sm text-slate-400 mb-4">Bugün Yapılacaklar</h2>

            <div className="space-y-5">
              <div>
                <p className="text-xs text-emerald-400 mb-2 uppercase tracking-widest">Satış</p>
                <div className="space-y-2">
                  {data.satisAksiyonlari.map((a: any, i: number) => (
                    <div
                      key={i}
                      onClick={() => a.id && router.push(`/is/detay?id=${a.id}`)}
                      className="bg-[#111827] p-3 rounded text-sm cursor-pointer hover:bg-[#172033]"
                    >
                      {a.metin}
                    </div>
                  ))}

                  {data.satisAksiyonlari.length === 0 && (
                    <div className="text-xs text-slate-500">Bugün sıcak satış aksiyonu yok.</div>
                  )}
                </div>
              </div>

              <div>
                <p className="text-xs text-blue-400 mb-2 uppercase tracking-widest">Atölye</p>
                <div className="space-y-2">
                  {data.operasyonAksiyonlari.map((a: any, i: number) => (
                    <div
                      key={i}
                      onClick={() => a.id && router.push(`/is/detay?id=${a.id}`)}
                      className="bg-[#111827] p-3 rounded text-sm cursor-pointer hover:bg-[#172033]"
                    >
                      <span className="text-blue-400">{a.tip}</span> · {a.metin}
                    </div>
                  ))}

                  {data.operasyonAksiyonlari.length === 0 && (
                    <div className="text-xs text-slate-500">Bugün atölye aksiyonu yok.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
