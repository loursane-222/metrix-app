"use client";

import { useEffect, useState } from "react";

export default function YeniIsV2() {
  const [data, setData] = useState<any>(null);
  const [karOrani, setKarOrani] = useState(30);

  useEffect(() => {
    const raw = localStorage.getItem("aiPlakaSonuc");
    if (raw) setData(JSON.parse(raw));
  }, []);

  if (!data) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
        <h1 className="text-2xl font-black text-slate-900">AI sonucu bulunamadı</h1>
        <p className="mt-2 text-slate-500">Önce AI Plaka Planlayıcıdan hesap yapıp “Yeni İşe Aktar” butonuna bas.</p>
        <button
          onClick={() => window.location.href = "/dashboard/plaka-planlayici"}
          className="mt-6 rounded-2xl bg-slate-950 px-6 py-3 text-sm font-black text-white"
        >
          AI Plaka Planlayıcıyı Aç →
        </button>
      </div>
    );
  }

  const maliyet = Number(data.toplamMaliyet || 0);
  const satis = maliyet * (1 + karOrani / 100);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-violet-950 p-7 text-white shadow-[0_20px_60px_rgba(15,23,42,0.22)]">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_.8fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-300">Satış Teklif Motoru</p>
            <h1 className="mt-3 text-4xl font-black tracking-tight">
              {data.toplamPlaka} plaka · %{Number(data.fireOrani || 0).toFixed(1)} fire
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              AI plaka optimizasyonundan gelen maliyet, metraj ve fire bilgileriyle fiyat teklifini satışa hazır hale getir.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/10 p-6 text-right backdrop-blur">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-300">Satış Fiyatı</p>
            <div className="mt-3 text-5xl font-black">€{satis.toFixed(0)}</div>
            <p className="mt-2 text-sm text-slate-300">Kar oranı: %{karOrani}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-4">
        <Metric title="Toplam Plaka" value={`${data.toplamPlaka || 0}`} />
        <Metric title="Maliyet" value={`€${maliyet.toFixed(2)}`} />
        <Metric title="Fire Maliyeti" value={`€${Number(data.fireMaliyeti || 0).toFixed(2)}`} />
        <Metric title="Ortalama Fire" value={`%${Number(data.fireOrani || 0).toFixed(2)}`} />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_.8fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
          <h2 className="text-xl font-black text-slate-900">AI Plaka Planı</h2>
          <p className="mt-2 text-sm text-slate-500">
            Yerleşimi düzenlemek için AI plaka optimizasyon ekranına dönebilirsin.
          </p>
          <button
            onClick={() => window.location.href = "/dashboard/plaka-planlayici"}
            className="mt-5 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white"
          >
            Yerleşimi Düzenle →
          </button>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
          <h2 className="text-xl font-black text-slate-900">Metraj Özeti</h2>
          <div className="mt-5 space-y-3">
            <Row label="Tezgah" value={Number(data.tezgahMtul || 0)} />
            <Row label="Tezgah Arası" value={Number(data.tezgahArasiMtul || 0)} />
            <Row label="Ada Tezgah" value={Number(data.adaTezgahMtul || 0)} />
          </div>

          <div className="mt-6 border-t border-slate-200 pt-5">
            <label className="text-sm font-bold text-slate-700">Kar Oranı: %{karOrani}</label>
            <input
              type="range"
              min="10"
              max="80"
              value={karOrani}
              onChange={(e) => setKarOrani(Number(e.target.value))}
              className="mt-3 w-full"
            />
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-7 text-center shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
        <p className="text-sm font-bold text-slate-500">Teklif Satış Fiyatı</p>
        <div className="mt-2 text-5xl font-black text-slate-950">€{satis.toFixed(0)}</div>
        <button className="mt-6 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 px-8 py-4 text-sm font-black text-white">
          TEKLİF OLUŞTUR
        </button>
      </section>
    </div>
  );
}

function Metric({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-3xl bg-white p-5 shadow-[0_14px_40px_rgba(15,23,42,0.08)]">
      <p className="text-sm font-bold text-slate-500">{title}</p>
      <p className="mt-2 text-3xl font-black text-slate-950">{value}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between rounded-2xl bg-slate-50 px-4 py-3 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="font-black text-slate-950">{value.toFixed(2)} mtül</span>
    </div>
  );
}
