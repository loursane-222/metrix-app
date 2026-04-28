"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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

          <section>
            <h2 className="text-xs text-emerald-400 mb-3 uppercase tracking-widest">Satış Radar</h2>

            <div className="space-y-3">
              {data.kapanabilirTeklifler
                .filter((t: any) => t.ihtimal >= 50)
                .map((t: any) => (
                  <div
                    key={t.id}
                    onClick={() => router.push(`/is/detay?id=${t.id}`)}
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

        <div className="grid grid-cols-12 gap-6 flex-1">
          <div className="col-span-5 bg-[#0B1120] p-6 rounded-xl border border-slate-800">
            <h2 className="text-sm text-slate-400 mb-4">Kapanabilir Teklifler</h2>

            <div className="space-y-3">
              {data.kapanabilirTeklifler.map((t: any) => (
                <div key={t.id} className="flex justify-between items-center bg-[#111827] p-4 rounded-lg border border-slate-800">
                  <div>
                    <p className="text-sm font-medium">{t.musteri}</p>
                    <p className="text-xs text-slate-400">{t.tutar.toLocaleString("tr-TR")}₺</p>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className={`text-sm ${t.ihtimal >= 65 ? "text-emerald-400" : "text-yellow-400"}`}>
                      %{t.ihtimal}
                    </span>

                    <button
                      onClick={() => router.push(`/is/detay?id=${t.id}`)}
                      className="px-3 py-1 bg-blue-600 text-xs rounded"
                    >
                      {t.aksiyon}
                    </button>
                  </div>
                </div>
              ))}

              {data.kapanabilirTeklifler.length === 0 && (
                <div className="text-slate-500 text-sm">Kapanabilir teklif yok.</div>
              )}
            </div>
          </div>

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
